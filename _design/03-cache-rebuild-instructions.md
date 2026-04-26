# Cache Rebuild Instructions

## Current state (2026-04-27 final)

| Pack | Status | Cache name | Tokens | Files |
|---|---|---|---|---|
| `stage1_virtue_compassion` | ✅ BUILT | `projects/167911956198/locations/us-central1/cachedContents/593140240617570304` | 1,426 | 2 PDFs |
| `stage1_aesthetics` | ✅ BUILT | `projects/167911956198/locations/us-central1/cachedContents/853223119098216448` | 2,186 | 2 PDFs |
| `stage1_religion_ethics` | ❌ FAILED | — | — | 3 Haidt PDFs exceed inline data-size limit |
| `stage1_existentialism` | ❌ FAILED | — | — | .docx mimetype rejected |
| `stage1_mind_simulation` | ❌ FAILED | — | — | PPTX + PDFs exceed inline data-size limit |

The two built caches expire 70 days from build (~early July 2026). The state file at `unit_corpus_state.json` (auto-written next to `unit_corpus.json`) holds their cache names.

The site is wired so the AI agent uses these caches when available and falls back to system-prompt-only mode for topics where the cache build failed. **No site code changes are needed when the remaining caches are built** — the function reads the state file at request time.

---

## Failure mode 1: .docx mimetype (`stage1_existentialism`)

**Error:** `Unable to submit request because it has a mimeType parameter with value application/octet-stream`

**Cause:** Vertex AI cache API doesn't accept .docx files as inline content. Several of the existentialism readings are .docx (Sartre.docx, Existentialism Four Thinkers.docx, Simone de Beauvoir.docx, Albert Camus.docx).

**Fix:** Convert each .docx to PDF first.

PowerShell snippet (run from the Issues Study folder):

```powershell
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$docs = @(
    "Unit 4 - Issues Study\Sartre.docx",
    "Unit 4 - Issues Study\Existentialism Four Thinkers.docx",
    "Unit 4 - Issues Study\Simone de Beauvoir.docx",
    "Unit 4 - Issues Study\Albert Camus.docx",
    "Unit 4 - Issues Study\Dualism.docx",
    "Unit 4 - Issues Study\Problems for Identity Theory.docx"
)
foreach ($doc in $docs) {
    $full = Resolve-Path $doc
    $pdf = [System.IO.Path]::ChangeExtension($full, ".pdf")
    $d = $word.Documents.Open($full.Path)
    $d.SaveAs([ref]$pdf, [ref]17)  # 17 = wdFormatPDF
    $d.Close()
    Write-Host "Converted: $doc"
}
$word.Quit()
```

Then update `unit_corpus.json` — change each `.docx` extension to `.pdf` in the `files` arrays for `stage1_existentialism` and `stage1_mind_simulation`. Re-run `cache_unit_pack` for those two packs.

---

## Failure mode 2: Data size limit (`stage1_religion_ethics`, `stage1_mind_simulation`)

**Error:** `The cached content exceeds the data size limit. Please upload the cached content to GCS and specify via file_uri in Part.`

**Cause:** Vertex inline content has a ~20MB request limit. Three Haidt PDFs combined exceed it; PPTX files for mind_simulation are large too.

**Two fixes:**

### Fix A (recommended): split the packs

Smaller packs avoid the limit. Edit `unit_corpus.json`:

For `stage1_religion_ethics` — split into two packs:
- `stage1_religion_haidt_short`: just `Haidt on Religion BARE MINIMUM.pdf` (use for entry-level questions)
- `stage1_religion_haidt_full`: just `Haidt on Religion.pdf` (use for standard/ambitious questions)

(Drop the "MORE THAT MINIMUM" version — it's almost certainly redundant.)

For `stage1_mind_simulation` — split into:
- `stage1_mind_identity`: `Identity Theory and Functionalism.pdf` + `Problems for Identity Theory.pdf` only (drop .docx, drop PPTX)
- `stage1_mind_simulation_only`: `Simulation Theory.pptx` + `What is a Human Being.pptx` only (these are smaller alone)

### Fix B: upload to GCS first

Modify the MCP server at `C:\Users\Peter Ellis\.mcp-servers\ai-image\server.py` so `cache_unit_pack` uploads files to a GCS bucket and passes `file_uri` instead of inline `Part` data. Requires a GCS bucket in your `gen-lang-client-0274569601` project. More work but no pack-splitting needed.

---

## Reusable Stage 2 caches (no rebuild needed)

These are **live** in your Stage 2 corpus and queryable by the Netlify Function via `corpus_path`:

| Pack | Corpus path | Useful for |
|---|---|---|
| `lab_applied_normative_ethics` | `C:/Users/Peter Ellis/OneDrive/Teaching/2026/12PHIL - 2026/Issues Study/Issues_Study_Lab/unit_corpus_state.json` | Personhood, abortion, animal ethics |
| `lab_q005` | Same | Phil-of-mind questions (advanced) |

The Netlify Function in this site is wired to recognise both corpora when the `corpus` parameter is sent in the chat request.

---

## What needs to happen and how much it costs

| Action | Cost | Time |
|---|---|---|
| Convert 6 .docx files to PDF (PowerShell snippet above) | $0 | 2 min |
| Edit unit_corpus.json to split religion + mind packs | $0 | 5 min |
| Re-run `cache_unit_pack` for: existentialism, religion_haidt_short, religion_haidt_full, mind_identity, mind_simulation_only | ~$1.50 in Vertex spend | 2 min |
| **Total** | **~$1.50** | **~10 min** |

After completion, the agent has full coverage of all Stage 1 readings.
