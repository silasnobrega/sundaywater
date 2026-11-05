# Adding "What's in your water" to the Clear site

This folder is a **self-contained add-on**. It doesn't change any of your existing files' behavior:

- All styles are scoped under `.cwr` — they can't restyle anything else on the page.
- The script adds one global (`window.ClearWaterReport`) and only draws inside the box you give it.
- It reads your map's town dropdown (`#townSelect`) to stay in sync, but never edits your code.
- To remove it, delete the 4 lines below and the folder. Your site goes back exactly as it was.

## 1. Try it on its own first

Open `clear-water-report/demo.html` in your browser. You should see the Bridgeport report with cards and the body diagram.

## 2. Add it to the site (4 lines)

Copy the whole `clear-water-report` folder into your project, next to `index.html`.

In `index.html`, inside `<head>`, **after** your existing `styles.css` link and `app.js` script:

```html
<link rel="stylesheet" href="clear-water-report/water-report.css">
<script src="clear-water-report/data/ct-water-quality.js" defer></script>
<script src="clear-water-report/water-report.js" defer></script>
```

Then in `<body>`, where you want the section (recommended: right after the `#map` section, before `#filtration`):

```html
<section id="water-report" class="clear-sec" style="position: relative; padding: 20px 20px 110px">
  <div data-clear-water-report data-sync-select="#townSelect" data-cta-href="#book"></div>
</section>
```

That's it. Picking a town on the map updates the report, and picking a town in the report moves the map.

### Options (on the `<div>`)

| Attribute | What it does |
|---|---|
| `data-sync-select="#townSelect"` | Keeps the report in sync with your map's town dropdown. Leave it off to run the report on its own. |
| `data-town="Bridgeport"` | Town to show first (default: whatever the map shows, else Hartford). |
| `data-cta-href="#book"` | Where the "Book a free water test" buttons go. |

From your own code you can also call `ClearWaterReport.setTown('Guilford')`.

## Paste this into Cursor

> Add the water report module in the `clear-water-report/` folder to `index.html`. Follow `clear-water-report/INTEGRATION.md` exactly: add the stylesheet link and the two script tags in `<head>` after the existing `styles.css` and `app.js`, and add the `<section id="water-report">` block right after the `#map` section. **Do not modify `styles.css`, `app.js`, any existing markup, or any file inside `clear-water-report/`.** Then open the page and confirm: the map still works, the booking form still works, and choosing a town on the map updates the new section.

### If your project is now React / Next.js

Paste this instead:

> Add the vanilla JS module in `clear-water-report/` as a client component. Load `water-report.css` globally, load `data/ct-water-quality.js` then `water-report.js` with `next/script` (strategy "afterInteractive", in that order), and render a `<div ref={ref}>` that calls `window.ClearWaterReport.mount(ref.current, { syncSelect: '#townSelect', ctaHref: '#book' })` in a `useEffect` once the scripts have loaded. Don't rewrite the module or the data file.

## What's inside

| File | Purpose |
|---|---|
| `water-report.js` | The module (vanilla JS, no dependencies) |
| `water-report.css` | Its styles, all under `.cwr` |
| `data/ct-water-quality.js` | The data, loaded as a script so it works without a server |
| `data/ct-water-quality.json` | Same data as JSON, for an API or CMS later |
| `demo.html` | Stand-alone test page |

## Updating the data

Don't hand-edit `ct-water-quality.js`. Update the spreadsheet (`Clear-CT-Water-Quality-2025.xlsx`), then regenerate the data files — or ask Claude to. New utility reports come out every summer (usually by July 1).

## What it shows (and how it stays honest)

- Each town shows the public water systems that serve it, from their 2025 water quality reports (or state test averages where the 2025 report couldn't be retrieved — marked "State data").
- Each contaminant card compares the result to the federal limit and Connecticut's action level, says whether the number is an average, a highest result or a 90th percentile, and links the source.
- The body diagram highlights in orange only systems linked to results at or near a limit; things detected well under a limit show in a light tint.
- Towns that are mostly on private wells get the USGS / CT DPH well findings (arsenic, uranium, radon) instead.
- Health text comes from EPA and CT DPH and always describes long-term exposure above legal limits.
