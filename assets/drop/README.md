# "Follow a drop" animation assets

Layered, scroll-driven. drop.js draws these on #dropCanvas from the `sunday:stage` progress app.js fires.

- plate.webp / plate.jpg   — the cutaway with no characters (1344x576). jpg is the poster + fallback.
- atlas.webp / atlas.png   — Drip + rust, chlorine, scale, dissolved-solids villains; 4 poses each (move, idle, caught, out).
- frames.json              — atlas rects (also inlined in drop.js).
- build_atlas.py           — rebuilds atlas + plate from src/ (python3 + Pillow). src/ is gitignored.

Beat map (progress → card):
  0.00–0.25  01 Sediment   rust caught at tank 1
  0.25–0.50  02 Carbon     chlorine absorbed at tank 2
  0.50–0.75  03 Softener   scale caught at tank 3 → brine tank
  0.75–1.00  04 RO         dissolved solids stopped at the membrane; glass fills from the dedicated RO tap
Only the active stage is lit; closing beat lifts the dim and shows "Your water test shows which stages your home needs."

To tune: path points, zones, catch timings and sprite sizes are the constants at the top of drop.js.
assets/drop-frames/ (old 108-frame video sequence, 14 MB) is no longer referenced and can be deleted.
