---
name: travelguide-composer
description: "Enrich and compile an existing travel itinerary into a premium travel guide or roadbook. Trigger this skill whenever a user shares or pastes a travel plan, trip schedule, or itinerary — in any format (Word .docx, Excel .xlsx, PDF, markdown, or plain text) — and wants to: fill gaps (empty meals, bare URLs, missing activity descriptions), add restaurant recommendations, produce a styled output document, or choose a publication style (Michelin Green roadbook, Rick Steves opinionated, Boutique minimalist, DK Eyewitness visual, Lonely Planet backpacker, or Blue Guides scholarly). Also trigger for phrases like 'make this itinerary nicer', 'enrich my travel plan', 'turn my trip notes into a proper guide', 'I have a holiday itinerary and want a roadbook', or any time an itinerary file is uploaded and the user wants it improved or styled. This skill orchestrates structure and completeness — it delegates prose writing to the travelguide-copywriting-skill companion skill."
---

# Travelguide Composer — Structure & Completeness Orchestrator

**Primary responsibility**: Ensure every day block in the travel guide is structurally complete and all content gaps are filled by the `travelguide-copywriting-skill` skill. This skill writes NO prose itself. It detects, packages, delegates, stitches, and compiles.

---

## Role Separation

| This skill (composer) | Sibling skill (copywriter) |
|---|---|
| Parse input itinerary | Write restaurant descriptions |
| Detect structural gaps | Write sight/landmark essays |
| Build the day template scaffold | Write etiquette & cultural tips |
| Package gap → copywriter invocation | Write sensory moodboards |
| Stitch prose back into template | Write pacing narratives |
| Source & embed photos | Produce live-verified dining picks |
| Compile to DOCX / HTML | Apply style voice (Boutique, Rick Steves, etc.) |

**Rule**: If you find yourself writing a paragraph of travel prose, stop. That belongs to the copywriter. Your job is to make sure the structure is complete and every slot is filled.

---

## Execution Workflow

### Phase 1 — Preference Alignment

Collect exactly these parameters before starting:

1. **Style** — choose one of six:
   - `backpacker` — Lonely Planet: raw, transit-heavy, budget.
   - `visual` — DK Eyewitness: structured, architectural cutaways, Top 10.
   - `scholarly` — Blue Guides: academic, historical, dense.
   - `boutique` — Cereal/Wallpaper*: minimalist grids, white space, curated.
   - `opinionated` — Rick Steves: warm, first-person, pre-filtered gems.
   - `roadbook` — Michelin Green: analytical, driver-focused, metric-rich.

2. **Output format**:
   - **DOCX** — recommended for print-ready roadbooks (Michelin/traditional planning style).
   - **HTML** — recommended for interactive digital sharing with live maps.
   - **PDF** — generate HTML first, then print-to-PDF with background graphics.

3. **Demographics**:
   - `ages`: Traveler ages (toddlers, seniors, teenagers, active adults).
   - `dietary_needs`: Food restrictions (vegan, gluten-free, celiac, allergies, none).
   - `interests`: Sight preferences (history, culinary, adventure, photography, relaxation).

4. **Language**: Detect from source itinerary. Preserve it throughout. If source is Dutch, all enriched sections must be written in Dutch — pass `lang: nl` to every copywriter invocation.

---

### Phase 2 — Parse and Index the Itinerary

Run the parser to serialize the source file to Markdown:
```powershell
python ./scripts/parse_itinerary.py --file "<source_path>" --output "./scratch/itinerary_parsed.md"
```

Supported source formats: `.md`, `.docx`, `.xlsx`, `.pdf`.

**CRITICAL**: Never overwrite the source file. If the user chose the same format as their source, produce `[Filename]_Enriched.[ext]`.

After parsing, **build the Day Index** — a structured catalogue of every day block. Each entry records:
- Day number and title
- Date, origin, destination, timezone (if present)
- Hotel name and address (if present)
- Status of each meal slot: `empty` / `filled`
- List of activity/sight items: for each, flag as `raw_url` / `name_only` / `enriched`
- Missing premium blocks: pacing label, maps, etiquette, moodboard, packing grid

The Day Index drives everything that follows. Treat a section as "filled" only if it contains actual content (restaurant name, description, address) — not just a placeholder like `/` or a bare URL.

---

### Phase 3 — Gap Catalogue

Read [gap_detection_guide.md](./references/gap_detection_guide.md) for the full detection ruleset. The canonical gap types are:

| Gap type | Detection pattern | Copywriter task |
|---|---|---|
| **Empty meal slot** | `Ontbijt:`, `Lunch:`, `Diner:`, `Breakfast:`, `Dinner:` followed by nothing or `/` | `task: dining_pick` |
| **Bare URL** | Any `http://` or `https://` URL on its own line or as a link title | `task: sight_essay` after scraping URL |
| **Name-only sight** | A landmark/restaurant name with no description | `task: sight_essay` |
| **Empty afternoon/day** | Lines like "Free time", "Rust", blank day block | `task: activity_suggestion` |
| **Missing pacing label** | Day header has no Energy/Pacing line | `task: pacing_label` |
| **Missing etiquette** | No "Local Handshake" block for the destination | `task: etiquette_tips` |
| **Missing moodboard** | No listening/cinema recommendation for the destination | `task: sensory_moodboard` |
| **Missing weather grid** | No climate/packing table at document start | `task: weather_grid` |

Produce a **Gap List** as a numbered catalogue before doing any enrichment. Each entry:
```
[GAP-01] Day 2 / Lunch / empty → task: dining_pick / location: Florence, Oltrarno / diet: vegan, gluten-free
[GAP-02] Day 1 / Universal Studios URL → task: sight_essay / source: https://www.universalorlando.com/...
[GAP-03] Day 3 / Pacing label missing → task: pacing_label / destination: Crystal River, FL
```

Show the Gap List to the user. For long itineraries (> 10 days), summarize counts by type.

---

### Phase 4 — URL Scraping (Primary Source of Truth)

For every `raw_url` gap, fetch the URL content **before** calling the copywriter:
- Use `WebFetch` or web search targeting the specific domain.
- Extract: opening times, prices, historical facts, official safety notes, coordinates.
- Store scraped facts as the `source_facts` payload attached to the copywriter invocation.
- **If scraping is blocked** (403 / permission denied): note this in the gap entry and instruct the copywriter to rely on verified knowledge for that destination.

---

### Phase 5 — Photo Sourcing

For each day section, source a minimum of 1 real photo before invoking the copywriter:
- Search Wikimedia Commons, Unsplash, Pexels, or official tourism bureau photos.
- **MANDATORY**: Record the exact source URL, photographer name, and license (CC-BY, CC-BY-SA, etc.).
- **For DOCX output**: Download the image file to `./scratch/photos/day_N_[landmark].jpg` — embed actual bytes, not remote URLs, so the DOCX is self-contained.
- **For HTML output**: Use the remote URL directly; the Markdown compiler will render it.
- If no real photo is found after search, note the fallback AI-generation option but do NOT generate inline — that is a content decision passed to the copywriter invocation context.
- Photo caption format: `![Caption (Source: Photographer / License)](path_or_url)`

---

### Phase 6 — Invoke the Copywriter (One Gap at a Time)

For each entry in the Gap Catalogue, invoke the `travelguide-copywriting-skill` skill with a precise, self-contained payload. **Do not write any prose yourself** — your job here is to package the invocation correctly.

**Invocation payload template:**
```markdown
Run the travelguide-copywriting-skill playbook with these parameters:
- task: [dining_pick | sight_essay | activity_suggestion | pacing_label | etiquette_tips | sensory_moodboard | weather_grid]
- location: [City, Region, Country] or [lat, lon]
- lang: [nl | en | fr | de | ...]
- style: [backpacker | visual | scholarly | boutique | opinionated | roadbook]
- scope: [one paragraph | two paragraphs | full section | brief label]
- ages: [e.g., "2 adults 35-40, 1 teenager 15"]
- dietary_needs: [e.g., "vegan, gluten-free"]
- interests: [e.g., "theme parks, wildlife, nature"]
- source_facts: [paste scraped URL content here, or "none — use verified knowledge"]
- photo_context: [caption and path of the day's sourced photo, or "none"]
```

**Task-specific scope guidance:**
- `dining_pick`: "one recommendation with name, address, hours, why it fits the demographics" — do not ask for a full section.
- `sight_essay`: "two paragraphs covering history, what to see, practical tip" — do not ask for logistics table.
- `pacing_label`: "one line: Pacing rating and Energy tier" — brief label only.
- `etiquette_tips`: "2-3 rules, formatted as a blockquote or tip box" — concise.
- `sensory_moodboard`: "one listening pick + one film/book pick with 1-sentence explanation each".
- `weather_grid`: "Markdown table: month, high/low temp, rainy days, packing essentials".

Invoke the copywriter sequentially, one gap at a time. After each invocation:
1. Receive the returned prose.
2. Splice it into `./scratch/itinerary_parsed.md` at the correct position, replacing the gap placeholder.
3. Mark the gap as resolved in the Gap Catalogue.

---

### Phase 7 — Structural Completeness Check

After all copywriter invocations, run a completeness check against the **Day Index**. Every day block MUST have:

| Field | Required? | Notes |
|---|---|---|
| Day header (H2) | ✓ | Format: `## Dag N: City/Activity` or `## Day N: City/Activity` |
| Algemeen / General table | ✓ | Date, From/To or Location, Timezone |
| Hotel block | ✓ if traveling | Name + full street address + city + postal code |
| Meal slots (3×) | ✓ | All three non-empty |
| Gereserveerde activiteiten | ✓ | Confirmed bookings or `/` if none |
| Dagindeling / Daily Schedule | ✓ | Narrative schedule with at least one photo embedded |
| Pacing label | ✓ | e.g., `★★★ High-Intensity / Energy: Active` |

Flag any field still missing and trigger one more copywriter call to fill it before proceeding.

---

### Phase 8 — Map and Navigation Embedding

For each day, embed navigation anchors:

**Interactive map** (HTML output):
```markdown
[MAP: lat=<latitude>, lon=<longitude>, zoom=<12-16>, label=<POI Name>]
```
The HTML compiler replaces this with a live Leaflet OpenStreetMap box.

**Route link** (all formats):
```markdown
[🗺️ Route: Hotel → First Stop](https://www.google.com/maps/dir/?api=1&origin=<Hotel+Address>&destination=<POI>&travelmode=driving)
```

For DOCX, replace `[MAP: ...]` tags with a static thumbnail note or omit (Leaflet is HTML-only).

---

### Phase 9 — Document-Level Elements

Add these once at document level (not per day):

1. **Climate & Timezone Summary Table** — at document end (or beginning for roadbook style):
   ```markdown
   | Van | Tot | Plaats | Tijdzone | Min °C | Max °C |
   |-----|-----|--------|----------|--------|--------|
   | 03/aug | 05/aug | Orlando | EDT -6u | 24 | 33 |
   ```
   Populate from the Day Index dates and a weather search for the travel month.

2. **Traveler Profile Block** — brief summary of demographics/style chosen, for reference.

---

### Phase 10 — Compile and Style Output

**For HTML:**
```powershell
python ./scripts/generate_outputs.py --markdown "./scratch/itinerary_parsed.md" --theme <style> --format html --output "<output_path>" --assets-dir "./assets"
```

**For DOCX (professional roadbook quality):**
Use the `docx` npm package via the bundled script. Reference the docx skill (`C:\Users\jochi\.agents\skills\docx\SKILL.md`) for the full API:
```powershell
node ./scripts/generate_docx.js --markdown "./scratch/itinerary_parsed.md" --output "<output_path>.docx" --lang <nl|en>
```

The `generate_docx.js` script produces:
- Title page (trip name, dates, destination)
- Table of Contents (auto-generated from H1/H2 headings)
- Page numbers in footer
- Per-day blocks using the day template (Algemeen table, Hotel block, Maaltijden list, etc.)
- Embedded photos at 14.5cm width (A4 fit)
- Climate table at end
- A4 page size, Calibri 11pt body, green day headers matching Michelin roadbook aesthetic

**DOCX package installation** (if not present):
```powershell
cd ./travelguide-composer && npm install docx
```

---

## Day Template Reference

This is the canonical per-day structure for BOTH the enriched Markdown and the DOCX output:

```markdown
## Dag N: [City / Activity title]

- **Pacing Rating:** ★☆☆ / ★★☆ / ★★★ [Label]
- **Energy Tier:** Low / Moderate / High

### Algemeen
| Datum | Weekdag DD-MM-YYYY |
| Van / Plaats | Origin or current location |
| Naar | Destination (omit if staying) |
| Tijdzone | e.g., EDT / UTC -4u / Brussel -6u |

### Hotel
[Hotel Name]
[Street Address]
[City, State/Country PostalCode]

### Maaltijden
- **Ontbijt**: [Restaurant name, address, brief description from copywriter]
- **Lunch**: [Restaurant name, address, brief description from copywriter]
- **Diner**: [Restaurant name, address, brief description from copywriter]

### Gereserveerde activiteiten
[Confirmed bookings with times, or /]

### Dagindeling
[Narrative schedule — sourced from copywriter invocations]

![Photo caption (Source: photographer / license)](./scratch/photos/day_N_landmark.jpg)

[🗺️ Route link]
[MAP: lat=..., lon=..., zoom=14, label=...]

> **Etiquette tip** — [sourced from copywriter]

🎵 *Listen:* [Music recommendation from copywriter]
🎬 *Watch/Read:* [Film or book from copywriter]
```

---

## Troubleshooting

| Issue | Root Cause | Fix |
|---|---|---|
| Copywriter not invoked | Composer wrote prose directly | Refactor: extract prose to a copywriter call; paste the payload template from Phase 6 |
| DOCX has no TOC or photos | Using `generate_outputs.py` DOCX path (basic python-docx) | Use `node ./scripts/generate_docx.js` instead — see Phase 10 |
| Dutch meal gaps not detected | Pattern `Ontbijt: ` (empty) not recognized | Scan for `^(Ontbijt\|Lunch\|Diner\|Breakfast\|Dinner):\s*$` — always a dining gap |
| Copywriter returns too much text | Scope not specified in invocation | Add explicit `scope: one paragraph` or `scope: brief label` to the payload |
| Photo not embedded in DOCX | Using remote URL instead of local file | Download to `./scratch/photos/` first; pass local path to `ImageRun` in generate_docx.js |
| Excel parse fails | Corrupted or legacy `.xls` format | Export to CSV or `.md` and re-run parser |
| Sibling skill not found by agent | Agent can't locate the copywriter SKILL.md path | Point agent to: `C:\Users\jochi\.agents\skills\travelguide-copywriting-skill\SKILL.md` |
