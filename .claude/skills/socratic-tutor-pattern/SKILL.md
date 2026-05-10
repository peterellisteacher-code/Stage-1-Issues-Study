---
name: socratic-tutor-pattern
description: Use when building or modifying an AI tutor for students embedded in a static website — especially Socratic tutors that guide thinking rather than answer questions. Provides patterns for cost-efficient Anthropic API integration (Haiku, ephemeral prompt caching with 1h TTL, multi-turn caching), the question-bank → pin → AI-assisted refinement → grounded dialogue architecture that preserves student agency, Netlify Function deployment for the API proxy, and pedagogical anti-patterns to avoid. Self-iterating: append findings to "Lessons in the wild" after each application.
---

# Socratic tutor pattern (for student-facing AI tutors)

> **Future Claude: after applying this skill to a new tutor or a real cost incident, add a one-paragraph entry under "Lessons in the wild" at the bottom of this file. Date it. Keep it specific.**

## When to invoke

A student-facing AI tutor on a static site (Year 10-12 / first-year undergrad), where:
- The student must produce their own analysis, question, argument, or design — not consume one.
- Cost matters (a teacher's personal API key, not a grant).
- The site has no auth infrastructure beyond optional site-wide password protection.
- The AI is one tool inside a workflow (curated material → selection → AI shaping → student-led product), not a chat-with-everything box.

If the project is "build me a chatbot that answers homework questions", this is the wrong pattern — refuse and recommend a different shape.

## Three principles to defend

### 1. Pedagogy: the AI does not do the student's thinking

The whole point of school is the cognitive labour. An AI that does the labour for the student is a labour-substitution tool, not a learning tool. The system prompt must encode this explicitly — model defaults lean toward helpfulness, and helpful here means harmful.

Template (adapt to subject — keep the structure):

```
You are a Socratic interlocutor for a [LEVEL] student working on their [TASK]. The student must produce their OWN [PRIMARY ARTIFACT] — [task-specific sub-goals].

YOUR ROLE: To help the student refine and sharpen, NOT to do their thinking for them.

YOU MUST NEVER:
- Suggest a complete [primary artifact] for the student
- Generate paragraphs of [domain] content for them
- Tell them what to think about a position
- Summarise [readings/data/sources] unprompted
- Take over the conversation with long lectures
- Praise generically ("great question!", "well done!")
- Write any portion of the actual [final product]

YOU MUST ALWAYS:
- Ask ONE focused question at a time, then stop
- When the student offers a vague topic, press them: [domain-specific specifying move]
- When they offer [stage 1], ask them to convert it to [stage 2]
- When they offer [stage 2], ask them what [next layer] exists
- When they name one [thing], ask: "What would the strongest objection to that view look like?"
- Point them to the [source material] rather than summarising
- Use [domain] terminology accurately and gently introduce the right technical term when the student gestures at a concept
- Reflect their thinking back to test it: "So you're saying X — but doesn't that imply Y?"
- Register intellectual engagement at the LEVEL of thinking, not at task completion: "That's a sharper formulation."
- Keep responses short (2-4 sentences usually). The student does the talking; you do the questioning.

If the student asks you to write the [final product], refuse warmly: "That would do the thinking the assessment is asking *you* to do. Let me ask a question that might help instead..."
```

Three crucial moves the prompt must explicitly require, because the model will skip them otherwise:

- **Convert topic → question.** Students arrive with topics. The single most-leveraged move is requiring them to phrase a question. The AI must NOT write the question — only ask "how would you phrase that as a question?"
- **Ask for the strongest objection.** Stops single-position drift.
- **Point, don't summarise.** *"Have a look at the Murdoch passage on attention; what do you think she'd say to that?"* Not *"Murdoch argues that…"*

### 2. Cost: defend the budget by design

A class of 30 hitting the chat at once during a lesson, with reading packs of 20K-68K tokens and a teacher paying out of pocket, is the cost danger zone. Defences (in priority order):

1. **Smallest model that does the job.** For Socratic dialogue: Haiku. Smarter models are LESS Socratic by default — they over-explain. Hardcode the model.
2. **Ephemeral prompt caching with 1h TTL on stable prefixes.**
   ```js
   { type: 'text', text: readings_pack, cache_control: { type: 'ephemeral', ttl: '1h' } }
   ```
   Why 1h not 5min: students read → think → ask follow-up, often >5 min between turns. Default 5-min TTL produces 1:1 cache_write:cache_read (cache always expired by next turn). 1h costs 2× to write but lasts 12× longer. Net ~40-50% saving on busy days.
3. **Multi-turn caching on the most recent assistant turn.** Marks the cache breakpoint AFTER history, so the next user message benefits from a hit covering system + readings + history.
   ```js
   { role: 'assistant', content: [{ type: 'text', text, cache_control: { type: 'ephemeral', ttl: '1h' } }] }
   ```
4. **Skip cache markers when prefix is below model minimum.** Haiku: 2048 tokens. Sonnet: 1024. A bare ~400-token system prompt with a marker silently no-ops.
5. **History truncation + output cap.** Last N turns; max_tokens 600 for short Socratic replies.
6. **Per-IP rate limit (soft, in-memory).** Sufficient at class scale; don't over-engineer.
7. **Structured per-request usage logging** — `{ ip, pack, input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens }`. Surface in function logs so cache effectiveness is visible.

**How to verify the cache is working:** pull the Anthropic console CSV after a real class. Look for the write:read ratio. 1:1 = broken. 1:5 or better = healthy.

### 3. Architecture: agency through a funnel

The shape that works:

```
Curated bank (HTML) → student PINs one item → AI helps SHAPE the student's draft → grounded dialogue → student-authored product
```

Why this works pedagogically:
- "What's your question?" cold produces vagueness. Students arrive with topics, not questions.
- The bank exposes raw material; pinning is a low-effort act of selection that already commits the student.
- The AI helps SHAPE — refining what the student is gesturing at — not generating from scratch. Most "AI tutor" projects skip this and go straight to "what do you want to write about?". That move is wrong.
- Once the question/claim/design exists, every dialogue turn refers back to it. Persist it in localStorage and inject it as a synthetic context message into every chat request.

In code (Netlify Function pattern):

```js
// Inject working question + topic context as a synthetic user message.
// Stub assistant ack ("Noted. Keep going.") keeps it in context without
// occupying the system cache (cache lives on system + readings only).
if (workingQuestion) contextParts.push(`[WORKING QUESTION: "${workingQuestion}"]`);
if (contextParts.length) {
  out.push({ role: 'user', content: contextParts.join('\n\n') });
  out.push({ role: 'assistant', content: 'Noted. Keep going.' });
}
```

Frontend persists `workingQuestion` in `localStorage` and sends it on every request. Same with `pack` (which reading set is loaded).

Pack files: plain UTF-8 text, OCRd from source PDFs at build time. Source PDFs and intermediate text files NEVER reach the API and SHOULD NEVER be deployed publicly (force-404 in `netlify.toml` and gitignore).

## Netlify Function deployment

`netlify.toml` essentials:
```toml
[build]
  publish = "."
  functions = "netlify/functions"

[functions]
  node_bundler = "esbuild"
  included_files = ["data/packs/*.txt"]   # CRITICAL — without this fs.readFileSync fails

[[redirects]]
  from = "/api/chat"
  to = "/.netlify/functions/chat"
  status = 200

[[redirects]]
  from = "/readings_source/*"
  to = "/"
  status = 404
  force = true                            # hide copyrighted sources from public
```

Pro plan facts (2026-05):
- Sync function timeout: 60s default and max (cannot be customised).
- Background functions: 15min via async invocation.
- Site password protection covers `/.netlify/functions/*` (verified via support-forum reports of webhooks being blocked when site password is enabled). ONE shared password = both HTML and chat function gated. Good for copyright defence.
- Log drains are Enterprise only; on Pro rely on the 7-day function-log retention.
- Deploy contexts (production / branch-deploy / deploy-preview) can have distinct env vars — use a separate test API key in branch deploys to test changes without affecting live class.

## Anti-patterns to refuse

- A "summarise this reading" button. Defeats the pedagogy.
- Any praise vocabulary in system prompt. Disengages students from level-of-thinking feedback.
- Complete artifacts generated by AI ("write me a question", "draft me an outline"). Removes agency.
- Multi-paragraph AI replies. Reduces student share of talking.
- Smarter-than-Haiku models. They over-explain.
- Sending images / PDFs / scans when text is available.
- Caching markers on prefixes below model minimum. No-op + wasted slot.
- Per-student auth or accounts at class scale. Use one site password.
- Storing student conversations server-side without an explicit teacher-facing reason. localStorage is enough.

## Lessons in the wild

> Each entry: date, what shipped, what surprised you. Keep entries short.

**2026-05-10 — founding lesson (Stage-1-Issues-Study, May 1 2026 cost incident).** A class of ~14 students hit the chat at once during a lesson. Anthropic console showed cache_write:cache_read = 1:1 on Haiku — every cached chunk rewritten as soon as used once. Day cost ~$5.60 just on 5-min ephemeral writes of the readings packs. Root cause: 5-min default TTL + work pattern (read → think 6+ min → ask follow-up) → cache always expired by next turn. Fix: switch readings cache breakpoint to `ttl: '1h'`, add `cache_control` on most recent assistant turn for multi-turn caching, and SKIP the cache marker when no pack is selected (system prompt alone is below Haiku's 2048-token cache minimum, so the marker silently no-ops). Sister Stage 2 lab on the same architecture had 1:2 write:read at lower volume — better baseline but not yet ideal. Lesson: ephemeral prompt caching needs TTL set against the actual think-time of the user, not the default. For students, that means 1h, not 5min.
