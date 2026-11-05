/* Builds a Sunday water plan from a street address and the town report. */
(function () {
  'use strict';

  var D = window.CLEAR_WQ;
  var root = document.getElementById('planRoot');
  if (!root) return;
  if (!D || !D.towns) {
    root.textContent = 'Water report data did not load.';
    return;
  }

  var RO_KEYS = {
    pfoa: 1, pfos: 1, pfhxs: 1, pfna: 1, pfbs: 1, pfhxa: 1, pfba: 1,
    lead: 1, arsenic: 1, nitrate: 1, uranium: 1
  };
  var COMPLIANCE = { avg: 1, lraa: 1, '90th': 1 };
  var PLANS = {
    essential: {
      name: 'Essential',
      detail: 'Whole-house sediment and carbon filter.',
      image: 'assets/price-essential.png',
      alt: 'A blue sediment filter beside two whole-house tanks'
    },
    soft: {
      name: 'Soft',
      detail: 'A water softener for the whole house.',
      image: 'assets/price-soft.png',
      alt: 'A water softener tank beside a brine tank'
    },
    complete: {
      name: 'Complete',
      detail: 'Soft water through the house, and reverse osmosis at the kitchen sink.',
      image: 'assets/price-complete.png',
      alt: 'A softener, a whole-house filter, and a reverse osmosis tap'
    },
    test: {
      name: 'A free in-home test',
      detail: 'A technician tests the tap at this address and leaves you the results.',
      image: '',
      alt: ''
    }
  };

  var frame = 0;
  function stopMotion() {
    var style = document.getElementById('planLeaveStyle');
    if (!style) {
      style = document.createElement('style');
      style.id = 'planLeaveStyle';
      style.textContent = 'html.is-leaving, html.is-leaving * { animation: none !important; transition: none !important; }';
      document.head.appendChild(style);
    }
    document.documentElement.classList.add('is-leaving');
    if (frame) window.cancelAnimationFrame(frame);
    void document.body.offsetWidth;
  }
  document.addEventListener('pagehide', stopMotion);
  document.addEventListener('click', function (e) {
    var node = e.target;
    if (node && node.nodeType !== 1) node = node.parentNode;
    while (node && node !== document) {
      if (node.tagName === 'A') {
        var href = node.getAttribute('href') || '';
        if (href && href.charAt(0) !== '#') stopMotion();
        return;
      }
      node = node.parentNode;
    }
  }, true);

  var params = new URLSearchParams(window.location.search);
  var address = (params.get('address') || '').trim();
  var asked = params.get('town');

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  // Mailing names that are not the official town. The plan is built for the town.
  var PLACES = {
    'mystic': 'Stonington',
    'old mystic': 'Stonington',
    'west mystic': 'Groton',
    'pawcatuck': 'Stonington',
    'niantic': 'East Lyme',
    'flanders': 'East Lyme',
    'winsted': 'Winchester',
    'willimantic': 'Windham',
    'south windham': 'Windham',
    'rockville': 'Vernon',
    'talcottville': 'Vernon',
    'plantsville': 'Southington',
    'milldale': 'Southington',
    'marion': 'Southington',
    'uncasville': 'Montville',
    'oakdale': 'Montville',
    'jewett city': 'Griswold',
    'danielson': 'Killingly',
    'dayville': 'Killingly',
    'moosup': 'Plainfield',
    'central village': 'Plainfield',
    'wauregan': 'Plainfield',
    'stafford springs': 'Stafford',
    'staffordville': 'Stafford',
    'warehouse point': 'East Windsor',
    'broad brook': 'East Windsor',
    'hazardville': 'Enfield',
    'thompsonville': 'Enfield',
    'poquonock': 'Windsor',
    'collinsville': 'Canton',
    'tariffville': 'Simsbury',
    'weatogue': 'Simsbury',
    'unionville': 'Farmington',
    'kensington': 'Berlin',
    'east berlin': 'Berlin',
    'terryville': 'Plymouth',
    'bantam': 'Litchfield',
    'yalesville': 'Wallingford',
    'northford': 'North Branford',
    'cos cob': 'Greenwich',
    'old greenwich': 'Greenwich',
    'riverside': 'Greenwich',
    'byram': 'Greenwich',
    'glenville': 'Greenwich',
    'rowayton': 'Norwalk',
    'southport': 'Fairfield',
    'georgetown': 'Wilton',
    'storrs': 'Mansfield',
    'mansfield center': 'Mansfield',
    'noank': 'Groton',
    'quaker hill': 'Waterford',
    'gales ferry': 'Ledyard',
    'baltic': 'Sprague',
    'versailles': 'Sprague',
    'ivoryton': 'Essex',
    'centerbrook': 'Essex',
    'higganum': 'Haddam',
    'moodus': 'East Haddam',
    'cobalt': 'East Hampton',
    'middle haddam': 'East Hampton',
    'somersville': 'Somers',
    'north grosvenordale': 'Thompson',
    'grosvenordale': 'Thompson',
    'sandy hook': 'Newtown',
    'hawleyville': 'Newtown',
    'stepney': 'Monroe',
    'gaylordsville': 'New Milford',
    'new preston': 'Washington',
    'marble dale': 'Washington',
    'lakeville': 'Salisbury',
    'falls village': 'Canaan',
    'riverton': 'Barkhamsted',
    'pleasant valley': 'Barkhamsted',
    'forestville': 'Bristol',
    'oakville': 'Watertown',
    'south britain': 'Southbury',
    'hotchkissville': 'Woodbury',
    'west cornwall': 'Cornwall',
    'cornwall bridge': 'Cornwall',
    'west redding': 'Redding',
    'south glastonbury': 'Glastonbury'
  };

  function townFromAddress(raw) {
    var a = (raw || '').toLowerCase();
    var labels = [];
    Object.keys(D.towns).forEach(function (name) { labels.push([name, name]); });
    Object.keys(PLACES).forEach(function (name) { labels.push([name, PLACES[name]]); });
    var best = null;
    labels.forEach(function (pair) {
      var label = pair[0].toLowerCase();
      var town = pair[1];
      var re = new RegExp('(^|[^a-z])' + label.replace(/ /g, '\\s+') + '(?=[^a-z]|$)', 'g');
      var match;
      while ((match = re.exec(a))) {
        var found = {
          name: town,
          index: match.index + match[1].length,
          length: label.length
        };
        if (!best) { best = found; continue; }
        var overlap = found.index < best.index + best.length && best.index < found.index + found.length;
        if (overlap) {
          if (found.length > best.length) best = found;
        } else if (found.index > best.index) {
          best = found;
        }
      }
    });
    return best && best.name;
  }

  function utilitiesFor(town) {
    var byId = {};
    (D.utilities || []).forEach(function (u) { byId[u.id] = u; });
    return (D.town_to_utilities[town] || []).map(function (id) { return byId[id]; }).filter(Boolean)
      .sort(function (a, b) { return (b.population || 0) - (a.population || 0); });
  }

  function rankOf(c) {
    if (!c || c.level_type === 'nd') return 0;
    var lim = c.limit;
    var lv = c.level || 0;
    var hi = c.highest_result != null ? c.highest_result : lv;
    var secondary = /Secondary/i.test(c.limit_label || '');
    if (lim && COMPLIANCE[c.level_type] && lv >= lim && !secondary) return 5;
    if (c.ct_action_level && hi > c.ct_action_level) return 4;
    if (lim && hi >= lim) return secondary ? 2 : 4;
    if (lim && lv >= lim * 0.5) return 2;
    return lv || hi ? 1 : 0;
  }

  function formatAmount(n) {
    if (n == null || isNaN(n)) return '';
    if (n >= 1000) return Math.round(n).toLocaleString('en-US');
    return String(Number(Number(n).toPrecision(3)));
  }

  function findingFrom(c) {
    var meta = D.contaminants[c.key] || {};
    var detected = c.level_type !== 'nd';
    var level = detected
      ? formatAmount(c.level) + ' ' + (c.units || '') + (c.level_label ? ' ' + c.level_label.toLowerCase() : '')
      : 'Not detected';
    var limit = '';
    if (c.limit != null) limit = 'Limit ' + formatAmount(c.limit) + ' ' + (c.units || '');
    else if (c.limit_label) limit = c.limit_label;
    return {
      key: c.key,
      name: c.name,
      rank: rankOf(c),
      pct: c.pct_of_limit || 0,
      level: level,
      limit: limit,
      sentence: meta.what_it_is || ''
    };
  }

  function topFindings(util) {
    var list = (util.contaminants || []).map(findingFrom);
    list.sort(function (a, b) {
      if (b.rank !== a.rank) return b.rank - a.rank;
      return b.pct - a.pct;
    });
    var notable = list.filter(function (f) { return f.rank > 0; });
    return (notable.length ? notable : list).slice(0, 3);
  }

  function wellFindings() {
    var want = ['arsenic', 'uranium', 'radon'];
    var used = {};
    return want.map(function (key) {
      var hit = (D.private_wells.findings || []).filter(function (f) {
        return !used[f.what] && f.what.toLowerCase().indexOf(key) !== -1;
      })[0];
      if (!hit) return null;
      used[hit.what] = 1;
      return hit;
    }).filter(Boolean);
  }

  function recommend(profile, util) {
    var wellPath = profile === 'N' || !util;
    if (wellPath) return { id: 'test', carbon: false, soft: false, ro: false };
    var carbon = /chlorine/i.test(util.disinfectant || '');
    var label = util.hardness_label || '';
    var soft = (util.hardness_gpg != null && util.hardness_gpg >= 7) || /^hard\b/i.test(label);
    var ro = false;
    (util.contaminants || []).forEach(function (c) {
      if ((c.key === 'tthm' || c.key === 'haa5') && (c.pct_of_limit || 0) >= 40) carbon = true;
      if (RO_KEYS[c.key] && rankOf(c) >= 3) ro = true;
    });
    if (ro) return { id: 'complete', carbon: carbon, soft: soft, ro: true };
    if (soft) return { id: 'soft', carbon: carbon, soft: true, ro: false };
    return { id: 'essential', carbon: carbon, soft: false, ro: false };
  }

  function names(list) {
    if (!list.length) return '';
    if (list.length === 1) return list[0];
    if (list.length === 2) return list[0] + ' and ' + list[1];
    return list.slice(0, -1).join(', ') + ', and ' + list[list.length - 1];
  }

  function whyText(choice, findings, profile) {
    if (choice.id === 'test') {
      if (profile === 'M') return 'We don’t have this town’s utility report in this set. The free test is how we see what’s actually at this address.';
      return 'A utility report cannot see a private well. The free test measures what is actually coming out of this tap.';
    }
    var roNames = findings.filter(function (f) { return RO_KEYS[f.key] && f.rank >= 3; }).map(function (f) { return f.name; });
    if (choice.id === 'complete') {
      var what = names(roNames) || 'a contaminant worth taking out of drinking water';
      return 'The report shows ' + what + '. Complete is soft water through the house and reverse osmosis at the kitchen sink.';
    }
    if (choice.id === 'soft') {
      var extra = choice.carbon ? ' Carbon in Essential is the piece that takes out chlorine taste, if that bothers you after the test.' : '';
      return 'This system’s water is hard enough to spot glass and scale up heaters. Soft is the plan for that.' + extra;
    }
    var byproduct = findings.filter(function (f) { return f.key === 'tthm' || f.key === 'haa5'; })[0];
    if (byproduct) {
      return byproduct.name + ' is ' + byproduct.level + '. Essential is a whole-house sediment and carbon filter, which is what takes chlorine taste out of every faucet.';
    }
    return 'This water is disinfected with chlorine. Essential is a whole-house sediment and carbon filter, which is what takes that taste out of every faucet.';
  }

  function profileLine(profile, utils) {
    if (profile === 'N') return 'Most homes here are on private wells. No utility tests those wells.';
    if (profile === 'S' && !utils.length) return 'Only small systems serve parts of this town, and most homes are likely on private wells.';
    if (profile === 'S') return 'Small systems serve parts of this town. Many homes may still be on private wells.';
    if (!utils.length) return 'A public system serves parts of this town. We don’t have that system’s report in this set, so the plan starts with a test of your tap.';
    return 'A public water system serves parts of this town. The numbers below are that system’s report, not a test of this faucet.';
  }

  function buildModel(town) {
    var info = D.towns[town];
    var utils = utilitiesFor(town);
    var util = utils[0] || null;
    var profile = info.profile;
    var wellPath = profile === 'N' || !util;
    var choice = recommend(wellPath ? 'N' : profile, wellPath ? null : util);
    var findings = wellPath ? [] : topFindings(util);
    var wells = (profile === 'N' || (profile === 'S' && !util)) ? wellFindings() : [];
    var others = utils.slice(1).map(function (u) { return u.name; });
    return {
      town: town,
      county: info.county,
      profile: profile,
      address: address,
      street: address ? address.split(',')[0].trim() : town,
      util: wellPath ? null : util,
      others: others,
      choice: choice,
      findings: findings,
      wells: wells,
      wellPath: wellPath,
      line: profileLine(profile, utils),
      why: whyText(choice, findings, profile)
    };
  }

  function stepsFor(model) {
    var second = model.util
      ? 'Read ' + model.util.name + '’s report'
      : (model.wells.length
        ? 'Checked what Connecticut wells tend to show'
        : 'Looked for this town’s utility report');
    return [
      'Found ' + model.town,
      second,
      'Matched a plan for ' + model.street
    ];
  }

  function showMiss() {
    root.textContent = '';
    var box = el('div', 'plan-miss');
    box.appendChild(el('p', 'plan-kicker clear-caps', 'Your plan'));
    box.appendChild(el('h1', 'clear-display', 'Which town?'));
    var lead = el('p', 'plan-lead');
    lead.textContent = address
      ? 'We couldn’t find a Connecticut town in “' + address + '”. Pick yours and we’ll build the plan.'
      : 'Enter a Connecticut town and we’ll build the plan from that town’s water report.';
    box.appendChild(lead);
    var form = el('form');
    var select = el('select');
    select.name = 'town';
    select.setAttribute('aria-label', 'Your town');
    var placeholder = el('option', null, 'Choose a town');
    placeholder.value = '';
    select.appendChild(placeholder);
    Object.keys(D.towns).sort().forEach(function (name) {
      var opt = el('option', null, name);
      opt.value = name;
      select.appendChild(opt);
    });
    var button = el('button', 'clear-caps', 'Build my plan');
    button.type = 'submit';
    form.appendChild(select);
    form.appendChild(button);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!select.value) return;
      var url = new URL(window.location.href);
      url.searchParams.set('town', select.value);
      window.location.href = url.pathname + url.search;
    });
    box.appendChild(form);
    root.appendChild(box);
  }

  function ringCircle(cls) {
    var c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('cx', '60');
    c.setAttribute('cy', '60');
    c.setAttribute('r', '52');
    c.setAttribute('class', cls);
    return c;
  }

  function showBuild(model, done) {
    root.textContent = '';
    var steps = stepsFor(model);
    var box = el('div', 'plan-build');
    box.appendChild(el('p', 'plan-kicker clear-caps', 'Building your plan'));
    var title = el('h1', 'clear-display');
    title.textContent = model.street || model.town;
    box.appendChild(title);

    var ring = el('div', 'plan-ring');
    ring.setAttribute('role', 'progressbar');
    ring.setAttribute('aria-valuemin', '0');
    ring.setAttribute('aria-valuemax', '100');
    ring.setAttribute('aria-valuenow', '0');
    ring.setAttribute('aria-label', 'Building your plan');
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 120 120');
    svg.setAttribute('aria-hidden', 'true');
    var defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    var grad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    grad.setAttribute('id', 'planRingGrad');
    grad.setAttribute('x1', '0');
    grad.setAttribute('y1', '1');
    grad.setAttribute('x2', '1');
    grad.setAttribute('y2', '0');
    [['0', '#3E8F74'], ['100', '#14244D']].forEach(function (stop) {
      var node = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      node.setAttribute('offset', stop[0] + '%');
      node.setAttribute('stop-color', stop[1]);
      grad.appendChild(node);
    });
    defs.appendChild(grad);
    svg.appendChild(defs);
    svg.appendChild(ringCircle('plan-ring-track'));
    var value = ringCircle('plan-ring-value');
    svg.appendChild(value);
    ring.appendChild(svg);
    var spin = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    spin.setAttribute('class', 'plan-ring-spin');
    spin.setAttribute('viewBox', '0 0 120 120');
    spin.setAttribute('aria-hidden', 'true');
    spin.appendChild(ringCircle('plan-ring-spin-arc'));
    ring.appendChild(spin);
    var rotor = el('span', 'plan-ring-rotor');
    rotor.setAttribute('aria-hidden', 'true');
    var knob = el('span', 'plan-ring-knob');
    rotor.appendChild(knob);
    ring.appendChild(rotor);
    var pct = el('span', 'plan-ring-pct', '0');
    var count = el('div', 'plan-ring-count');
    count.appendChild(pct);
    count.appendChild(el('span', 'plan-ring-unit', '%'));
    ring.appendChild(count);
    box.appendChild(ring);

    var status = el('p', 'plan-build-status');
    status.setAttribute('aria-live', 'polite');
    status.textContent = 'Matching this address to ' + model.town + '…';
    box.appendChild(status);

    var bar = el('div', 'plan-bar');
    bar.setAttribute('aria-hidden', 'true');
    var barFill = el('span');
    bar.appendChild(barFill);
    box.appendChild(bar);

    var list = el('ol', 'plan-steps');
    var items = steps.map(function (label, index) {
      var li = el('li');
      var mark = el('span', 'plan-mark', String(index + 1));
      mark.setAttribute('aria-hidden', 'true');
      li.appendChild(mark);
      li.appendChild(el('span', null, label));
      list.appendChild(li);
      return li;
    });
    box.appendChild(list);
    root.appendChild(box);

    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { done(); return; }

    var RING = 326.73;
    var DURATION = 1800;
    var shown = -1;
    var stepOn = -1;
    function apply(p) {
      var clamped = p < 0 ? 0 : (p > 100 ? 100 : p);
      value.style.strokeDashoffset = String(RING * (1 - clamped / 100));
      rotor.style.transform = 'rotate(' + (clamped * 3.6) + 'deg)';
      barFill.style.transform = 'scaleX(' + (clamped / 100) + ')';
      var n = Math.round(clamped);
      if (n !== shown) {
        shown = n;
        pct.textContent = String(n);
        ring.setAttribute('aria-valuenow', String(n));
      }
      var step = clamped >= 100 ? steps.length : Math.floor(clamped / (100 / steps.length));
      if (step === stepOn) return;
      stepOn = step;
      items.forEach(function (item, index) {
        item.classList.toggle('is-done', index < step);
        item.classList.toggle('is-active', index === step);
      });
      if (step < steps.length) status.textContent = steps[step];
    }

    var start = window.performance.now();
    function tick(now) {
      var t = Math.min(1, (now - start) / DURATION);
      var eased = 1 - Math.pow(1 - t, 3);
      apply(eased * 100);
      if (t < 1) {
        frame = window.requestAnimationFrame(tick);
        return;
      }
      items.forEach(function (item) {
        item.classList.remove('is-active');
        item.classList.add('is-done');
      });
      ring.classList.add('is-complete');
      status.textContent = 'Your plan is ready.';
      window.setTimeout(done, 460);
    }
    frame = window.requestAnimationFrame(tick);
  }

  function addFinding(parent, title, level, sentence) {
    var card = el('article', 'plan-finding clear-sticker');
    card.appendChild(el('h3', null, title));
    if (level) card.appendChild(el('p', 'plan-level', level));
    if (sentence) card.appendChild(el('p', null, sentence));
    parent.appendChild(card);
  }

  function showResult(model) {
    root.textContent = '';
    var plan = PLANS[model.choice.id];
    var box = el('div');
    box.setAttribute('aria-live', 'polite');
    box.appendChild(el('p', 'plan-kicker clear-caps', 'Your plan'));
    var title = el('h1', 'clear-display');
    title.textContent = model.address || model.town;
    box.appendChild(title);
    box.appendChild(el('p', 'plan-home', model.town + ', Connecticut'));
    var badge = el('div', 'plan-badge clear-caps');
    badge.textContent = model.profile === 'N' ? 'Likely private wells' : (model.profile === 'S' ? 'Small systems' : 'Public system present');
    box.appendChild(badge);

    var report = el('section', 'plan-block');
    report.appendChild(el('h2', 'clear-display', 'What the report shows'));
    report.appendChild(el('p', 'plan-note', model.line));
    if (model.util) {
      var source = model.util.name + (model.util.data_years ? ', ' + model.util.data_years : '');
      if (model.others.length) source += '. Also serving parts of ' + model.town + ': ' + names(model.others) + '.';
      report.appendChild(el('p', 'plan-note', source));
    }
    var findings = el('div', 'plan-findings');
    if (model.wellPath) {
      model.wells.forEach(function (f) {
        addFinding(findings, f.what, f.value, f.detail);
      });
    } else {
      model.findings.forEach(function (f) {
        var level = f.level + (f.limit ? ' · ' + f.limit : '');
        addFinding(findings, f.name, level, f.sentence);
      });
    }
    report.appendChild(findings);
    box.appendChild(report);

    var yours = el('section', 'plan-block');
    yours.appendChild(el('h2', 'clear-display', 'The plan for this address'));
    var card = el('div', 'plan-card clear-sticker');
    if (plan.image) {
      var img = el('img');
      img.src = plan.image;
      img.alt = plan.alt;
      card.appendChild(img);
    }
    var copy = el('div');
    copy.appendChild(el('p', 'clear-caps', 'Recommended'));
    copy.appendChild(el('h2', 'clear-display', plan.name));
    copy.appendChild(el('p', null, model.why));
    var book = el('a', 'clear-caps', 'Book my free water test');
    book.href = 'book.html?town=' + encodeURIComponent(model.town);
    copy.appendChild(book);
    card.appendChild(copy);
    yours.appendChild(card);
    var foot = el('p', 'plan-foot');
    if (model.wells.length) {
      foot.textContent = 'No utility tests a private well. The figures above are statewide well studies, not a sample from this address. ';
    } else if (!model.util) {
      foot.textContent = 'This plan is not a lab test of the faucet at this address. ';
    } else {
      foot.textContent = 'These numbers are the utility report for a system that serves parts of ' + model.town + ', not a test of the faucet at this address. A listing does not mean every home is on that system. ';
    }
    var again = el('a', null, 'Try another address');
    again.href = 'index.html#top';
    foot.appendChild(again);
    yours.appendChild(foot);
    box.appendChild(yours);
    root.appendChild(box);
  }

  var town = (asked && D.towns[asked]) ? asked : townFromAddress(address);
  if (!town) { showMiss(); return; }
  var model = buildModel(town);
  showBuild(model, function () { showResult(model); });
})();
