/* tc-ui.js: the engine pieces the Forms pages use (Python reaches them through client_code/tc.py and Components/*).
     TC.mountStage(el, opts)   the bamboo backdrop + a TC.Figure in el (Components/Stage, MoveCard thumbnails)
     TC.lymphMap(el)           the lymph guide's body map: the figure + numbered points (Components/LymphMap)
     TC.catalogJSON()          moves, categories, stages, the 24 steps, kinds and feelings as JSON text for Python
     TC.footprints(el, opts)   "Feet first": a top-down map of a move's footprints (numbered), the weighted foot filled,
                               the free foot outlined, a dot for the weight; follows the live teacher (Components/Footprints
                               on the Move page, a small one in the session panel for form moves)
     TC.onSpace(fn)            Space (outside fields and buttons) calls fn; returns the function that removes it
     TC.player(nodes, S, prefs, hooks)   the guided session (Pages/Session): the teacher, the steps lighting up, the
                               breathing orb, the clock and progress bar, voice + bell + forest sound + music, wake lock,
                               keys (space = pause, arrows = previous/next). Moved from the JavaScript version's
                               web/pages/session.html; the intro, the "finish here?" dialog and the done screen are Forms.
     TC.local.annotate / TC.guestStats   a guest's last session (feeling after, note) and their stats, kept in this browser.
   Tests: window.TC.session.{state, next, finish, skipAhead}. */
(function () {
  'use strict';
  var TC = window.TC;

  /* ---------------------------------------------------------------- stage + figure */
  TC.mountStage = function (el, opts) {
    opts = opts || {};
    el.innerHTML = TC.stage({ seed: opts.seed || 7, sunX: opts.sunX || undefined }) + '<svg></svg>' + (opts.extra || '');
    var f = new TC.Figure(el.querySelector('svg:not(.tc-bg)'), {
      trails: opts.trails !== false, mirror: !!opts.mirror, gentle: !!opts.gentle, onKey: opts.onKey || null, label: opts.label,
      yaw: opts.yaw == null ? undefined : opts.yaw, pitch: opts.pitch == null ? undefined : opts.pitch
    });
    if (opts.move && TC.moveKeys(opts.move)) {
      f.setKeys(TC.moveKeys(opts.move));
      if (opts.still) f.time(TC.heroTime(opts.move)); else f.play();
    }
    return f;
  };

  /* ---------------------------------------------------------------- lymph body map (was learn.html) */
  var MAP = [['collarbone', 'lsh', 'rsh'], ['neck-sides', 'neck', null], ['ears', 'head', null], ['armpits', 'lsh', 'rsh'],
    ['belly', 'pel', 'chest'], ['groin', 'lhp', 'rhp'], ['thighs', 'lkn', 'rkn']];
  TC.lymphMap = function (host) {
    host.innerHTML = TC.stage({ seed: 9 }) + '<svg data-lyfig></svg><svg class="dots" data-dots aria-hidden="true"></svg>';
    var f = new TC.Figure(host.querySelector('[data-lyfig]'), { trails: false, yaw: 0, pitch: 4, label: 'A body map of the lymph massage points' });
    f.setPose({ lf: [13, 0, 0, 4, 0], rf: [-13, 0, 0, -4, 0], sink: 3, lh: [30, -50, 6], rh: [-30, -50, 6] });
    function place() {
      var P = f.drawNow(), sz = f.size(), out = '';
      if (!P) return;
      MAP.forEach(function (m, i) {
        var pts = [], a = P[m[1]], b = m[2] ? P[m[2]] : null;
        if (m[0] === 'collarbone') pts = [[(P.chest[0] * .6 + a[0] * .4), P.chest[1] + 4 * sz.scale], [(P.chest[0] * .6 + b[0] * .4), P.chest[1] + 4 * sz.scale]];
        else if (m[0] === 'armpits') pts = [[a[0] - (a[0] > P.chest[0] ? 1 : -1) * 3 * sz.scale, a[1] + 14 * sz.scale], [b[0] - (b[0] > P.chest[0] ? 1 : -1) * 3 * sz.scale, b[1] + 14 * sz.scale]];
        else if (m[0] === 'neck-sides') pts = [[a[0] - 6 * sz.scale, a[1] - 5 * sz.scale], [a[0] + 6 * sz.scale, a[1] - 5 * sz.scale]];
        else if (m[0] === 'ears') pts = [[a[0] - 11 * sz.scale, a[1]], [a[0] + 11 * sz.scale, a[1]]];
        else if (m[0] === 'belly') pts = [[a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25]];
        else if (m[0] === 'groin') pts = [[a[0], a[1] + 6 * sz.scale], [b[0], b[1] + 6 * sz.scale]];
        else pts = [[a[0], a[1]], [b[0], b[1]]];
        pts.forEach(function (p) {
          out += '<circle class="ring" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="10" style="animation-delay:' + (i * .3) + 's"/>' +
            '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="9"/>' + '<text x="' + p[0].toFixed(1) + '" y="' + p[1].toFixed(1) + '">' + (i + 1) + '</text>';
        });
      });
      var dots = host.querySelector('[data-dots]');
      dots.setAttribute('viewBox', '0 0 ' + sz.w + ' ' + sz.h);
      dots.innerHTML = out;
    }
    setTimeout(place, 30);
    var ro = window.ResizeObserver ? new ResizeObserver(function () { place(); }) : null;
    if (ro) ro.observe(host);
    return { stop: function () { f.stop(); if (ro) ro.disconnect(); } };
  };

  /* ---------------------------------------------------------------- content for Python */
  TC.catalogJSON = function () {
    return JSON.stringify({
      moves: TC.MOVES.map(function (m) {
        return { id: m.id, cat: m.cat, name: m.name, zh: m.zh || '', py: m.py || '', about: m.about || '', steps: m.steps, tip: m.tip || '',
          form: m.form || null, both: !!m.both, secs: m.secs, loop: Math.round(TC.moveLength(m.id)), gentle_tip: m.gentleTip || '' };
      }),
      cats: TC.CATS, stages: TC.STAGES, path: TC.PATH, form24: TC.FORM24, kinds: TC.KINDS, feels: TC.FEELS, learned_at: TC.LEARNED_AT,
      gentle_chair: TC.GENTLE_CHAIR
    });
  };

  /* ---------------------------------------------------------------- feet first: the footprint map */
  /* Seen from above with "forward" pointing up the screen, as if you stood behind the teacher: the teacher's left foot
     is on the left and marked L. Mirrored (you practise the other side, as in a mirror) the map flips and the marks
     swap. Prints are every place a foot rests in the move (both sides for left-and-right moves), numbered in order. */
  var SOLE = 'M0,-16C5,-16 6,-8 5,-2C4.5,3 3,5 0,5C-3,5 -4.5,3 -5,-2C-6,-8 -5,-16 0,-16Z';
  function r1(n) { return Math.round(n * 10) / 10; }
  TC.footprints = function (host, opts) {
    opts = opts || {};
    var id = null, keys = null, prints = [], mirror = !!opts.mirror, fig = opts.fig || null, figSvg = null;
    var raf = 0, stopped = false, sig = '', vb = [0, 0, 100, 100], compact = !!opts.compact;
    host.classList.add('fp');
    if (compact) host.classList.add('fp-compact');
    host.innerHTML = '<svg class="fp-map" role="img" preserveAspectRatio="xMidYMid meet"><g class="fp-grid"></g><g class="fp-prints"></g><g class="fp-live"></g></svg>' +
      (compact ? '' : '<div class="fp-cap"><span data-fp-weight>Weight in both feet</span><span class="fp-key"><i class="fp-k full"></i>full<i class="fp-k empty"></i>empty</span></div>');
    var svg = host.querySelector('svg'), gGrid = svg.querySelector('.fp-grid'), gPr = svg.querySelector('.fp-prints'), gLive = svg.querySelector('.fp-live');
    var wLabel = host.querySelector('[data-fp-weight]');
    function sx(x) { return mirror ? x : -x; }
    function sy(z) { return -z; }
    function angle(yaw) { var a = yaw * Math.PI / 180; return Math.atan2(mirror ? Math.sin(a) : -Math.sin(a), Math.cos(a)) * 180 / Math.PI; }
    function sole(f, cls, extra) {
      return '<path class="' + cls + '" d="' + SOLE + '" transform="translate(' + r1(sx(f[0])) + ' ' + r1(sy(f[1])) + ') rotate(' + r1(angle(f[3] || 0)) + ')' + (extra || '') + '"/>';
    }
    function side(foot) { return (foot === 'lf') !== mirror ? 'L' : 'R'; }
    function collect() {
      prints = [];
      if (!keys) return;
      keys.forEach(function (k) {
        ['lf', 'rf'].forEach(function (foot) {
          var f = k.p[foot];
          if (f[2] >= 3) return;
          for (var i = 0; i < prints.length; i++) {
            var q = prints[i];
            if (q.foot === foot && Math.abs(q.f[0] - f[0]) + Math.abs(q.f[1] - f[1]) < 5 && Math.abs((q.f[3] || 0) - (f[3] || 0)) < 25) return;
          }
          prints.push({ foot: foot, f: f.slice(), mir: !!k.mir });
        });
      });
    }
    function drawStatic() {
      var x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      prints.forEach(function (q) {
        var x = sx(q.f[0]), y = sy(q.f[1]);
        x0 = Math.min(x0, x - 10); x1 = Math.max(x1, x + 10); y0 = Math.min(y0, y - 20); y1 = Math.max(y1, y + 10);
      });
      if (!prints.length) { x0 = -30; x1 = 30; y0 = -30; y1 = 20; }
      var pad = 10, w = Math.max(70, x1 - x0 + pad * 2), h = Math.max(compact ? 50 : 64, y1 - y0 + pad * 2);
      var cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      var ratio = compact ? 2.2 : 1.7;  // wider than tall: the map sits as a strip
      if (w / h < ratio) w = h * ratio; else h = w / ratio;
      vb = [cx - w / 2, cy - h / 2, w, h];
      svg.setAttribute('viewBox', vb.map(r1).join(' '));
      var grid = '', step = 20, gx, gy;
      for (gx = Math.ceil(vb[0] / step) * step; gx < vb[0] + w; gx += step) grid += '<path d="M' + r1(gx) + ' ' + r1(vb[1]) + 'v' + r1(h) + '"/>';
      for (gy = Math.ceil(vb[1] / step) * step; gy < vb[1] + h; gy += step) grid += '<path d="M' + r1(vb[0]) + ' ' + r1(gy) + 'h' + r1(w) + '"/>';
      grid += '<path class="fp-fwd" d="M' + r1(vb[0] + 7) + ' ' + r1(vb[1] + h - 5) + 'v-13m-3.5 4 3.5-4 3.5 4"/>';
      gGrid.innerHTML = grid;
      gPr.innerHTML = prints.map(function (q, i) {
        var tx = sx(q.f[0]), ty = sy(q.f[1]), a = angle(q.f[3] || 0) * Math.PI / 180;
        var nx = tx + Math.sin(a) * 6, ny = ty - Math.cos(a) * 6;
        return '<g class="fp-print print' + (q.mir ? ' mir' : '') + '" data-foot="' + side(q.foot) + '">' + sole(q.f, 'fp-sole') +
          '<text x="' + r1(nx) + '" y="' + r1(ny + 2.6) + '">' + (i + 1) + '</text></g>';
      }).join('');
      var name = TC.MOVE[id] ? TC.MOVE[id].name : 'the move';
      svg.setAttribute('aria-label', 'Footprint map of ' + name + ': ' + prints.length + ' places where the feet rest, seen from above' + (mirror ? ', mirrored' : ''));
      sig = '';
    }
    function findFig() {
      if (opts.fig) return opts.fig;
      if (figSvg && figSvg.isConnected && figSvg._tcfig) return figSvg._tcfig;
      figSvg = opts.stage ? opts.stage.querySelector('svg.tc-fig') : null;
      return figSvg && figSvg._tcfig || null;
    }
    function live() {
      fig = findFig();
      var p = fig && fig.shownPose;
      if (!p && keys) p = keys[0].p;
      if (!p) return;
      var L = p.lf, R = p.rf;
      var s2 = [L[0], L[1], L[2], L[3], R[0], R[1], R[2], R[3], p.px, p.pz].map(function (n) { return Math.round(n * 2); }).join(',') + (mirror ? 'm' : '');
      if (s2 === sig) return;
      sig = s2;
      var upL = L[2] >= 3, upR = R[2] >= 3, u;
      if (upL && !upR) u = 1;
      else if (upR && !upL) u = 0;
      else {
        var dx = R[0] - L[0], dz = R[1] - L[1], d2 = dx * dx + dz * dz;
        u = d2 < 1 ? .5 : Math.max(0, Math.min(1, ((p.px - L[0]) * dx + (p.pz - L[1]) * dz) / d2));
      }
      var wl = 1 - u, out = '';
      var mx = L[0] + (R[0] - L[0]) * u, mz = L[1] + (R[1] - L[1]) * u;
      out += '<path class="fp-line" d="M' + r1(sx(L[0])) + ' ' + r1(sy(L[1])) + 'L' + r1(sx(R[0])) + ' ' + r1(sy(R[1])) + '"/>';
      [['lf', L, wl, upL], ['rf', R, u, upR]].forEach(function (e) {
        var f = e[1], on = e[2] >= .5;
        out += sole(f, 'fp-foot ' + (on ? 'full' : 'empty') + (e[3] ? ' lift' : ''), e[3] ? ' scale(.86)' : '');
        out += '<text class="fp-lr' + (on ? ' on' : '') + '" x="' + r1(sx(f[0])) + '" y="' + r1(sy(f[1]) - 3) + '">' + side(e[0]) + '</text>';
      });
      out += '<circle class="fp-dot" cx="' + r1(sx(mx)) + '" cy="' + r1(sy(mz)) + '" r="3.2"/>';
      gLive.innerHTML = out;
      if (wLabel) {
        var pl = Math.round(wl * 10) * 10, a = side('lf'), b = side('rf');
        if (upL || upR) wLabel.textContent = 'All the weight on the ' + (upL ? b : a) + ' foot' + ((upL ? L : R)[2] > 12 ? ', the other lifted' : ', the other stepping');
        else wLabel.textContent = pl >= 40 && pl <= 60 ? 'Weight in both feet' : 'Weight: ' + Math.max(pl, 100 - pl) + '% on the ' + (pl > 50 ? a : b) + ' foot';
      }
    }
    function setMove(mid) {
      id = mid; keys = TC.moveKeys(mid); collect(); drawStatic(); live();
    }
    function loop() {
      raf = 0;
      if (stopped) return;
      if (!host.isConnected) { api.stop(); return; }
      live();
      raf = requestAnimationFrame(loop);
    }
    var api = {
      setMove: function (mid) { setMove(mid); return api; },
      mirror: function (v) { if (v != null && !!v !== mirror) { mirror = !!v; drawStatic(); live(); } return mirror; },
      count: function () { return prints.length; },
      stop: function () { stopped = true; if (raf) cancelAnimationFrame(raf); raf = 0; }
    };
    setMove(opts.move);
    raf = requestAnimationFrame(loop);
    return api;
  };

  TC.onSpace = function (fn) {
    function h(e) {
      if (e.key !== ' ' || e.repeat) return;
      var t = (e.target && e.target.tagName) || '';
      if (/^(input|textarea|select|button|a)$/i.test(t) || (e.target && e.target.isContentEditable)) return;
      e.preventDefault();
      fn();
    }
    document.addEventListener('keydown', h);
    return function () { document.removeEventListener('keydown', h); };
  };

  /* ---------------------------------------------------------------- guests: their sessions live in this browser */
  TC.local.annotate = function (started, feelAfter, note) {
    var all = TC.local.sessions(), last = all[all.length - 1];
    if (last && last.started === started) { last.feel_after = feelAfter; last.note = String(note || '').slice(0, 1000); UI.store.set('guest.sessions', all); return true; }
    return false;
  };
  TC.guestStats = function () {
    var all = TC.local.sessions(), st = TC.streaks(all.map(function (x) { return x.day; }));
    return JSON.stringify({ sessions: all.length, streak: st.current, days: Object.keys(all.reduce(function (o, x) { o[x.day] = 1; return o; }, {})),
      minutes: Math.round(all.reduce(function (s, x) { return s + (x.minutes || 0); }, 0)) });
  };

  /* ---------------------------------------------------------------- the guided session */
  var VIEWS = [[28, 'three-quarter'], [0, 'front'], [90, 'side'], [180, 'back']];
  TC.player = function (nodes, S, prefs, hooks) {
    var esc = UI.esc, view = nodes.stage.closest('.ss') || document;
    var fig = null, phase = 'intro', idx = 0, el = 0, playing = false, raf = 0, last = 0, speed = 1, yawI = 0;
    var done = [], stopWind = null, wake = null, startedAt = null, held = false;
    var vo = {}, lastS = -1, segBreath = '', segUntil = 0, orbState = '', destroyed = false, feet = null;
    var $ = function (s) { return view.querySelector(s); };
    function call(name) { var h = hooks && hooks[name]; if (h) { try { h.apply(null, Array.prototype.slice.call(arguments, 1)); } catch (e) { console.error(e); } } }

    fig = TC.mountStage(nodes.stage, { seed: 11, trails: prefs.trails, mirror: prefs.mirror, gentle: prefs.gentle, onKey: onKey, label: 'Your teacher, showing the current movement',
      extra: '<div class="ss-orb" data-orb hidden><i></i><span>Breathe</span></div><div class="ss-cap" data-cap></div><span class="ss-side-badge" data-sideb></span><span class="ss-mclock" data-mclock hidden></span>' });
    fig.setKeys(TC.moveKeys('wuji')).play();

    function step() { return S.steps[idx]; }
    function move() { return TC.MOVE[step().id]; }
    function practised() { return done.reduce(function (s, x) { return s + (x || 0); }, 0); }
    function left() { var t = 0; for (var i = idx; i < S.steps.length; i++) t += S.steps[i].secs - (i === idx ? el : 0); return t; }

    function drawBar() {
      nodes.bar.innerHTML = S.steps.map(function (s, i) {
        return '<i style="--w:' + Math.max(1, s.secs) + '" class="' + (i < idx && phase !== 'intro' ? 'done ' : '') + TC.MOVE[s.id].cat + '"><b></b></i>';
      }).join('');
    }
    function drawControls() {
      nodes.ctl.innerHTML = '<div class="grp side"><button type="button" class="ui-btn ghost icon ss-tog' + (prefs.voice ? ' on' : '') + '" data-tog="voice" aria-pressed="' + !!prefs.voice + '" aria-label="Spoken guidance">' + UI.icon(prefs.voice ? 'volume' : 'mute') + '</button>' +
        '<button type="button" class="ui-btn ghost icon ss-tog' + (prefs.mirror ? ' on' : '') + '" data-tog="mirror" aria-pressed="' + !!prefs.mirror + '" aria-label="Mirror the teacher">' + UI.icon('mirror') + '</button></div>' +
        '<div class="grp"><button type="button" class="ui-btn icon" data-prev aria-label="Previous step">' + UI.icon('prev') + '</button>' +
        '<button type="button" class="ui-btn primary icon ss-play" data-play aria-label="' + (playing ? 'Pause' : 'Play') + '">' + UI.icon(playing ? 'pause' : 'play') + '</button>' +
        '<button type="button" class="ui-btn icon" data-next aria-label="Next step">' + UI.icon('next') + '</button></div>' +
        '<div class="grp side"><button type="button" class="ui-btn ghost icon" data-view aria-label="Change the view">' + UI.icon('rotate') + '</button>' +
        '<button type="button" class="ui-btn ghost sm" data-speed aria-label="Speed">' + (speed === 1 ? '1×' : speed + '×') + '</button></div>';
    }
    function drawStep() {
      var s = step(), m = move(), n = S.steps[idx + 1];
      nodes.panel.innerHTML =
        '<div class="ss-meta">' + TC.catLabel(m.cat) + '<span class="small muted">Step ' + (idx + 1) + ' of ' + S.steps.length + '</span>' +
        (s.label === 'new' ? '<span class="ui-badge brand">' + UI.icon('sparkle') + 'Your new move</span>' : '') + '</div>' +
        '<h2>' + esc(s.label && s.label !== 'new' ? s.label : m.name) + '</h2>' +
        (m.zh ? '<div class="ss-zh"><span class="zh">' + esc(m.zh) + '</span>' + esc(m.py) + '</div>' : '') +
        '<ol class="ss-steps" data-steps>' + m.steps.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ol>' +
        (m.tip ? '<div class="ss-tip">' + UI.icon('leaf') + '<span>' + esc(m.tip) + '</span></div>' : '') +
        (prefs.gentle && m.gentleTip ? '<div class="ss-tip ss-gentle">' + UI.icon('chair') + '<span>' + esc(m.gentleTip) + '</span></div>' : '') +
        (m.cat === 'form' ? '<div class="ss-feet"><div class="ss-feet-h">' + UI.icon('feet') + '<span>Feet first</span></div><div data-feet></div></div>' : '') +
        '<div class="ss-clock"><b data-clock>' + TC.mmss(s.secs) + '</b><span data-next-up>' + (n ? 'Next: ' + esc(n.label && n.label !== 'new' ? n.label : TC.MOVE[n.id].name) : 'Last step') + '</span></div>';
      $('[data-cap]').textContent = m.about || '';
      if (feet) { feet.stop(); feet = null; }
      var fh = nodes.panel.querySelector('[data-feet]');
      if (fh) feet = TC.footprints(fh, { fig: fig, move: s.id, mirror: prefs.mirror, compact: true });
      lastS = -1;
    }
    function startStep(i, auto, first) {
      idx = Math.max(0, Math.min(S.steps.length - 1, i));
      el = 0; segBreath = ''; segUntil = 0;
      var s = step(), m = move();
      fig.setKeys(TC.moveKeys(s.id)); fig.time(s.offset || 0); fig.speed(speed);
      if (playing) fig.play(); else fig.pause();
      drawBar(); drawStep();
      $('[data-sideb]').innerHTML = '';
      if (auto && prefs.bell) TC.bell(.1);
      /* The voice: the move's name and first step now, each other step the first time the teacher reaches it,
         "other side" once, then the tip, then only an occasional breath cue. Lines queue, so none is lost. */
      TC.voice.stop();
      vo = { said: { 0: true }, lastS: -1, mir: false, side: false, tip: !m.tip, rounds: 0 };
      if (prefs.voice) {
        if (first) TC.voice.say(TC.CUES.welcome);
        if (idx === S.steps.length - 1 && S.steps.length > 2) TC.voice.say(TC.CUES.last);
        TC.voice.say(TC.introLine(m));
        var nx = S.steps[idx + 1];
        if (nx) TC.voice.preload([TC.introLine(TC.MOVE[nx.id])].concat(TC.MOVE[nx.id].steps.slice(1)));
      }
    }
    function voiceKey(key) {
      var m = move();
      if (!prefs.voice || key.s < 0) return;
      if (key.s !== vo.lastS || !!key.mir !== vo.mir) {
        var turned = vo.lastS >= 0 && (key.s < vo.lastS || !!key.mir !== vo.mir);
        if (turned) vo.rounds++;
        if (key.mir && !vo.side) { vo.side = true; TC.voice.say(TC.CUES.side); }
        else if (!vo.said[key.s]) { vo.said[key.s] = true; TC.voice.say(m.steps[key.s]); }
        else if (turned && !vo.tip && vo.rounds >= (m.both ? 2 : 1)) { vo.tip = true; TC.voice.say(m.tip); }
        vo.lastS = key.s; vo.mir = !!key.mir;
      }
      var all = m.steps.every(function (x, j) { return vo.said[j]; });
      if (all && vo.tip && (key.b === 'in' || key.b === 'out') && key.d >= 2 && TC.voice.quietFor() > 14000)
        TC.voice.say(TC.CUES[key.b]);
    }
    function onKey(key) {
      if (phase !== 'run' || !S) return;
      var list = nodes.panel.querySelectorAll('[data-steps] li');
      if (key.s >= 0 && key.s !== lastS && list[key.s]) {
        Array.prototype.forEach.call(list, function (li, j) { li.classList.toggle('on', j === key.s); });
        lastS = key.s;
      }
      voiceKey(key);
      $('[data-sideb]').innerHTML = key.mir ? '<span class="ui-badge brand">Other side</span>' : '';
      segBreath = key.b || '';
      segUntil = performance.now() + key.d / speed * 1000;
      if (segBreath) orb(segBreath, key.d / speed);
    }
    function orb(st, secs) {
      var o = $('[data-orb]');
      if (!o || orbState === st) return;
      orbState = st;
      o.querySelector('i').style.transitionDuration = Math.max(.6, secs) + 's';
      o.classList.toggle('in', st === 'in');
      o.querySelector('span').textContent = st === 'in' ? 'Breathe in' : 'Breathe out';
    }
    function tick(now) {
      raf = 0;
      if (destroyed || phase !== 'run') return;
      var dt = last ? Math.min(.25, (now - last) / 1000) : 0;
      last = now;
      if (playing) {
        el += dt * speed;
        done[idx] = Math.max(done[idx] || 0, Math.min(el, step().secs));
        if (!segBreath || now > segUntil) {  // natural breathing: 4 seconds in, 5 out
          var c = (now / 1000) % 9;
          orb(c < 4 ? 'in' : 'out', c < 4 ? 4 - c : 9 - c);
        }
        if (el >= step().secs) {
          if (idx < S.steps.length - 1) startStep(idx + 1, true); else { finish(); return; }
        }
      }
      var s = step(), clock = $('[data-clock]'), bars = nodes.bar.querySelectorAll('i b');
      if (clock) clock.textContent = TC.mmss(s.secs - el);
      var mc = $('[data-mclock]');
      if (mc) { mc.hidden = false; mc.textContent = TC.mmss(s.secs - el); }
      if (bars[idx]) bars[idx].style.width = Math.min(100, el / s.secs * 100) + '%';
      nodes.left.textContent = TC.mmss(left()) + ' left';
      raf = requestAnimationFrame(tick);
    }
    function setPlaying(v) {
      playing = v;
      if (v) { fig.play(); last = 0; if (!raf) raf = requestAnimationFrame(tick); TC.music.resume(); } else { fig.pause(); TC.hush(); TC.music.pause(); }
      var b = nodes.ctl.querySelector('[data-play]');
      if (b) { b.innerHTML = UI.icon(v ? 'pause' : 'play'); b.setAttribute('aria-label', v ? 'Pause' : 'Play'); }
    }
    function begin() {
      if (phase !== 'intro') return;
      TC.unlockAudio();
      phase = 'run'; startedAt = new Date().toISOString();
      $('[data-orb]').hidden = false;
      if (prefs.wind) stopWind = TC.wind();
      if (prefs.music) TC.music.start();
      if (navigator.wakeLock) navigator.wakeLock.request('screen').then(function (l) { wake = l; }).catch(function () {});
      if (prefs.bell) TC.bell(.14);
      playing = true;
      drawControls();
      startStep(0, false, true);
      last = 0; raf = requestAnimationFrame(tick);
    }
    function sessionData() {
      var moves = [];
      S.steps.forEach(function (s, i) { if ((done[i] || 0) >= s.secs * .5 && moves.indexOf(s.id) < 0) moves.push(s.id); });
      return { day: TC.today(), kind: S.kind, minutes: Math.round(practised() / 6) / 10, title: S.title, moves: moves,
        feel_before: prefs.feel_before == null ? null : prefs.feel_before, feel_after: null, note: '', started: startedAt };
    }
    function stopAll() {
      if (raf) cancelAnimationFrame(raf); raf = 0;
      TC.hush();
      if (stopWind) { stopWind(); stopWind = null; }
      TC.music.stop();
      if (wake) { try { wake.release(); } catch (e) {} wake = null; }
    }
    function finish() {
      if (phase === 'done') return;
      phase = 'done'; playing = false; stopAll();
      if (prefs.voice && practised() >= 30) setTimeout(function () { if (!destroyed) TC.voice.say(TC.CUES.closing); }, 900);
      fig.setKeys(TC.moveKeys('closing')); fig.time(9); fig.pause();
      if (prefs.bell) { TC.bell(.16); setTimeout(function () { if (!destroyed) TC.bell(.1); }, 1600); }
      call('done', JSON.stringify({ data: sessionData(), practised: practised() }));
    }

    /* ---------------------------------------------------------------- events */
    nodes.ctl.addEventListener('click', function (e) {
      if (destroyed) return;
      var t = e.target;
      if (t.closest('[data-play]')) return setPlaying(!playing);
      if (t.closest('[data-next]')) { if (idx < S.steps.length - 1) { done[idx] = Math.max(done[idx] || 0, el); startStep(idx + 1, false); } else finish(); return; }
      if (t.closest('[data-prev]')) { startStep(el > 4 ? idx : idx - 1, false); return; }
      if (t.closest('[data-view]')) { yawI = (yawI + 1) % VIEWS.length; fig.view(VIEWS[yawI][0], VIEWS[yawI][0] === 0 ? 6 : 11); call('toast', 'View: ' + VIEWS[yawI][1]); return; }
      if (t.closest('[data-speed]')) { speed = speed === 1 ? .75 : speed === .75 ? .5 : 1; fig.speed(speed); t.closest('[data-speed]').textContent = speed === 1 ? '1×' : speed + '×'; return; }
      var tg = t.closest('[data-tog]');
      if (tg) {
        var k = tg.getAttribute('data-tog');
        prefs[k] = !prefs[k];
        call('pref', k, prefs[k]);
        if (k === 'mirror') { fig.mirror(prefs.mirror); if (feet) feet.mirror(prefs.mirror); }
        if (k === 'voice' && !prefs.voice) TC.hush();
        drawControls();
      }
    });
    function onKeyDown(e) {
      if (phase !== 'run' || held || /input|textarea|select/i.test((e.target && e.target.tagName) || '')) return;
      if (e.key === ' ') { e.preventDefault(); setPlaying(!playing); }
      else if (e.key === 'ArrowRight') { var n = nodes.ctl.querySelector('[data-next]'); if (n) n.click(); }
      else if (e.key === 'ArrowLeft') { var p = nodes.ctl.querySelector('[data-prev]'); if (p) p.click(); }
    }
    document.addEventListener('keydown', onKeyDown);
    function onHide() { if (document.hidden && phase === 'run' && playing) setPlaying(false); }
    document.addEventListener('visibilitychange', onHide);

    drawBar();
    nodes.left.textContent = 'About ' + Math.max(1, Math.round(S.secs / 60)) + ' min · ' + UI.plural(S.steps.length, 'step');
    if (prefs.voice) { var m0 = TC.MOVE[S.steps[0].id]; TC.voice.preload([TC.CUES.welcome, TC.introLine(m0)].concat(m0.steps.slice(1))); }

    var api = {
      begin: begin,
      finish: function () { finish(); },
      state: function () { return { phase: phase, idx: idx, steps: S.steps.length, playing: playing, practised: practised(), title: S.title }; },
      playing: function () { return playing; },
      play: function (v) { if (phase === 'run') setPlaying(!!v); },
      hold: function (v) { held = !!v; },
      feelBefore: function (v) { prefs.feel_before = v == null ? null : v; },
      next: function () { var b = nodes.ctl.querySelector('[data-next]'); if (b) b.click(); },
      skipAhead: function (secs) { el += secs; done[idx] = Math.max(done[idx] || 0, Math.min(el, step().secs)); },
      /* a setting changed on the intro (Python CheckBoxes) */
      setPref: function (k, v) {
        prefs[k] = v;
        if (k === 'mirror') { fig.mirror(v); if (feet) feet.mirror(v); }
        if (k === 'gentle') { fig.gentle(v); if (phase === 'run') drawStep(); }
        if (k === 'bell' && v) { TC.unlockAudio(); TC.bell(.1); }
        if (k === 'music') { if (v && phase === 'run') TC.music.start(); else if (!v) TC.music.stop(); }
        if (k === 'voice') { TC.unlockAudio(); TC.voice.stop(); if (v) TC.voice.say(TC.CUES.on); }
      },
      stop: function () {
        destroyed = true; stopAll(); fig.stop(); if (feet) feet.stop();
        document.removeEventListener('keydown', onKeyDown);
        document.removeEventListener('visibilitychange', onHide);
        if (TC.session === api) TC.session = null;
      }
    };
    TC.session = api;
    return api;
  };
})();
