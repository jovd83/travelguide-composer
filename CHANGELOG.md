# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

### Changed

### Fixed

### Removed


The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-02

### Added
- Initial release of travelguide-composer skill
- Orchestrator-first architecture: composer delegates all prose writing to `travelguide-copywriter` skill
- Phase 1-10 execution workflow: preference alignment → parse → gap catalogue → URL scraping → photo sourcing → copywriter invocation → completeness check → map embedding → document-level elements → compile
- Explicit numbered Gap Catalogue output (`[GAP-01]`, `[GAP-02]`...) as a discrete artifact before enrichment
- Typed copywriter invocation contract: `task/location/lang/style/scope/ages/dietary/interests/source_facts/photo_context`
- Per-day DOCX template: Algemeen table → Hotel block → Maaltijden (3 slots) → Gereserveerde activiteiten → Dagindeling
- Bundled `generate_docx.js` script using `docx` npm package — produces A4 Calibri DOCX with TOC, page numbers, photo embedding
- Dutch language support: detects Dutch input and preserves language through all enrichment
- Dutch meal gap detection: `Ontbijt:`, `Lunch:`, `Diner:` with empty value recognized as dining gaps
- Six CSS theme support: backpacker, visual, scholarly, boutique, opinionated, roadbook
- HTML output with interactive Leaflet OpenStreetMap embeds
- Photo sourcing with mandatory Wikimedia/Unsplash attribution
- Climate & timezone summary table at document end
- Multi-format parser: `.md`, `.docx`, `.xlsx`, `.pdf` source support
- Gap type table: dining picks, sight essays, activity suggestions, pacing labels, etiquette tips, sensory moodboards, weather grids
