# Output Generation & Compilation Guide

This guide outlines how the orchestrator handles final file formats (.docx, .pdf, and dynamic HTML) and maintains the strict rule of never overwriting the user's source files.

---

## 1. Source-File Safety & Non-Overwriting Rules

* **CRITICAL POLICY**: Never directly overwrite or perform in-place edits on the user's input itinerary files.
* **Workflow**:
  1. Determine the path and format of the source itinerary (e.g., `Itinerary.pdf`).
  2. If the user requests the enriched output in the *same* format, make a complete standalone copy (e.g., `Itinerary_Enriched.pdf` or `Itinerary_Compiled.docx`) in the same directory.
  3. Perform all editing, writing, and generation on the *copied* file.
  4. Always present the path of the new output file clearly to the user.

---

## 2. Dynamic HTML Generation (Default Premium Output)

Dynamic HTML provides the richest, most immersive experience. When generating HTML:
1. **Apply CSS Themes**: Link or inline the chosen CSS file inside the HTML header:
   - `backpacker.css`
   - `visual.css`
   - `scholarly.css`
   - `boutique.css`
   - `opinionated.css`
   - `roadbook.css`
2. **Structural Components**: Translate the Markdown sections into clean HTML structural elements:
   - Use standard `<table class="logistics-table">` for tabular roadbook grids.
   - Use `<div class="insider-tip">` and `<div class="tourist-trap-warning">` for callouts.
   - Use `<div class="architectural-box">` for structured sections.
3. **Photos & Visual Image Cards**: Standard Markdown images `![alt](url)` compile into a `<div class="visual-image-card">` containing the `<img>` and a center-aligned `style="font-style:italic;"` caption beneath the image frame.
4. **Interactive Leaflet Maps**:
   - Leaflet Map triggers (e.g. `[MAP: lat=43.7696, lon=11.2558, label=Piazza Santo Spirito]`) generate an interactive OpenStreetMap canvas powered by Leaflet.js.
   - It automatically loads the Leaflet CDN stylesheets and scripts, hooks a listener to check for Leaflet readiness, maps the coordinates, and places an interactive marker popup with the POI label.
5. **Mobile & Print Friendly**: Verify the viewport is set to `width=device-width, initial-scale=1.0` so that the roadbook is responsive and perfectly legible on travelers' mobile screens.

---

## 3. Word Document (.docx) Compilation

When compiling to Word:
1. **Library Verification**: Check if the `python-docx` library is present in the Python environment.
2. **Styling Mapping**:
   - Map Markdown `#` headers to Heading 1 (centered, bold, dark green or blue depending on theme).
   - Map `##` headers to Heading 2.
   - Use standard styled bullet-point paragraphs (`style='List Bullet'`) for list items.
3. **Graceful Fallback**: If `python-docx` is not available, compile the final text to clean Markdown and save it with a `.docx` extension or write a clear RTF file, notifying the traveler of the library limitation and providing a conversion command (e.g., `pandoc input.md -o output.docx`).

---

## 4. PDF Generation & Conversions

When compiling to PDF:
1. **Compilation Pipeline**: First compile the enriched markdown to a styled, single-page dynamic HTML file.
2. **Conversion Mechanics**:
   - Propose using command-line converters like `weasyprint` or `pandoc` with a pdf engine if available.
   - **Alternative**: Save the premium dynamic HTML and instruct the traveler: *"To get a perfectly formatted, print-ready PDF, open the generated HTML file in your web browser and choose 'Print to PDF' with background graphics enabled."* This ensures a zero-dependency, bulletproof export loop that guarantees flawless visual fidelity!
