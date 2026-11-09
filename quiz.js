/* Sunday water check — the intake quiz behind start.html
   Pattern (Hims/Hers assessment): two openers sort the visitor into an identity archetype,
   the reveal names it, then that archetype's own follow-ups run in its own voice, and the
   result is written for it. All copy and branching live in quiz_map.json; archetypes.md
   explains them. Vanilla JS, no dependencies. Reads window.CLEAR_WQ (town water data). */
(function () {
  'use strict';

  var CONFIG = {
    // Where to POST the finished lead as JSON. Leave empty to only keep it in localStorage.
    leadEndpoint: window.SUNDAY_LEAD_ENDPOINT || '',
    mapUrl: 'quiz_map.json?v=3',
    phone: '475-241-4486',
    phoneHref: 'tel:+14752414486',
    bookUrl: 'book.html',
    storageKey: 'sunday_quiz_v2',
    leadsKey: 'sunday_quiz_leads'
  };

  var D = window.CLEAR_WQ || null;
  var MAP = null;
  var $ = function (id) { return document.getElementById(id); };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var PROFILE = {
    N: { badge: 'Likely private wells', color: '#E07A62', headline: 'This water is probably untested.', body: 'No utility tests a private well. No community system serving 1,000+ people lists this town, so only the homeowner can test this water.', checks: ['Bacteria', 'Arsenic', 'Hardness', 'Iron', 'Chlorine'] },
    S: { badge: 'Small systems only', color: '#E4C56A', headline: 'Most of this water is probably untested.', body: 'Only small community systems serve parts of this town. Most homes are likely on private wells, and those wells are not tested by any utility.', checks: ['Bacteria', 'Arsenic', 'Hardness', 'Iron', 'Chlorine'] },
    M: { badge: 'Public system present', color: '#A9D4C4', headline: 'A utility report is not your kitchen tap.', body: 'A large community system serves parts of this town. Coverage is not reported street by street, and some homes may still be on private wells.', checks: ['Chlorine', 'Hardness', 'Iron'] }
  };

  /* ---------------- State ---------------- */
  // a: answers keyed by step key. pre: facts from deep links (address, source). arch: archetype id once sorted.
  var state = load() || { i: 0, a: {}, pre: {}, arch: '' };
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

  /* ---------------- Text helpers ---------------- */
  function first() { return (state.a.name || 'there').split(' ')[0]; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  // Map copy: {name}/{town} tokens, then escape, then *word* becomes the script face.
  function rich(s) {
    s = String(s == null ? '' : s).replace(/\{name\}/g, first()).replace(/\{town\}/g, state.a.town || 'your town');
    return esc(s).replace(/\*(.+?)\*/g, '<span class="clear-script">$1</span>');
  }
  function arch() { return MAP && state.arch ? MAP.archetypes[state.arch] : null; }
  function archShort() { var a = arch(); return a ? a.name.replace(/^The /, '') : ''; }
  function article(word) { return /^[aeiou]/i.test(word) ? 'an' : 'a'; }
  function setBad(input, bad) { var f = input.closest('.sq-field'); if (f) f.classList.toggle('is-bad', !!bad); }

  /* ---------------- The sort ---------------- */
  function sortArch() {
    var score = {};
    Object.keys(MAP.archetypes).forEach(function (k) { score[k] = 0; });
    var top = null;
    MAP.openers.forEach(function (o, idx) {
      var v = state.a[o.id];
      var opt = o.opts.filter(function (x) { return x.v === v; })[0];
      if (!opt) return;
      Object.keys(opt.w || {}).forEach(function (k) { score[k] += opt.w[k]; });
      if (idx === 0) top = Object.keys(opt.w || {}).sort(function (a, b) { return opt.w[b] - opt.w[a]; })[0];
    });
    var best = null;
    Object.keys(score).forEach(function (k) {
      if (best === null || score[k] > score[best] || (score[k] === score[best] && k === top)) best = k;
    });
    return score[best] > 0 ? best : (top || Object.keys(MAP.archetypes)[0]);
  }

  // Every tag the visitor's answers carry (openers + the active branch + deep-link facts).
  function tags() {
    var out = {};
    var add = function (list) { (list || []).forEach(function (t) { out[t] = true; }); };
    add(state.pre.tags);
    MAP.openers.forEach(function (o) {
      var opt = o.opts.filter(function (x) { return x.v === state.a[o.id]; })[0];
      if (opt) add(opt.tags);
    });
    (MAP.branches[state.arch] || []).forEach(function (s) {
      var key = bkey(s);
      var chosen = state.a[key];
      if (chosen == null) return;
      var list = Array.isArray(chosen) ? chosen : [chosen];
      s.opts && s.opts.forEach(function (o) { if (list.indexOf(o.v) !== -1) add(o.tags); });
    });
    return out;
  }
  function bkey(s) { return 'b_' + state.arch + '_' + s.id; }
  function openAnswers() {
    var out = {};
    (MAP.branches[state.arch] || []).forEach(function (s) { if (s.kind === 'open' && state.a[bkey(s)]) out[s.id] = state.a[bkey(s)]; });
    return out;
  }

  /* ---------------- Steps ---------------- */
  var QKINDS = ['text', 'single', 'multi', 'open', 'town', 'contact'];

  function mapStep(s, key) {
    var step = { id: s.id, kind: s.kind, key: key, eyebrow: s.eyebrow, q: s.q, help: s.help, opts: s.opts, cta: s.cta };
    if (s.kind === 'open') {
      step.placeholder = s.placeholder || '';
      step.cta = 'Next';
      step.render = function () {
        return '<p class="sq-eyebrow clear-caps">' + questionLabel() + '</p>' +
          '<h2 class="sq-q clear-display">' + rich(s.q) + '</h2>' +
          (s.help ? '<p class="sq-help">' + rich(s.help) + '</p>' : '') +
          '<div class="sq-field"><label for="sqOpen" class="clear-caps">In your words</label><textarea id="sqOpen" rows="4" maxlength="400" placeholder="' + esc(s.placeholder || '') + '">' + esc(state.a[key] || '') + '</textarea></div>' +
          '<p class="sq-fine">Nothing to add? Just tap Next.</p>';
      };
      step.read = function () { state.a[key] = ($('sqOpen').value || '').trim().slice(0, 400); };
    }
    return step;
  }

  function steps() {
    var head = [
      {
        id: 'intro', kind: 'intro',
        render: function () {
          return '<p class="sq-eyebrow clear-caps">The Connecticut water check</p>' +
            '<h1 class="sq-q clear-display">Find the right system for <span class="clear-script">your tap.</span></h1>' +
            '<p class="sq-help">Two questions sort you into a type. Then we ask what someone like you actually asks, match it to what’s on record for your town, and show you the one system that fits. About <strong>90 seconds</strong>. No pressure, no obligation.</p>' +
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
      }
    ];
    MAP.openers.forEach(function (o) { head.push(mapStep(o, o.id)); });
    head.push({
      id: 'reveal', kind: 'reveal',
      render: function () {
        var a = arch();
        var short = archShort();
        return '<p class="sq-eyebrow clear-caps">You’re sorted</p>' +
          '<h2 class="sq-q clear-display">' + esc(first()) + ', you’re ' + article(short) + ' <span class="clear-script">' + esc(short) + '.</span></h2>' +
          '<div class="sq-arch">' +
          '<div class="sq-arch-top"><span class="sq-arch-glyph" aria-hidden="true">' + esc(short.charAt(0)) + '</span><div><div class="sq-arch-name clear-display">' + esc(a.name) + '</div><p class="sq-arch-tag">' + esc(a.tag) + '</p></div></div>' +
          '<p class="sq-arch-id">' + rich(a.identity) + '</p>' +
          '<p class="sq-arch-shift">' + rich(a.shift) + '</p>' +
          '</div>' +
          '<p class="sq-help" style="margin:16px 0 0">Next: your town’s water record, then four questions written for ' + article(short) + ' ' + esc(short) + '.</p>';
      },
      cta: 'That’s me. Keep going'
    });
    head.push({
      id: 'town', kind: 'town', key: 'town',
      render: function () {
        var opts = '<option value="">Pick a town…</option>' + TOWNS.map(function (t) { return '<option value="' + esc(t) + '"' + (state.a.town === t ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('');
        return '<p class="sq-eyebrow clear-caps">Your town</p>' +
          '<h2 class="sq-q clear-display">Which Connecticut town is the <span class="clear-script">home in?</span></h2>' +
          '<p class="sq-help">We’ll pull what’s on record for that town’s water before you go any further.</p>' +
          '<div class="sq-field"><label for="sqTown" class="clear-caps">Town</label><div class="sq-selwrap"><select id="sqTown">' + opts + '</select><svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 5l4 4 4-4" fill="none" stroke="#0E2E2C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div><span class="sq-err">Pick the town to keep going.</span></div>';
      },
      valid: function () { return !!state.a.town; },
      read: function () { state.a.town = $('sqTown').value; },
      onMount: function () { $('sqTown').addEventListener('change', function () { state.a.town = this.value; save(); setFoot(); }); },
      cta: 'Show me my town'
    });
    head.push({ id: 'townReport', kind: 'info', render: renderTownReport, cta: 'Got it, keep going' });

    var branch = (MAP.branches[state.arch] || []).map(function (s) { return mapStep(s, bkey(s)); });

    var tail = [
      {
        id: 'build', kind: 'build',
        render: function () {
          return '<p class="sq-eyebrow clear-caps">One moment</p>' +
            '<h2 class="sq-q clear-display">Building your <span class="clear-script">water plan.</span></h2>' +
            '<div class="sq-build">' +
            buildRow('Reading what’s on record for ' + esc(state.a.town || 'your town')) +
            buildRow('Matching it to what ' + article(archShort()) + ' ' + esc(archShort()) + ' sees at the sink') +
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
          var ph = ($('sqPhone').value || '').replace(/\D/g, '');
          var em = ($('sqEmail').value || '').trim();
          setBad($('sqPhone'), !(ph.length === 10 || (ph.length === 11 && ph.charAt(0) === '1')));
          setBad($('sqEmail'), !!em && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em));
          return !cardEl.querySelector('.is-bad');
        },
        read: function () { state.a.phone = $('sqPhone').value.trim(); state.a.email = $('sqEmail').value.trim(); },
        onDone: submitLead,
        cta: 'See my plan'
      },
      { id: 'result', kind: 'result', render: renderResult }
    ];
    return head.concat(branch, tail);
  }

  function buildRow(text) {
    return '<div class="sq-build-row"><span class="sq-build-dot"><svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6.2l2.6 2.6L10 3.5" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span>' + text + '</span></div>';
  }

  /* ---------------- Recommendation ---------------- */
  // The archetype gives the lean; the tags from its branch can override it. Renters always get the kitchen tap.
  function recommend() {
    var T = tags();
    var has = function (t) { return !!T[t]; };
    var P = MAP.plans;
    var hard = has('hard'), health = has('health'), taste = has('taste'), sed = has('sed') || has('sulfur');
    var untested = has('untested') && !has('tested');
    var plan, why = [], alt = '';
    var townLine = townWhy();

    if (has('rent')) {
      plan = P.sink;
      why.push('You rent, so we keep it to the kitchen tap. No plumbing changes to the house, and it comes with you when you move.');
      if (health) why.push('Reverse osmosis is the stage that handles PFAS, lead, arsenic and nitrates at the glass.');
      if (hard) alt = 'Spots and dry skin are hard water, and that’s a whole-house fix (Soft), which is the owner’s call. We’ll put the test numbers in writing so you have something to hand them.';
    } else if (state.arch === 'fixer') {
      plan = (health || taste || has('both')) ? P.complete : P.soft;
      why.push('Spots, scale and dry skin are one problem with one cause. A softener at the main line fixes it at every faucet, not one at a time.');
      if (has('appliances')) why.push('Scale is what shortens a water heater and dishwasher. Soft water is the cheapest appliance insurance there is.');
      if (plan === P.complete) why.push('You also want the water you drink handled, so reverse osmosis at the kitchen tap rides along. That pair is Complete.');
      if (has('softener')) alt = 'There’s already a softener. The test tells us whether it’s undersized, exhausted or just needs service before you buy anything new.';
      if (has('sed')) alt = alt || 'Orange staining is iron on top of hardness. If the test confirms it, a sediment stage goes in front of the softener.';
    } else if (state.arch === 'protector') {
      plan = hard ? P.complete : P.sink;
      why.push('Reverse osmosis at the kitchen tap is the stage that takes PFAS, lead, nitrates and arsenic out of the water that goes in the bottle.');
      if (has('formula') || has('baby')) why.push('For formula and a baby’s first water, that’s the one place we’d never skip.');
      if (has('pitcher')) why.push('A pitcher or fridge filter is carbon. It fixes taste. It does not take out PFAS, lead or nitrates. RO does.');
      if (hard) why.push('You also mentioned spots and dry skin, so the softener handles the whole house and the RO handles the glass. That pair is Complete.');
      if (has('well')) alt = 'On a well, the test also checks bacteria and arsenic first. If either shows, that gets handled before anything else.';
    } else if (state.arch === 'standard') {
      if (has('chlorine') || has('sulfur') || has('sed')) plan = hard ? P.complete : P.essential;
      else plan = has('both') ? P.essential : P.sink;
      if (plan === P.essential || plan === P.complete) why.push('The taste you’re describing is at every faucet, so the fix goes at the main line. Carbon takes chlorine and odor out of the water you drink, cook with and shower in.');
      if (plan === P.sink && taste) why.push('Flat or off tastes are usually a drinking-water problem, so we start where you drink it: reverse osmosis at the kitchen tap.');
      if (health && !taste) why.push('You can\u2019t taste PFAS, lead or nitrates. Reverse osmosis is the stage that takes them out, and the test tells you whether they\u2019re there to begin with.');
      if (has('bottled')) why.push('A case a week is the workaround. The system is the fix, and it’s the last time you think about it.');
      if (has('sulfur')) alt = 'Rotten egg is sulfur, and it’s usually a well. The test confirms the level, because the treatment stage depends on it.';
      if (has('pitcher')) alt = alt || 'A fridge filter is carbon too, just small and usually past its date. This is that idea, done once, for the whole house.';
    } else if (state.arch === 'investigator') {
      if (has('now')) {
        plan = (hard && health) ? P.complete : health ? P.sink : hard ? P.soft : P.essential;
        why.push('You’ve done the reading. The test confirms your tap against the report, and the install follows the numbers.');
      } else {
        plan = P.test;
        why.push('A measurement, not a pitch. The technician tests your tap, leaves the written numbers, and leaves. You compare them to the report yourself.');
      }
      if (has('pfas')) why.push('Reverse osmosis is the stage that takes PFAS out at the tap. Carbon alone does not reliably do it.');
      if (has('lead')) why.push('Lead is usually the pipes, not the plant, which is exactly why the plant’s report can’t tell you.');
      if (hard && plan === P.test) alt = 'Hardness is on record for your town. If the tap confirms it, Soft is the whole-house fix and RO at the sink covers the rest. Together that’s Complete.';
    } else if (state.arch === 'freshstart') {
      plan = P.test;
      why.push('A new house gets a baseline. One test, one written report, and you know exactly what you inherited on day one.');
      if (has('softener')) why.push('The softener that came with the house gets checked, not replaced. If it’s doing its job, you keep it.');
      if (has('well')) why.push('A well means nobody has tested this water but the previous owner, if they ever did. Bacteria and arsenic come first.');
      if (hard) alt = 'Spots and scale that early usually mean Soft is where this ends up. The test confirms the hardness before you decide.';
      else if (taste) alt = 'Taste or smell on week one is usually chlorine or iron. If the test agrees, Essential at the main line is the fix.';
      else if (sed) alt = 'Staining is iron or sediment. If the test agrees, Essential at the main line is the fix.';
    } else { // scrutinizer
      if (untested || (!hard && !sed && !health)) {
        plan = P.test;
        why.push('A test is the Scrutinizer\u2019s move: bacteria, arsenic, hardness and iron, in writing, before anyone tries to sell you anything.');
        why.push('About 1 in 25 Connecticut wells is over the arsenic limit, and you can’t taste it. That’s the one worth seeing.');
        if (sed) alt = 'The staining is almost certainly iron. If the test confirms it, Essential at the main line is the fix, and you’ll have the number to prove it.';
        else if (hard) alt = 'Spots and scale are hardness. If the test confirms it, Soft is the fix. You’ll see the grains per gallon before you decide.';
      } else {
        plan = (hard && (sed || health)) ? P.complete : hard ? P.soft : P.essential;
        why.push('You’ve seen it at the tap and you’ve had it tested. The system matches what the water is actually doing.');
        if (sed) why.push('Orange staining and grit are iron and sediment. Essential takes them out at the main line, before the fixtures.');
        if (hard) why.push('Spots and scale are hardness. A softener fixes that at every faucet.');
      }
      if (health) why.push('With kids drinking it, reverse osmosis at the kitchen tap is the stage for arsenic, nitrates and lead at the glass.');
    }

    if (townLine) why.push(townLine);
    return { plan: plan, why: why.slice(0, 4), alt: alt };
  }

  function townWhy() {
    var t = state.a.town;
    if (!t || !D || !D.towns[t]) return '';
    var T = tags();
    var prof = D.towns[t].profile;
    var utils = utilitiesFor(t);
    if (prof === 'M' && utils.length && !T.well) {
      var n = notableFor(utils[0]);
      if (n && n.pct_of_limit >= 50) return 'In ' + t + ', ' + utils[0].name + ' reported ' + n.name + ' at ' + fmt(n.level) + ' ' + (n.units || '') + ', about ' + Math.round(n.pct_of_limit) + '% of the federal limit. The test checks your tap, not the plant.';
      return 'In ' + t + ', ' + utils[0].name + '’s report covers the plant, not your pipes. The test checks the water at your sink.';
    }
    if (prof === 'N' || prof === 'S' || T.well) return 'Most homes in ' + t + ' are on private wells. Nobody tests those but you, which is why the test comes first.';
    return '';
  }

  /* ---------------- Renderers ---------------- */
  function renderTownReport() {
    var t = state.a.town;
    var info = D && D.towns[t];
    var T = tags();
    if (!info) {
      return '<p class="sq-eyebrow clear-caps">' + esc(t || 'Your town') + '</p><h2 class="sq-q clear-display">Here’s the <span class="clear-script">short version.</span></h2><p class="sq-help">About 1 in 4 people in Connecticut drink from a private well that no utility tests. A utility report, where one exists, covers the plant, not your kitchen tap.</p>';
    }
    var well = !!T.well;
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
    var lead = well ? 'You said you’re on a well. Nobody tests that water but you.' : prof.headline;
    return '<p class="sq-eyebrow clear-caps">What’s on record for ' + esc(t) + '</p>' +
      '<h2 class="sq-q clear-display">' + esc(first()) + ', here’s your <span class="clear-script">town.</span></h2>' +
      '<div class="sq-town">' +
      '<span class="badge clear-caps" style="background:' + prof.color + '">' + esc(well ? 'Private well' : prof.badge) + '</span>' +
      '<div class="sq-town-head">' + esc(lead) + '</div>' +
      '<p class="sq-town-body">' + esc(well ? 'No community system reports on a private well. The only numbers that exist for your water are the ones a test produces at your tap.' : prof.body) + '</p>' +
      rows +
      '<p class="clear-caps" style="font-size:12px;margin:6px 0 0;color:rgba(243,237,220,.75)">A Sunday test in ' + esc(t) + ' checks for</p>' +
      '<ul class="sq-town-checks">' + prof.checks.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') + (well || info.profile !== 'M' ? '' : '<li>PFAS</li>') + '</ul>' +
      '<p class="sq-town-src">Source: EPA SDWIS, CT DPH, utility water quality reports.</p>' +
      '</div>' +
      '<p class="sq-help" style="margin:16px 0 0">Four more questions, written for ' + article(archShort()) + ' ' + esc(archShort()) + ', and we’ll match this to what you see at the sink.</p>';
  }

  function renderResult() {
    var r = recommend();
    var p = r.plan;
    var a = arch();
    var art = p.image
      ? '<img src="' + esc(p.image) + '" alt="' + esc(p.alt) + '" width="104" height="104">'
      : '<span class="sq-result-ic" aria-hidden="true"><svg width="56" height="56" viewBox="0 0 56 56"><path d="M28 6c-7 11-15 19-15 29a15 15 0 0 0 30 0c0-10-8-18-15-29z" fill="#3E8F74" stroke="#0E2E2C" stroke-width="2.5" stroke-linejoin="round"/><path d="M21 36a7 7 0 0 0 7 7" fill="none" stroke="#F3EDDC" stroke-width="2.5" stroke-linecap="round"/></svg></span>';
    var slots = ['Weekday morning', 'Weekday afternoon', 'Weekday evening', 'Saturday'];
    var isTest = p === MAP.plans.test;
    // A renter keeps the identity but the fix moves to the kitchen tap; the archetype's lead would contradict the plan.
    var lead = tags().rent
      ? 'Renting doesn\u2019t change what kind of person you are. It changes where the fix goes: the kitchen tap, with the numbers in writing for whoever owns the pipes.'
      : a.resultLead;
    return '<p class="sq-eyebrow clear-caps">Your water plan</p>' +
      '<p class="sq-result-arch clear-caps"><span aria-hidden="true">' + esc(archShort().charAt(0)) + '</span><span>' + esc(a.name) + '</span></p>' +
      '<h2 class="sq-q clear-display">' + rich(a.resultHead) + '</h2>' +
      '<p class="sq-result-lead">' + rich(lead) + '</p>' +
      '<div class="sq-result-hero">' + art + '<div>' + (p.flag ? '<span class="sq-result-flag clear-caps">' + esc(p.flag) + '</span>' : '') + '<div class="sq-result-name clear-display">' + esc(p.name) + '</div><p class="sq-result-detail">' + esc(p.detail) + '</p></div></div>' +
      '<p class="clear-caps" style="font-size:13px;margin:0 0 10px;color:#3E8F74">Why this fits ' + article(archShort()) + ' ' + esc(archShort()) + '</p>' +
      '<ul class="sq-why">' + r.why.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul>' +
      (r.alt ? '<p class="sq-alt">' + esc(r.alt) + '</p>' : '') +
      '<div class="sq-next"><h3 class="clear-display">' + (isTest ? 'Step one: the free in-home test.' : 'Next: the free in-home test.') + '</h3>' +
      '<p class="sq-help" style="margin-bottom:0">A technician tests your tap in ' + esc(state.a.town || 'your town') + ', walks you through the numbers, and leaves you a written report. The price comes after you see your water.</p>' +
      '<p class="clear-caps" style="font-size:13px;margin:16px 0 0">Best time for you</p>' +
      '<div class="sq-chips" id="sqSlots">' + slots.map(function (s) { return '<button type="button" class="chip clear-btn" aria-pressed="' + (state.a.slot === s) + '">' + s + '</button>'; }).join('') + '</div>' +
      '<a id="sqBook" class="sq-btn clear-caps" href="' + bookHref(p) + '">Book my free water test</a>' +
      '<a class="sq-btn sq-btn-navy clear-caps" href="' + CONFIG.phoneHref + '">Call ' + CONFIG.phone + '</a>' +
      '<ul class="sq-trust"><li>No pressure, no obligation</li><li>Licensed CT plumber install</li><li>Cancel any agreement within 3 business days</li></ul>' +
      '</div>';
  }

  function planKey(p) { var k = ''; Object.keys(MAP.plans).forEach(function (x) { if (MAP.plans[x] === p) k = x; }); return k; }

  function bookHref(plan) {
    var a = state.a;
    var q = new URLSearchParams();
    if (a.town) q.set('town', a.town);
    if (a.name) q.set('name', a.name);
    if (a.phone) q.set('phone', a.phone);
    if (a.email) q.set('email', a.email);
    if (state.pre.street) q.set('street', state.pre.street);
    if (plan && plan.interest) q.set('interest', plan.interest);
    if (a.slot) q.set('slot', a.slot);
    q.set('plan', planKey(plan));
    q.set('archetype', state.arch || '');
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
      archetype: state.arch,
      name: state.a.name, phone: state.a.phone, email: state.a.email,
      town: state.a.town, street: state.pre.street || '',
      answers: state.a,
      in_their_words: openAnswers(),
      tags: Object.keys(tags()),
      recommended: planKey(r.plan),
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
  function step() { var s = steps(); if (state.i >= s.length) state.i = s.length - 1; return s[state.i]; }
  function questionCount() { return steps().filter(function (s) { return QKINDS.indexOf(s.kind) !== -1; }).length; }
  function questionIndex(i) {
    var n = 0, s = steps();
    for (var k = 0; k <= i && k < s.length; k++) if (QKINDS.indexOf(s[k].kind) !== -1) n++;
    return n;
  }
  function questionLabel() { return 'Question ' + questionIndex(state.i) + ' of ' + questionCount(); }

  function render(dir) {
    var s = step();
    var html;
    if (s.render) html = s.render();
    else {
      html = '<p class="sq-eyebrow clear-caps">' + (s.eyebrow ? rich(s.eyebrow) : questionLabel()) + '</p>' +
        '<h2 class="sq-q clear-display">' + rich(s.q) + '</h2>' +
        (s.help ? '<p class="sq-help">' + rich(s.help) + '</p>' : '') +
        '<ul class="sq-opts' + (s.kind === 'single' && s.opts.length >= 4 && s.opts.every(function (o) { return o.t.length <= 28; }) ? ' sq-grid-2' : '') + '" role="' + (s.kind === 'multi' ? 'group' : 'radiogroup') + '">' +
        s.opts.map(function (o, oi) {
          var on = s.kind === 'multi' ? (state.a[s.key] || []).indexOf(o.v) !== -1 : state.a[s.key] === o.v;
          return '<li><button type="button" class="sq-opt" data-v="' + esc(o.v) + '" role="' + (s.kind === 'multi' ? 'checkbox' : 'radio') + '" aria-checked="' + on + '"><span class="sq-opt-ic" aria-hidden="true">' + String.fromCharCode(65 + oi) + '</span><span class="sq-opt-txt">' + esc(o.t) + (o.s ? '<span class="sq-opt-sub">' + esc(o.s) + '</span>' : '') + '</span><span class="sq-opt-tick" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6.2l2.6 2.6L10 3.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span></button></li>';
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
    if (s.kind === 'text' || s.kind === 'contact' || s.kind === 'town' || s.kind === 'open') bindFields(s);
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
          afterAnswer(s);
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
          afterAnswer(s);
          save();
          setFoot();
        }
      });
    });
  }
  // Openers re-sort the archetype every time they change.
  function afterAnswer(s) {
    if (MAP.openers.some(function (o) { return o.id === s.key; })) state.arch = sortArch();
  }

  function bindFields(s) {
    var inputs = Array.prototype.slice.call(cardEl.querySelectorAll('input, textarea'));
    inputs.forEach(function (inp, idx) {
      inp.addEventListener('input', function () { setBad(inp, false); if (s.read) s.read(); save(); setFoot(); });
      inp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && inp.tagName !== 'TEXTAREA') { e.preventDefault(); if (inputs[idx + 1]) inputs[idx + 1].focus(); else next(); }
      });
    });
    var firstInput = cardEl.querySelector('input, select, textarea');
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
    footInner.innerHTML = '<button type="button" id="sqNext" class="sq-btn clear-caps"' + (canAdvance() ? '' : ' disabled') + '>' + esc(s.cta || 'Next') + '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M4 9h10M10 5l4 4-4 4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      (s.note ? '<p class="sq-foot-note">' + s.note + '</p>' : '');
    $('sqNext').addEventListener('click', next);
  }

  function setProgress() {
    var s = step();
    var total = steps().length - 1;
    var pct = s.kind === 'result' ? 100 : Math.round((state.i / total) * 100);
    fillEl.style.width = pct + '%';
    if (s.kind === 'intro') { stepEl.textContent = 'About 90 seconds'; pctEl.textContent = ''; }
    else if (s.kind === 'result') { stepEl.textContent = 'Your plan'; pctEl.textContent = 'Done'; }
    else { stepEl.textContent = state.arch && state.i > 3 ? archShort() : 'Water check'; pctEl.textContent = pct + '%'; }
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
    var all = steps();
    var n = state.i + dir;
    if (n < 0 || n >= all.length) return;
    // Back from the result skips the contact + build screens; back from contact skips the build animation.
    if (dir < 0 && all[n].kind === 'build') n--;
    if (dir < 0 && all[n].id === 'townReport') n--;
    // Never land on the reveal without a sort.
    if (all[n].kind === 'reveal' && !state.arch) state.arch = sortArch();
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
    document.querySelector('.sq-bar-mark').addEventListener('click', function () { try { sessionStorage.setItem('sunday_home', '1'); } catch (e) {} });

    fetch(CONFIG.mapUrl).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (map) {
      MAP = map;
      start();
    }).catch(function () {
      stageEl.innerHTML = '<div class="sq-card"><h1 class="sq-q clear-display">Test my water.</h1><p class="sq-help">The water check couldn’t load. You can <a href="' + CONFIG.bookUrl + '">book a free in-home test</a> or call <a href="' + CONFIG.phoneHref + '">' + CONFIG.phone + '</a>.</p></div>';
    });
  }

  function start() {
    if (!state.pre) state.pre = {};
    // Deep links: start.html#address=...&town=...&source=well&restart=1 (hash survives clean-URL redirects; query works too)
    try {
      var p = new URLSearchParams((location.hash || '').replace(/^#/, ''));
      new URLSearchParams(location.search).forEach(function (v, k) { if (!p.has(k)) p.set(k, v); });
      if (p.get('restart')) { state = { i: 0, a: {}, pre: {}, arch: '' }; }
      var addr = (p.get('address') || '').trim();
      var town = p.get('town') || townFromText(addr);
      if (addr) state.pre.street = addr;
      if (town && TOWNS.indexOf(town) !== -1) state.a.town = town;
      if (p.get('source') === 'well') state.pre.tags = ['well'];
      if (p.get('source') === 'city') state.pre.tags = ['city'];
    } catch (e) {}
    // Resume safely: never into the build screen, a stale result, or a branch without a sort.
    if (state.arch && !MAP.archetypes[state.arch]) state.arch = '';
    if (!state.arch && state.i > 3) state.i = 2;
    if (step().kind === 'build') state.i -= 1;
    if (step().kind === 'result' && !(state.a.phone)) state.i = 0;
    render('init');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
