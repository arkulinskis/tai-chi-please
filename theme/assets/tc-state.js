/* _state: shared helpers for every page. Preferences and move progress (server for members, the browser for
     guests), moving guest sessions into a new account, the daily calendar reminder (.ics), the grove picture,
     move thumbnails and the little feeling picker.
   (moved from the JavaScript version's web/pages/_state.html; saving prefs, progress, the guest import and the
   feeling picker are Python now: client_code/tc.py and Components/FeelPicker) */
(function () {
  'use strict';
  var TC = window.TC;
  TC.PREF_DEFAULTS = { minutes: 15, time: '07:00', voice: true, bell: true, wind: false, music: true, mirror: false, trails: true, circle: false };
  TC.prefs = function () {
    var p = {}, k, l = TC.local.prefs();
    for (k in TC.PREF_DEFAULTS) p[k] = TC.PREF_DEFAULTS[k];
    for (k in l) p[k] = l[k];
    return p;
  };
  /* A daily calendar event at the chosen time, so the phone's own calendar does the reminding. */
  TC.downloadReminder = function (time, minutes) {
    time = /^\d\d:\d\d$/.test(time || '') ? time : '07:00';
    var d = new Date(), pad = function (n) { return ('0' + n).slice(-2); };
    var start = d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + 'T' + time.replace(':', '') + '00';
    var stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    var url = location.origin + location.pathname + '#practice';
    var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Tai Chi Please//Morning practice//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
      'UID:taichiplease-morning-' + time.replace(':', '') + '@taichiplease', 'DTSTAMP:' + stamp, 'DTSTART:' + start, 'DURATION:PT' + (minutes || 15) + 'M',
      'RRULE:FREQ=DAILY', 'SUMMARY:Tai chi\\, please', 'DESCRIPTION:Your morning practice in the bamboo forest: ' + url, 'URL:' + url,
      'BEGIN:VALARM', 'TRIGGER:PT0M', 'ACTION:DISPLAY', 'DESCRIPTION:Time for tai chi', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    a.download = 'tai-chi-please-morning.ics';
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  };

  /* The grove: one bamboo stalk for each day you practised in the last `n` days; streaks grow taller. */
  TC.grove = function (days, n, opts) {
    opts = opts || {};
    n = n || 28;
    var have = {}; (days || []).forEach(function (d) { have[d] = 1; });
    var W = 560, H = 170, gap = W / n, out = [], run = 0, today = TC.today();
    out.push('<svg class="tc-grove" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + UI.plural(Object.keys(have).length, 'day') + ' of practice">');
    out.push('<rect class="g-ground" x="0" y="' + (H - 12) + '" width="' + W + '" height="12" rx="6"/>');
    for (var i = 0; i < n; i++) {
      var d = new Date(); d.setDate(d.getDate() - (n - 1 - i));
      var key = TC.today(d), x = gap * i + gap / 2, isToday = key === today;
      if (have[key]) {
        run++;
        var h = Math.min(H - 22, 40 + run * 9 + ((i * 37) % 13)), w = Math.max(5, gap * .38), top = H - 12 - h;
        var cls = 'g-stalk' + (i < n - 7 ? ' old' : '');
        var g = '<g class="g-sway' + (isToday && opts.grow ? ' g-grow' : '') + '" style="animation-delay:-' + (i % 7) + 's">';
        if (isToday) g += '<circle class="g-today" cx="' + x.toFixed(1) + '" cy="' + (top + 8).toFixed(1) + '" r="' + (gap * .9).toFixed(1) + '"/>';
        g += '<rect class="' + cls + '" x="' + (x - w / 2).toFixed(1) + '" y="' + top.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="' + (w / 2).toFixed(1) + '"/>';
        for (var y = H - 12 - 22; y > top + 6; y -= 22) g += '<path class="g-node" d="M' + (x - w / 2).toFixed(1) + ' ' + y.toFixed(1) + 'h' + w.toFixed(1) + '"/>';
        var side = i % 2 ? 1 : -1;
        g += '<path class="g-leaf" d="M' + x.toFixed(1) + ' ' + (top + 10).toFixed(1) + 'q' + (side * 9) + ' -10 ' + (side * 19) + ' -6q' + (side * -9) + ' 6 ' + (side * -19) + ' 6z"/>';
        if (h > 70) g += '<path class="g-leaf" d="M' + x.toFixed(1) + ' ' + (top + 32).toFixed(1) + 'q' + (-side * 9) + ' -8 ' + (-side * 17) + ' -3q' + (side * 8) + ' 5 ' + (side * 17) + ' 3z"/>';
        out.push(g + '</g>');
      } else {
        run = 0;
        out.push('<path class="g-tuft" d="M' + (x - 3).toFixed(1) + ' ' + (H - 12) + 'q1 -6 3 -8M' + x.toFixed(1) + ' ' + (H - 12) + 'v-9M' + (x + 3).toFixed(1) + ' ' + (H - 12) + 'q-1 -6 -3 -8"/>');
      }
    }
    return out.join('') + '</svg>';
  };

  /* A still picture of a move (one frame of its animation) in a little bamboo stage. */
  TC.thumbHtml = function (id, seed) {
    return '<div class="tc-stage tc-thumb" data-thumb="' + UI.esc(id) + '">' + TC.stage({ seed: seed || 5, sunX: 320 }) + '<svg></svg></div>';
  };
  /* The most telling moment of a move for a still picture: hands and feet far apart, a lifted foot, a deep stance.
     Looks at the first side only (both-sided moves are mirrored copies). */
  var heroCache = {};
  TC.heroTime = function (id) {
    if (heroCache[id] != null) return heroCache[id];
    var keys = TC.moveKeys(id), L = TC.loopLength(keys), m = TC.MOVE[id], span = m.both ? L / 2 : L, best = 0, bestT = span / 2;
    function d(a, b) { return Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2) + Math.pow(a[2] - b[2], 2)); }
    for (var i = 1; i < 48; i++) {
      var t = span * i / 48, p = TC.sample(keys, t).pose;
      var score = d(p.lh, p.rh) + .6 * Math.abs(p.lh[1] - p.rh[1]) + .3 * (p.lh[2] + p.rh[2]) +
        .5 * Math.hypot(p.lf[0] - p.rf[0], p.lf[1] - p.rf[1]) + 1.2 * (p.lf[2] + p.rf[2]) + .6 * p.sink + .15 * Math.abs(p.hy);
      if (score > best) { best = score; bestT = t; }
    }
    return (heroCache[id] = bestT);
  };
  /* Draw every [data-thumb] inside root (call after putting thumbHtml in the page). */
  TC.drawThumbs = function (root) {
    Array.prototype.forEach.call(root.querySelectorAll('[data-thumb]'), function (el) {
      var id = el.getAttribute('data-thumb'), keys = TC.moveKeys(id);
      if (!keys || el._fig) return;
      var f = new TC.Figure(el.querySelector('svg:not(.tc-bg)'), { trails: false, yaw: 24, label: TC.MOVE[id].name });
      f.setKeys(keys); f.time(TC.heroTime(id));
      el._fig = f;
    });
  };

  TC.catLabel = function (cat) { var c = TC.CATS[cat] || {}; return '<span class="tc-cat">' + UI.icon(c.icon) + UI.esc(c.short || '') + '</span>'; };
})();
