# Sunday Water Co. — design brief

**The vibe in one line:** the 1952 Sunday-supplement ad for a water company that actually exists.

References: Westinghouse and GE appliance ads, Reddy Kilowatt (the utility mascot — Drip is ours),
Googie signage, Saul Bass restraint, a New England town's water-company brochure. Optimistic,
domestic, a little proud. The site should feel **printed**, not rendered.

## Paper and ink
- **Paper** is warm cream (`--paper #FBF6EE`, `--cream #F6EBD8`) with faint grain. No grid, no gradients-for-depth.
- **Ink** is forest green (`--ink #1C3F36`), never black. Hairline rules (1–1.5px) do the structural work.
- Dark panels get a **halftone dot screen** at low alpha. Light panels get grain.

## Color
- **Seafoam** (`--seafoam #3E8F74`) is the brand color: section fields, the plate, large panels. Mint (`--mint #A9D4C4`) is its tint.
- **Butter yellow** (`--butter #F2D06B`) is *emphasis*: the active card, the primary button, a highlight, a starburst. Used like a highlighter — one place per view.
- **Tomato** (`--tomato #D9593D`) is the rust villain's color. Alerts and at most one accent per page.
- Navy is retired. If something needs to be dark, it's ink.

## Type
- **Headlines:** Archivo, condensed (`font-stretch: 75%`), 800, caps, letterspaced `.02em`. Poster/ad headlines. Big.
- **Accent word:** Playball script, one warm word per headline, in seafoam or butter on dark.
- **Labels:** Archivo caps 600–700, `.14em` tracking, small, often with a hairline rule.
- **Body:** Archivo 100% width, 400–500, 1.5–1.6 line height, ink or `--ink-2`.

## Shape
- Rounded rectangles with **TV-screen corners**: 10–14px. Not 24–34px blobs.
- Outlines are **1.5px ink**. Depth is a **paper shadow** (`0 2px 0 rgba(ink,.18), 0 12px 28px -16px rgba(ink,.35)`), never an offset block.
- **Pills** are for chips and tags only.
- Ornament, used sparingly: **starburst** for an offer, a **seal** for the guarantee, **double hairlines** under section labels, numbered circles.

## Illustration
- The cutaway cartoon and **Drip** are the brand's visual voice. The hero engraving is the "postcard" — kept.
- No emoji anywhere. Quiz answers are **lettered** (A, B, C…) in ink circles.

## Motion
- Scroll-driven and gentle. Things slide and settle like paper (`cubic-bezier(.2,.8,.2,1)`), no spring bounce.
- Reduced motion: everything rests in its final state.

## Voice
- Short declaratives. Confident, plain, warm. "Good water. Good living." Mid-century ad cadence without pastiche.

## What this means for each piece
| Piece | Treatment |
|---|---|
| Buttons | Rounded 12px, ink outline, butter fill for the primary, cream/ink for secondary. Hover: lift 1px, no bounce. |
| Cards | Cream, 14px corners, ink hairline, paper shadow. Active: butter fill, ink text. |
| Section labels | Caps label with a short hairline rule beneath. |
| Stats (The Problem) | Huge condensed number, tomato accent on the figure, hairline underneath. No tile. |
| Map panel | Ink-on-seafoam panel with a halftone screen. |
| "Most popular" | Butter starburst. |
| Quiz | Lettered options; thin rule progress; reveal card as a stamped certificate (double rule + seal). |
| Hero | Engraving kept; copy on a cream paper card with ink outline; a small rotating seal: "Free in-home test · Licensed CT plumbers". |
| Footer | Ink field with a halftone screen; hairline columns. |
