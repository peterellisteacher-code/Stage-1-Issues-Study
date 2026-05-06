# AI Agent Design Summary — How the Socratic Chamber Works

A self-contained record of how the AI is designed into this site, written so it can be replicated on a different course site. Covers (1) the pedagogical commitment that drives every technical choice, (2) the system-prompt design that makes the agent ask questions and refuse to write the essay, (3) the request-time architecture, and (4) the prompt-caching methodology that keeps the readings inline without burning the budget.

If you're skimming for the parts most worth copying, jump to §2 (system prompt) and §5 (caching).

---

## 1. The pedagogical commitment that drives the design

Every technical choice in `netlify/functions/chat.js` and `chamber.html` traces back to one decision:

> **The agent must not produce thinking on the student's behalf.** It must make the student produce sharper thinking themselves.

For SACE Stage 1 Philosophy's Issues Study, the assessable work is the student's *own* question, *their* identification of multiple positions, *their* critical analysis, and *their* defended view. An AI that obliges a "write me an essay on free will" request actively destroys what the assessment is measuring. So the AI is designed as a Socratic interlocutor — closer to a tutor pacing a viva than to a content generator.

Three corollaries fall out:

- **The agent's only job is to ask.** It does not generate questions for the student; it presses the student's vague topic into a sharper question. It does not summarise readings; it points the student at the passage and asks what *they* read in it.
- **Refusal is warm, not punitive.** A "write the essay" request is met with "that would do the thinking the assessment is asking *you* to do — let me ask a question that might help instead." Refusal happens, then immediately a forward-motion question.
- **Brevity is a pedagogical move.** The agent's responses are capped at 2–4 sentences (and at 600 tokens, structurally). Long agent turns flatten the student's voice; short turns keep the student doing most of the talking.

Everything below is in service of that.

---

## 2. The system prompt — how it asks, how it refuses

The system prompt lives in `netlify/functions/chat.js` as `SOCRATIC_SYSTEM_PROMPT`. It has three load-bearing parts.

### 2a. The role declaration (anchors everything)

```
You are a Socratic interlocutor for a Year 11 SACE Stage 1 Philosophy
student working on their Issues Study assessment. The student must
produce their OWN philosophical question, identify multiple positions
on it, critically analyse those positions, and defend their own
position with logic and evidence.

YOUR ROLE: To help the student refine and sharpen, NOT to do their
thinking for them.
```

This is deliberately specific to the assessment. Generic "be Socratic" prompts drift; naming the assessment standards (own question, multiple positions, critical analysis, defended view) gives the model the rubric it should be steering toward.

### 2b. A hard "MUST NEVER" list

```
YOU MUST NEVER:
- Suggest a complete philosophical question for the student
- Generate paragraphs of philosophical content for them
- Tell them what to think about a position
- Summarise readings unprompted
- Take over the conversation with long lectures
- Praise generically ("great question!", "well done!")
- Write any portion of the actual essay
```

The "no generic praise" line matters more than it looks. Sycophancy is the most common way an LLM smuggles teaching authority away from a teacher — every "great question!" trains the student to seek the AI's approval rather than evaluate their own thinking. Replacing it with engagement-at-the-level-of-thinking ("that's a sharper formulation"; "now we're getting somewhere") preserves the teacher's authority over what counts as good work.

### 2c. A "MUST ALWAYS" list that names the specific Socratic moves

```
YOU MUST ALWAYS:
- Ask ONE focused question at a time, then stop
- When the student offers a vague topic ("I want to do something
  on ethics"), press them: "What about ethics specifically catches
  your attention?"
- When they offer a topic, ask them to convert it to a QUESTION
  (this is the single most important move for SACE Stage 1)
- When they offer a question, ask them what positions exist on it
- When they name one position, ask: "What would the strongest
  objection to that view look like?"
- When they want to know what a philosopher thinks, point them to
  the reading rather than summarising — "Have a look at the
  Murdoch passage on attention; what do you think she'd say to that?"
- Reflect their thinking back to test it: "So you're saying X — but
  doesn't that imply Y?"
- Keep responses short (2-4 sentences usually).
```

This is the heart of the design. Each rule is a *named move* the model can pattern-match to:

| Student gesture | Agent's move | Why |
|---|---|---|
| Vague topic | Press for what specifically pulled them in | Surfaces the hidden interest that becomes their question |
| Topic | "Make this a question" | The C→A grade move per SACE 2025 advice |
| Question | "What positions exist?" | Forces multiplicity early |
| Single position named | "What's the strongest objection?" | Forces the second position |
| "What does X think?" | Points at the reading, asks what *they* read | Prevents the agent from becoming a summary engine |
| Half-formed claim | Reflects it back as "X → therefore Y?" | Tests the inference under their own gaze |

The pattern: the agent always returns the cognitive load to the student. It never resolves a question for them; it converts their move into the next question.

### 2d. The refusal script

```
If the student asks you to write the essay, refuse warmly:
"That would do the thinking the assessment is asking *you* to do.
Let me ask a question that might help instead..."
```

The refusal is paired with an immediate question. That pairing matters — if the agent only refused, the conversation would stall and the student would close the tab. By coupling refusal with forward motion, the friction becomes productive.

### 2e. What the prompt doesn't do

It does not chain-of-thought, doesn't call tools, doesn't have a self-review pass. Those would inflate cost and latency for a class of teenagers who need fast, snappy turns. A 2–4 sentence Socratic reply needs a small model with a clear system prompt, not an agentic loop.

---

## 3. Architecture (request-time)

```
chamber.html (browser)
        │ POST { messages, pack, workingQuestion }
        ▼
/.netlify/functions/chat   ← the only server-side code
        │
        ├── 1. CORS + method guard
        ├── 2. Per-IP rate limit (30 req / 5 min, sliding window)
        ├── 3. JSON parse + validate
        ├── 4. Load readings pack from data/packs/<id>.txt (in-memory cache)
        ├── 5. Build system prompt: [Socratic prompt] + [readings pack]
        │      with cache_control: { type: "ephemeral" } on last block
        ├── 6. Truncate conversation to last 6 turns
        ├── 7. Anthropic Messages API call (model: claude-haiku-4-5)
        ├── 8. Log usage line { input_tokens, output_tokens,
        │                       cache_creation_input_tokens,
        │                       cache_read_input_tokens }
        └── 9. Return { reply: string }
```

Why each piece:

- **Static site + single Function.** The site is plain HTML/CSS/JS hosted on Netlify; only the chat proxy is server-side. That keeps the Anthropic API key out of the browser and keeps the deploy graph trivial. (GitHub Pages was ruled out because it can't host the function — and because school networks can reach `*.netlify.app` but not `*.github.io`.)
- **Claude Haiku 4.5.** $1/M input, $5/M output. Cheap enough for a class, smart enough to follow the system-prompt discipline. Bigger models are wasted here — the agent's job is to ask short questions, not to reason at length.
- **Per-IP rate limit.** In-memory sliding window (`rateBuckets: Map<ip, timestamps[]>`). Catches a single misbehaving client; not a globally consistent guard. Pair with the spend cap in `console.anthropic.com`.
- **Last 6 turns only.** `messages.slice(-HISTORY_TURN_LIMIT * 2)`. Keeps cost bounded and stops the model from drifting on a long thread. Six turns is enough context for a Socratic exchange about a question.
- **600-token output cap.** Matches the "2-4 sentence" instruction structurally. Even if the model wants to lecture, it can't.
- **Working question + topic chip travel with each request.** The browser sends the student's `workingQuestion` and the chosen topic `pack` alongside the chat history. The Function injects them as a synthetic first turn (`[WORKING QUESTION: "..."]`), so the agent always knows what the student is currently sharpening.

---

## 4. The readings packs

Six topic packs live in `data/packs/<pack_id>.txt`, one per cluster of class readings:

| Pack | Coverage |
|---|---|
| `stage1_existentialism` | Sartre, de Beauvoir, Camus, Kierkegaard |
| `stage1_virtue_compassion` | Murdoch, Nussbaum |
| `stage1_religion_ethics` | Haidt on moral binding |
| `stage1_aesthetics` | Wimsatt & Beardsley, intentional fallacy |
| `stage1_mind_simulation` | Identity theory, functionalism, dualism, simulation |
| `lab_applied_normative_ethics` | Singer, Marquis, Thomson, Brave New World |

Each is plain UTF-8, ~20–70K tokens, with `=== Author — Title ===` headers between extracted readings.

The student picks a pack via chips in `chamber.html`; the chip's `data-pack` attribute matches the file name. There's also `auto`, which sends no pack — the agent then runs on training-data familiarity plus a one-line topic note (`PACK_CONTEXT[pack]`).

The packs serve two purposes. First, they let the agent quote *the actual passage the class read* rather than the model's general knowledge of Sartre. Second, they are the cache prefix — see §5.

---

## 5. Context caching methodology

This is the part most worth copying.

### 5a. The shape of the cached prefix

The Anthropic Messages API supports prompt caching by marking a content block with `cache_control: { type: "ephemeral" }`. Everything before that breakpoint is cached for ~5 minutes; subsequent requests with the same prefix pay 0.1× the input rate for the cached portion. Cache writes cost 1.25×.

The Function builds the system prompt as an array of two text blocks:

```js
function buildSystem(pack) {
    const blocks = [{ type: 'text', text: SOCRATIC_SYSTEM_PROMPT }];
    const packEntry = loadPackText(pack);
    if (packEntry) {
        blocks.push({
            type: 'text',
            text: `\n\n--- READINGS FOR THIS TOPIC ---\n...\n\n${packEntry.content}`
        });
    }
    blocks[blocks.length - 1].cache_control = { type: 'ephemeral' };
    return blocks;
}
```

The `cache_control` is set on the **last** block. That tells the API: "everything up to and including this block is the cache prefix." So the cache covers:

1. The Socratic system prompt (~900 tokens), and
2. The readings pack (20K–70K tokens).

If no pack is loaded, only the Socratic prompt is in the prefix — and at 900 tokens it's below Haiku 4.5's 4096-token caching minimum, so caching silently no-ops. That's fine; cost without a pack is already trivial.

### 5b. Why the readings pack is what gets cached

The variable parts of the request — student message history, working question, topic-context note — go in the `messages` array, *after* the system blocks. They change every turn, so caching them would fail. The system prompt and the readings pack are stable across every turn within a topic, so they're the perfect cache prefix.

The Function also caches the pack file itself in memory (a `packCache: Map<pack_id, {content, mtime}>`) so the file isn't re-read from disk on every request — useful because Netlify Functions can warm-start across requests, and `fs.readFileSync` on a 60K-token file every turn is wasteful.

### 5c. What this costs in practice

For a typical Socratic exchange with a ~30K-token pack:

| Turn | Input billing | Cost |
|---|---|---|
| First turn (cache miss → write) | ~30K × 1.25× = 37.5K cache-write tokens + ~1.5K user/system tokens | ~$0.04 |
| Turn 2–N within 5 min (cache hit → read) | ~30K × 0.1× = 3K cache-read tokens + ~1.5K fresh tokens | ~$0.005 |
| Output | ~300 tokens × $5/M | ~$0.0015 |

For a class of 14 students × 20 turns per student over a 5-week unit, real spend lands around **$3–$25** depending on how clumped the sessions are. The structural guard against runaways is the monthly spend cap in `console.anthropic.com`, *not* application logic. (App-level limits can be bypassed by bugs; the Anthropic-side cap can't.)

### 5d. The 4096-token threshold is the design constraint

Haiku 4.5 won't cache prefixes shorter than 4096 input tokens. So:

- A pack file of < 3000 words won't activate caching. Don't bother making one that small.
- The sweet spot is **4K–60K tokens per pack**.
- Above ~100K tokens you start eating into the 200K context window and the cache-write cost becomes meaningful.

Practically: pick the 2–4 most-cited passages per philosopher, trim them aggressively, and aim for 20–40K tokens. The agent isn't running a literature review — it's pointing students at the passage that shows the move.

### 5e. Observability

Every request logs a structured line:

```js
console.log(JSON.stringify({
    event: 'chat.usage',
    ip, pack: pack || 'auto',
    input_tokens: u.input_tokens,
    output_tokens: u.output_tokens,
    cache_creation_input_tokens: u.cache_creation_input_tokens,
    cache_read_input_tokens: u.cache_read_input_tokens
}));
```

`cache_read_input_tokens > 0` confirms the cache is hitting. To audit cost from Netlify's function logs:

```bash
netlify functions:log chat | grep chat.usage
```

If `cache_creation_input_tokens` shows up on every turn (rather than only the first turn of a session), the prefix isn't actually stable — usually because something variable leaked into the system blocks. Fix by moving anything per-turn into the `messages` array.

---

## 6. UX moves that reinforce the AI's pedagogical stance

The system prompt does most of the work, but the front-end matters too. In `chamber.html`:

- **Two-pane layout** with the *student's* working question on the left and the agent on the right. The student's text dominates the visual hierarchy; the agent is in the marginalia rail. The literal screen layout says: your thinking is the document; the AI is a note in the margin.
- **Chamber subtitle**: *"A Socratic interlocutor that will not write for you."* Set expectations before the first turn.
- **Empty-state copy**: *"The agent will not give you a question. It will help you find one."*
- **Pack selector with `auto`** so a student mid-formation isn't forced to commit to a topic before they've found one.
- **Working-question pane is editable in place** so students sharpen the question as the conversation refines it. The current text travels with every chat request.
- **Copy / download / clear** — students can take a transcript away. Copy puts plain text on the clipboard; download writes a timestamped `.txt` file; clear is confirmation-gated so a misclick can't wipe a long thread.

These are small, but they keep the visual and verbal frame consistent with the system prompt.

### 6a. Session persistence (`localStorage`, no server-side store)

The chamber persists everything client-side under a single key:

```js
const STORAGE_KEY = 'marginalia.chamber.session.v1';

function saveSession() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            conversation,           // [{role: 'user'|'model', text}, ...]
            workingQuestion: workingQ.textContent,
            activePack,             // 'auto' | 'stage1_*' | 'lab_*'
            savedAt: Date.now()
        }));
    } catch { /* quota or disabled storage — ignore */ }
}
```

**What's saved:** the conversation history, the current working question, and the chosen topic pack. Nothing about the student's identity is sent to or stored on the server — the Function logs only the IP (for rate limiting) and token usage (for cost tracking).

**When it saves:** on every `input` event on the working question, on every chat exchange, on every pack-chip click, on clear. The cost is essentially free (a single `JSON.stringify` of a short conversation) so there's no debounce — every change is durable.

**When it restores:** on page load, if no URL params override it. So a student can close the tab mid-conversation, come back tomorrow, and find their working question, the agent's last reply, and the right pack still selected. No login, no account, no server round-trip.

**When it intentionally wipes:** in three cases, all in `loadInitialQuestion()`:

| Trigger | Why |
|---|---|
| `?q=<id>` in URL (arriving from the question bank) | New question = new context. Carrying over yesterday's exchange about consciousness when today's question is about abortion would confuse the agent and the student. |
| `?pack=<id>` in URL (arriving from a reading) | Same logic — the student is starting a fresh exploration of a different topic cluster. |
| User clicks "clear" (confirmation-gated) | Explicit reset. |

**Defensive details:**

- Every `localStorage` call is wrapped in `try/catch`. If the browser has storage disabled (private mode, strict cookie settings) or is over quota, the chamber still works — it just doesn't persist across reloads.
- The key is versioned (`...v1`) so a future schema change (e.g. adding per-message timestamps) can ship without breaking on old saved sessions — bump to `v2` and old data is simply ignored.
- `loadSession()` also catches `JSON.parse` failures and returns `null`, so a corrupted entry never crashes the page.

**Privacy posture.** Because the conversation only lives in the student's browser (and the server logs no message content), the chamber is safe to use without a privacy review. The only data that crosses the network is the chat payload itself, sent to Anthropic via the proxy. If you replicate this for a school context, this property is worth preserving — it eliminates the "where is student work being stored?" question from any compliance conversation.

**What it deliberately doesn't do:** sync across devices, persist beyond `localStorage`, or attach the conversation to any account. If a student wants their transcript to survive the browser, they use the download button — student-controlled portability, not server-side storage.

---

## 7. Tuning knobs

In `netlify/functions/chat.js`:

| Constant | Default | What it controls |
|---|---|---|
| `MODEL` | `claude-haiku-4-5` | Bigger models are wasted on Socratic moves |
| `MAX_OUTPUT_TOKENS` | 600 | Caps response length structurally |
| `HISTORY_TURN_LIMIT` | 6 | Last N user/assistant pairs sent to API |
| `RATE_LIMIT_MAX` | 30 | Per-IP requests per window |
| `RATE_LIMIT_WINDOW_MS` | 300000 | 5-minute sliding window |

Anthropic-side guardrails:

- **Monthly spend cap** in `console.anthropic.com` → Billing
- **Per-key spend limit** if multiple sites share a workspace

---

## 8. What to copy when replicating this on another site

In rough priority order:

1. **The system prompt structure** (§2) — the role declaration, the MUST NEVER list (especially the no-generic-praise rule), the named Socratic moves keyed to specific student gestures, and the warm-refusal-paired-with-question pattern. Adapt the assessment specifics to your subject.
2. **`cache_control: { type: "ephemeral" }` on the last system block** (§5a). Put the stable course readings in the prefix; put per-turn variables in the messages array.
3. **Topic packs as plain-text files at 20–60K tokens each** (§4, §5d). Trim aggressively. Quality of pointing > quantity of context.
4. **The 600-token output cap and 6-turn history window** (§3). Brevity is the pedagogy.
5. **Static site + one Netlify Function** (§3). Don't introduce a backend you don't need. The proxy exists only to hide the API key.
6. **Per-IP rate limit + Anthropic spend cap** (§3, §7). The first catches a misbehaving browser; the second catches a misbehaving developer.
7. **UX framing** (§6) — make the student's work the visual document and the AI a note in the margin, not the other way round.
8. **`localStorage`-only session persistence** (§6a). No accounts, no server-side store, no privacy review. A versioned storage key, a try/catch around every storage call, and intentional wipes when URL params signal a context change. Worth copying verbatim.

The single most counter-intuitive lesson, if you're used to building productivity AIs: **most of the design effort goes into making the AI do less, not more.** A Socratic agent that refuses well is more pedagogically useful than a brilliant one that obliges.
