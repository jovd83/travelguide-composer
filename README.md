# travelguide-composer

[![AgentSkill](https://img.shields.io/badge/AgentSkill-1.0.0-blue)](https://github.com/jovd83/travelguide-composer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-Compatible-brightgreen)](https://claude.ai/code)
[![Companion: travelguide-copywriting-skill](https://img.shields.io/badge/Companion-travelguide--copywriter-orange)](https://github.com/jovd83/travelguide-copywriting-skill)
[![Eval: 100%](https://img.shields.io/badge/Eval-100%25%20pass-success)](travelguide-composer/evals/evals.json)
[![Format: DOCX+HTML](https://img.shields.io/badge/Output-DOCX%20%7C%20HTML%20%7C%20PDF-informational)]()

**Structure & completeness orchestrator for premium travel guides and roadbooks.**

Parses existing travel itineraries (`.md`, `.docx`, `.xlsx`, `.pdf`), builds a numbered Gap Catalogue, delegates all prose writing to the `travelguide-copywriting-skill` companion skill, and compiles the result into a print-ready DOCX roadbook or interactive HTML guide — in six publication styles, with photos, Leaflet maps, and a climate table.

## What it does

1. **Ingests** your source itinerary in any format
2. **Catalogues** every structural gap: empty meals, bare URLs, missing activities, absent pacing labels, no etiquette tips — numbered `[GAP-01]`, `[GAP-02]`...
3. **Delegates** each gap to `travelguide-copywriting-skill` with a typed invocation payload (`task/location/lang/style/scope`)
4. **Verifies** structural completeness per day (Algemeen → Hotel → Maaltijden → Gereserveerde activiteiten → Dagindeling)
5. **Compiles** to DOCX (with TOC, page numbers, A4 Calibri fonts) or HTML (with Leaflet maps)

## Six publication styles

| Code | Style | Inspiration |
|------|-------|-------------|
| `backpacker` | Raw, transit-heavy, budget | Lonely Planet |
| `visual` | Structural, Top 10, cutaways | DK Eyewitness |
| `scholarly` | Academic, historical, dense | Blue Guides |
| `boutique` | Minimalist, white space, curated | Cereal / Wallpaper* |
| `opinionated` | Warm, first-person, pre-filtered | Rick Steves |
| `roadbook` | Analytical, metric-rich, driver-focused | Michelin Green |

## Requirements

- Claude Code (claude-sonnet-4-6 or later)
- `travelguide-copywriting-skill` companion skill installed
- Node.js v18+ with `docx` npm package (for DOCX output)
- Python 3.10+ (for HTML compilation and parsing)

## Installation

Download the latest `.skill` file from [GitHub Releases](https://github.com/jovd83/travelguide-composer/releases) and install it in your Claude Code skills directory.

## Usage

Trigger the skill by sharing an itinerary file with a request like:

> *"Turn this Word doc itinerary into a Michelin Green roadbook DOCX. Family of 3, vegan, interests: nature and theme parks."*

> *"Enrich this markdown travel plan and output as Boutique HTML. Ages: couple 40s, gluten-free."*

The skill will ask clarifying questions (style, format, demographics) before proceeding.
