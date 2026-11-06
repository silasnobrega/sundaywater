# Clear — website

Homepage for Clear, a Connecticut water testing and filtration company. Plain HTML, CSS and JavaScript — no build step, no framework, no dependencies.

## Open it in Cursor

1. Unzip `clear-website.zip`.
2. In Cursor: **File → Open Folder…** and pick the `clear-website` folder.
3. To preview, either:
   - double-click `index.html` to open it in your browser, or
   - in Cursor's terminal run `npx serve .` (or `python3 -m http.server`) and open the address it prints.

Everything works offline except the Google Fonts, which load from the internet.

## What's in here

| File | What it is |
|---|---|
| `index.html` | The whole page: hero, water map, filtration, pricing, booking form, CTA, footer |
| `styles.css` | Brand colors, type, animations, and the phone layout (everything under 720px wide) |
| `app.js` | Mobile menu, town map (click, hover, zoom), address check, filtration cards, booking form |
| `assets/sky.jpg` | Hero sky photo (animated with CSS) |
| `data/ct-towns-map.js` | The 169 town shapes (pre-projected for the SVG map) + water profile for each town |
| `data/ct-towns.geojson` | Same towns as real lat/lng GeoJSON with water-profile properties — use this for Mapbox |
| `data/ct-water-towns.json` | Full town dataset: population, public water systems, sources and method notes |

## Run it locally (phone + desktop)

```bash
npm install        # once
npm run dev        # serves the folder at http://localhost:3000
```

No Node? `python3 -m http.server 3000` from this folder does the same job.

To open it on your phone: make sure the phone is on the same Wi-Fi, find the computer's LAN address (`ipconfig getifaddr en0` on a Mac, `ipconfig` on Windows), and visit `http://<that-address>:3000/start.html` on the phone. Chrome DevTools device mode (Cmd/Ctrl+Shift+M, pick "iPhone") is the quick alternative.

## The water check (`start.html`)

A mobile-first intake quiz modeled on the Hims & Hers "assessment" funnel: one question per screen, big tap targets, auto-advance on single answers, progress bar, an information break that shows the town's real water data, contact capture right before the result, then one personalized recommendation and the booking handoff.

| File | What it is |
|---|---|
| `start.html` | The page. Loads `quiz.css` + `quiz.js` and the town water data. |
| `quiz.js` | Question bank, branching, scoring, the town report, the result, and the lead handoff. All copy lives here. |
| `quiz.css` | Scoped under `.sq` so it can't restyle the rest of the site. Also holds the phone sticky bar on the home page. |

**Flow:** intro → first name → symptoms (multi) → well or city → town → *town report* → who drinks it → own/rent → existing treatment → what to fix → timeline → *building your plan* → phone + email → result (Essential / Soft / Complete / Kitchen tap RO / Free test first) → `book.html` prefilled.

**Entry points:** hero address bar on the home page, the "Find my system" buttons, and a phone-only sticky bar that slides up once the hero scrolls away. Deep links: `start.html#address=...`, `start.html#town=Guilford`, `start.html#source=well`, add `&restart=1` to clear a saved session. Hashes, not `?query=`, because Vercel's `cleanUrls` redirect drops a query string.

**Leads:** every finished quiz is stored in the browser under `localStorage["sunday_quiz_leads"]` (open DevTools → Application → Local Storage to see them while testing). To send them somewhere real, set `window.SUNDAY_LEAD_ENDPOINT` in `start.html` to a Formspree, Zapier catch-hook, Supabase or CRM URL; the quiz POSTs one JSON object per lead (`name, phone, email, town, street, answers, recommended`). The booking form on `book.html` also receives the quiz answers in the URL hash and a hidden `quiz_plan` field.

**Knobs in `quiz.js` → `CONFIG`:** `showPrices` (off until the plan prices are set; fill the `$[X,XXX]` placeholders in `PLANS`), `phone`, `bookUrl`. The recommendation rules are in `recommend()`, the question order is the `steps` array.

## Brand

- Navy `#14244D` · Cream `#FFF6EA` · Sun `#FFD978` · Blue `#2350D8`
- Map: public system `#A8C4FF` · small systems only `#FFD978` · likely private wells `#FF8F66`
- Type: **Archivo** (heavy + wide for headlines, condensed caps for buttons/labels) and **Yellowtail** for the script accent words

## Before going live — fill these in

Search the project for `[` to find every placeholder:

- `[Phone]` — nav, mobile menu, footer (make the nav one a `tel:` link)
- `[Email]` — footer
- `$[X,XXX]` and `$[XX]/mo` — the three plan prices
- `[Financing terms…]` — lender disclosure under pricing
- `HIC.[0000000]` — your CT Home Improvement Contractor registration number (CT requires it on advertising)

## Next steps (good prompts to give Cursor)

- **Make the booking form send leads:** "Wire the booking form in app.js to Formspree / HubSpot / my CRM's API, with a loading state and an error message." (Look for the `TODO` in `app.js`.)
- **Swap in a real Mapbox map:** "Replace the SVG map with Mapbox GL JS. Load `data/ct-towns.geojson` as a fill layer colored by `water_profile` (major_system #A8C4FF, small_systems_only #FFD978, no_public_system #FF8F66), keep the town panel behavior, and zoom to the town that's picked." You'll need a Mapbox access token.
- **Real address lookup:** "Geocode the hero address with the Mapbox Geocoding API instead of matching town names in the text."
- **Move to a framework:** "Convert this site to Next.js + Tailwind, keeping the design identical."
- **Hosting:** the folder can be dropped as-is onto Netlify, Vercel or Cloudflare Pages.

## Data notes

- Town water profiles come from EPA's Safe Drinking Water Information System (community water systems serving 1,000+ people and the towns each one lists).
- EPA lists which towns a system serves, not how much of each town — so "public system present" does **not** mean every home in that town is on public water. The site copy already says this; keep it that way.
- Town boundaries: U.S. Census Bureau 2019 cartographic boundary file (county subdivisions).
- Statewide well figure ("1 in 4"): CT Private Well Records report, September 2020 (~23% of residents).
