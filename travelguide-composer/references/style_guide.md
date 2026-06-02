# Style Guide: The 6 Core Travel Publication Styles

This guide defines the specific tone, formatting, and content patterns for each of the six custom travel guide styles. When enrichment is triggered, these definitions must be fed to the copywriter to guarantee a consistent visual and literary vibe.

---

## 1. The "Backpacker & Independent" Blueprint (Lonely Planet Style)

* **The Vibe:** Nitty-gritty, highly practical, culturally curious, raw, and budget-conscious.
* **Tone:** Informative, adventurous, respectful, straightforward.
* **Layout Structure:**
  - **Pragmatic transit callouts**: Focus heavily on how to physically transit between nodes (e.g., local buses, minivans, walking directions).
  - **Budget tiers**: Clear price points ($ / $$) and cheap eats.
  - **Transit block style**: Use standard Markdown blockquotes with explicit route logs.
* **Writing Rules:**
  - Emphasize independent exploration. Avoid luxury resorts or rigid tour groups.
  - Write details like local market haggling tips, street food safety, and off-the-beaten-path paths.

---

## 2. The "Highly Visual & Illustrated" Explorer (DK Eyewitness Style)

* **The Vibe:** Architectural, highly structured, spatial, and clean.
* **Tone:** Instructive, clear, spatial, engaging.
* **Layout Structure:**
  - **Structured Top 10 lists**: Organize sights numerically with bold ranking badges.
  - **Spatial cutaways**: Focus heavily on describing the physical structure of a room, church, or plaza before diving into history.
  - **LOBBY DIORAMAS & BUILDING SLICES**: Create numbered cutaway tables showing building sections (1. Nave, 2. Apse, 3. Crypt) paired with structural measurements (meters, tonnage, building materials).
  - **Visual boxes**: Call out specific architectural details (e.g. "The Gothic Portal", "The Romanesque Apse").
* **Writing Rules:**
  - Help the traveler mentally map the layout of a space.
  - Use coordinates, exact dimensions, and orientation-specific tips (e.g., "On the north side of the nave...").
  - **MANDATORY SOURCING**: Every embedded real photo or AI backup illustration must contain a precise, italicized source attribution line right beneath it.

---

## 3. The "Scholarly & Deep Cultural" Dossier (Blue Guides Style)

* **The Vibe:** Academic, deeply historical, uncompromisingly dense, and artistic.
* **Tone:** Formal, academic, precise, objective.
* **Layout Structure:**
  - **Exhaustive history essays**: Omit trendy cafes or tourist traps to make space for detailed historical timelines.
  - **Infographic Fact Sheets**: Integrate factual blocks detailing weights, heights, archaeological layers, and chronological markers.
  - **Art-historical analysis**: Focus on columns, paintings, local biodiversity, and regional art movements.
  - **Dossier Index boxes**: Use detailed dotted index rows showing historical markers and dates.
* **Writing Rules:**
  - Use exact historical dates, names of builders/artists, and architectural vocabulary (e.g. *chancel*, *architrave*, *lintel*).
  - Provide structured vertical cross-sections (dioramas) of historic layers (e.g. Roman foundations vs. Medieval expansion).
  - Target sophisticated, high-intellect travelers who value cultural heritage over leisure.

---

## 4. The "Boutique, Design & Minimalist" Curation (Cereal/Wallpaper* Style)

* **The Vibe:** Sophisticated, minimalist, high-end aesthetics, and hyper-curated.
* **Tone:** Poetic, soft, design-oriented, understated.
* **Layout Structure:**
  - **Matte layout feel**: Generous margins, clean typographic spacing, lots of white space.
  - **Hyper-curated entries**: List only the absolute top 2-3 design landmarks, brutalist coffee shops, or architectural masterpieces.
  - **Matte white cards**: Structured around structural lines, muted colors, and quiet luxury.
* **Writing Rules:**
  - Avoid laundry lists of sights. Highlight texture, light, shadows, and design philosophies.
  - Focus on craftsmanship, quiet boutique spaces, and fine artisan products.

---

## 5. The "Hyper-Opinionated & Curated" Mentor (Rick Steves Style)

* **The Vibe:** Warm, personal, conversational, and highly opinionated.
* **Tone:** Friendly, direct, first-person ("I guarantee...", "My advice is..."), witty.
* **Layout Structure:**
  - **Insider Tip boxes**: Sunny highlights explicitly distinguishing hidden gems from tourist traps.
  - **First-person walkthroughs**: Guide the reader by the hand step-by-step.
  - **Warning columns**: Hard-hitting sections labeled "Avoid!" to steer travelers away from overpriced traps.
* **Writing Rules:**
  - Write with a strong personal voice. Speak directly to the reader like a local uncle.
  - Pre-filter the destination ruthlessly—actively ignore major landmarks if they are overcrowded and disappointing.

---

## 6. The "Navigational Roadbook & Connoisseur" Grid (Michelin Green Style)

* **The Vibe:** Analytical, driver-focused, metric-rich, and standardized.
* **Tone:** Authoritative, systematic, concise.
* **Layout Structure:**
  - **Iconography tables**: Standardized star rating grids (🌟🌟🌟 worth a journey, 🌟🌟 worth a detour, 🌟 interesting).
  - **Driving logs**: Technical road parameters (distances in kilometers, driving durations, bypass codes).
  - **Metric boxes**: Bold, red navigation highlights and structured coordinates.
* **Writing Rules:**
  - Keep sentences short, concise, and focused on navigation, bypasses, parking, and logistics.
  - Use highly consistent structural headers and rating tiers for all entries.

---

## 7. Designing Premium Enhancements (Theme Alignment)

To ensure maximum visual cohesion, format the new premium additions according to the active theme guidelines:

### A. Itinerary Pacing & Energy Tiers
* **Boutique / Minimalist**: Place a small, thin capitalized tag right under the day header:
  `*Day 1 / Pacing: Quiet & Sensory / Energy: Low (Stroller Accessible)*`
* **Roadbook / Connoisseur**: Use structured metric lines:
  `- **Pacing Rating**: [★★☆ Moderate Explorer]`
  `- **Steps Count Target**: [8,500 Steps / +120m Gain]`

### B. One-Click Mobile Navigators
* Always format the link using clean, clickable Markdown containing destination markers:
  `[🗺️ Open Route: Piazza Signoria to Santo Spirito](https://www.google.com/maps/dir/?api=1&origin=Piazza+Signoria,Florence&destination=Santo+Spirito,Florence&travelmode=walking)`

### C. Local Etiquettes & Unwritten Rules
* **Opinionated / Uncle Rick**: Render as a friendly hand-drawn card:
  `> **Uncle's Tip on Dining Fees:** In Venice, stand at the counter for espresso. If you sit, they add a €4 sitting fee!`
* **Backpacker / Independent**: Use bold inline blocks:
  `* **Local Custom**: Haggle at outer markets, but never in retail boutiques. Tips are not expected but rounding up change is polite.*`

### D. Sensory Moodboard
* **Scholarly / Academic**: Suggest historical novels or deep regional essays:
  `* **Literature Connection**: Read E.M. Forster's *A Room with a View* before walking the Piazza Signoria.*`
* **Boutique / Design**: Suggest contemporary ambient or acoustic tones:
  `* **Atmospheric Soundtrack**: Play *Ludovico Einaudi - In a Time Lapse* during late-afternoon walks.*`

### E. Weather & Packing Grid
* Format as a clean, standardized Markdown grid at the very beginning of the guide:
  ```markdown
  ### 🌡️ Seasonal Climate & Gear Checklist: October
  | High/Low Temp | Rainy Days | Mandatory Packing Items |
  | :--- | :--- | :--- |
  | 21°C / 11°C | 7 Days | Leather sneakers, packable raincoat, umbrella, light scarf. |
  ```
