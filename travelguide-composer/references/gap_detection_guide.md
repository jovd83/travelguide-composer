# Gap Detection & Orchestration Guide

This guide outlines the systematic procedure for finding content gaps in itineraries and orchestrating modular calls to the sibling `travelguide-copywriting-skill` skill for individual segment enrichment.

---

## 1. What Qualifies as a "Gap"?

When scanning the ingested itinerary representation, the orchestrator catalog must flag:
1. **Textless & Under-enriched Links**:
   - Matches: `[http://...]` or `[Website](http://...)` or raw URLs, as well as links that have simple one-liner descriptions.
   - Action: Retrieve the URL contents first. Treat this scraped data as the primary source of truth, and **always invoke the copywriting worker to build a rich, 2-3 paragraph historical/architectural travel essay for each site**.
2. **Missing & Incomplete Meals (Culinary Multiplicity)**:
   - Matches: Days lacking complete dining profiles. Travelers eat multiple times a day:
     - **Ontbijt (Breakfast)**: Standard hotel buffets or local morning street eats (e.g. Kaya Toast, Dim Sum).
     - **Lunch**: Healthy mid-day sit-downs or temple canteens.
     - **Diner**: Premium local dining, night markets, or waterfront tables.
     - **Koffiepauze / Snacks**: Artisanal cafes, local ice creams, or tea garden stops.
   - Action: Automatically populate all four daily dining nodes with physical addresses, operating hours, prices, and live-verified reviews.
3. **Under-enriched Sights & Activities**:
   - Matches: Any named sight, landmark, or walking route listed in the itinerary (e.g. *KLCC Park*, *Batu Caves*, *Jonker Street*).
   - Action: Flag these as primary copywriting gaps. Do not leave them as simple lists or bare links. Call the `travelguide-copywriting-skill` skill playbooks to write highly sensory, visually detailed essays containing dimensions, diorama tables, and routing guidelines.
4. **Empty Timeframes**:
   - Matches: Statements like *"Afternoon: Free time"*, *"Explore Rome on your own"*, or *"Rest of the day free"*.
   - Action: Mine safe hikes, scenic walking routes, or visual landmarks matching traveler ages and interests.
5. **Missing Premium Enhancements**:
   - Matches: Itineraries lacking pacing indicators, mobile directions links, local customs/etiquette tips, cultural moodboards, or packing/weather grids.
   - Action: 
     - Insert a structured climate/packing grid at the document start.
     - Calculate transit buffers and insert `Pacing` & `Energy` metrics at each daily header.
     - Geocode endpoints and inject Google Maps route URLs between daily stops.
     - Call real-time search tools to fetch local etiquette standards, regional playlist tracks, and visual recommendations.

---

## 2. URL Scrape Sourcing (Primary Source of Truth)

If a link is associated with a gap:
- **Rule**: Never search standard Google or make general assumptions before scraping that specific URL.
- **Workflow**:
  1. Retrieve the text content using `read_url_content` or a web search tool targeting the specific URL.
  2. Parse key facts: opening hours, location particulars, physical demands, history, and official safety details.
  3. Package these facts into the context payload sent to the copywriter.

---

## 3. Worker Orchestration Workflow (Sequential Invocations)

For every identified gap, call the `travelguide-copywriting-skill` skill one by one:

```
[Composer Orchestrator]
       │
       ├─► [Identify Gap 1] ──► Scrape URL / Context ──► Call Copywriter Skill ──► Splice Content
       ├─► [Identify Gap 2] ──► Scrape URL / Context ──► Call Copywriter Skill ──► Splice Content
       └─► [Identify Gap 3] ──► Scrape URL / Context ──► Call Copywriter Skill ──► Splice Content
```

### The Infill Request Formula
When triggering the copywriter for an individual section, construct a precise task instruction:

```markdown
Run the travelguide-copywriting-skill playbook for the following slot:
- Location / Context: [Scraped text / Coordinates / Landmark name]
- Demographics: [Ages: e.g., Toddler, Parents; Diet: e.g., Vegan; Interests: e.g., History]
- Tone Style: [Match chosen theme - e.g., "minimalist and poetic" for Boutique]
- Output Section: [Define standard templates: e.g., Customized Walk or Dining Recommendations]
```

### Splicing the Response
1. Capture the completed copywriting block returned by the worker skill.
2. Replace the placeholder/gap entry in the Intermediate Representation (Markdown).
3. Ensure headings and list levels match the surrounding document flow.
