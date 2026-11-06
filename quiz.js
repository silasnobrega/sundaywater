/* Sunday water check — the intake quiz behind start.html
   Pattern: one question per screen, big tap targets, auto-advance on single-choice,
   progress bar, info breaks, contact before the result, result built from the answers.
   Vanilla JS, no dependencies. Reads window.CLEAR_WQ (town water data) if it loaded. */
(function () {
  'use strict';

  var CONFIG = {
    // Where to POST the finished lead as JSON. Leave empty to only keep it in localStorage.
    // Examples: a Formspree endpoint, a Zapier catch hook, a Supabase edge function, your CRM.
    leadEndpoint: window.SUNDAY_LEAD_ENDPOINT || '',
    // Show "from $X" on the result card. Prices are placeholders until the plans are set.
    showPrices: false,
    phone: '475-241-4486',
    phoneHref: 'tel:+14752414486',
    bookUrl: 'book.html',
    storageKey: 'sunday_quiz_v1',
    leadsKey: 'sunday_quiz_leads'
  };

  var D = window.CLEAR_WQ || null;
  var $ = function (id) { return document.getElementById(id); };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var PROFILE = {
    N: { badge: 'Likely private wells', color: '#E07A62', headline: 'This water is probably untested.', body: 'No utility tests a private well. No community system serving 1,000+ people lists this town, so only the homeowner can test this water.', checks: ['Bacteria', 'Arsenic', 'Hardness', 'Iron', 'Chlorine'] },
    S: { badge: 'Small systems only', color: '#E4C56A', headline: 'Most of this water is probably untested.', body: 'Only small community systems serve parts of this town. Most homes are likely on private wells, and those wells are not tested by any utility.', checks: ['Bacteria', 'Arsenic', 'Hardness', 'Iron', 'Chlorine'] },
    M: { badge: 'Public system present', color: '#A9D4C4', headline: 'A utility report is not your kitchen tap.', body: 'A large community system serves parts of this town. Coverage is not reported street by street, and some homes may still be on private wells.', checks: ['Chlorine', 'Hardness', 'Iron'] }
  };

  var PLANS = {
    essential: { key: 'essential', name: 'Essential', detail: 'Whole-house sediment + carbon filter. Every faucet.', image: 'assets/price-essential.png', alt: 'A blue sediment filter beside two whole-house tanks', price: '$[X,XXX]', interest: 'Whole-house filter' },
    soft: { key: 'soft', name: 'Soft', detail: 'Whole-house water softener. Stops scale, softens laundry, skin and hair.', image: 'assets/price-soft.png', alt: 'A water softener tank beside a brine tank', price: '$[X,XXX]', interest: 'Water softener', flag: 'Most popular' },
    complete: { key: 'complete', name: 'Complete', detail: 'Softener for the whole house + reverse osmosis at the kitchen tap.', image: 'assets/price-complete.png', alt: 'Filters, a softener, and a brine tank together', price: '$[X,XXX]', interest: 'Drinking water (RO)' },
    sink: { key: 'sink', name: 'Kitchen tap', detail: 'Reverse osmosis at the sink. Clean drinking and cooking water, no changes to the rest of the house.', image: '', alt: '', price: '$[X,XXX]', interest: 'Drinking water (RO)' },
    test: { key: 'test', name: 'Free test first', detail: 'A technician tests the tap, walks you through the results, and leaves. The system comes after you see your water.', image: '', alt: '', price: '', interest: 'Not sure yet' }
  };

  /* ---------------- State ---------------- */
  var state = load() || { i: 0, a: {} };
  var steps = [];
  var stageEl, cardEl, footEl, footInner, backBtn, fillEl, stepEl, pctEl;

  function load() {
    try { var raw = sessionStorage.getItem(CONFIG.storageKey); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }
  function save() {
    try { sessionStorage.setItem(CONFIG.storageKey, JSON.stringify(state)); } catch (e) {}
  }

  /* ---------------- Towns ---------------- */
  var TOWNS = D && D.towns ? Object.keys(D.towns).sort() : [];
  function townFromText(raw) {
    var a = (raw || '').toLowerCase();
    var best = null;
    TOWNS.forEach(function (name) {
      var label = name.toLowerCase();
      var re = new RegExp('(^|[^a-z])' + label.replace(/ /g, '\\s+') + '(?=[^a-z]|$)');
      if (re.test(a) && (!best || label.length > best.length)) best = name;
    });
    return best;
  }
  function utilitiesFor(town) {
    if (!D || !D.town_to_utilities) return [];
    var byId = {};
    (D.utilities || []).forEach(function (u) { byId[u.id] = u; });
    return (D.town_to_utilities[town] || []).map(function (id) { return byId[id]; }).filter(Boolean)
      .sort(function (a, b) { return (b.population || 0) - (a.population || 0); });
  }
  function notableFor(util) {
    var list = (util && util.contaminants || []).filter(function (c) { return c.level_type !== 'nd' && c.limit; });
    list.sort(function (a, b) { return (b.pct_of_limit || 0) - (a.pct_of_limit || 0); });
    return list[0] || null;
  }
  function fmt(n) {
    if (n == null || isNaN(n)) return '';
    if (n >= 1000) return Math.round(n).toLocaleString('en-US');
    return String(Number(Number(n).toPrecision(3)));
  }

  /* ---------------- Question bank ---------------- */
  function ic(glyph) { return '<span class="sq-opt-ic" aria-hidden="true">' + glyph + '</span>'; }
  var TICK = '<span class="sq-opt-tick" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6.2l2.6 2.6L10 3.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';

  steps = [
    {
      id: 'intro', kind: 'intro',
      render: function () {
        return '<p class="sq-eyebrow clear-caps">The Connecticut water check</p>' +
          '<h1 class="sq-q clear-display">Find the right system for <span class="clear-script">your tap.</span></h1>' +
          '<p class="sq-help">Nine quick taps, about <strong>90 seconds</strong>. We match what you see at the sink with what’s known about your town’s water, then show you the one system that fits. No pressure, no obligation.</p>' +
          '<ul class="sq-trust"><li>Free in-home test</li><li>Licensed CT plumbers</li><li>Cancel any agreement within 3 business days</li></ul>';
      },
      cta: 'Start my water check', note: 'Already know what you want? <a href="' + CONFIG.bookUrl + '" style="color:inherit">Book the free test</a>'
    },
    {
      id: 'name', kind: 'text', key: 'name',
      render: function () {
        return '<p class="sq-eyebrow clear-caps">First things first</p>' +
          '<h2 class="sq-q clear-display">What should we <span class="clear-script">call you?</span></h2>' +
          '<p class="sq-help">Just a first name is fine.</p>' +
          '<div class="sq-field"><label for="sqName" class="clear-caps">First name</label><input id="sqName" type="text" autocomplete="given-name" autocapitalize="words" enterkeyhint="next" value="' + esc(state.a.name || '') + '"><span class="sq-err">Add a first name to keep going.</span></div>';
      },
      valid: function () { return !!(state.a.name || '').trim(); },
      read: function () { state.a.name = ($('sqName').value || '').trim().replace(/\s+/g, ' '); },
      cta: 'Next'
    },
    {
      id: 'symptoms', kind: 'multi', key: 'symptoms',
      q: function () { return 'Nice to meet you, ' + first() + '. What’s <span class="clear-script">bugging you</span> about your water?'; },
      help: 'Tap everything that fits.',
      opts: [
        { v: 'taste', t: 'Taste or smell', s: 'Chlorine, metallic, rotten egg', g: '👃' },
        { v: 'scale', t: 'Spots and scale', s: 'Glasses, faucets, shower doors', g: '💧' },
        { v: 'rust', t: 'Rust, staining or grit', s: 'Orange tubs, sediment in the tank', g: '🪨' },
        { v: 'skin', t: 'Dry skin and hair', s: 'Stiff laundry too', g: '🧴' },
        { v: 'health', t: 'Health worries', s: 'PFAS, lead, arsenic, nitrates', g: '🩺' },
        { v: 'none', t: 'Nothing yet, just curious', s: 'Smart. That’s why we test first.', g: '🔍', solo: true }
      ],
      cta: 'Next'
    },
    {
      id: 'source', kind: 'single', key: 'source',
      q: function () { return 'Where does your water <span class="clear-script">come from?</span>'; },
      help: 'Well homes and city homes need different things.',
      opts: [
        { v: 'well', t: 'A private well', s: 'Nobody tests it but you', g: '🪣' },
        { v: 'city', t: 'City or public water', s: 'You get a water bill', g: '🏙️' },
        { v: 'unsure', t: 'Not sure', s: 'We can tell from the address', g: '🤷' }
      ]
    },
    {
      id: 'town', kind: 'town', key: 'town',
      render: function () {
        var opts = '<option value="">Pick a town…</option>' + TOWNS.map(function (t) { return '<option value="' + esc(t) + '"' + (state.a.town === t ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('');
        return '<p class="sq-eyebrow clear-caps">Your town</p>' +
          '<h2 class="sq-q clear-display">Which Connecticut town is the <span class="clear-script">home in?</span></h2>' +
          '<p class="sq-help">We’ll pull what’s on record for that town’s water before you go any further.</p>' +
          '<div class="sq-field"><label for="sqTown" class="clear-caps">Town</label><div class="sq-selwrap"><select id="sqTown">' + opts + '</select><svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 5l4 4 4-4" fill="none" stroke="#1C3F36" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div><span class="sq-err">Pick the town to keep going.</span></div>';
      },
      valid: function () { return !!state.a.town; },
      read: function () { state.a.town = $('sqTown').value; },
      onMount: function () { $('sqTown').addEventListener('change', function () { state.a.town = this.value; save(); setFoot(); }); },
      cta: 'Show me my town'
    },
    {
      id: 'townReport', kind: 'info',
      render: renderTownReport,
      cta: 'Got it, keep going'
    },
    {
      id: 'who', kind: 'single', key: 'who',
      q: function () { return 'Who’s <span class="clear-script">drinking it?</span>'; },
      help: 'Kids and little ones drink more water per pound than adults do, so this matters.',
      opts: [
        { v: 'me', t: 'Just me', g: '🧍' },
        { v: 'couple', t: 'Me and a partner', g: '👫' },
        { v: 'kids', t: 'Kids at home', g: '🧒' },
        { v: 'baby', t: 'A baby, or one on the way', g: '🍼' }
      ]
    },
    {
      id: 'own', kind: 'single', key: 'own',
      q: function () { return 'Do you <span class="clear-script">own</span> the home?'; },
      help: 'Whole-house systems need the owner’s OK. A sink system doesn’t.',
      opts: [
        { v: 'own', t: 'I own it', g: '🏡' },
        { v: 'buying', t: 'Buying soon', s: 'Under contract or shopping', g: '🔑' },
        { v: 'rent', t: 'I rent', g: '📝' }
      ]
    },
    {
      id: 'existing', kind: 'multi', key: 'existing',
      q: function () { return 'Anything treating the water <span class="clear-script">right now?</span>'; },
      help: 'Tap all that apply.',
      opts: [
        { v: 'softener', t: 'A water softener', g: '🧂' },
        { v: 'pitcher', t: 'A pitcher or fridge filter', g: '🫙' },
        { v: 'whole', t: 'A whole-house filter', g: '🏠' },
        { v: 'nothing', t: 'Nothing', s: 'Straight from the pipe', g: '🚰', solo: true }
      ],
      cta: 'Next'
    },
    {
      id: 'goal', kind: 'single', key: 'goal',
      q: function () { return 'What do you want <span class="clear-script">fixed?</span>'; },
      help: 'Most families start with one of these.',
      opts: [
        { v: 'sink', t: 'Drinking water at the kitchen tap', s: 'Cooking, coffee, the kids’ bottles', g: '🥤' },
        { v: 'house', t: 'Every faucet in the house', s: 'Showers, laundry, the water heater', g: '🚿' },
        { v: 'both', t: 'Both', g: '✨' },
        { v: 'unsure', t: 'Not sure. Tell me.', g: '💬' }
      ]
    },
    {
      id: 'when', kind: 'single', key: 'when',
      q: function () { return 'If the test turns something up, <span class="clear-script">when</span> would you want it handled?'; },
      help: 'No wrong answer. It just tells us how to follow up.',
      opts: [
        { v: 'now', t: 'Right away', g: '⚡' },
        { v: 'soon', t: 'In the next few months', g: '📅' },
        { v: 'research', t: 'Just researching for now', g: '📖' }
      ]
    },
    {
      id: 'build', kind: 'build',
      render: function () {
        return '<p class="sq-eyebrow clear-caps">One moment</p>' +
          '<h2 class="sq-q clear-display">Building your <span class="clear-script">water plan.</span></h2>' +
          '<div class="sq-build">' +
          buildRow('Reading what’s on record for ' + esc(state.a.town || 'your town')) +
          buildRow('Matching what you see at the sink') +
          buildRow('Picking the one system that fits') +
          '<div class="sq-build-bar"><span id="sqBuildBar"></span></div></div>';
      }
    },
    {
      id: 'contact', kind: 'contact',
      render: function () {
        return '<p class="sq-eyebrow clear-caps">Your plan is ready</p>' +
          '<h2 class="sq-q clear-display">Where should we <span class="clear-script">send it,</span> ' + esc(first()) + '?</h2>' +
          '<p class="sq-help">We text you the plan and the open test times. That’s it. No spam, no sharing.</p>' +
          '<div class="sq-field"><label for="sqPhone" class="clear-caps">Mobile number</label><input id="sqPhone" type="tel" inputmode="tel" autocomplete="tel" enterkeyhint="next" placeholder="(860) 555-0123" value="' + esc(state.a.phone || '') + '"><span class="sq-err">Add a 10-digit mobile number.</span></div>' +
          '<div class="sq-field"><label for="sqEmail" class="clear-caps">Email <span style="font-weight:600;text-transform:none;letter-spacing:0;color:#5A6E64">(optional)</span></label><input id="sqEmail" type="email" inputmode="email" autocomplete="email" enterkeyhint="done" placeholder="you@example.com" value="' + esc(state.a.email || '') + '"><span class="sq-err">That email doesn’t look right.</span></div>' +
          '<p class="sq-fine">By continuing you agree to get a text and a call from Sunday Water Co. about your water test. Message rates may apply. Reply STOP to opt out.</p>';
      },
      valid: function () {
        var ok = true;
        var ph = ($('sqPhone').value || '').replace(/\D/g, '');
        var em = ($('sqEmail').value || '').trim();
        setBad($('sqPhone'), !(ph.length === 10 || (ph.length === 11 && ph.charAt(0) === '1')));
        setBad($('sqEmail'), !!em && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em));
        ok = !cardEl.querySelector('.is-bad');
        return ok;
      },
      read: function () { state.a.phone = $('sqPhone').value.trim(); state.a.email = $('sqEmail').value.trim(); },
      onDone: submitLead,
      cta: 'See my plan'
    },
    {
      id: 'result', kind: 'result',
      render: renderResult
    }
  ];

  function buildRow(text) {
    return '<div class="sq-build-row"><span class="sq-build-dot"><svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6.2l2.6 2.6L10 3.5" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span>' + text + '</span></div>';
  }

  /* ---------------- Recommendation ---------------- */
  function recommend() {
    var a = state.a;
    var sym = a.symptoms || [];
    var has = function (v) { return sym.indexOf(v) !== -1; };
    var hard = has('scale') || has('skin');
    var health = has('health') || a.who === 'kids' || a.who === 'baby';
    var sed = has('rust') || a.source === 'well';
    var taste = has('taste');
    var curious = has('none') && !hard && !health && !sed && !taste;
    var ex = a.existing || [];
    var hasSoftener = ex.indexOf('softener') !== -1;
    var hasWhole = ex.indexOf('whole') !== -1;

    var plan, why = [], alt = '';
    var townLine = townWhy();

    if (a.own === 'rent') {
      plan = PLANS.sink;
      why.push('You rent, so we keep it to the kitchen tap. No plumbing changes to the house, and it comes with you when you move.');
      if (health) why.push('Reverse osmosis is the stage that handles PFAS, lead, arsenic and nitrates at the glass.');
      if (hard) alt = 'Spots and dry skin come from hard water. That’s a whole-house fix (Soft), which is the owner’s call. Worth a conversation with them after the test.';
    } else if (curious && a.goal !== 'both' && a.goal !== 'house' && a.goal !== 'sink') {
      plan = PLANS.test;
      why.push('Nothing is bugging you yet, and that’s the right time to look. The free test puts numbers on hardness, iron, chlorine and more.');
      why.push('You get a written report to keep, whether or not you ever buy a system.');
    } else if (a.goal === 'sink' && !(hard && health)) {
      plan = PLANS.sink;
      why.push('You asked for better drinking water, so we start where you drink it.');
      if (health) why.push('Reverse osmosis is the stage that handles PFAS, lead, arsenic and nitrates at the glass.');
      if (taste) why.push('It also takes the chlorine and metallic taste out of coffee, cooking and the kids’ bottles.');
      if (hard) alt = 'Spots and dry skin mean hard water. If the test confirms it, Soft fixes the whole house and the two together are our Complete package.';
    } else if (a.goal === 'both' || (hard && (health || taste))) {
      plan = PLANS.complete;
      if (hard) why.push('Spots, scale and dry skin point to hard water. The softener fixes that at every faucet.');
      if (health) why.push('Reverse osmosis at the kitchen tap handles PFAS, lead, arsenic and nitrates where you actually drink.');
      if (taste && !health) why.push('Reverse osmosis at the kitchen tap takes the taste and smell out of the water you drink and cook with.');
      if (!hard && !health && !taste) why.push('You asked for the whole house and the kitchen tap, and Complete is both in one install.');
      if (hasSoftener) alt = 'You already have a softener. If the test shows it’s still doing its job, we skip that half and you only pay for the kitchen tap.';
    } else if (hard) {
      plan = PLANS.soft;
      why.push('Spots on glass, scale on faucets and dry skin are the classic signs of hard water. A softener is the fix.');
      why.push('It also protects the water heater and appliances, which is where hard water costs real money.');
      if (hasSoftener) alt = 'You already have a softener. The test tells us if it’s undersized, exhausted or just needs service before you buy anything.';
      if (health) alt = 'For the health worries, reverse osmosis at the kitchen tap is the add-on. Together that’s our Complete package.';
    } else if (health) {
      plan = PLANS.sink;
      why.push('Health worries get handled at the glass. Reverse osmosis is the stage that takes out PFAS, lead, arsenic and nitrates.');
      if (a.who === 'baby') why.push('For formula and a baby’s first water, that’s the one place we’d never skip.');
      if (sed) alt = 'Well water or rust usually means sediment and iron too. If the test shows it, Essential at the main line protects the whole house and the RO unit.';
    } else if (sed || taste) {
      plan = PLANS.essential;
      if (a.source === 'well') why.push('Well water almost always carries sediment and iron. A whole-house filter catches it before it reaches your fixtures.');
      if (has('rust')) why.push('Orange staining and grit are iron and sediment. Essential takes them out at the main line.');
      if (taste) why.push('The carbon stage takes out chlorine taste and smell at every faucet, not just one.');
      if (hasWhole) alt = 'You already have a whole-house filter. The test shows whether it’s the right type and whether it’s spent.';
    } else {
      plan = PLANS.test;
      why.push('The free test puts numbers on hardness, iron, chlorine and more, and you keep the written report.');
    }

    if (townLine) why.push(townLine);
    if (!alt && a.when === 'research') alt = 'No rush. The test is free, the report is yours to keep, and nobody follows you around the house.';
    return { plan: plan, why: why.slice(0, 4), alt: alt };
  }

  function townWhy() {
    var t = state.a.town;
    if (!t || !D || !D.towns[t]) return '';
    var prof = D.towns[t].profile;
    var utils = utilitiesFor(t);
    if (prof === 'M' && utils.length && state.a.source !== 'well') {
      var n = notableFor(utils[0]);
      if (n && n.pct_of_limit >= 50) return 'In ' + t + ', ' + utils[0].name + ' reported ' + n.name + ' at ' + fmt(n.level) + ' ' + (n.units || '') + ', about ' + Math.round(n.pct_of_limit) + '% of the federal limit. The test checks your tap, not the plant.';
      return 'In ' + t + ', ' + utils[0].name + '’s report covers the plant, not your pipes. The test checks the water at your sink.';
    }
    if (prof === 'N' || prof === 'S' || state.a.source === 'well') return 'Most homes in ' + t + ' are on private wells. Nobody tests those but you, which is why the test comes first.';
    return '';
  }

  /* ---------------- Renderers ---------------- */
  function renderTownReport() {
    var t = state.a.town;
    var info = D && D.towns[t];
    if (!info) {
      return '<p class="sq-eyebrow clear-caps">' + esc(t || 'Your town') + '</p><h2 class="sq-q clear-display">Here’s the <span class="clear-script">short version.</span></h2><p class="sq-help">About 1 in 4 people in Connecticut drink from a private well that no utility tests. A utility report, where one exists, covers the plant, not your kitchen tap.</p>';
    }
    var well = state.a.source === 'well';
    var prof = well ? PROFILE.N : (PROFILE[info.profile] || PROFILE.M);
    var utils = utilitiesFor(t);
    var rows = '<div class="sq-town-row"><span>County</span><span>' + esc(info.county || '') + '</span></div>';
    if (well) {
      rows += '<div class="sq-town-row"><span>Who tests it</span><span>Only you</span></div>';
      rows += '<div class="sq-town-row"><span>CT wells over the arsenic limit</span><span>about 1 in 25</span></div>';
    } else if (utils.length) {
      rows += '<div class="sq-town-row"><span>Largest supplier</span><span>' + esc(utils[0].name) + '</span></div>';
      var n = notableFor(utils[0]);
      if (n) rows += '<div class="sq-town-row"><span>Highest reading vs. limit</span><span>' + esc(n.name) + ' · ' + Math.round(n.pct_of_limit || 0) + '%</span></div>';
    } else {
      rows += '<div class="sq-town-row"><span>Public systems (1,000+ people)</span><span>None listed</span></div>';
    }
    var lead = well
      ? 'You said you’re on a well. Nobody tests that water but you.'
      : prof.headline;
    return '<p class="sq-eyebrow clear-caps">What’s on record for ' + esc(t) + '</p>' +
      '<h2 class="sq-q clear-display">' + esc(first()) + ', here’s your <span class="clear-script">town.</span></h2>' +
      '<div class="sq-town">' +
      '<span class="badge clear-caps" style="background:' + prof.color + '">' + esc(well ? 'Private well' : prof.badge) + '</span>' +
      '<div class="sq-town-head">' + esc(lead) + '</div>' +
      '<p class="sq-town-body">' + esc(well ? 'No community system reports on a private well. The only numbers that exist for your water are the ones a test produces at your tap.' : prof.body) + '</p>' +
      rows +
      '<p class="clear-caps" style="font-size:12px;margin:6px 0 0;color:rgba(246,235,216,.75)">A Sunday test in ' + esc(t) + ' checks for</p>' +
      '<ul class="sq-town-checks">' + prof.checks.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') + (well || info.profile !== 'M' ? '' : '<li>PFAS</li>') + '</ul>' +
      '<p class="sq-town-src">Source: EPA SDWIS, CT DPH, utility water quality reports.</p>' +
      '</div>' +
      '<p class="sq-help" style="margin:16px 0 0">Four more taps and we’ll match this to what you see at the sink.</p>';
  }

  function renderResult() {
    var r = recommend();
    var p = r.plan;
    var art = p.image
      ? '<img src="' + p.image + '" alt="' + esc(p.alt) + '" width="104" height="104">'
      : '<span class="sq-result-ic" aria-hidden="true"><svg width="56" height="56" viewBox="0 0 56 56"><path d="M28 6c-7 11-15 19-15 29a15 15 0 0 0 30 0c0-10-8-18-15-29z" fill="#3E8F74" stroke="#1C3F36" stroke-width="2.5" stroke-linejoin="round"/><path d="M21 36a7 7 0 0 0 7 7" fill="none" stroke="#F6EBD8" stroke-width="2.5" stroke-linecap="round"/></svg></span>';
    var isTest = p.key === 'test';
    var head = isTest
      ? esc(first()) + ', start with <span class="clear-script">the test.</span>'
      : esc(first()) + ', your fit is <span class="clear-script">' + esc(p.name) + '.</span>';
    var price = CONFIG.showPrices && p.price ? '<p class="sq-price"><b>from ' + esc(p.price) + '</b><span>installed by a licensed CT plumber · financing from $[X]/day</span></p>' : '';
    var slots = ['Weekday morning', 'Weekday afternoon', 'Weekday evening', 'Saturday'];
    var research = state.a.when === 'research';
    return '<p class="sq-eyebrow clear-caps">Your water plan</p>' +
      '<h2 class="sq-q clear-display">' + head + '</h2>' +
      '<div class="sq-result-hero">' + art + '<div>' + (p.flag ? '<span class="sq-result-flag clear-caps">' + esc(p.flag) + '</span>' : '') + '<div class="sq-result-name clear-display">' + esc(p.name) + '</div><p class="sq-result-detail">' + esc(p.detail) + '</p></div></div>' +
      '<p class="clear-caps" style="font-size:13px;margin:0 0 10px;color:#3E8F74">Why this fits you</p>' +
      '<ul class="sq-why">' + r.why.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul>' +
      (r.alt ? '<p class="sq-alt">' + esc(r.alt) + '</p>' : '') +
      price +
      '<div class="sq-next"><h3 class="clear-display">Next: the free in-home test.</h3>' +
      '<p class="sq-help" style="margin-bottom:0">A technician tests your tap in ' + esc(state.a.town || 'your town') + ', walks you through the numbers, and leaves you a written report. The price comes after you see your water.</p>' +
      '<p class="clear-caps" style="font-size:13px;margin:16px 0 0">Best time for you</p>' +
      '<div class="sq-chips" id="sqSlots">' + slots.map(function (s) { return '<button type="button" class="chip clear-btn" aria-pressed="' + (state.a.slot === s) + '">' + s + '</button>'; }).join('') + '</div>' +
      '<a id="sqBook" class="sq-btn clear-caps" href="' + bookHref(p) + '">' + (research ? 'Hold a spot for my free test' : 'Book my free water test') + '</a>' +
      '<a class="sq-btn sq-btn-navy clear-caps" href="' + CONFIG.phoneHref + '">Call ' + CONFIG.phone + '</a>' +
      '<ul class="sq-trust"><li>No pressure, no obligation</li><li>Licensed CT plumber install</li><li>Cancel any agreement within 3 business days</li></ul>' +
      '</div>';
  }

  function bookHref(plan) {
    var a = state.a;
    var q = new URLSearchParams();
    if (a.town) q.set('town', a.town);
    if (a.name) q.set('name', a.name);
    if (a.phone) q.set('phone', a.phone);
    if (a.email) q.set('email', a.email);
    if (a.street) q.set('street', a.street);
    if (plan && plan.interest) q.set('interest', plan.interest);
    if (a.slot) q.set('slot', a.slot);
    q.set('plan', plan ? plan.key : '');
    q.set('src', 'quiz');
    // Hash, not query string: Vercel's cleanUrls redirect (book.html -> /book) drops a query string but keeps a hash.
    return CONFIG.bookUrl + '#' + q.toString();
  }

  /* ---------------- Lead handoff ---------------- */
  function submitLead() {
    var r = recommend();
    var lead = {
      ts: new Date().toISOString(),
      source: 'water-check-quiz',
      name: state.a.name, phone: state.a.phone, email: state.a.email,
      town: state.a.town, street: state.a.street || '',
      answers: state.a,
      recommended: r.plan.key,
      page: location.href
    };
    try {
      var list = JSON.parse(localStorage.getItem(CONFIG.leadsKey) || '[]');
      list.push(lead);
      localStorage.setItem(CONFIG.leadsKey, JSON.stringify(list.slice(-50)));
    } catch (e) {}
    if (CONFIG.leadEndpoint) {
      try {
        fetch(CONFIG.leadEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(lead), keepalive: true }).catch(function () {});
      } catch (e) {}
    } else if (window.console) {
      console.log('[Sunday quiz] lead (set window.SUNDAY_LEAD_ENDPOINT to POST this):', lead);
    }
  }

  /* ---------------- Engine ---------------- */
  var QUESTION_STEPS = steps.filter(function (s) { return ['text', 'single', 'multi', 'town', 'contact'].indexOf(s.kind) !== -1; }).length;
  function questionIndex(i) {
    var n = 0;
    for (var k = 0; k <= i && k < steps.length; k++) if (['text', 'single', 'multi', 'town', 'contact'].indexOf(steps[k].kind) !== -1) n++;
    return n;
  }
  function first() { return (state.a.name || 'there').split(' ')[0]; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function setBad(input, bad) { var f = input.closest('.sq-field'); if (f) f.classList.toggle('is-bad', !!bad); }

  function step() { return steps[state.i]; }

  function render(dir) {
    var s = step();
    var html;
    if (s.render) html = s.render();
    else {
      html = '<p class="sq-eyebrow clear-caps">Question ' + questionIndex(state.i) + ' of ' + QUESTION_STEPS + '</p>' +
        '<h2 class="sq-q clear-display">' + s.q() + '</h2>' +
        (s.help ? '<p class="sq-help">' + s.help + '</p>' : '') +
        '<ul class="sq-opts' + (s.opts.length >= 4 && s.kind === 'single' ? ' sq-grid-2' : '') + '" role="' + (s.kind === 'multi' ? 'group' : 'radiogroup') + '">' +
        s.opts.map(function (o) {
          var on = s.kind === 'multi' ? (state.a[s.key] || []).indexOf(o.v) !== -1 : state.a[s.key] === o.v;
          return '<li><button type="button" class="sq-opt" data-v="' + esc(o.v) + '" role="' + (s.kind === 'multi' ? 'checkbox' : 'radio') + '" aria-checked="' + on + '">' + ic(o.g || '') + '<span class="sq-opt-txt">' + esc(o.t) + (o.s ? '<span class="sq-opt-sub">' + esc(o.s) + '</span>' : '') + '</span>' + TICK + '</button></li>';
        }).join('') + '</ul>';
    }
    var fresh = document.createElement('div');
    fresh.className = 'sq-card';
    fresh.innerHTML = html;
    if (cardEl) cardEl.remove();
    cardEl = fresh;
    stageEl.appendChild(cardEl);
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });

    if (s.kind === 'single' || s.kind === 'multi') bindOptions(s);
    if (s.kind === 'text' || s.kind === 'contact' || s.kind === 'town') bindFields(s);
    if (s.onMount) s.onMount();
    if (s.kind === 'build') runBuild();
    if (s.kind === 'result') bindResult();

    setProgress();
    setFoot();
    document.title = (s.kind === 'result' ? 'Your water plan' : 'Water check') + ' — Sunday Water Co.';
    save();
    var h = cardEl.querySelector('h1, h2');
    if (h && dir !== 'init') { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  }

  function bindOptions(s) {
    var btns = Array.prototype.slice.call(cardEl.querySelectorAll('.sq-opt'));
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        var v = b.getAttribute('data-v');
        if (s.kind === 'single') {
          state.a[s.key] = v;
          btns.forEach(function (o) { o.setAttribute('aria-checked', String(o === b)); });
          save();
          setTimeout(function () { go(1); }, reduceMotion ? 0 : 220);
        } else {
          var cur = (state.a[s.key] || []).slice();
          var opt = s.opts.filter(function (o) { return o.v === v; })[0];
          if (cur.indexOf(v) !== -1) cur = cur.filter(function (x) { return x !== v; });
          else if (opt && opt.solo) cur = [v];
          else cur = cur.filter(function (x) { var o = s.opts.filter(function (y) { return y.v === x; })[0]; return !(o && o.solo); }).concat([v]);
          state.a[s.key] = cur;
          btns.forEach(function (o) { o.setAttribute('aria-checked', String(cur.indexOf(o.getAttribute('data-v')) !== -1)); });
          save();
          setFoot();
        }
      });
    });
  }

  function bindFields(s) {
    var inputs = Array.prototype.slice.call(cardEl.querySelectorAll('input'));
    inputs.forEach(function (inp, idx) {
      inp.addEventListener('input', function () { setBad(inp, false); if (s.read) s.read(); save(); setFoot(); });
      inp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); if (inputs[idx + 1]) inputs[idx + 1].focus(); else next(); }
      });
    });
    var firstInput = cardEl.querySelector('input, select');
    if (firstInput && window.matchMedia('(min-width: 721px)').matches) firstInput.focus();
  }

  function bindResult() {
    var chips = Array.prototype.slice.call(cardEl.querySelectorAll('#sqSlots .chip'));
    chips.forEach(function (c) {
      c.addEventListener('click', function () {
        state.a.slot = c.textContent;
        chips.forEach(function (o) { o.setAttribute('aria-pressed', String(o === c)); });
        $('sqBook').setAttribute('href', bookHref(recommend().plan));
        save();
      });
    });
  }

  function runBuild() {
    var rows = Array.prototype.slice.call(cardEl.querySelectorAll('.sq-build-row'));
    var bar = $('sqBuildBar');
    var wait = reduceMotion ? 300 : 1900;
    requestAnimationFrame(function () { if (bar) bar.style.width = '100%'; });
    rows.forEach(function (r, i) { setTimeout(function () { r.classList.add('is-on'); }, reduceMotion ? 0 : 450 * (i + 1)); });
    setTimeout(function () { if (step().kind === 'build') go(1); }, wait);
  }

  function canAdvance() {
    var s = step();
    if (s.kind === 'single') return !!state.a[s.key];
    if (s.kind === 'multi') return (state.a[s.key] || []).length > 0;
    if (s.kind === 'text') return !!(state.a.name || '').trim();
    if (s.kind === 'town') return !!state.a.town;
    if (s.kind === 'contact') return !!(state.a.phone || '').replace(/\D/g, '').length;
    return true;
  }

  function setFoot() {
    var s = step();
    if (s.kind === 'build' || s.kind === 'result' || s.kind === 'single') { footEl.hidden = true; document.querySelector('.sq').style.setProperty('--sq-foot-h', '0px'); return; }
    document.querySelector('.sq').style.removeProperty('--sq-foot-h');
    footEl.hidden = false;
    footInner.innerHTML = '<button type="button" id="sqNext" class="sq-btn clear-caps"' + (canAdvance() ? '' : ' disabled') + '>' + (s.cta || 'Next') + '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M4 9h10M10 5l4 4-4 4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      (s.note ? '<p class="sq-foot-note">' + s.note + '</p>' : '');
    $('sqNext').addEventListener('click', next);
  }

  function setProgress() {
    var s = step();
    var total = steps.length - 1;
    var pct = s.kind === 'result' ? 100 : Math.round((state.i / total) * 100);
    fillEl.style.width = pct + '%';
    if (s.kind === 'intro') { stepEl.textContent = 'About 90 seconds'; pctEl.textContent = ''; }
    else if (s.kind === 'result') { stepEl.textContent = 'Your plan'; pctEl.textContent = 'Done'; }
    else { stepEl.textContent = 'Water check'; pctEl.textContent = pct + '%'; }
    backBtn.disabled = state.i === 0 || s.kind === 'build' || s.kind === 'result';
  }

  function next() {
    var s = step();
    if (s.read) s.read();
    if (s.valid && !s.valid()) { var bad = cardEl.querySelector('.is-bad input, .is-bad select'); if (bad) bad.focus(); return; }
    if (s.onDone) s.onDone();
    go(1);
  }

  function go(dir) {
    var n = state.i + dir;
    if (n < 0 || n >= steps.length) return;
    // Back from the result skips the contact + build screens; back from contact skips the build animation.
    if (dir < 0 && steps[n].kind === 'build') n--;
    if (dir < 0 && steps[n].id === 'townReport') n--;
    var leave = function () { state.i = n; render(dir); };
    if (cardEl && !reduceMotion) { cardEl.classList.add('sq-out'); setTimeout(leave, 160); } else leave();
  }

  /* ---------------- Boot ---------------- */
  function boot() {
    var root = $('sqRoot');
    if (!root) return;
    root.innerHTML =
      '<div class="sq-bar">' +
      '<button type="button" class="sq-bar-back" id="sqBack" aria-label="Back"><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M11 4L6 9l5 5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      '<a class="sq-bar-mark" href="index.html" aria-label="Sunday Water Co."><img src="assets/sunday-wordmark.png?v=2" alt="" width="97" height="44"></a>' +
      '<div class="sq-bar-prog"><div class="sq-bar-step clear-caps"><span id="sqStep"></span><span id="sqPct"></span></div><div class="sq-bar-track"><div class="sq-bar-fill" id="sqFill"></div></div></div>' +
      '<a class="sq-bar-call clear-caps" href="' + CONFIG.phoneHref + '">Call</a>' +
      '</div>' +
      '<div class="sq-stage" id="sqStage"></div>' +
      '<div class="sq-foot" id="sqFoot"><div class="sq-foot-inner" id="sqFootInner"></div></div>';
    stageEl = $('sqStage'); footEl = $('sqFoot'); footInner = $('sqFootInner');
    backBtn = $('sqBack'); fillEl = $('sqFill'); stepEl = $('sqStep'); pctEl = $('sqPct');
    backBtn.addEventListener('click', function () { go(-1); });
    // Leaving the quiz for the site: remember it so index.html does not bounce a phone straight back here.
    document.querySelector(".sq-bar-mark").addEventListener("click", function () { try { sessionStorage.setItem("sunday_home", "1"); } catch (e) {} });

    // Deep links: start.html#address=...&town=...&restart=1 (query string works too, but the hash survives clean-URL redirects)
    try {
      var p = new URLSearchParams((location.hash || '').replace(/^#/, ''));
      new URLSearchParams(location.search).forEach(function (v, k) { if (!p.has(k)) p.set(k, v); });
      if (p.get('restart')) { state = { i: 0, a: {} }; }
      var addr = (p.get('address') || '').trim();
      var town = p.get('town') || townFromText(addr);
      if (addr) state.a.street = addr;
      if (town && TOWNS.indexOf(town) !== -1) state.a.town = town;
      if (p.get('source') === 'well' || p.get('source') === 'city') state.a.source = p.get('source');
    } catch (e) {}
    // Never resume into the build screen or into a stale result.
    if (step().kind === 'build') state.i -= 1;
    if (step().kind === 'result' && !(state.a.phone)) state.i = 0;
    render('init');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
