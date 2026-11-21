/* _state: shared helpers for every page. Preferences and move progress (server for members, the browser for
     guests), moving guest sessions into a new account, the daily calendar reminder (.ics), the grove picture,
     move thumbnails and the little feeling picker.
   (moved from the JavaScript version's web/pages/_state.html; saving prefs, progress, the guest import and the
   feeling picker are Python now: client_code/tc.py and Components/FeelPicker) */
(function () {
  'use strict';
  var TC = window.TC;
  TC.PREF_DEFAULTS = { minutes: 15, time: '07:00', voice: true, bell: true, wind: false, music: true, mirror: false, trails: true, circle: false, gentle: false };
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

  /* ---------------------------------------------------------------- the morning postcard */
  /* TC.postcard(o) -> Promise of {blob, url, name}: a 1080 x 1350 picture to share after a session. The bamboo
     stage with the teacher in the move of the day, the seal, today's thought, the grove, "N mornings", and an
     invitation link. Drawn as SVG and painted onto a canvas (PNG). An SVG used as a picture can't load web fonts or
     the page's CSS, so the colours are written into it and the type uses the system's serif and sans fonts.
     o = {days: [iso days], mornings, minutes, thought: [text, source], name, move, gentle, host, dateText} */
  var PC = { bg: '#f2f0e4', paper: '#fffdf5', ink: '#1b2a21', muted: '#55645a', brand: '#2e6a44', accent: '#c98d2c', seal: '#b4432f', line: '#dcd8c4' };
  var PC_CSS = 'svg{--fig-skin:#f0d6b4;--fig-line:#142019}' +
    '.far{fill:#bccfae}.mid{fill:#8fb388}.near{fill:#4f8a5c}.node{stroke:rgba(255,255,240,.55)}.leaf.far{fill:#c7d7b5}.leaf.mid{fill:#9fc092}' +
    '.leaf.near{fill:#5d9767}.sun{fill:#f3cf7d;opacity:.85}.sunglow{fill:#f6dc9a;opacity:.45}.mist{fill:url(#tcMist)}' +
    '.ln{stroke:#142019;stroke-linecap:round;stroke-linejoin:round;fill:none}.robe{stroke:#2e6a44}.robe2{stroke:#24553a}.pants{stroke:#2a332d}' +
    '.pants2{stroke:#1f2621}.skin{stroke:#f0d6b4}.skin2{stroke:#dcbc96}.f-skin{fill:#f0d6b4;stroke:#142019}.f-robe{fill:#2e6a44;stroke:#142019;stroke-linejoin:round}' +
    '.f-hair{fill:#142019}.sash{stroke:#c98d2c;stroke-linecap:round}.mat{fill:rgba(46,106,68,.13)}.shadow{fill:rgba(20,32,25,.16)}.trail{display:none}' +
    '.g-ground{fill:#e9e6d6}.g-stalk{fill:#2e6a44}.g-stalk.old{fill:#6f9a7b}.g-node{stroke:#fffdf5;stroke-width:1.4}.g-leaf{fill:#5b8a3c}' +
    '.g-tuft{stroke:#5c695d;stroke-width:1.4;fill:none;stroke-linecap:round;opacity:.55}.g-today{fill:#c98d2c;opacity:.22}';
  var SERIF = "Georgia, 'Iowan Old Style', 'Palatino Linotype', 'Times New Roman', serif";
  var SANS = "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  var ZH = "'Songti SC', 'STSong', 'SimSun', 'Noto Serif CJK SC', 'Noto Serif SC', serif";
  function xesc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function wrap(text, max) {
    var words = String(text || '').split(/\s+/), lines = [], cur = '';
    words.forEach(function (w) {
      if (!w) return;
      if (cur && (cur + ' ' + w).length > max) { lines.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w;
    });
    if (cur) lines.push(cur);
    return lines;
  }
  TC.postcardSVG = function (o) {
    o = o || {};
    var W = 1080, H = 1350, out = [];
    var move = TC.MOVE[o.move] ? o.move : 'crane';
    // the teacher, drawn once into a detached SVG (400 x 300 when it isn't on the page)
    var fsvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    var f = new TC.Figure(fsvg, { trails: false, yaw: 22, pitch: 9, gentle: !!o.gentle });
    f.setKeys(TC.moveKeys(move)); f.time(TC.heroTime(move)); f.drawNow(); f.stop();
    var figInner = fsvg.innerHTML, figVB = fsvg.getAttribute('viewBox') || '0 0 400 300';
    var stage = TC.stage({ seed: 11, sunX: 290 }).replace(/var\(--c-bg\)/g, PC.bg).replace('<svg class="tc-bg"', '<svg x="60" y="60" width="960" height="640" class="tc-bg"');
    out.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">');
    out.push('<style>' + PC_CSS + '</style>');
    out.push('<defs><clipPath id="pcScene"><rect x="60" y="60" width="960" height="640" rx="34"/></clipPath></defs>');
    out.push('<rect width="' + W + '" height="' + H + '" fill="' + PC.bg + '"/>');
    out.push('<rect x="22" y="22" width="' + (W - 44) + '" height="' + (H - 44) + '" rx="40" fill="' + PC.paper + '" stroke="' + PC.line + '" stroke-width="2"/>');
    out.push('<g clip-path="url(#pcScene)"><rect x="60" y="60" width="960" height="640" fill="' + PC.bg + '"/>' + stage +
      '<svg x="60" y="90" width="960" height="610" viewBox="' + figVB + '" preserveAspectRatio="xMidYMax meet">' + figInner + '</svg></g>');
    // the seal
    out.push('<g transform="translate(904 92)"><rect width="88" height="88" rx="16" fill="' + PC.seal + '"/>' +
      '<text x="44" y="62" text-anchor="middle" font-family="' + ZH + '" font-size="56" fill="#fff">好</text></g>');
    var mv = TC.MOVE[move];
    out.push('<text x="88" y="672" font-family="' + SANS + '" font-size="26" font-weight="600" fill="#fff" opacity=".92" style="paint-order:stroke" stroke="rgba(20,32,25,.35)" stroke-width="4">' + xesc(mv.name) + '</text>');
    // date + name
    var head = (o.name ? o.name + '\u2019s morning \u00b7 ' : 'This morning \u00b7 ') + (o.dateText || '');
    out.push('<text x="72" y="776" font-family="' + SANS + '" font-size="30" font-weight="600" fill="' + PC.muted + '">' + xesc(head) + '</text>');
    // the thought
    var th = o.thought || ['Seek stillness in movement.', 'from the tai chi classics'];
    var size = 50, lh = 64, lines = wrap('\u201c' + th[0] + '\u201d', 34);
    if (lines.length > 3) { size = 42; lh = 54; lines = wrap('\u201c' + th[0] + '\u201d', 41); }
    lines = lines.slice(0, 4);
    var y = 856;
    lines.forEach(function (l, i) {
      out.push('<text x="72" y="' + (y + i * lh) + '" font-family="' + SERIF + '" font-size="' + size + '" font-style="italic" fill="' + PC.ink + '">' + xesc(l) + '</text>');
    });
    y += (lines.length - 1) * lh + 50;
    if (th[1]) out.push('<text x="72" y="' + y + '" font-family="' + SANS + '" font-size="26" fill="' + PC.muted + '">\u2014 ' + xesc(th[1]) + '</text>');
    // the grove + numbers
    var grove = TC.grove(o.days || [], 28).replace('<svg class="tc-grove"', '<svg x="60" y="1096" width="420" height="128" preserveAspectRatio="xMinYMax meet" class="tc-grove"');
    out.push(grove);
    var n = Math.max(1, o.mornings || 1), mins = Math.max(1, Math.round(o.minutes || 0));
    out.push('<text x="1008" y="1168" text-anchor="end" font-family="' + SERIF + '" font-size="66" font-weight="700" fill="' + PC.brand + '">' + n + ' ' + (n === 1 ? 'morning' : 'mornings') + '</text>');
    out.push('<text x="1008" y="1214" text-anchor="end" font-family="' + SANS + '" font-size="30" fill="' + PC.muted + '">' + mins + ' min of tai chi today</text>');
    // the invitation
    out.push('<path d="M72 1250H1008" stroke="' + PC.line + '" stroke-width="2"/>');
    out.push('<text x="72" y="1300" font-family="' + SANS + '" font-size="30" fill="' + PC.ink + '">Try a 7-minute morning: <tspan font-weight="700" fill="' + PC.brand + '">' + xesc(o.host || 'tai-chi-please.anvil.app') + '</tspan></text>');
    out.push('<text x="1008" y="1300" text-anchor="end" font-family="' + SERIF + '" font-size="30" font-weight="700" fill="' + PC.accent + '">Tai Chi Please</text>');
    out.push('</svg>');
    return out.join('');
  };
  TC.postcard = function (o) {
    var svgText = TC.postcardSVG(o), W = 1080, H = 1350;
    return new Promise(function (resolve, reject) {
      var src = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' }));
      var img = new Image();
      img.onload = function () {
        try {
          var c = document.createElement('canvas');
          c.width = W; c.height = H;
          c.getContext('2d').drawImage(img, 0, 0, W, H);
          c.toBlob(function (b) {
            URL.revokeObjectURL(src);
            if (!b) { reject(new Error('This browser could not paint the postcard.')); return; }
            resolve({ blob: b, url: URL.createObjectURL(b), name: 'tai-chi-please-morning.png', type: 'image/png' });
          }, 'image/png');
        } catch (e) {
          // a browser that won't turn an SVG picture into pixels: keep the SVG itself
          var sb = new Blob([svgText], { type: 'image/svg+xml' });
          resolve({ blob: sb, url: src, name: 'tai-chi-please-morning.svg', type: 'image/svg+xml' });
        }
      };
      img.onerror = function () { URL.revokeObjectURL(src); reject(new Error('This browser could not paint the postcard.')); };
      img.src = src;
    });
  };
  /* Share sheet with the picture when the phone allows files; 'shared' | 'cancelled' | 'unsupported' | 'error' */
  TC.canShareFiles = function () {
    try { return !!(navigator.canShare && navigator.share && navigator.canShare({ files: [new File([new Blob(['x'], { type: 'image/png' })], 'x.png', { type: 'image/png' })] })); }
    catch (e) { return false; }
  };
  TC.sharePostcard = function (card, text, link) {
    try {
      var file = new File([card.blob], card.name, { type: card.type });
      if (!(navigator.canShare && navigator.canShare({ files: [file] }))) return Promise.resolve('unsupported');
      return navigator.share({ files: [file], title: 'My morning tai chi', text: text + ' ' + link })
        .then(function () { return 'shared'; }, function (e) { return e && e.name === 'AbortError' ? 'cancelled' : 'error'; });
    } catch (e) { return Promise.resolve('error'); }
  };
  TC.saveFile = function (url, name) {
    var a = document.createElement('a');
    a.href = url; a.download = name || 'tai-chi-please-morning.png';
    document.body.appendChild(a); a.click();
    setTimeout(function () { a.remove(); }, 500);
  };
  TC.copyText = function (text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return fallback(); });
    return Promise.resolve(fallback());
    function fallback() {
      try {
        var t = document.createElement('textarea');
        t.value = text; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
        document.body.appendChild(t); t.select();
        var ok = document.execCommand('copy'); t.remove(); return !!ok;
      } catch (e) { return false; }
    }
  };

  TC.catLabel = function (cat) { var c = TC.CATS[cat] || {}; return '<span class="tc-cat">' + UI.icon(c.icon) + UI.esc(c.short || '') + '</span>'; };
})();
