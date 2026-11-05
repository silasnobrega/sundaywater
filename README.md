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
