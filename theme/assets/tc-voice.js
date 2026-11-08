/* _voice: the teacher's voice. Every spoken line is a recorded clip (assets/vo-<hash>.mp3), made ahead of time with
     Kokoro, an open-source neural voice, by tools/make_voice.py. No browser speech, so the voice is the same everywhere.
     TC.voiceLines() lists every line the app can say; the flow test checks each one has its clip.
     TC.voice: say(text) queues a line (lines never cut each other off), stop() silences it, preload(texts) fetches ahead.
   (moved unchanged from the JavaScript version's web/pages/_voice.html) */
(function () {
  'use strict';
  var TC = window.TC;
  var VER = 'k1';  // change this (and run tools/make_voice.py) to re-record every line, e.g. with another voice

  TC.CUES = {
    welcome: 'Good morning. Stand tall, soften your knees, and let your breathing slow down.',
    on: 'Spoken guidance is on. I will talk you through each move.',
    side: 'Now the same on the other side.',
    last: 'And now, the last move.',
    in: 'Breathe in.',
    out: 'Breathe out.',
    closing: 'That is your practice for this morning. Well done. Take a moment to notice how you feel.'
  };
  /* What the teacher says when a move starts: its name and the first step. */
  TC.introLine = function (m) { return m.name + '. ' + m.steps[0]; };
  TC.voiceLines = function () {
    var out = Object.keys(TC.CUES).map(function (k) { return TC.CUES[k]; });
    TC.MOVES.forEach(function (m) {
      out.push(TC.introLine(m));
      m.steps.slice(1).forEach(function (s) { out.push(s); });
      if (m.tip) out.push(m.tip);
    });
    return out.filter(function (t, i) { return out.indexOf(t) === i; });
  };
  function fnv(s) {  // FNV-1a, the same in tools/make_voice.py
    var h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return ('0000000' + h.toString(16)).slice(-8);
  }
  TC.voiceFile = function (text) { return '_/theme/vo-' + fnv(VER + '|' + text) + '.mp3'; };

  var cache = {}, queue = [], cur = null, lastEnd = 0;
  function load(text) {
    var url = TC.voiceFile(text), a = TC.audioCtx();
    if (!a) return Promise.resolve(null);
    if (!cache[url]) {
      cache[url] = fetch(url).then(function (r) { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
        .then(function (b) { return new Promise(function (res, rej) { a.decodeAudioData(b, res, rej); }); })
        .catch(function () { delete cache[url]; return null; });
    }
    return cache[url];
  }
  function pump() {
    if (cur || !queue.length) return;
    var token = {}; cur = token;
    load(queue.shift()).then(function (buf) {
      if (cur !== token) return;
      if (!buf) { cur = null; pump(); return; }
      var a = TC.audioCtx(), src = a.createBufferSource(), g = a.createGain();
      g.gain.value = .95; src.buffer = buf; src.connect(g); g.connect(a.destination);
      TC.music.duck(true);
      src.onended = function () {
        if (cur !== token) return;
        cur = null; lastEnd = Date.now();
        setTimeout(function () { if (!cur && !queue.length) TC.music.duck(false); }, 600);
        setTimeout(pump, 450);  // a small breath between lines
      };
      token.src = src; src.start();
    });
  }
  TC.voice = {
    said: [],  // the last lines asked for, newest last (the flow test reads it)
    say: function (text) { if (text) { TC.voice.said = TC.voice.said.slice(-30).concat([text]); queue.push(text); pump(); } },
    stop: function () {
      queue = [];
      if (cur && cur.src) { try { cur.src.onended = null; cur.src.stop(); } catch (e) {} }
      if (cur) lastEnd = Date.now();
      cur = null;
      TC.music.duck(false);
    },
    busy: function () { return !!cur || queue.length > 0; },
    quietFor: function () { return this.busy() ? 0 : Date.now() - lastEnd; },
    preload: function (texts) { texts.forEach(function (t) { load(t); }); }
  };
  TC.say = TC.voice.say;
  TC.hush = TC.voice.stop;

  /* Calm music for a session: long ambient tracks streamed by ArkMusic (web/pages/_arkmusic.html), quiet,
     dipping while the teacher speaks. Switched by the "Calm music" pref (prefs.music). */
  var M = function () { return window.ArkMusic; };
  TC.music = {
    tracks: ['never-morning', 'divine-light', 'small-and-grand-wonder'],
    start: function () { if (M()) M().play(TC.music.tracks, { volume: 0.3, fade: 3 }); },
    stop: function () { if (M()) M().stop(2); },
    pause: function () { if (M()) M().pause(); },
    resume: function () { if (M()) M().resume(); },
    duck: function (on) { if (M()) M().duck(on ? 0.45 : 1, on ? 0.3 : 1.2); }
  };
})();
