# Marginalia — SACE Stage 1 Philosophy Issues Study

A polished portal for Year 11 Philosophy students working on the Issues Study (Assessment Type 3, 800 words / 5 min / multimodal). Static site + Netlify Function calling Vertex AI.

## What this is

| Page | Purpose |
|---|---|
| `index.html` | Welcome — sets the intellectual stakes |
| `explainer.html` | What is an Issues Study? Five principles + A-vs-C exemplar comparison |
| `bank.html` | 117 philosophical questions, filterable by key area + difficulty + search; pin to revisit |
| `chamber.html` | Socratic AI agent — refines vague intuitions into tight philosophical questions. Never writes for the student. |
| `resources.html` | The cached readings library, with chamber links |
| `drafting.html` | Five-section drafting scaffold with word count + Markdown export |

Aesthetic identity: **Marginalia** — philosophy as a 2,500-year tradition of writing in the margins of texts. See `_design/02-aesthetic-brief.md`.

Pedagogical brief, aesthetic brief, and cache-rebuild instructions all live in `_design/`.

## Architecture

```
Browser  ──HTTPS──▶  Netlify (static + Function)  ──REST──▶  Vertex AI (us-central1)
                                  │                              │
                                  │                              ├── cachedContent (when pack cache exists)
                                  └── reads data/cache-state.json
```

The site is purely static HTML/CSS/JS. The only server-side code is `netlify/functions/chat.js`, which:
1. Authenticates with GCP using a service account JSON in env var
2. Calls Vertex AI's generateContent endpoint
3. Uses `cachedContent` when the requested pack has a valid cache name in `data/cache-state.json`
4. Falls back to system-prompt-only generation when no cache is available
5. Always enforces the Socratic system prompt (never writes the essay)

## File tree

```
website/
├── index.html            ← welcome
├── explainer.html        ← assignment explainer + A/C exemplars
├── bank.html             ← question bank with filters & pins
├── chamber.html          ← Socratic AI chat interface
├── resources.html        ← cached readings library
├── drafting.html         ← drafting scaffold with word count
├── shared/
│   ├── tokens.css        ← design tokens (Marginalia palette + 8px grid + Perfect Fourth scale)
│   ├── marginalia.css    ← shared component styles
│   └── pins.js           ← session-storage pinned-question state
├── data/
│   ├── questions.json    ← 117 questions across 20 clusters
│   └── cache-state.json  ← pack-id → Vertex cache resource name mapping
├── netlify/
│   └── functions/
│       └── chat.js       ← Vertex AI proxy (the only server-side code)
├── netlify.toml          ← deployment config
├── package.json          ← google-auth-library dep
├── .gitignore
├── _design/              ← briefs (not deployed but committed)
│   ├── 01-pedagogical-brief.md
│   ├── 02-aesthetic-brief.md
│   └── 03-cache-rebuild-instructions.md
└── README.md             ← this file
```

## Local development

```bash
npm install
netlify dev          # starts local server with functions on http://localhost:8888
```

You'll need `netlify-cli` installed globally (`npm i -g netlify-cli`) and the same env vars set locally (see below).

## Environment variables (set in Netlify site settings)

| Var | Required | Default | Notes |
|---|---|---|---|
| `GCP_SERVICE_ACCOUNT_JSON` | yes | — | Full JSON of a Vertex-AI-enabled service account in project `gen-lang-client-0274569601`. Single string, contents of the key file. |
| `GCP_PROJECT_ID` | no | `gen-lang-client-0274569601` | Override only if using a different project |
| `GCP_LOCATION` | no | `us-central1` | Caches are tied to the location they were built in |
| `GEMINI_MODEL` | no | `gemini-2.5-flash` | Cheaper than 2.5-pro for chat. Use `gemini-2.5-pro` for richer responses if budget allows. |

To set the service account JSON in Netlify:
1. Site settings → Environment variables → Add variable
2. Key: `GCP_SERVICE_ACCOUNT_JSON`
3. Value: paste the entire contents of your service-account.json file as a single string

Or via Netlify CLI:
```bash
netlify env:set GCP_SERVICE_ACCOUNT_JSON "$(cat /path/to/service-account.json)"
```

## Cache state

`data/cache-state.json` holds the live Vertex AI cache resource names keyed by pack ID. Two caches are currently built (virtue/compassion, aesthetics) and three are pending. See `_design/03-cache-rebuild-instructions.md` for how to build the remaining caches.

When a pack's `cache_name` is `null`, the chat function still works — it falls back to system-prompt-only generation. The conversation quality is slightly lower but the agent still functions.

When you rebuild a cache, update `data/cache-state.json` with the new `cache_name`, commit, and Netlify auto-redeploys.

## Deployment

The site deploys via GitHub → Netlify. See `_DEPLOYMENT_PROMPT.md` (in the parent folder) for the autonomous prompt that wires this up end-to-end.

## Why Netlify (not GitHub Pages)

- GitHub Pages is static-only — no serverless functions. The Vertex AI proxy needs server-side execution to keep the GCP credentials secret.
- Netlify provides static hosting AND serverless functions in one platform.
- Per the user: students at school cannot access github.io domains, but can access netlify.app.

## Pedagogical commitments encoded in the code

- The Socratic system prompt in `chat.js` explicitly forbids the agent from writing the essay or generating questions for the student.
- The question bank requires every entry to be phrased as a *question* (not a topic) — this is the single most impactful move per SACE's 2025 assessment advice.
- The drafting scaffold structures the work in the order the assessment expects: question → multiple positions → critical analysis → defended position → sources.
- The A-vs-C exemplar comparison surfaces the difference between description and analysis up front.

See `_design/01-pedagogical-brief.md` for the full mapping of site sections to SACE Stage 1 Philosophy performance standards.
