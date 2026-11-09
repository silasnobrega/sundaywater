# Sunday Water Co. — design brief

**The vibe in one line:** the 1952 Sunday-supplement ad for a water company that actually exists.

References: Westinghouse and GE appliance ads, Reddy Kilowatt (the utility mascot — Drip is ours),
Googie signage, Saul Bass restraint, a New England town's water-company brochure. Optimistic,
domestic, a little proud. The site should feel **printed**, not rendered.

## Paper and ink
- **Paper** is cream `#F3EDDC` with faint grain. Cards sit a shade lighter (`--card #FAF6EA`). No grid, no gradients-for-depth.
- **Ink** is black-teal `#0E2E2C`, never black. Hairline rules (1–1.5px) do the structural work.
- Dark panels get a **halftone dot screen** at low alpha. Light panels get grain.

## Color (the brand palette)
| Role | Name | Hex |
|---|---|---|
| Brand / paint | Seafoam | `#8FC9B5` (big fields; the truck goes brighter) |
| Background / paper | Cream | `#F3EDDC` |
| Text / ink / dark panels | Black-teal | `#0E2E2C` |
| Accent / CTA | Brick red | `#B6432F` |

- **Brick** is the only accent: the primary button, the active card, the selected answer, the starburst, the progress fill. Anything on brick reads in cream.
- **Seafoam** is paint, not text. For labels and script accents on cream use the deeper `--seafoam-deep #3E8F74` so it stays legible.
- Map data colors (mint / straw / coral) are categorical and stay as they are.

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
