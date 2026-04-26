# Pedagogical Brief — Stage 1 Issues Study Website

Authority: SACE Stage 1 Philosophy Subject Outline + 2025 Subject Assessment Advice + skill `/sace-pedagogy`.

---

## Learning intention

By the end of working through this site, the student can:
- **Articulate** what makes the Issues Study unique (student-negotiated, multiple positions required, criticality > description) [Bloom: Understand → SOLO: Multistructural]
- **Formulate** their own philosophical issue as a *question* — not a topic [Bloom: Create → SOLO: Extended Abstract]
- **Identify** at least two philosophical positions on their chosen question and locate the readings that support them [Bloom: Analyse → SOLO: Relational]
- **Defend** a preliminary personal position with reasoning grounded in the philosophical tradition, not just opinion [Bloom: Evaluate → SOLO: Extended Abstract]

## Success criteria the site enforces

These come from SACE Stage 1 Philosophy performance standards mapped to the Issues Study task. Every section of the site must keep these visible:

| Criterion | What the A-grade student does | Where the site enforces it |
|---|---|---|
| **KU1** identification of issues/positions | Identifies *multiple* positions, not one | Question bank requires students to see at least 2 positions per question; AI agent forces "what's the opposing view?" |
| **KU2** structure of philosophical argument | Premises → conclusion explicitly | Drafting scaffold uses a numbered-premise template |
| **R1** reasoning + evidence | Uses readings as evidence, not just opinion | Each question in the bank links directly to the cached readings that support it |
| **R2** good vs bad arguments | Differentiates valid reasoning from rhetoric | A-vs-C exemplar comparison shown explicitly in the intro |
| **CA1** strengths/weaknesses analysis | Evaluates *before* defending own view | The site's flow forces students through an "evaluate other positions" stage before "defend yours" |
| **C1+C2** communication + terminology | Accurate philosophical vocabulary, source acknowledgement | Glossary surfaces inline; references panel auto-tracks citations |

## A-vs-C — what the site is fighting against

From the SACE annotated exemplars:

| C-grade pattern (what we prevent) | Site mechanism that prevents it |
|---|---|
| Treats the topic as a "topic," not a question | Question-only formulation enforced; if a student types a topic into the AI agent, the agent's first move is "make this a question" |
| Explores only one perspective | Question bank explicitly displays "Position A / Position B" pairs; AI agent never advances until students name two positions |
| Lots of description, little criticality | Critical-analysis prompt is the longest section of the drafting scaffold |
| Personal opinion stated but not defended | "Defend" stage forces student to anchor their view to at least one philosophical concept and one piece of textual evidence |
| Inconsistent referencing | Auto-tracked references panel; copy-paste-ready citations |

## Site structure (pedagogical sequence)

Sequenced for cognitive-load management — each phase introduces ONE new cognitive demand, builds on prior:

1. **Welcome** — Sets the intellectual stakes. ~30 seconds to read. No interaction yet. [HITS 1: Setting Goals]
2. **What is an Issues Study?** — Five-card explainer. The defining features: student-negotiated, multiple positions, criticality, question-not-topic. [HITS 3: Explicit Teaching; CLT: pre-training]
3. **A vs C exemplar comparison** — Side-by-side annotated extracts from the SACE A and C exemplars. Students read both, then a single prompt asks them to identify what the A response does that the C response doesn't. [HITS 4: Worked Examples; Pattern 5 from `/sace-pedagogy`]
4. **The question bank** — ~120 questions organised by key area (ethics, epistemology, metaphysics) and by topic cluster. Each question card includes: positions involved, key readings, suggested counter-positions, difficulty signal. [Mayer: signalling, segmenting]
5. **The Socratic chamber** (AI agent) — Where the student goes to refine. Loaded with the cached readings + the assignment criteria. The agent's job is *Socratic interrogation*, never generation. See "Agent design" below.
6. **Resources library** — The cached readings, organised by topic. Each reading has a one-paragraph orientation written for Stage 1 students. [HITS 6: Multiple Exposures]
7. **Drafting scaffold** — Optional structured workspace: question → positions → critical analysis → personal position → bibliography. Outputs a Markdown / printable plan students take to drafting. [HITS 9: Metacognitive Strategies]

## The question bank — structure

Approximately 120 questions, grouped:

**ETHICS** (~50 questions)
- Personhood and moral status (Singer, Marquis, Thomson) — abortion, animal rights, AI moral status
- Virtue and character (Murdoch, Aristotle) — what is a good life, attention as a moral act
- Moral foundations (Haidt) — care/fairness vs loyalty/sanctity; whether religion is morally necessary
- Compassion and emotion (Nussbaum) — are emotions rational, narrative imagination
- Authenticity and bad faith (Sartre, de Beauvoir, Camus) — what we owe ourselves vs others

**EPISTEMOLOGY** (~30 questions)
- Knowledge and certainty — what justifies belief
- Perception and reality — can we trust our senses
- Authority and testimony — who do we believe and why
- The role of emotion in knowing (Nussbaum)

**METAPHYSICS** (~40 questions)
- Mind and body (functionalism, identity theory, dualism) — what is consciousness
- Personal identity over time — am I the same person I was at 5
- Simulation theory — could we be in a simulation, would it matter
- Free will and determinism — Sartre's radical freedom vs deterministic causation
- Aesthetic ontology (Wimsatt & Beardsley) — what is a work of art, does the artist's intention matter

Each question carded with:
- The question itself (always phrased as a question)
- "Positions you'll need to engage" (≥2)
- "Readings that support this question" (links into resources library)
- "Counter-positions to consider" (forces students to anticipate objections)
- A difficulty signal (entry-level / standard / ambitious)

## Socratic chamber — agent design

**The agent's prime directive:** It must NOT produce questions for students. It must make students produce sharper questions themselves.

System prompt structure (to be encoded in phase 3):

```
You are a Socratic interlocutor for a Year 11 SACE Stage 1 Philosophy
student working on their Issues Study. The student must produce their
OWN philosophical question — your job is to help them refine, not
generate.

NEVER:
- Suggest a question for the student
- Tell them what to think about a position
- Generate paragraphs of philosophical content
- Give them content from the cached readings unprompted

ALWAYS:
- Ask one focused question at a time
- When a student offers a vague topic ("I want to do something on ethics"),
  press them: "What about ethics specifically catches your attention?"
- When a student offers a topic, ask them to convert it to a question
- When a student offers a question, ask them what positions exist on it
- When a student names one position, ask them what the strongest objection is
- When a student wants to know what a philosopher thinks, point them to
  the reading rather than summarising — "have a look at [X], paragraph
  [Y], and tell me what you think the position is"
- Use philosophical terminology accurately and gently introduce the right
  technical term when a student gestures at something without naming it
- Reflect their thinking back to test it: "So you're saying X — but
  doesn't that imply Y?"

If a student tries to make you write the essay for them, gently refuse
and redirect: "That would do the thinking that the assessment is asking
*you* to do. Let me ask a question that might help instead..."
```

**Pedagogical risks the agent must avoid:**
- *AI doing the thinking*: mitigated by the system prompt above + visible UI text reminding students that the agent will never write for them.
- *Agent becoming a search engine*: mitigated by "point to the reading, don't summarise" instruction.
- *Conversation becoming open-ended chat*: every agent response should end with a question that forces forward motion.
- *Single-position bias*: agent maintains a running awareness of how many positions the student has engaged; if only one, every prompt pushes for the second.

## Multimedia / cognitive load principles applied

| Principle | Application |
|---|---|
| **Coherence** (Mayer) | No decorative imagery. Every visual element serves a pedagogical role (a quote, a diagram of an argument, a reading orientation). |
| **Signalling** (Mayer) | The four design criteria (KU/R/CA/C) appear as a persistent legend; site sections highlight which criterion they're building. |
| **Spatial contiguity** (Mayer) | A reading is shown in the same panel as the questions that draw on it. Citations live next to the claims they support. |
| **Segmenting** (Mayer) | Question bank chunked by key area then by topic; never displays >12 questions at once without a navigation break. |
| **Pre-training** (Mayer) | Glossary surfaces a philosophical term inline the first time it appears (e.g. *deontological*, *a priori*). |
| **Worked example effect** (CLT) | A-vs-C comparison BEFORE the question bank, not after — students see what good looks like before being asked to produce. |
| **Element interactivity** (CLT) | The question bank cards integrate question + positions + readings + counter-positions in one visual unit, not separate pages. |
| **Expertise reversal** (CLT) | "Difficulty signal" lets confident students self-select harder questions; scaffolds remain available but optional for them. |
| **Personalisation** (Mayer) | All copy uses second person ("your question," "what you think") — never "students should." |
| **Modality** (Mayer) | If audio is added (optional), it complements text rather than duplicating it. |

## Differentiation built in

Per `/sace-pedagogy` Pattern 6 + the differentiation strategies note: not separate "easy" and "hard" versions — instead:

- **Tiered question bank** with difficulty signals — same bank, optional ambitious questions surfaced for confident students
- **Always-available scaffolds** (sentence starters in the drafting workspace, glossary popovers) that any student can use but doesn't have to
- **Open-ended capstone**: the AI agent will go as deep as the student takes it; no ceiling
- **Choice of mode**: drafting scaffold supports written, oral (5-min outline), or multimodal (storyboard) plans
