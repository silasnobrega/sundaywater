/* Sunday — "Follow a drop through your home"
   Layered, scroll-driven animation inside the pinned filtration section.

   app.js owns the scroll math and fires `sunday:stage` with {progress: 0..1} while the
   section is pinned. This file maps that progress to a scene and draws it on #dropCanvas:
     plate.webp   the cutaway (no characters)              assets/drop/plate.webp|jpg
     atlas.webp   Drip + 4 contaminants, 4 poses each     assets/drop/atlas.webp|png

   Every event is pinned to the card that owns it, so the story can't drift:
     0.00–0.25  01 Sediment   rust/grit caught at tank 1
     0.25–0.50  02 Carbon     chlorine absorbed at tank 2
     0.50–0.75  03 Softener   scale caught at tank 3, dropped in the brine tank
     0.75–1.00  04 RO         dissolved solids stopped at the membrane; glass fills from the RO tap
   Only the active stage's equipment is lit; the rest sits dimmed, because a water test
   decides which stages a home actually needs. */
(function () {
  'use strict';
  var box = document.getElementById('dropStage');
  if (!box || !window.HTMLCanvasElement) return;
  var canvas = document.getElementById('dropCanvas');
  var ctx = canvas.getContext('2d', { alpha: false });
  var BG = box.getAttribute('data-bg') || '#3E8F74';
  var ASSETS = box.getAttribute('data-assets') || 'assets/drop/';

  /* ---------- plate geometry (1344 x 576 source pixels) ---------- */
  var PW = 1344, PH = 576;

  // The water path, as a polyline through the pipes and tanks.
  var PATH = [
    [-60, 452], [425, 452], [432, 345], [478, 338], [492, 352], [492, 455], // tank 1 (dip)
    [492, 352], [560, 336], [645, 352], [645, 455],                         // tank 2 (dip)
    [645, 352], [725, 336], [810, 352], [810, 455],                         // tank 3 (dip)
    [810, 352], [890, 352], [993, 358], [993, 190], [1123, 190], [1123, 262], // RO membrane
    [1123, 322], [1187, 300], [1218, 277], [1218, 150], [1252, 153], [1238, 186] // RO tap → glass
  ];
  var TANK1 = 5, TANK2 = 9, TANK3 = 13, MEMBRANE = 19, TAP = 24, GLASS = 25; // PATH indices
  var cum = [0];
  for (var i = 1; i < PATH.length; i++) {
    cum[i] = cum[i - 1] + Math.hypot(PATH[i][0] - PATH[i - 1][0], PATH[i][1] - PATH[i - 1][1]);
  }
  function at(s) {
    if (s <= 0) return PATH[0].slice();
    if (s >= cum[cum.length - 1]) return PATH[PATH.length - 1].slice();
    var i = 1;
    while (cum[i] < s) i++;
    var t = (s - cum[i - 1]) / (cum[i] - cum[i - 1]);
    return [PATH[i - 1][0] + (PATH[i][0] - PATH[i - 1][0]) * t, PATH[i - 1][1] + (PATH[i][1] - PATH[i - 1][1]) * t];
  }

  // progress → arc length of the lead drop (piecewise linear, holds while a catch plays out)
  var S_KEYS = [
    [0.00, cum[0]], [0.16, cum[TANK1]], [0.25, cum[TANK1]],
    [0.41, cum[TANK2]], [0.50, cum[TANK2]],
    [0.66, cum[TANK3]], [0.75, cum[TANK3]],
    [0.88, cum[MEMBRANE]], [0.94, cum[TAP]], [0.975, cum[GLASS]], [1.00, cum[GLASS]]
  ];
  function lead(p) {
    for (var k = 1; k < S_KEYS.length; k++) {
      if (p <= S_KEYS[k][0]) {
        var a = S_KEYS[k - 1], b = S_KEYS[k];
        return a[1] + (b[1] - a[1]) * ((p - a[0]) / (b[0] - a[0]));
      }
    }
    return S_KEYS[S_KEYS.length - 1][1];
  }

  // Equipment regions (for dimming) and the mitt / landing spots for each catch.
  var ZONES = [
    [430, 298, 132, 276],   // tank 1
    [582, 298, 126, 276],   // tank 2
    [744, 278, 264, 296],   // tank 3 + brine tank
    [1048, 248, 226, 128]   // RO unit, cartridges, storage tank
  ];
  var CATCH = [
    // villain, trailing offset (px behind Drip), catch window [start,end] in progress,
    // mitt point (centre), landing point (bottom-centre), landing pose anchor, landing alpha
    { who: 'rust',   off: 62,  t: [0.165, 0.215], mitt: [548, 440], land: [578, 560], fade: 1 },
    { who: 'chlor',  off: 118, t: [0.415, 0.465], mitt: [700, 440], land: [735, 528], fade: 0.55 },
    { who: 'scale',  off: 172, t: [0.665, 0.715], mitt: [870, 425], land: [947, 472], fade: 1 },
    { who: 'specks', off: 224, t: [0.875, 0.905], mitt: [1123, 262], land: [1102, 340], fade: 1 }
  ];
  var SIZE = { drip: 90, rust: 66, chlor: 70, scale: 66, specks: 68 }; // sprite heights in plate px

  var FRAMES = { "drip.move": [4, 4, 232, 232], "drip.idle": [247, 4, 225, 232], "drip.caught": [490, 4, 219, 232], "drip.out": [730, 4, 219, 232], "rust.move": [4, 311, 232, 165], "rust.idle": [244, 244, 231, 232], "rust.caught": [484, 245, 232, 231], "rust.out": [724, 298, 232, 178], "chlor.move": [4, 491, 232, 225], "chlor.idle": [290, 484, 140, 232], "chlor.caught": [499, 484, 201, 232], "chlor.out": [750, 484, 180, 232], "scale.move": [4, 789, 232, 167], "scale.idle": [244, 727, 232, 229], "scale.caught": [484, 726, 232, 230], "scale.out": [724, 763, 232, 193], "specks.move": [4, 980, 232, 216], "specks.idle": [251, 964, 217, 232], "specks.caught": [484, 970, 232, 226], "specks.out": [777, 964, 126, 232] };

  /* ---------- assets ---------- */
  var plate = null, atlas = null;
  function loadImg(srcs, done) {
    var im = new Image();
    im.decoding = 'async';
    im.onload = function () { done(im); };
    im.onerror = function () { if (srcs.length > 1) loadImg(srcs.slice(1), done); };
    im.src = ASSETS + srcs[0];
  }

  /* ---------- state ---------- */
  var phoneQuery = window.matchMedia('(max-width: 720px)');
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches || navigator.webdriver || /[?&]capture\b/.test(location.search);
  var progress = still ? 1 : 0;
  var raf = false, dpr = 1, ready = false;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function ease(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  /* ---------- drawing ---------- */
  var view = { s: 1, ox: 0, oy: 0 }; // plate → canvas transform

  function sprite(key, cx, cy, h, alpha, anchorBottom) {
    var f = FRAMES[key];
    if (!f || !atlas) return;
    var scale = h / f[3], w = f[2] * scale;
    var x = cx - w / 2, y = anchorBottom ? cy - h : cy - h / 2;
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.drawImage(atlas, f[0], f[1], f[2], f[3], view.ox + x * view.s, view.oy + y * view.s, w * view.s, h * view.s);
    ctx.globalAlpha = 1;
  }
  function rrect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function px(v) { return v * view.s; }

  function scene(p) {
    var cw = canvas.width, ch = canvas.height;
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, cw, ch);
    if (!plate) return;

    var leadS = lead(p);
    var dripPos = at(leadS);

    // camera: desktop fits the whole plate; phone fits height and pans with Drip
    if (phoneQuery.matches) {
      view.s = ch / PH;
      var vw = cw / view.s;
      var camX = clamp(dripPos[0] - vw * 0.45, 0, Math.max(0, PW - vw));
      view.ox = -camX * view.s; view.oy = 0;
    } else {
      view.s = Math.min(cw / PW, ch / PH);
      view.ox = (cw - PW * view.s) / 2; view.oy = (ch - PH * view.s) / 2;
    }
    ctx.drawImage(plate, 0, 0, PW, PH, view.ox, view.oy, PW * view.s, PH * view.s);

    // glass fill from the RO tap (last beat)
    var fill = ease((p - 0.95) / 0.045);
    if (fill > 0) {
      var gx = 1224, gy1 = 236, gy0 = 172, gw = 29;
      var top = gy1 - (gy1 - gy0) * fill;
      ctx.fillStyle = 'rgba(214, 241, 228, 0.92)';
      ctx.fillRect(view.ox + px(gx), view.oy + px(top), px(gw), px(gy1 - top));
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillRect(view.ox + px(gx + 4), view.oy + px(top), px(gw - 8), px(2));
    }

    // dim the stages that aren't in play
    var stage = p >= 1 ? 3 : Math.min(3, Math.floor(p * 4));
    var endLift = ease((p - 0.985) / 0.015); // closing beat: everything back on
    var canBlur = 'filter' in ctx;
    for (var z = 0; z < 4; z++) {
      var dim = (z === stage) ? 0 : 0.5;
      dim *= (1 - endLift);
      if (dim <= 0.01) continue;
      ctx.fillStyle = 'rgba(62,143,116,' + dim.toFixed(3) + ')';
      if (canBlur) ctx.filter = 'blur(' + Math.max(2, px(7)).toFixed(1) + 'px)';
      var zx = ZONES[z][0] - 10, zy = ZONES[z][1] - 10, zw = ZONES[z][2] + 20, zh = ZONES[z][3] + 20;
      rrect(view.ox + px(zx), view.oy + px(zy), px(zw), px(zh), px(26));
      ctx.fill();
      if (canBlur) ctx.filter = 'none';
    }

    // contaminants: ride behind Drip until their catch, then land and stay
    for (var c = 0; c < CATCH.length; c++) {
      var v = CATCH[c], key, pos, alpha = 1, bottom = false;
      if (p < v.t[0]) {
        pos = at(leadS - v.off);
        if (pos[0] < -40) continue;
        key = v.who + '.move';
        pos[1] += Math.sin(p * 140 + c) * 3; // slight bob in the stream
      } else if (p < v.t[1]) {
        var t = (p - v.t[0]) / (v.t[1] - v.t[0]);
        if (t < 0.5) { // yanked to the mitt
          var from = at(lead(v.t[0]) - v.off);
          var e = ease(t / 0.5);
          pos = [lerp(from[0], v.mitt[0], e), lerp(from[1], v.mitt[1], e)];
          key = v.who + '.caught';
        } else {       // dropped where it lands
          var e2 = ease((t - 0.5) / 0.5);
          pos = [lerp(v.mitt[0], v.land[0], e2), lerp(v.mitt[1], v.land[1], e2) - Math.sin(e2 * Math.PI) * 26];
          key = v.who + (e2 > 0.6 ? '.out' : '.caught');
          bottom = e2 > 0.6;
          alpha = lerp(1, v.fade, e2);
        }
      } else {
        pos = v.land.slice(); key = v.who + '.out'; bottom = true; alpha = v.fade;
      }
      sprite(key, pos[0], pos[1], SIZE[v.who], alpha, bottom);
    }

    // Drip
    var dripKey = 'drip.move', dripA = 1, dripH = SIZE.drip, dripBottom = false;
    var holding = (p > 0.16 && p < 0.25) || (p > 0.41 && p < 0.5) || (p > 0.66 && p < 0.75);
    if (holding) { dripKey = 'drip.idle'; dripPos[1] += Math.sin(p * 90) * 4; }
    if (p >= 0.95) { // pours into the glass, then pops up to celebrate
      var pour = ease((p - 0.95) / 0.03);
      dripA = 1 - pour; dripH = SIZE.drip * (1 - 0.5 * pour);
      if (p > 0.975) {
        var cheer = ease((p - 0.975) / 0.02);
        dripKey = 'drip.out'; dripA = cheer; dripH = SIZE.drip * (0.7 + 0.3 * cheer);
        dripPos = [1292, 212]; dripBottom = true;
      }
    }
    if (dripA > 0.02) sprite(dripKey, dripPos[0], dripPos[1], dripH, dripA, dripBottom);

    // sparkle over the full glass
    if (p > 0.985) {
      ctx.strokeStyle = '#F3EDDC'; ctx.lineWidth = Math.max(1.5, px(2.5)); ctx.lineCap = 'round';
      var sx = view.ox + px(1264), sy = view.oy + px(150), r = px(7);
      ctx.beginPath(); ctx.moveTo(sx - r, sy); ctx.lineTo(sx + r, sy); ctx.moveTo(sx, sy - r); ctx.lineTo(sx, sy + r); ctx.stroke();
    }

    // closing sticker
    if (endLift > 0 && !phoneQuery.matches) {
      ctx.globalAlpha = endLift;
      var msg = 'Your water test shows which stages your home needs.';
      ctx.font = '700 ' + Math.round(px(17)) + 'px Archivo, "Helvetica Neue", Arial, sans-serif';
      var tw = ctx.measureText(msg).width, pad = px(14), bx = view.ox + px(24), by = view.oy + px(20), bh = px(40);
      ctx.fillStyle = '#0E2E2C'; rrect(bx + px(3), by + px(3), tw + pad * 2, bh, px(10)); ctx.fill();
      ctx.fillStyle = '#F3EDDC'; rrect(bx, by, tw + pad * 2, bh, px(10)); ctx.fill();
      ctx.strokeStyle = '#0E2E2C'; ctx.lineWidth = px(2); rrect(bx, by, tw + pad * 2, bh, px(10)); ctx.stroke();
      ctx.fillStyle = '#0E2E2C'; ctx.textBaseline = 'middle'; ctx.fillText(msg, bx + pad, by + bh / 2 + px(1));
      ctx.globalAlpha = 1;
    }
  }

  function paint() {
    raf = false;
    if (!ready) return;
    scene(progress);
    if (!box.classList.contains('is-ready')) box.classList.add('is-ready');
  }
  function request() { if (!raf) { raf = true; window.requestAnimationFrame(paint); } }

  function size() {
    var r = box.getBoundingClientRect();
    if (!r.width) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    paint();
  }

  window.addEventListener('sunday:stage', function (e) {
    if (still) return;
    var p = clamp(e.detail && e.detail.progress || 0, 0, 1);
    if (Math.abs(p - progress) > 0.0005) { progress = p; request(); }
  });
  window.addEventListener('resize', size);
  if (phoneQuery.addEventListener) phoneQuery.addEventListener('change', size);

  loadImg(['plate.webp', 'plate.jpg'], function (im) { plate = im; if (atlas) { ready = true; size(); } });
  loadImg(['atlas.webp', 'atlas.png'], function (im) { atlas = im; if (plate) { ready = true; size(); } });
  size();
})();
