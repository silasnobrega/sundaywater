/* Clear — page behavior (no dependencies).
   Data comes from data/ct-towns-map.js (window.CLEAR_MAP). */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var isPhone = function () { return window.matchMedia('(max-width: 720px)').matches; };

  /* ---------------- Mobile menu ---------------- */
  var menuBtn = $('menuBtn');
  var menu = $('menu');
  if (menuBtn && menu) {
    function setMenu(open) {
      menu.hidden = !open;
      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      $('iconOpen').hidden = open;
      $('iconClose').hidden = !open;
    }
    menuBtn.addEventListener('click', function () { setMenu(menu.hidden); });
    menu.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); menuBtn.focus(); } });
  }

  /* ---------------- The Problem ---------------- */
  /* The section stays pinned while scrolling steps through the three points. */
  var problemSection = document.getElementById('problem');
  var problemPoints = Array.prototype.slice.call(document.querySelectorAll('.problem-point'));
  var problemMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (problemSection && problemPoints.length && problemSection.querySelector('.problem-pin') && !problemMotion.matches) {
    var problemPin = problemSection.querySelector('.problem-pin');
    var problemFill = $('problemFill');
    var problemIndex = -1;
    problemSection.classList.add('problem-step');
    function setProblem(i) {
      problemIndex = i;
      problemPoints.forEach(function (el, j) {
        var on = j === i;
        el.classList.toggle('is-active', on);
        if (on) el.removeAttribute('inert');
        else el.setAttribute('inert', '');
      });
      if (problemFill) problemFill.style.width = (((i + 1) / problemPoints.length) * 100) + '%';
    }
    function problemFromScroll() {
      if (problemMotion.matches) return;
      var travel = problemSection.offsetHeight - problemPin.offsetHeight;
      if (travel <= 0) return;
      var progress = (window.scrollY - problemSection.offsetTop) / travel;
      if (progress < 0) progress = 0;
      if (progress > 1) progress = 1;
      var i = Math.min(problemPoints.length - 1, Math.floor(progress * problemPoints.length));
      if (i !== problemIndex) setProblem(i);
    }
    function problemRelease() {
      problemSection.classList.remove('problem-step');
      problemPoints.forEach(function (el) {
        el.classList.remove('is-active');
        el.removeAttribute('inert');
      });
      problemIndex = -1;
    }
    setProblem(0);
    window.addEventListener('scroll', problemFromScroll, { passive: true });
    window.addEventListener('resize', problemFromScroll);
    if (problemMotion.addEventListener) {
      problemMotion.addEventListener('change', function () {
        if (problemMotion.matches) problemRelease();
        else {
          problemSection.classList.add('problem-step');
          problemFromScroll();
        }
      });
    }
  }

  /* ---------------- Filtration stages ---------------- */
  var STAGES = [
    { name: 'Sediment', body: 'Catches grit before it reaches your pipes, fixtures and appliances.', removes: 'sand, rust, silt' },
    { name: 'Carbon', body: 'Improves taste and smell for every faucet in the house.', removes: 'chlorine, chloramine, odors' },
    { name: 'Softener', body: 'Swaps out the minerals that leave scale on faucets, heaters and glassware.', removes: 'calcium, magnesium' },
    { name: 'Reverse osmosis', body: 'A fine membrane at the kitchen tap for drinking and cooking water.', removes: 'dissolved solids, many contaminants' }
  ];
  var stageWrap = $('stages');
  if (stageWrap) {
  var stageButtons = STAGES.map(function (s, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'stage-card clear-sticker clear-press';
    b.innerHTML =
      '<span class="stage-num clear-caps">0' + (i + 1) + '</span>' +
      '<span class="stage-name clear-display"></span>' +
      '<span class="stage-body"></span>' +
      '<span class="stage-tag clear-caps"></span>';
    b.querySelector('.stage-name').textContent = s.name;
    b.querySelector('.stage-body').textContent = s.body;
    b.querySelector('.stage-tag').textContent = 'Removes: ' + s.removes;
    b.addEventListener('click', function () { goToStage(i); });
    stageWrap.appendChild(b);
    return b;
  });
  var stageSection = $('filtration');
  var stagePin = stageSection.querySelector('.stage-pin');
  var stageIndex = 0;
  var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  function setStage(i) {
    stageIndex = i;
    stageButtons.forEach(function (b, j) {
      b.classList.toggle('is-active', i === j);
      b.setAttribute('aria-pressed', String(i === j));
    });
    $('progressFill').style.width = ((i + 1) * 25) + '%';
    if (isPhone() && stageWrap.scrollWidth > stageWrap.clientWidth + 24) {
      var card = stageButtons[i];
      var delta = card.getBoundingClientRect().left - stageWrap.getBoundingClientRect().left - 16;
      stageWrap.scrollLeft += delta;
    }
  }

  function stageTravel() {
    return stageSection.offsetHeight - stagePin.offsetHeight;
  }
  function stageStart() {
    // The pin is sticky, so its offsetTop grows while it is stuck.
    // The section's own top is the stable start of the scroll.
    return stageSection.offsetTop;
  }
  // While this section is pinned, scroll position picks the card.
  function stageFromScroll() {
    if (motionQuery.matches) return;
    var travel = stageTravel();
    if (travel <= 0) return;
    var progress = (window.scrollY - stageStart()) / travel;
    if (progress < 0) progress = 0;
    if (progress > 1) progress = 1;
    var i = Math.min(STAGES.length - 1, Math.floor(progress * STAGES.length));
    if (i !== stageIndex) setStage(i);
  }
  function goToStage(i) {
    if (motionQuery.matches) { setStage(i); return; }
    var travel = stageTravel();
    var top = stageStart() + ((i + 0.5) / STAGES.length) * travel;
    window.scrollTo({ top: top, behavior: motionQuery.matches ? 'auto' : 'smooth' });
  }
  setStage(0);
  window.addEventListener('scroll', stageFromScroll, { passive: true });
  window.addEventListener('resize', stageFromScroll);
  if (motionQuery.addEventListener) motionQuery.addEventListener('change', stageFromScroll);
  }

  /* ---------------- Booking form ---------------- */
  if ($('bookForm')) {
  var interestButtons = Array.prototype.slice.call($('interests').querySelectorAll('.chip'));
  interestButtons.forEach(function (b) {
    b.addEventListener('click', function () {
      b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
    });
  });
  var slotButtons = Array.prototype.slice.call($('slots').querySelectorAll('.chip'));
  slotButtons.forEach(function (b) {
    b.addEventListener('click', function () {
      slotButtons.forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
    });
  });

  var form = $('bookForm');
  var booked = $('booked');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var data = new FormData(form);
    data.append('interests', interestButtons.filter(function (b) { return b.getAttribute('aria-pressed') === 'true'; }).map(function (b) { return b.textContent; }).join(', '));
    var slot = slotButtons.filter(function (b) { return b.getAttribute('aria-pressed') === 'true'; })[0];
    data.append('preferred_time', slot ? slot.textContent : '');

    // TODO: send `data` to your form backend / CRM here, e.g.
    // fetch('https://formspree.io/f/XXXXXXX', { method: 'POST', body: data, headers: { Accept: 'application/json' } });

    $('bookedSummary').textContent = 'Water test in ' + (data.get('town') || 'your town') +
      (slot ? ', ' + slot.textContent.toLowerCase() : '') + ". We'll text you to confirm.";
    form.hidden = true;
    booked.hidden = false;
  });
  $('resetBtn').addEventListener('click', function () {
    form.reset();
    interestButtons.concat(slotButtons).forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
    booked.hidden = true;
    form.hidden = false;
    var mapTown = $('townSelect');
    if (mapTown && mapTown.value && $('fTown')) $('fTown').value = mapTown.value;
  });
  }

  /* ---------------- Town map ---------------- */
  var MAP = window.CLEAR_MAP;
  var mapStatus = $('mapStatus');
  var hasMap = !!$('mapTowns');
  if (!MAP || !MAP.towns) {
    if (mapStatus) mapStatus.textContent = "The map couldn't load. Refresh the page to try again.";
    return;
  }
  if (mapStatus) mapStatus.hidden = true;

  var W = MAP.w || 640, H = MAP.h || 491.4;
  // row: [town, county, profile, systemCount, largestSystem, svgPath, labelX, labelY]
  var PROFILE = {
    N: {
      badge: 'Likely private wells',
      headline: 'This water is probably untested.',
      explainer: 'No utility tests a private well. No community system serving 1,000+ people lists this town, so only the homeowner can test this water.',
      checks: ['Bacteria', 'Arsenic', 'Hardness', 'Iron', 'Chlorine'],
      strip: '#E07A62',
      color: '#E07A62'
    },
    S: {
      badge: 'Small systems only',
      headline: 'Most of this water is probably untested.',
      explainer: 'Only small community systems serve parts of this town. Most homes are likely on private wells, and those wells are not tested by any utility.',
      checks: ['Bacteria', 'Arsenic', 'Hardness', 'Iron', 'Chlorine'],
      strip: '#E4C56A',
      color: '#E4C56A'
    },
    M: {
      badge: 'Public system present',
      headline: 'A utility report is not your kitchen tap.',
      explainer: 'A large community system serves parts of this town. Coverage is not reported street by street, and some homes may still be on private wells.',
      checks: ['Chlorine', 'Hardness', 'Iron'],
      strip: '#E4C56A',
      color: '#A9D4C4'
    }
  };
  var byName = {};
  MAP.towns.forEach(function (t) { byName[t[0]] = t; });
  var state = { town: 'Hartford', zoom: 1, hover: null };

  // Town dropdowns. The map page flies to the town. The form page only stores it.
  var selects = [$('townSelect'), $('fTown')].filter(Boolean);
  selects.forEach(function (sel) {
    MAP.towns.forEach(function (t) {
      var o = document.createElement('option');
      o.value = o.textContent = t[0];
      sel.appendChild(o);
    });
  });

  if (hasMap) {
  selects.forEach(function (sel) {
    sel.addEventListener('change', function () { flyTo(sel.value); });
  });

  // Draw map
  var NS = 'http://www.w3.org/2000/svg';
  MAP.context.forEach(function (d) {
    var p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d);
    $('mapCtx').appendChild(p);
  });
  MAP.towns.forEach(function (t) {
    var p = document.createElementNS(NS, 'path');
    p.setAttribute('d', t[5]);
    p.setAttribute('fill', PROFILE[t[2]].color);
    p.setAttribute('class', 'clear-t');
    p.addEventListener('click', function () {
      state.town = t[0];
      state.hover = null;
      if (isPhone()) state.zoom = Math.max(state.zoom, 2); // small towns are hard to tap at full-state size
      render();
    });
    p.addEventListener('mouseenter', function () { state.hover = t[0]; renderHover(); });
    p.addEventListener('mouseleave', function () { state.hover = null; renderHover(); });
    $('mapTowns').appendChild(p);
  });

  function view() {
    var z = state.zoom, t = byName[state.town], tx = 0, ty = 0;
    if (z !== 1) {
      tx = Math.min(0, Math.max(W - W * z, W / 2 - t[6] * z));
      ty = Math.min(0, Math.max(H - H * z, H / 2 - t[7] * z));
    }
    return { z: z, tx: tx, ty: ty };
  }
  function toPct(v, x, y) { return { l: ((x * v.z + v.tx) / W) * 100, t: ((y * v.z + v.ty) / H) * 100 }; }

  function overHealthLimit(c) {
    if (!c || c.level_type === 'nd') return false;
    if (/Secondary/i.test(c.limit_label || '')) return false;
    var lim = c.limit, ct = c.ct_action_level, lv = c.level || 0;
    var hi = c.highest_result != null ? c.highest_result : lv;
    var compliance = c.level_type === 'avg' || c.level_type === 'lraa' || c.level_type === '90th';
    if (lim && compliance && lv >= lim) return true;
    if (ct && hi > ct) return true;
    if (lim && hi >= lim) return true;
    return false;
  }
  function fmtLevel(n) {
    if (n == null || isNaN(n)) return '';
    if (Math.abs(n) >= 100) return String(Math.round(n));
    return String(Number(Number(n).toPrecision(3)));
  }
  function shortContam(name) {
    var m = /\(([^)]+)\)/.exec(name || '');
    return m ? m[1] : (name || 'A result');
  }
  function scoreContaminant(c) {
    if (!c || c.level_type === 'nd') return null;
    if (/Secondary/i.test(c.limit_label || '')) return null;
    var lim = c.limit, ct = c.ct_action_level, lv = c.level || 0;
    var hi = c.highest_result != null ? c.highest_result : lv;
    if (hi <= 0 && lv <= 0) return null;
    var compliance = c.level_type === 'avg' || c.level_type === 'lraa' || c.level_type === '90th';
    var best = null;
    function consider(value, limit, kind, usedHigh) {
      if (!limit || !(value > 0)) return;
      var ratio = value / limit;
      if (!best || ratio > best.ratio) best = { ratio: ratio, value: value, limit: limit, kind: kind, usedHigh: usedHigh };
    }
    if (lim) {
      if (compliance) consider(lv, lim, 'limit', false);
      if (hi !== lv) consider(hi, lim, 'limit', true);
      else if (!compliance) consider(hi, lim, 'limit', true);
    }
    if (ct) consider(hi, ct, 'ct', true);
    if (!best) return null;
    best.name = shortContam(c.name);
    best.units = c.units || '';
    best.over = overHealthLimit(c);
    best.action = /action level/i.test(c.limit_label || '');
    return best;
  }
  function townMeter(name) {
    var D = window.CLEAR_WQ;
    if (!D || !D.town_to_utilities || !D.utilities) return { empty: true };
    var ids = D.town_to_utilities[name] || [];
    if (!ids.length) return { empty: true };
    var best = null;
    for (var i = 0; i < ids.length; i++) {
      var util = null;
      for (var j = 0; j < D.utilities.length; j++) {
        if (D.utilities[j].id === ids[i]) util = D.utilities[j];
      }
      if (!util || !util.contaminants) continue;
      for (var k = 0; k < util.contaminants.length; k++) {
        var score = scoreContaminant(util.contaminants[k]);
        if (score && (!best || score.ratio > best.ratio)) best = score;
      }
    }
    return best || { clear: true };
  }
  function paintMeter(name) {
    var root = $('panelMeter');
    if (!root) return;
    var reading = townMeter(name);
    var label = $('panelMeterLabel');
    var pctEl = $('panelMeterPct');
    var detail = $('panelMeterDetail');
    var track = $('panelMeterTrack');
    var fill = $('panelMeterFill');
    var knob = $('panelMeterKnob');
    var empty = !reading || reading.empty;
    var over = !empty && !reading.clear && (reading.over || reading.ratio >= 1);
    var pct = empty || reading.clear ? 0 : Math.round(Number((reading.ratio * 100).toFixed(2)));
    var visual = empty || reading.clear ? 0 : Math.min(reading.ratio / 2, 1);
    root.classList.toggle('is-over', over);
    root.classList.toggle('is-empty', empty);
    if (fill) fill.style.width = (visual * 100).toFixed(1) + '%';
    if (knob) knob.style.left = 'calc(11px + (100% - 22px) * ' + visual + ')';
    var headline = empty
      ? 'No utility report for this town.'
      : (over ? 'Harmful contaminants detected in your water.' : 'Under the legal limit.');
    var line = 'A tap test is the only reading for this water.';
    if (!empty && reading.clear) line = 'Nothing in this report was over a health limit.';
    if (!empty && !reading.clear) {
      var noun = reading.kind === 'ct' ? "Connecticut's action level" : (reading.action ? 'the action level' : 'the federal limit');
      var verb = reading.usedHigh ? 'reached' : 'is at';
      var unit = reading.units ? ' ' + reading.units : '';
      line = reading.name + ' ' + verb + ' ' + fmtLevel(reading.value) + unit + ', ' + (over ? 'over' : 'under') + ' ' + noun + ' of ' + fmtLevel(reading.limit) + unit + '.';
    }
    if (label) label.textContent = headline;
    if (pctEl) pctEl.textContent = empty ? '\u2014' : pct + '%';
    if (detail) detail.textContent = line;
    if (track) {
      track.setAttribute('aria-valuetext', headline + ' ' + line);
      if (empty) track.removeAttribute('aria-valuenow');
      else {
        track.setAttribute('aria-valuenow', String(pct));
        track.setAttribute('aria-valuemax', String(Math.max(200, pct)));
      }
    }
  }

  function render() {
    var t = byName[state.town];
    var p = PROFILE[t[2]];
    var v = view();
    selects.forEach(function (s) { s.value = t[0]; });
    var badge = $('badge');
    badge.textContent = p.badge;
    badge.style.background = p.color;
    $('caution').style.background = p.strip;
    $('panelHeadline').textContent = p.headline;
    $('panelExplainer').textContent = p.explainer;
    var checks = $('panelChecks');
    checks.innerHTML = '';
    p.checks.forEach(function (name) {
      var li = document.createElement('li');
      li.textContent = name;
      checks.appendChild(li);
    });
    $('panelCounty').textContent = t[1];
    $('panelCount').textContent = String(t[3]);
    $('panelLargest').textContent = t[4] || 'None on record';
    $('panelTown').textContent = t[0];
    var panelBook = $('panelBook');
    if (panelBook) panelBook.href = 'book.html#town=' + encodeURIComponent(t[0]);
    paintMeter(t[0]);

    $('mapZoom').style.transform = 'translate(' + v.tx.toFixed(1) + 'px,' + v.ty.toFixed(1) + 'px) scale(' + v.z + ')';
    $('selHalo').setAttribute('d', t[5]);
    $('selLine').setAttribute('d', t[5]);
    var lbl = $('selLabel');
    var pos = toPct(v, t[6], t[7]);
    lbl.hidden = false;
    lbl.style.left = pos.l.toFixed(2) + '%';
    lbl.style.top = pos.t.toFixed(2) + '%';
    $('selLabelText').textContent = t[0];
    renderHover();
  }

  function renderHover() {
    var tip = $('hoverTip');
    var h = state.hover && state.hover !== state.town ? byName[state.hover] : null;
    if (!h) { tip.hidden = true; return; }
    var pos = toPct(view(), h[6], h[7]);
    $('hoverName').textContent = h[0];
    $('hoverBadge').textContent = PROFILE[h[2]].badge;
    tip.style.left = pos.l.toFixed(2) + '%';
    tip.style.top = pos.t.toFixed(2) + '%';
    tip.hidden = false;
  }

  function flyTo(name) {
    if (!byName[name]) return;
    state.town = name;
    state.hover = null;
    state.zoom = Math.max(state.zoom, 2.2);
    render();
  }

  $('zoomIn').addEventListener('click', function () { state.zoom = Math.min(5, +(state.zoom * 1.6).toFixed(2)); render(); });
  $('zoomOut').addEventListener('click', function () { var z = +(state.zoom / 1.6).toFixed(2); state.zoom = z < 1.05 ? 1 : z; render(); });
  $('zoomReset').addEventListener('click', function () { state.zoom = 1; render(); });

  /* ---------------- Hero address check ---------------- */
  $('heroForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var field = $('heroAddr');
    field.value = (field.value || '').trim();
    // Hash instead of ?address= so the value survives the clean-URL redirect on Vercel.
    window.location.href = 'start.html' + (field.value ? '#address=' + encodeURIComponent(field.value) : '');
  });
  render();
  }

  // Longest town name found in the address wins ("South Windsor" beats "Windsor").
  function townFromAddress(raw) {
    var a = (raw || '').toLowerCase();
    var best = null;
    MAP.towns.forEach(function (t) {
      var n = t[0].toLowerCase();
      if (new RegExp('(^|[^a-z])' + n.replace(/ /g, '\\s+') + '([^a-z]|$)').test(a)) {
        if (!best || n.length > best.length) best = t[0];
      }
    });
    return best;
  }

  /* Suggestions while typing, the same idea as a maps search box.
     Esri's public suggest service, limited to Connecticut. */
  function formatSuggestion(text) {
    var cleaned = (text || '').replace(/,\s*USA$/i, '');
    var parts = cleaned.split(',').map(function (p) { return p.trim(); }).filter(Boolean);
    if (!parts.length) return null;
    var secondary = parts.slice(1).join(', ').replace(/,\s*(\d{5}(?:-\d{4})?)$/, ' $1');
    return {
      primary: parts[0],
      secondary: secondary,
      line: secondary ? parts[0] + ', ' + secondary : parts[0],
      raw: cleaned
    };
  }
  function attachAddressSuggest(input, list, onPick) {
    var active = -1;
    var items = [];
    var timer = 0;
    var seq = 0;

    function close() {
      list.hidden = true;
      list.innerHTML = '';
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
      active = -1;
      items = [];
    }
    function paint() {
      var buttons = list.querySelectorAll('button');
      for (var i = 0; i < buttons.length; i++) {
        var on = i === active;
        buttons[i].setAttribute('aria-selected', on ? 'true' : 'false');
        if (on) input.setAttribute('aria-activedescendant', buttons[i].id);
      }
    }
    function choose(i) {
      var item = items[i];
      if (!item) return;
      close();
      onPick(item);
    }
    function open(suggestions) {
      list.innerHTML = '';
      items = suggestions;
      if (!items.length) { close(); return; }
      items.forEach(function (item, i) {
        var li = document.createElement('li');
        li.setAttribute('role', 'presentation');
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.id = list.id + '-' + i;
        btn.setAttribute('role', 'option');
        var main = document.createElement('span');
        main.className = 'addr-main';
        main.textContent = item.primary;
        var sub = document.createElement('span');
        sub.className = 'addr-sub';
        sub.textContent = item.secondary;
        btn.appendChild(main);
        if (item.secondary) btn.appendChild(sub);
        btn.addEventListener('mousedown', function (e) { e.preventDefault(); });
        btn.addEventListener('click', function () { choose(i); });
        li.appendChild(btn);
        list.appendChild(li);
      });
      var credit = document.createElement('li');
      credit.className = 'addr-credit';
      credit.setAttribute('role', 'presentation');
      credit.textContent = 'Address search by Esri';
      list.appendChild(credit);
      active = 0;
      list.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      paint();
    }
    function search(q) {
      var my = ++seq;
      var url = 'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/suggest'
        + '?f=json&countryCode=USA&maxSuggestions=5'
        + '&category=' + encodeURIComponent('Address,Street Address,Street Name')
        + '&searchExtent=-73.75,40.95,-71.75,42.06'
        + '&location=-72.68,41.60&distance=120000'
        + '&text=' + encodeURIComponent(q);
      fetch(url).then(function (r) { return r.json(); }).then(function (data) {
        if (my !== seq || input.value.trim() !== q) return;
        var out = [];
        (data.suggestions || []).forEach(function (s) {
          var item = formatSuggestion(s.text);
          if (item) out.push(item);
        });
        open(out);
      }).catch(function () { if (my === seq) close(); });
    }

    input.addEventListener('input', function () {
      var q = input.value.trim();
      window.clearTimeout(timer);
      if (q.length < 3) { seq++; close(); return; }
      timer = window.setTimeout(function () { search(q); }, 220);
    });
    input.addEventListener('keydown', function (e) {
      if (list.hidden) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(items.length - 1, active + 1); paint(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(0, active - 1); paint(); }
      else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); choose(active); }
      else if (e.key === 'Escape') { close(); }
    });
    input.addEventListener('blur', function () { window.setTimeout(close, 150); });
  }

  if ($('heroAddr') && $('heroAddrList')) {
    attachAddressSuggest($('heroAddr'), $('heroAddrList'), function (item) {
      $('heroAddr').value = item.line;
      window.location.href = 'start.html#address=' + encodeURIComponent(item.line);
    });
  }

  /* ---------------- Phone sticky CTA (home page) ---------------- */
  var stickyCta = $('stickyCta');
  if (stickyCta) {
    document.body.classList.add('sq-has-stickybar');
    var hero = document.getElementById('top');
    var stickyTick = false;
    var stickyPaint = function () {
      stickyTick = false;
      var past = hero ? window.scrollY > hero.offsetHeight - 80 : window.scrollY > 400;
      var nearForm = false;
      var bookSec = document.getElementById('book');
      if (bookSec) {
        var r = bookSec.getBoundingClientRect();
        nearForm = r.top < window.innerHeight * 0.6 && r.bottom > 0;
      }
      var on = past && !nearForm;
      stickyCta.classList.toggle('is-on', on);
      stickyCta.setAttribute('aria-hidden', String(!on));
    };
    window.addEventListener('scroll', function () { if (!stickyTick) { stickyTick = true; requestAnimationFrame(stickyPaint); } }, { passive: true });
    stickyPaint();
  }
  if ($('fStreet') && $('fStreetList')) {
    attachAddressSuggest($('fStreet'), $('fStreetList'), function (item) {
      $('fStreet').value = item.primary;
      var town = townFromAddress(item.raw);
      if (town && $('fTown')) $('fTown').value = town;
    });
  }

  if (!hasMap && $('fTown')) {
    var asked = 'Hartford';
    try {
      var fromLink = new URLSearchParams(window.location.search).get('town');
      var fromHash = new URLSearchParams((window.location.hash || '').replace(/^#/, '')).get('town');
      if (fromLink) asked = fromLink;
      if (fromHash) asked = fromHash;
    } catch (err) {}
    var townSel = $('fTown');
    for (var ti = 0; ti < townSel.options.length; ti++) {
      if (townSel.options[ti].value === asked) { townSel.value = asked; break; }
    }
  }

  /* ---------------- Prefill from the water check (start.html hands off here) ---------------- */
  if ($('bookForm')) {
    try {
      var qp = new URLSearchParams((window.location.hash || '').replace(/^#/, ''));
      new URLSearchParams(window.location.search).forEach(function (v, k) { if (!qp.has(k)) qp.set(k, v); });
      var fill = function (id, key) { var v = qp.get(key); if (v && $(id) && !$(id).value) $(id).value = v; };
      fill('fName', 'name'); fill('fPhone', 'phone'); fill('fEmail', 'email'); fill('fStreet', 'street');
      var pressChip = function (wrapId, label, single) {
        if (!label || !$(wrapId)) return;
        Array.prototype.slice.call($(wrapId).querySelectorAll('.chip')).forEach(function (b) {
          var hit = b.textContent.trim() === label;
          if (hit) b.setAttribute('aria-pressed', 'true');
          else if (single) b.setAttribute('aria-pressed', 'false');
        });
      };
      pressChip('interests', qp.get('interest'), false);
      pressChip('slots', qp.get('slot'), true);
      if (qp.get('src') === 'quiz') {
        var h = document.querySelector('.book-title');
        var nm = (qp.get('name') || '').split(' ')[0];
        if (h && nm) h.innerHTML = 'Last step, ' + nm.replace(/[&<>"']/g, '') + '. <span class="clear-script" style="color: #3E8F74; font-size: 1.15em">Pick a time.</span>';
        var plan = qp.get('plan');
        var hid = document.createElement('input');
        hid.type = 'hidden'; hid.name = 'quiz_plan'; hid.value = plan || '';
        $('bookForm').appendChild(hid);
      }
    } catch (err) {}
  }
})();
