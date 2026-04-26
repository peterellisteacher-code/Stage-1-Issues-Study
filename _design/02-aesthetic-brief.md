# Aesthetic Brief — Stage 1 Issues Study Website

Working title: **Marginalia**.

---

## Source Text Derivation

Not applicable — this content is conceptual rather than tied to a single literary or film text. The aesthetic seed comes from the *practice* of philosophy itself.

## Content Essence

- **Core intellectual activity:** *Refining* — the slow act of taking a vague intuition and bringing it to focus as a precise question. Not "answering" — *formulating*.
- **Emotional texture:** Wonder turning to inquiry; intimate; deliberate; companionable.
- **Governing metaphor:** **Marginalia** — the centuries-long scholarly tradition of writing in the margins of texts. A philosopher's notebook in real time. Annotations layering on top of the canonical questions. The student's own voice joining a conversation 2,500 years long.
- **Stakes register:** High-but-warm. These questions matter (consciousness, meaning, right action), but the page invites you in rather than fencing you out.
- **Natural pace:** Slow-deliberate. Reading, re-reading, pausing to write. Not the pace of a quiz.

## Why this metaphor (and not the alternatives)

I considered: lens/focusing, cartography, constellation, prism, sculpting, the well, the journey. I picked marginalia because:

- **It honours the student-negotiated character of the task.** Marginalia are written in your hand — you are not consuming someone else's text, you are responding to it. That IS the Issues Study.
- **It is what philosophy actually IS.** Philosophy is, materially, a 2,500-year tradition of commentaries on commentaries — Aristotle annotates Plato, Aquinas annotates Aristotle, Descartes annotates the Scholastics, you annotate Singer. The metaphor isn't decorative; it's literally the activity.
- **It re-frames the AI agent.** The agent stops being an oracle and becomes a *voice in the margin* — the second hand of an attentive thinking partner, not a teacher's solution key.
- **It rejects the dusty-philosophy trope.** Marginalia are alive. They include doodles, exclamations, "no!"s, "but wait —"s. The aesthetic is bookish but kinetic, scholarly but personal.
- **It works at desktop scale.** Marginalia want a wide page — there has to be room for the margin. Perfect for 1920×1080 classroom projection.

## Visual Metaphor

The site presents itself as a working philosophy notebook on a wide desk. A primary text panel sits left-of-centre; a marginalia rail runs alongside it. The student's interactions accumulate visibly — selections, annotations, notes pin themselves to the rail like sticky tabs and ink underlines. The Socratic agent appears as if the agent is writing in the margin alongside the student. Pages slide left/right like a notebook spread.

## Spatial Logic

**Two-column workspace, asymmetric:**
- *Left (≈70%):* the active text — the question, the explainer, the reading, the agent's transcript. This is what the student is currently focused on.
- *Right (≈30%):* the marginalia rail — the student's pinned questions, agent's clarifying prompts, scaffolds, citations being built up.

This mirrors the intellectual activity: you read on the left, you respond on the right, the conversation accumulates over time. The space between the two columns is the gutter — the place where attention crosses from text to thought.

**Navigation:** non-linear notebook navigation. The site is a notebook with named sections (Intro, Bank, Chamber, Resources, Drafting), reachable from any other section via a fixed top-nav. Students don't have to go through phases in order — but the *first visit* is funnelled through Intro → Exemplar → Bank to ensure pedagogical sequencing.

**No modal overlays.** Information unfolds inline (drawer slides from the side, panels expand) — a modal "blocks the page," but a notebook can hold multiple open thoughts at once.

## Composition Lock (deferring to `/page-composition`)

- **Grid:** 12-column at 1920px (desktop classroom projection); collapses to 8-column at 1280px (laptop)
- **Type scale:** 14 / 18 / 24 / 32 / 43 / 57 / 76px (Perfect Fourth from 18px base, with `text-xs` and `text-display` extensions)
- **Spacing tokens:** 8 / 16 / 24 / 32 / 48 / 64 / 96 / 128px (8px grid)
- **Layout strategy:** Asymmetric two-column — *not* the centered-grid-of-cards default. Marginalia rail is structurally part of the layout, not a sidebar afterthought.
- **Viewport:** Locked at intro and chamber sections (100dvh, no scroll); scrolling permitted in Bank and Resources where content depth requires it
- **Container width:** max 1600px on the active text column; marginalia rail is fluid

## Colour Story

Not a palette — a story. The site is set in *aged paper, iron ink, and the colour of a scholar's correction*.

| Token | Hex | Meaning |
|---|---|---|
| `--ground` | `#F4ECD8` | Aged cream paper — warm, hospitable, not white. The ground state of the site. |
| `--ink` | `#1A1612` | Iron-gall ink — deep brown-black, slightly warm. ALL primary text. Not pure black. |
| `--marginalia` | `#A53A2A` | Scholar's red — the colour of medieval rubric, of correction marks, of underlinings that say "look at this." Used for annotations, the agent's voice, and emphasis. |
| `--clarity` | `#2952A3` | Cobalt — the blue of mathematical diagrams, of an argument crystallising. Used sparingly for the moment a question is "yours." |
| `--aged` | `#9C8569` | Faded sepia — the edges of old paper, secondary text, dividers, citations. |
| `--paper-dark` | `#E5DBC1` | A slightly darker cream — used for elevated panels (drawers, the chamber transcript area). |

**"Right path" signal — no green:** A small graphite tick (✓ rendered in `--ink` at small size, with a hand-drawn quality if SVG allows). Like a teacher's pen mark, not a video-game success.

**"Wrong path" signal — no red flash:** A graphite question mark in the margin (rendered in `--marginalia` at the same modest scale). Gentle interrogation, not punishment. The site is non-evaluative throughout — there are no "wrong answers" in question selection, only sharper or vaguer formulations.

## Typography

Three families (all from Google Fonts CDN). Each chosen against the defaults:

- **Headings (display):** **Fraunces** — a 21st-century revival serif with expressive italics and variable weight. Used at 32–76px for section titles and pull-quoted philosopher epigraphs. Replaces the Georgia/Playfair default.
- **Body (long-form text):** **Spectral** — a serif designed for screen reading at body sizes; Mediterranean roots without being Roman-monumental. Used at 18px for all body copy, readings, agent transcript.
- **UI (interface chrome):** **Inter** — clean modern sans, used at 14–18px for buttons, labels, navigation, glossary popovers. Provides the only "system" voice in the site, deliberately understated so it doesn't compete with the literary serif.
- **Marginalia (annotations):** **Caveat** — a pen-quality handwriting font, used at 18–24px for the AI agent's voice in the marginalia rail and for student annotations. This is the typographic signature of the site.

**Why this combination connects to the content:**
Spectral + Fraunces are both *post-2015* serifs — alive, contemporary, designed by living typographers. They reject the museum-typeface trope while staying in the literary tradition. Caveat introduces handwriting because handwriting *is* marginalia — the visible trace of a thinking human. Inter for the chrome stays out of the way.

## Sound Identity

Optional and off-by-default (this is a polished portal, not a game). When toggled on:

- **Sonic world:** *Paper, ink, and quiet.* The sonic vocabulary of a scholar's study, not a game.
- **Selection:** A soft pen-skritch on paper — short filtered noise burst, ~80ms, low-pass filtered at 800Hz with a tight envelope.
- **Confirmation (a question pinned):** A satisfying single ink-stroke sound — a single short downward pitch glide on a low triangle wave, ~150ms, with reverb tail.
- **"Soft redirect" (agent gently nudges):** A sustained mid-low resonant tone — sine wave at ~220Hz with slow attack and 800ms decay. Contemplative, not corrective.
- **Page transition:** A paper-turn — short pink-noise burst, 200ms, with a slight pitch sweep.
- **AI agent thinking:** A faint quill-pause — almost-silent low pulse at 1Hz, used to indicate the agent is "writing." Not a typewriter clack.
- **Ambient:** None by default. Optional: distant rain on a study window (loop, low volume).

## Animation Character

**Movement style:** *Weighted ink.* Animations behave like ink absorbing into paper — slow attack, gentle settle, no overshoot. No bounce, no elastic, no spring.

- **New content reveals** as if ink is appearing: alpha 0 → 1 over 600ms with a 4px Y translation (lifting up slightly), `cubic-bezier(0.25, 0.1, 0.25, 1)` (ease-out).
- **Selection** draws an underline beneath the chosen item — a 200ms ease-out animation, like the swipe of a pen.
- **Page transitions** slide as a notebook spread — the active panel translates 100% in/out over 500ms with a slight depth blur on the outgoing page.
- **AI agent responses** appear letter-by-letter at *reading speed* (~80ms per word, not per character) — the agent appears to be thinking aloud in the margin.
- **Pinned items in the marginalia rail** appear as if a small piece of tape has been added — a quick scale-from-0.9 animation with a subtle shadow falling beneath. (Not the rounded-rectangle-card default.)
- **No screen shakes, no red flashes, no green pulses.**

## Interaction Model

**Primary interaction:** *Annotating.* The student doesn't just "click options" — they mark up the canonical questions, drag insights to their workspace, and converse with the marginalia voice.

Specifically:
- **Question bank cards** support: hover-to-reveal-marginalia (related thinkers, "you might also like…"), click-to-pin (the question slides into the marginalia rail as a pinned tab), and click-on-pin to refine the wording in place.
- **Readings** support: select-to-highlight (the highlight saves to the rail with the source citation auto-attached), and "send to chamber" (the highlighted passage is offered to the AI agent as a starting point for a Socratic exchange).
- **The AI agent** never takes over the page. The student types in a small input at the bottom of the marginalia rail; the agent's response appears in the rail above, in Caveat handwriting. The student stays anchored to the main text.
- **The drafting scaffold** uses inline editing — students write directly into the structure (Question / Positions / Critical Analysis / Personal Position), and the structure remains visible as guide rails.

**Why this interaction model fits:** Marginalia is a *responsive* practice — you read first, then mark. The site preserves that order. The student is never asked to produce content from nothing; they are always responding to something on the page.

## Ludonarrative Alignment

**Mode:** Harmony. The aesthetic (marginalia, annotation, scholarly conversation) and the mechanics (selecting, refining, conversing with the agent) reinforce each other. The student *is* a scholar adding to a tradition; the site lets them act like one.

(Deliberate dissonance was considered — e.g. making the agent confrontational rather than gentle to mirror philosophical adversariality — but rejected because the dominant pedagogical risk is students disengaging, not students under-challenging themselves.)

## Material Aesthetics

Not applicable — this is a digital portal, not a physical game.

## Rendering Approach

- **Medium:** CSS + SVG, no character art needed. The aesthetic is typographic, textural, and spatial — characters would be redundant decoration.
- **Texture:** A subtle paper texture (SVG noise, very low opacity ~5%) over the `--ground` colour, baked into the body background. Not a photograph of paper — a generated noise that suggests grain without imitating it.
- **Marginalia underlines and ticks:** SVG with hand-drawn `path` data — slightly irregular, not perfectly straight. Embeds the human hand without illustration overhead.
- **Ornamental moments (very sparing):** SVG flourishes at section breaks — like a calligrapher's flourish, in `--marginalia`. ~3 in the entire site.

**Downstream skill:** None. This site does not need pixel art or illustrated characters.

**One exception:** Hero image at the very top of the welcome page — a single Imagen-generated image of an open notebook with handwritten philosophical marginalia. Generated via `/ai-media-router` in phase 4 if time permits; otherwise omitted with no loss.

## Voice Guidelines

The copy is written in the voice of an attentive senior philosopher inviting a younger thinker into the conversation. Three rules:

1. **Address the student as a fellow inquirer, not a pupil.** "You" not "students." "Your question" not "the question you choose." The student is the philosopher in this conversation; the site is the older interlocutor.
2. **Register genuine intellectual engagement, never congratulations.** Replace "Well done!" with "*That's a sharper formulation.*" Replace "Great choice!" with "*Now we're getting somewhere — but what would [other position] say to that?*" The voice acknowledges progress at the level of *thinking*, not at the level of *task completion*.
3. **Name the philosophical move, don't just gesture at it.** When a student does something philosophical, the voice names it — "*you've just made an appeal to authority — is that move legitimate here?*" — so the student builds technical vocabulary by hearing it used.

## How the aesthetic manifests in each section

- **Welcome / Intro:** A single wide page. Cream ground. A pull-quoted question in Fraunces 76px in iron ink: *"What question keeps you up at night?"* Below, three short paragraphs in Spectral. A single button in `--clarity` blue: "Begin." Optional hero image of an open notebook.
- **Explainer ("What is an Issues Study?"):** Five horizontally-scrolling notebook spreads. Each spread is one principle, in long-form (not bullet points) — an essay-quality explanation in Spectral, with key terms underlined in `--marginalia` red.
- **A-vs-C exemplar:** Two columns side-by-side, like opened pages of a book. The A response on the left in iron ink, with marginalia in red highlighting the moves. The C response on the right, dimmer (alpha 0.7), with margin notes in red showing what's missing.
- **Question bank:** A long scrolling list (segmented by key area, then by cluster). Each question rendered as a typeset line of Spectral 24px in iron ink. Hover reveals marginalia (positions, readings, counter-positions) sliding in from the right. Click pins to the rail.
- **Socratic chamber (AI agent):** Full-screen take-over. Left panel: the student's working question in Spectral 32px, editable. Right panel: the agent's transcript in Caveat 18px, in `--marginalia` red — like a teacher's annotations. Input at bottom.
- **Resources library:** A two-column reading list. Each reading shown as a small card (paper texture, slightly elevated) with title, author, one-paragraph orientation, and a "send to chamber" affordance. Click-to-open shows the reading in the active text column.
- **Drafting scaffold:** A vertical "manuscript" — the student's work-in-progress, one section at a time, with the structure visible as guide rails. Outputs to printable Markdown or DOCX.

## Anti-Default Verification

Every default deliberately replaced:

| Default | What I'm doing instead |
|---|---|
| Dark gradient background | Cream paper (`--ground` `#F4ECD8`) with subtle SVG noise texture |
| Georgia / system serif | Spectral (body) + Fraunces (display) + Caveat (marginalia) |
| Rounded rectangle cards | Square corners with hairline `--aged` borders; pinned items use a "tape" treatment, not rounded cards |
| Blue+gold / teal+amber palette | Iron ink + scholar's red + cobalt clarity (no gold anywhere) |
| Green=correct / red=wrong | Graphite tick + graphite question mark; no evaluative coding at all in question selection |
| Centered grid of cards | Asymmetric two-column with marginalia rail |
| Ascending two-note beep on correct | Pen-skritch on paper (or silence by default) |
| Descending three-note buzz on wrong | Resonant low tone of contemplation (no "wrong" in this site anyway) |
| Hover = colour shift + scale 1.05 | Hover = marginalia slides in from the rail |
| Boot → Instructions → Game → Results | Non-linear notebook navigation; first visit funneled through pedagogical sequence |
| Linear progress bar | Pinned questions accumulate in the marginalia rail (visible progress without a bar) |
| Wrong = screen shake + red flash | No wrong/right binary in question selection; redirects via gentle marginalia notes |
| "Well done!" / "Great job!" | "*That's a sharper formulation.*" / "*Now what would Singer say back?*" |
| Could swap the content for any topic? | **No.** The marginalia metaphor is specifically about *philosophy as a tradition of close reading and annotation.* It does not transfer to math, science, or language teaching. The aesthetic is inseparable from the content. |
