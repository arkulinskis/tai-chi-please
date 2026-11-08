/* tc-ui.js: the engine pieces the Forms pages use (Python reaches them through client_code/tc.py and Components/*).
     TC.mountStage(el, opts)   the bamboo backdrop + a TC.Figure in el (Components/Stage, MoveCard thumbnails)
     TC.lymphMap(el)           the lymph guide's body map: the figure + numbered points (Components/LymphMap)
     TC.catalogJSON()          moves, categories, stages, the 24 steps, kinds and feelings as JSON text for Python
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
      trails: opts.trails !== false, mirror: !!opts.mirror, onKey: opts.onKey || null, label: opts.label,
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
          form: m.form || null, both: !!m.both, secs: m.secs, loop: Math.round(TC.moveLength(m.id)) };
      }),
      cats: TC.CATS, stages: TC.STAGES, path: TC.PATH, form24: TC.FORM24, kinds: TC.KINDS, feels: TC.FEELS, learned_at: TC.LEARNED_AT
    });
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
    var vo = {}, lastS = -1, segBreath = '', segUntil = 0, orbState = '', destroyed = false;
    var $ = function (s) { return view.querySelector(s); };
    function call(name) { var h = hooks && hooks[name]; if (h) { try { h.apply(null, Array.prototype.slice.call(arguments, 1)); } catch (e) { console.error(e); } } }

    fig = TC.mountStage(nodes.stage, { seed: 11, trails: prefs.trails, mirror: prefs.mirror, onKey: onKey, label: 'Your teacher, showing the current movement',
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
        '<div class="ss-clock"><b data-clock>' + TC.mmss(s.secs) + '</b><span data-next-up>' + (n ? 'Next: ' + esc(n.label && n.label !== 'new' ? n.label : TC.MOVE[n.id].name) : 'Last step') + '</span></div>';
      $('[data-cap]').textContent = m.about || '';
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
        if (k === 'mirror') fig.mirror(prefs.mirror);
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
        if (k === 'mirror') fig.mirror(v);
        if (k === 'bell' && v) { TC.unlockAudio(); TC.bell(.1); }
        if (k === 'music') { if (v && phase === 'run') TC.music.start(); else if (!v) TC.music.stop(); }
        if (k === 'voice') { TC.unlockAudio(); TC.voice.stop(); if (v) TC.voice.say(TC.CUES.on); }
      },
      stop: function () {
        destroyed = true; stopAll(); fig.stop();
        document.removeEventListener('keydown', onKeyDown);
        document.removeEventListener('visibilitychange', onHide);
        if (TC.session === api) TC.session = null;
      }
    };
    TC.session = api;
    return api;
  };
})();
