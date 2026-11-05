/* Clear — "What's in your water" module.
 *
 * Self-contained: needs data/ct-water-quality.js (window.CLEAR_WQ) loaded first.
 * Adds exactly one global: window.ClearWaterReport. Touches no element outside its own container.
 *
 * Use:  <div data-clear-water-report data-sync-select="#townSelect" data-cta-href="#book"></div>
 * or:   ClearWaterReport.mount(element, { town: 'Hartford', syncSelect: '#townSelect', ctaHref: '#book' })
 */
(function () {
  'use strict';
  if (window.ClearWaterReport) return;

  var SVGNS = 'http://www.w3.org/2000/svg';
  var COMPLIANCE_TYPES = ['avg', 'lraa', '90th'];

  var SYSTEMS = {
    brain: 'Brain & learning', nervous: 'Nervous system', thyroid: 'Thyroid', lungs: 'Lungs',
    heart: 'Heart & blood pressure', liver: 'Liver', stomach: 'Stomach', kidneys: 'Kidneys',
    immune: 'Immune system', skin: 'Skin & circulation', bones: 'Bones', teeth: 'Teeth',
    development: 'Babies & children', infants: 'Infants under 6 months', cancer: 'Cancer risk'
  };

  /* ---------- small helpers ---------- */
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function svg(tag, attrs) {
    var e = document.createElementNS(SVGNS, tag);
    for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
    return e;
  }
  function fmt(n) {
    if (n == null || isNaN(n)) return '';
    if (n >= 1000) return Math.round(n).toLocaleString('en-US');
    return String(Number(Number(n).toPrecision(3)));
  }
  function each(list, fn) { for (var i = 0; i < list.length; i++) fn(list[i], i); }

  /* ---------- status of one detected contaminant ---------- */
  function statusOf(c) {
    if (c.level_type === 'nd') return { k: 'nd', label: 'Not detected', rank: 0 };
    var lim = c.limit, ct = c.ct_action_level, lv = c.level || 0;
    var hi = c.highest_result != null ? c.highest_result : lv;
    var isPfas = c.key === 'pfoa' || c.key === 'pfos';
    var isPlumbing = c.key === 'lead' || c.key === 'copper';
    var secondary = /Secondary/i.test(c.limit_label || '');
    if (lim && COMPLIANCE_TYPES.indexOf(c.level_type) >= 0 && lv >= lim && !secondary)
      return { k: 'above', label: isPfas ? 'Average above new federal limit' : 'Above federal limit', rank: 5 };
    if (ct && hi > ct) return { k: 'warn', label: "A result topped CT's action level", rank: 4 };
    if (lim && hi >= lim) {
      if (isPlumbing) return { k: 'warn', label: 'Some homes over the action level', rank: 4 };
      if (secondary) return { k: 'near', label: 'Some samples over taste/stain standard', rank: 2 };
      if (isPfas) return { k: 'warn', label: 'Highest result above new federal limit', rank: 4 };
      return { k: 'warn', label: 'Some samples over the limit', rank: 3 };
    }
    if (lim && lv >= lim * 0.5) return { k: 'near', label: 'Over half the limit', rank: 2 };
    if (!lim && ct && hi >= ct * 0.25) return { k: 'near', label: "Detected — under CT's action level", rank: 2 };
    if (lv === 0 && hi) return { k: 'low', label: 'Mostly not detected', rank: 1 };
    return { k: 'low', label: 'Detected, under the limit', rank: 1 };
  }

  /* ---------- the module ---------- */
  function Report(root, opts) {
    this.root = root;
    this.opts = opts || {};
    this.D = window.CLEAR_WQ;
    this.town = null;
    this.utilIndex = 0;
    this.filter = null;
    this.syncing = false;
    if (!this.D || !this.D.towns) {
      root.textContent = '';
      root.appendChild(el('p', 'cwr-foot', 'Water report data did not load (data/ct-water-quality.js).'));
      return;
    }
    this.build();
    this.setTown(this.opts.town || this.readSync() || 'Hartford');
    this.listenSync();
  }

  Report.prototype.build = function () {
    var r = this.root, self = this;
    r.classList.add('cwr');
    if (this.opts.embedded) r.classList.add('cwr-embedded');
    r.textContent = '';
    var wrap = el('div', 'cwr-wrap');

    this.select = null;
    if (!this.opts.embedded) {
      var head = el('div', 'cwr-head');
      var h = el('div');
      h.appendChild(el('div', 'cwr-caps cwr-eyebrow', 'What the reports say'));
      var t = el('h2', 'cwr-display cwr-title');
      t.appendChild(document.createTextNode("What's in your "));
      t.appendChild(el('span', 'cwr-script', 'water'));
      h.appendChild(t);
      h.appendChild(el('p', 'cwr-lede', "Pick your town to see what your water supplier's latest report found, how it compares to the legal limits, and what the science says it can do to your body."));
      head.appendChild(h);

      var pick = el('div', 'cwr-picker');
      var id = 'cwr-town-' + Math.random().toString(36).slice(2, 8);
      var lab = el('label', 'cwr-caps', 'Your town');
      lab.setAttribute('for', id);
      var sw = el('div', 'cwr-select-wrap');
      var sel = el('select', 'cwr-select');
      sel.id = id;
      Object.keys(this.D.towns).sort().forEach(function (name) {
        var o = el('option', null, name); o.value = name; sel.appendChild(o);
      });
      sel.addEventListener('change', function () { self.setTown(sel.value, true); });
      sw.appendChild(sel);
      var chev = svg('svg', { width: 14, height: 14, viewBox: '0 0 14 14', 'aria-hidden': 'true' });
      chev.appendChild(svg('path', { d: 'M3 5l4 4 4-4', fill: 'none', stroke: '#1C3F36', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
      sw.appendChild(chev);
      pick.appendChild(lab); pick.appendChild(sw);
      head.appendChild(pick);
      wrap.appendChild(head);
      this.select = sel;
    }

    var grid = el('div', 'cwr-grid');
    var side = el('aside', 'cwr-side');
    side.setAttribute('aria-label', 'Body systems linked to what was found');
    this.side = side;
    grid.appendChild(side);
    var main = el('div', 'cwr-main');
    main.setAttribute('aria-live', 'polite');
    this.main = main;
    grid.appendChild(main);
    wrap.appendChild(grid);
    r.appendChild(wrap);
    this.buildBody();
  };

  Report.prototype.buildBody = function () {
    var self = this, panel = el('div', 'cwr-panel cwr-body');
    panel.appendChild(el('div', 'cwr-caps cwr-body-title', 'Where it can affect you'));
    this.bodySub = el('p', 'cwr-body-sub', '');
    panel.appendChild(this.bodySub);

    this.spots = {};
    var list = el('div', 'cwr-systems');
    this.sysButtons = {};
    Object.keys(SYSTEMS).forEach(function (k) {
      var b = el('button', 'cwr-sys', SYSTEMS[k]);
      b.type = 'button';
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () { self.toggleFilter(k); });
      list.appendChild(b);
      self.sysButtons[k] = b;
    });
    panel.appendChild(list);
    this.filterNote = el('p', 'cwr-filter-note');
    this.filterNote.hidden = true;
    panel.appendChild(this.filterNote);
    panel.appendChild(el('p', 'cwr-foot', 'Health links come from EPA and CT DPH and describe years of exposure above legal limits. Finding something is not the same as harm.'));
    this.side.appendChild(panel);
  };

  Report.prototype.toggleFilter = function (k) {
    if (this.sysButtons[k] && this.sysButtons[k].disabled) return;
    this.filter = this.filter === k ? null : k;
    this.renderMain();
  };

  /* ---------- town + sync ---------- */
  Report.prototype.readSync = function () {
    var s = this.opts.syncSelect && document.querySelector(this.opts.syncSelect);
    return s && s.value && this.D.towns[s.value] ? s.value : null;
  };
  Report.prototype.listenSync = function () {
    var self = this, sel = this.opts.syncSelect;
    if (!sel) return;
    // The page's own map sets its dropdown in code (no change event), so re-read it after any click, change or submit.
    var check = function () {
      setTimeout(function () {
        var v = self.readSync();
        if (v && v !== self.town) self.setTown(v);
      }, 0);
    };
    document.addEventListener('click', check, true);
    document.addEventListener('change', check, true);
    document.addEventListener('submit', check, true);
  };

  Report.prototype.setTown = function (name, fromUser) {
    if (!this.D.towns[name]) return;
    this.town = name;
    this.utilIndex = 0;
    this.filter = null;
    this.showAll = false;
    if (this.select) this.select.value = name;
    // Push the choice back to the page's own picker so the map follows along.
    if (fromUser && this.opts.syncSelect) {
      var s = document.querySelector(this.opts.syncSelect);
      if (s && s.value !== name) {
        s.value = name;
        try { s.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) { /* old browsers */ }
      }
    }
    this.renderMain();
  };

  /* ---------- what to show for the current town ---------- */
  Report.prototype.current = function () {
    var D = this.D, town = D.towns[this.town];
    var ids = D.town_to_utilities[this.town] || [];
    var utils = ids.map(function (id) { for (var i = 0; i < D.utilities.length; i++) if (D.utilities[i].id === id) return D.utilities[i]; return null; }).filter(Boolean);
    return { town: town, utils: utils, util: utils[this.utilIndex] || null, wells: town.profile !== 'M' };
  };

  Report.prototype.renderMain = function () {
    var self = this, D = this.D, cur = this.current(), m = this.main;
    m.textContent = '';

    // collect which body systems the shown contaminants touch
    // hit = linked to anything detected; hot = linked to a result at/near a limit (or a well-water risk)
    var shown = [];
    if (cur.util) shown = cur.util.contaminants.filter(function (c) { return c.level_type !== 'nd'; }).map(function (c) { return { k: c.key, hot: statusOf(c).rank >= 2 }; });
    if (cur.wells || !cur.util) shown = shown.concat([{ k: 'arsenic', hot: true }, { k: 'uranium', hot: true }, { k: 'radon', hot: true }]);
    var hit = {}, hot = {};
    each(shown, function (x) {
      var ref = D.contaminants[x.k];
      if (ref && ref.body) each(ref.body, function (b) { hit[b] = true; if (x.hot) hot[b] = true; });
    });
    if (this.filter && !hit[this.filter]) this.filter = null;
    if (this.spots) Object.keys(this.spots).forEach(function (k) {
      self.spots[k].classList.toggle('is-hit', !!hot[k]);
      self.spots[k].classList.toggle('is-detected', !!hit[k] && !hot[k]);
      self.spots[k].classList.toggle('is-selected', self.filter === k);
    });
    Object.keys(this.sysButtons).forEach(function (k) {
      var b = self.sysButtons[k];
      b.classList.toggle('is-hit', !!hot[k]);
      b.classList.toggle('is-detected', !!hit[k] && !hot[k]);
      b.disabled = !hit[k];
      b.setAttribute('aria-pressed', String(self.filter === k));
    });
    var n = Object.keys(hot).length;
    this.bodySub.textContent = n
      ? 'Orange = linked to a result at or near a limit. Light = detected well under the limit. Tap any to filter.'
      : 'Nothing here came close to a limit. Light areas are linked to things detected well under the limit.';
    if (this.filter) {
      this.filterNote.hidden = false;
      this.filterNote.textContent = 'Showing what affects: ' + SYSTEMS[this.filter] + '. ';
      var clr = el('button', null, 'Show all');
      clr.type = 'button';
      clr.addEventListener('click', function () { self.filter = null; self.renderMain(); });
      this.filterNote.appendChild(clr);
    } else this.filterNote.hidden = true;

    if (cur.wells) m.appendChild(this.wellPanel(cur));
    if (cur.util) {
      m.appendChild(this.utilPanel(cur));
      m.appendChild(this.cards(cur.util));
    } else if (!cur.wells) {
      var p = el('div', 'cwr-panel');
      p.appendChild(el('div', 'cwr-util-name', "We haven't added " + this.town + "'s supplier report yet."));
      p.appendChild(el('p', 'cwr-foot', this.town + ' has public water, but its supplier is not one of the 11 major systems in our dataset. The quickest way to know what is in your tap is to test it.'));
      m.appendChild(p);
    }
    m.appendChild(this.leadCallout(cur));
  };

  Report.prototype.wellPanel = function (cur) {
    var W = this.D.private_wells, p = el('div', 'cwr-panel cwr-panel-dark');
    p.appendChild(el('div', 'cwr-caps cwr-eyebrow', cur.town.profile === 'N' ? 'Most homes here are on private wells' : 'Many homes here are on private wells'));
    p.appendChild(el('div', 'cwr-util-name', 'Nobody tests your well but you.'));
    p.appendChild(el('p', null, W.headline + ' ' + W.advice));
    var g = el('div', 'cwr-stat-grid');
    each(W.findings, function (f) {
      var s = el('div', 'cwr-stat');
      s.appendChild(el('strong', null, f.value));
      s.appendChild(el('span', null, f.what));
      var small = el('small');
      var a = el('a', null, f.source); a.href = f.url; a.target = '_blank'; a.rel = 'noopener';
      small.appendChild(a);
      s.appendChild(small);
      g.appendChild(s);
    });
    p.appendChild(g);
    var cta = el('a', 'cwr-cta cwr-caps', 'Test my well for free');
    cta.href = this.opts.ctaHref || '#book';
    cta.style.marginTop = '18px';
    cta.style.background = '#14244D';
    cta.style.setProperty('color', '#fff', 'important');
    p.appendChild(cta);
    return p;
  };

  Report.prototype.utilPanel = function (cur) {
    var self = this, u = cur.util, p = el('div', 'cwr-panel cwr-panel-dark');
    if (cur.utils.length > 1) {
      var tabs = el('div', 'cwr-util-tabs');
      tabs.setAttribute('role', 'tablist');
      tabs.setAttribute('aria-label', 'Water systems that serve ' + this.town);
      each(cur.utils, function (x, i) {
        var b = el('button', 'cwr-tab', x.name);
        b.type = 'button';
        b.setAttribute('role', 'tab');
        b.setAttribute('aria-selected', String(i === self.utilIndex));
        b.addEventListener('click', function () { self.utilIndex = i; self.filter = null; self.showAll = false; self.renderMain(); });
        tabs.appendChild(b);
      });
      p.appendChild(el('div', 'cwr-caps cwr-eyebrow', cur.utils.length + ' public water systems serve parts of ' + this.town));
      p.lastChild.style.color = '#C5D4EE';
      p.lastChild.style.marginBottom = '8px';
      p.appendChild(tabs);
    } else {
      var eb = el('div', 'cwr-caps cwr-eyebrow', 'A public water system serving ' + this.town);
      eb.style.color = '#C5D4EE';
      p.appendChild(eb);
    }
    p.appendChild(el('div', 'cwr-util-name', u.name));
    var meta = el('div', 'cwr-util-meta');
    if (u.population) meta.appendChild(el('span', null, 'Serves about ' + fmt(u.population) + ' people'));
    if (u.hardness_gpg != null) meta.appendChild(el('span', null, 'Hardness ' + u.hardness_gpg + ' gpg (' + u.hardness_label.toLowerCase() + ')'));
    var isOld = /^EWG/.test(u.source_type);
    var badge = el('span', 'cwr-badge cwr-caps' + (isOld ? ' cwr-badge-old' : ''), isOld ? 'State data ' + u.data_years.split(' ')[0] : '2025 report');
    meta.appendChild(badge);
    var a = el('a', null, isOld ? 'See the data' : 'Read the report');
    a.href = u.source_url; a.target = '_blank'; a.rel = 'noopener';
    meta.appendChild(a);
    p.appendChild(meta);
    if (u.notes && u.notes.length) {
      var ul = el('ul', 'cwr-notes');
      each(u.notes, function (t) { ul.appendChild(el('li', null, t)); });
      p.appendChild(ul);
    }
    var who = el('p', null, 'Not sure who supplies your home? The company name is on your water bill. If you have no water bill, you are likely on a private well.');
    who.style.cssText = 'margin:14px 0 0;font-size:13px;opacity:.8';
    p.appendChild(who);
    return p;
  };

  Report.prototype.cards = function (u) {
    var self = this, D = this.D, box = el('div');
    var list = u.contaminants.map(function (c) { return { c: c, s: statusOf(c), ref: D.contaminants[c.key] || {} }; });
    var nd = list.filter(function (x) { return x.s.k === 'nd'; });
    list = list.filter(function (x) { return x.s.k !== 'nd'; });
    if (this.filter) list = list.filter(function (x) { return (x.ref.body || []).indexOf(self.filter) >= 0; });
    list.sort(function (a, b) {
      if (b.s.rank !== a.s.rank) return b.s.rank - a.s.rank;
      var pa = a.c.limit ? (a.c.highest_result || a.c.level) / a.c.limit : 0;
      var pb = b.c.limit ? (b.c.highest_result || b.c.level) / b.c.limit : 0;
      return pb - pa;
    });

    if (nd.length && !this.filter) {
      each(nd, function (x) {
        var g = el('div', 'cwr-good');
        g.appendChild(el('b', null, '✓'));
        g.appendChild(el('span', null, x.ref.name + ': none detected (' + x.c.year + ' testing).'));
        g.style.marginBottom = '14px';
        box.appendChild(g);
      });
    }
    var grid = el('div', 'cwr-cards');
    var LIMIT = 6;
    var visible = (this.showAll || this.filter) ? list : list.slice(0, LIMIT);
    each(visible, function (x) { grid.appendChild(self.card(x.c, x.s, x.ref)); });
    box.appendChild(grid);
    if (visible.length < list.length) {
      box.style.display = 'flex';
      box.style.flexDirection = 'column';
      var more = el('button', 'cwr-more-btn cwr-caps', 'Show all ' + list.length + ' results');
      more.type = 'button';
      more.addEventListener('click', function () { self.showAll = true; self.renderMain(); });
      box.appendChild(more);
    }
    return box;
  };

  Report.prototype.card = function (c, s, ref) {
    var card = el('article', 'cwr-card');
    var top = el('div', 'cwr-card-top');
    var nm = el('div');
    nm.appendChild(el('h3', 'cwr-card-name', ref.name || c.name));
    nm.appendChild(el('div', 'cwr-caps cwr-card-group', ref.group || ''));
    top.appendChild(nm);
    top.appendChild(el('span', 'cwr-status cwr-caps cwr-status-' + s.k, s.label));
    card.appendChild(top);

    var v = el('div', 'cwr-value');
    v.appendChild(el('strong', null, c.level ? fmt(c.level) + ' ' + c.units : 'ND'));
    v.appendChild(el('span', null, c.level ? c.level_label : 'Average below detection'));
    card.appendChild(v);

    // gauge against federal limit and/or CT action level
    var lim = c.limit, ct = c.ct_action_level, hi = c.highest_result;
    if (lim || ct) {
      var maxv = Math.max(lim || 0, ct || 0, hi || 0, c.level || 0) * 1.15;
      var g = el('div', 'cwr-gauge');
      g.setAttribute('role', 'img');
      var bits = [(c.level ? fmt(c.level) : 'none') + ' ' + c.units];
      var f = el('div', 'cwr-gauge-fill' + (s.k === 'above' ? ' is-high' : (s.k === 'warn' || s.k === 'near') ? ' is-mid' : ''));
      f.style.width = Math.max(1.5, ((c.level || 0) / maxv) * 100) + '%';
      g.appendChild(f);
      var mark = function (val, label, cls) {
        var pct = (val / maxv) * 100;
        var mk = el('div', 'cwr-mark' + (cls ? ' ' + cls : '') + (pct > 82 ? ' is-right' : pct < 12 ? ' is-left' : ''));
        mk.style.left = pct + '%';
        mk.appendChild(el('span', null, label));
        g.appendChild(mk);
      };
      if (lim) { mark(lim, (/Secondary/i.test(c.limit_label) ? 'Standard ' : 'Limit ') + fmt(lim)); bits.push('legal limit ' + fmt(lim)); }
      if (ct && ct !== lim) { mark(ct, 'CT ' + fmt(ct), 'cwr-mark-ct'); bits.push("Connecticut action level " + fmt(ct)); }
      if (hi && hi > (c.level || 0)) {
        var d = el('div', 'cwr-hi');
        d.style.left = (hi / maxv) * 100 + '%';
        d.title = 'Highest result ' + fmt(hi);
        g.appendChild(d);
        bits.push('highest result ' + fmt(hi));
      }
      g.setAttribute('aria-label', bits.join(', '));
      card.appendChild(g);
    }
    var facts = [];
    if (hi && hi > (c.level || 0)) facts.push('Highest result ' + fmt(hi) + ' ' + c.units);
    if (c.range) facts.push('Range ' + c.range);
    if (c.year) facts.push(c.year);
    card.appendChild(el('p', 'cwr-facts', facts.join(' · ')));
    card.appendChild(el('p', 'cwr-facts', c.limit_label || ''));

    var more = el('details', 'cwr-more');
    more.appendChild(el('summary', null, 'What it is & what it can do'));
    if (ref.what_it_is) more.appendChild(el('p', null, ref.what_it_is));
    if (ref.health) {
      var hp = el('p');
      hp.appendChild(el('b', null, 'Health: '));
      hp.appendChild(document.createTextNode(ref.health));
      more.appendChild(hp);
      if (ref.body && ref.body.length) {
        var tags = el('div', 'cwr-tags');
        each(ref.body, function (b) { tags.appendChild(el('span', 'cwr-tag', SYSTEMS[b])); });
        more.appendChild(tags);
      }
    }
    if (ref.reduced_by) {
      var rp = el('p');
      rp.appendChild(el('b', null, 'Reduced by: '));
      rp.appendChild(document.createTextNode(ref.reduced_by));
      more.appendChild(rp);
    }
    if (ref.health_source) {
      var sp = el('p', 'cwr-src');
      var a = el('a', null, 'Health source');
      a.href = ref.health_source; a.target = '_blank'; a.rel = 'noopener';
      sp.appendChild(a);
      more.appendChild(sp);
    }
    card.appendChild(more);
    return card;
  };

  Report.prototype.leadCallout = function (cur) {
    var box = el('div', 'cwr-callout');
    var icon = svg('svg', { width: 28, height: 28, viewBox: '0 0 28 28', 'aria-hidden': 'true' });
    icon.appendChild(svg('path', { d: 'M14 3 C14 3 6 13 6 18 a8 8 0 0 0 16 0 C22 13 14 3 14 3Z', fill: '#FFFFFF', stroke: '#1C3F36', 'stroke-width': 2.4, 'stroke-linejoin': 'round' }));
    box.appendChild(icon);
    var col = el('div');
    var p = el('p');
    p.appendChild(el('b', null, cur.util ? 'Your utility’s report covers its system, not your pipes. ' : 'Your well isn’t covered by any report. '));
    p.appendChild(document.createTextNode(cur.util
      ? 'Lead and copper mostly come from plumbing inside homes, and some homes test far higher than the system average. The only way to know what comes out of your tap is to test it.'
      : 'Routine well tests skip arsenic and uranium — the state recommends testing for both at least once.'));
    col.appendChild(p);
    var cta = el('a', 'cwr-cta cwr-caps', 'Book a free water test');
    cta.href = this.opts.ctaHref || '#book';
    cta.style.marginTop = '12px';
    col.appendChild(cta);
    box.appendChild(col);
    return box;
  };

  /* ---------- public API ---------- */
  var instances = [];
  window.ClearWaterReport = {
    version: '1.0.0',
    mount: function (target, opts) {
      var node = typeof target === 'string' ? document.querySelector(target) : target;
      if (!node) return null;
      var r = new Report(node, opts);
      instances.push(r);
      return { setTown: function (t) { r.setTown(t); }, element: node };
    },
    setTown: function (t) { each(instances, function (r) { r.setTown(t); }); }
  };

  function auto() {
    each(document.querySelectorAll('[data-clear-water-report]'), function (node) {
      if (node.__cwr) return;
      node.__cwr = true;
      window.ClearWaterReport.mount(node, {
        town: node.getAttribute('data-town') || null,
        syncSelect: node.getAttribute('data-sync-select') || null,
        ctaHref: node.getAttribute('data-cta-href') || '#book',
        embedded: node.hasAttribute('data-embedded')
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto);
  else auto();
})();
