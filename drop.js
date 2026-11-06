/* Sunday — "Follow a drop through your home"
   Scroll-scrubbed frame sequence on a canvas inside the pinned filtration section.
   app.js owns the scroll math and fires `sunday:stage` with {progress: 0..1} while the
   section is pinned; this file only maps that progress to a frame and draws it.
   Frames: assets/drop-frames/{d|m}/frame_001.webp … (desktop 1400w, phone 800w). */
(function () {
  'use strict';
  var box = document.getElementById('dropStage');
  if (!box || !window.HTMLCanvasElement) return;
  var canvas = document.getElementById('dropCanvas');
  var ctx = canvas.getContext('2d', { alpha: false });
  var N = parseInt(box.getAttribute('data-frames'), 10) || 0;
  // Frame index where each stage begins, plus the last frame. Stage i owns KEYS[i]..KEYS[i+1].
  var KEYS = (box.getAttribute('data-keys') || '').split(',').map(Number);
  var BG = box.getAttribute('data-bg') || '#3B8B69';
  if (!N || KEYS.length !== 5) return;

  var phoneQuery = window.matchMedia('(max-width: 720px)');
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches || navigator.webdriver || /[?&]capture\b/.test(location.search);
  var set = phoneQuery.matches ? 'm' : 'd';
  var frames = new Array(N);
  var want = still ? N - 1 : 0;
  var drawn = -1;
  var dpr = 1;
  var raf = false;

  function pad(i) { return (i < 10 ? '00' : i < 100 ? '0' : '') + i; }
  function src(i) { return 'assets/drop-frames/' + set + '/frame_' + pad(i + 1) + '.webp'; }

  function load(i) {
    if (frames[i] || frames[i] === false) return;
    frames[i] = false; // in flight
    var im = new Image();
    im.decoding = 'async';
    im.onload = function () { frames[i] = im; if (nearest(want) === i) paint(); };
    im.onerror = function () { frames[i] = null; };
    im.src = src(i);
  }
  // Closest loaded frame to i, preferring earlier ones so the drop never jumps ahead.
  function nearest(i) {
    for (var d = 0; d < N; d++) {
      if (frames[i - d] && frames[i - d] !== false) return i - d;
      if (frames[i + d] && frames[i + d] !== false) return i + d;
    }
    return -1;
  }
  function loadPhase1() { for (var i = 0; i < N; i += 6) load(i); load(N - 1); }
  function loadAll() { for (var i = 0; i < N; i++) load(i); }

  function size() {
    var r = box.getBoundingClientRect();
    if (!r.width) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    drawn = -1;
    paint();
  }

  function paint() {
    raf = false;
    var i = nearest(want);
    if (i < 0) return;
    var im = frames[i];
    var cw = canvas.width, ch = canvas.height, iw = im.naturalWidth, ih = im.naturalHeight;
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, cw, ch);
    if (phoneQuery.matches) {
      // Phone: fill the box's height and pan across the scene so the drop stays in view.
      // The pan finishes when the drop starts its climb to the sink (start of stage 4).
      var s = ch / ih, dw = iw * s;
      var over = Math.max(0, dw - cw);
      var j = Math.min(1, want / Math.max(1, KEYS[3]));
      j = j * j * (3 - 2 * j); // smoothstep
      ctx.drawImage(im, -over * j, 0, dw, ch);
    } else {
      var k = Math.min(cw / iw, ch / ih), w = iw * k, h = ih * k;
      ctx.drawImage(im, (cw - w) / 2, (ch - h) / 2, w, h);
    }
    drawn = i;
    if (!box.classList.contains('is-ready')) box.classList.add('is-ready');
  }
  function request() { if (!raf) { raf = true; window.requestAnimationFrame(paint); } }

  // Scroll progress 0..1 through the pinned section → frame, piecewise so each quarter of
  // scroll covers exactly the frames where the drop is in that stage.
  function frameFor(p) {
    p = Math.max(0, Math.min(1, p));
    var q = Math.min(3, Math.floor(p * 4));
    var local = p * 4 - q;
    var f = KEYS[q] + local * (KEYS[q + 1] - KEYS[q]);
    return Math.max(0, Math.min(N - 1, Math.round(f)));
  }

  window.addEventListener('sunday:stage', function (e) {
    if (still) return;
    var f = frameFor(e.detail && e.detail.progress);
    if (f !== want) { want = f; request(); }
  });
  window.addEventListener('resize', size);
  if (phoneQuery.addEventListener) phoneQuery.addEventListener('change', function () {
    // Crossing the phone breakpoint swaps frame sets; reload lazily from the current position.
    set = phoneQuery.matches ? 'm' : 'd';
    frames = new Array(N);
    loadPhase1(); loadAll(); size();
  });

  size();
  loadPhase1();
  if (still) { loadAll(); return; }
  // Load the rest once the section is within a viewport of the fold.
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      if (entries.some(function (x) { return x.isIntersecting; })) { loadAll(); io.disconnect(); }
    }, { rootMargin: '100% 0px' });
    io.observe(box);
  } else loadAll();
})();
