/* _figure: shared, loads before every page (name starts with "_").
     TC.Figure: a small 3D teacher drawn in SVG. Poses are keyframes (pelvis, waist turn, hand and foot targets);
     arms and legs are solved with two-bone IK, the scene is projected with an orbiting camera and depth-sorted.
     TC.stage(): the bamboo forest backdrop (sun in light mode, moon in dark mode, swaying stalks, mist).
     Also: extra icons, TC.bell() (a soft singing bowl), TC.wind() (forest ambience).
   (moved unchanged from the JavaScript version's web/pages/_figure.html) */
(function () {
  'use strict';
  var TC = window.TC = window.TC || {};
  var D = Math.PI / 180;

  /* ---------------------------------------------------------------- extra icons */
  var more = {
    play: '<path d="M7 4.5v15l12-7.5z"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    next: '<path d="M6 5l10 7-10 7z"/><path d="M18 5v14"/>',
    prev: '<path d="M18 5 8 12l10 7z"/><path d="M6 5v14"/>',
    book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5"/><path d="M8 7h7"/>',
    leaf: '<path d="M5 19c0-8 5-14 15-15-1 10-7 15-15 15z"/><path d="M5 19 13 11"/>',
    wind: '<path d="M3 9h11a3 3 0 1 0-3-3"/><path d="M3 14h15a3 3 0 1 1-3 3"/><path d="M3 19h6"/>',
    volume: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
    mute: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="m17 9 5 6M22 9l-5 6"/>',
    music: '<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
    rotate: '<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v5h-5"/>',
    mirror: '<path d="M12 3v18"/><path d="M8 7 3 12l5 5z"/><path d="m16 7 5 5-5 5z"/>',
    bamboo: '<path d="M12 21V3"/><path d="M9.5 8h5M9.5 14h5"/><path d="M12 8c2-3 5-4 8-3-2 3-5 4-8 3z"/><path d="M12 14c-2-2-5-3-8-2 2 2 5 3 8 2z"/>',
    hands: '<path d="M8 13V6a1.5 1.5 0 0 1 3 0v6"/><path d="M11 11V4.5a1.5 1.5 0 0 1 3 0V11"/><path d="M14 11V6a1.5 1.5 0 0 1 3 0v8a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-3l-2-4a1.5 1.5 0 0 1 2.6-1.5L8 13"/>',
    flame: '<path d="M12 21a6 6 0 0 0 6-6c0-4-3-6-4-10-2 2-3 4-3 6-1-1-2-2-2-4-2 2-3 5-3 8a6 6 0 0 0 6 6z"/>',
    drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    trail: '<path d="M4 18c4 0 4-12 8-12s4 12 8 12"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5"/><path d="M5 20h14"/>',
    sunrise: '<path d="M4 18h16M7 14a5 5 0 0 1 10 0"/><path d="M12 4v4M5 8l2 2M19 8l-2 2"/><path d="M3 21h18"/>',
    lotus: '<path d="M12 19c-4 0-8-2-9-6 3 0 6 1 9 6zM12 19c4 0 8-2 9-6-3 0-6 1-9 6z"/><path d="M12 19c-3-3-3-9 0-13 3 4 3 10 0 13z"/>'
  };
  Object.keys(more).forEach(function (k) { UI.ICONS[k] = more[k]; });

  /* ---------------------------------------------------------------- vectors */
  function v(x, y, z) { return [x, y, z]; }
  function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function mul(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function len(a) { return Math.sqrt(dot(a, a)); }
  function norm(a) { var l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
  function rotY(p, a) { var c = Math.cos(a), s = Math.sin(a); return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c]; }
  function rotX(p, a) { var c = Math.cos(a), s = Math.sin(a); return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c]; }
  function rotZ(p, a) { var c = Math.cos(a), s = Math.sin(a); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]]; }

  /* Two-bone IK: from root `a` towards target `t` with bone lengths l1, l2; the middle joint bends towards `pole`. */
  function ik(a, t, l1, l2, pole) {
    var d = sub(t, a), dist = len(d), dir = norm(d);
    var reach = Math.max(Math.abs(l1 - l2) + .5, Math.min(l1 + l2 - .2, dist));
    var end = add(a, mul(dir, reach));
    var cosA = (l1 * l1 + reach * reach - l2 * l2) / (2 * l1 * reach);
    cosA = Math.max(-1, Math.min(1, cosA));
    var sinA = Math.sqrt(1 - cosA * cosA);
    var perp = sub(pole, mul(dir, dot(pole, dir)));
    if (len(perp) < 1e-4) perp = [0, -1, 0];
    perp = norm(perp);
    return { mid: add(a, add(mul(dir, l1 * cosA), mul(perp, l1 * sinA))), end: end };
  }

  /* ---------------------------------------------------------------- body + poses */
  var B = { hip: 93, hipW: 9, spine: 47, shW: 17, neck: 8, headR: 10.5, upper: 29, fore: 28, thigh: 45, shin: 44, ankle: 5 };
  TC.B = B;
  /* A pose. Hands are [x, y, z] in the torso's frame from the middle of the shoulder line (x = the figure's left,
     y = up, z = forward). Feet are [x, z, lift, yaw degrees, toe up 0..1] on the ground in world space. The figure
     faces +z; positive yaw turns it to its left. */
  var BASE = { px: 0, pz: 0, sink: 0, hy: 0, wy: 0, lean: 0, side: 0, hdy: 0, hdp: 0, sh: 0,
    lh: [20, -54, 5], rh: [-20, -54, 5], lf: [9, 0, 0, 4, 0], rf: [-9, 0, 0, -4, 0] };
  TC.BASE = BASE;
  var KEYS = ['px', 'pz', 'sink', 'hy', 'wy', 'lean', 'side', 'hdy', 'hdp', 'sh'];
  function clone(p) {
    var o = {};
    for (var k in p) o[k] = Array.isArray(p[k]) ? p[k].slice() : p[k];
    return o;
  }
  function merge(base, part) {
    var o = clone(base);
    for (var k in part) o[k] = Array.isArray(part[k]) ? part[k].slice() : part[k];
    for (var i = 0; i < 2; i++) {  // feet may be given short: [x, z] -> fill lift/yaw/toe with 0
      var f = i ? 'rf' : 'lf';
      while (o[f].length < 5) o[f].push(0);
    }
    return o;
  }
  TC.merge = merge;
  /* The figure's other side: swap left and right, flip x and every turn. */
  TC.mirrorPose = function (p) {
    var o = clone(p);
    o.px = -p.px; o.hy = -p.hy; o.wy = -p.wy; o.side = -p.side; o.hdy = -p.hdy;
    o.lh = [-p.rh[0], p.rh[1], p.rh[2]]; o.rh = [-p.lh[0], p.lh[1], p.lh[2]];
    o.lf = [-p.rf[0], p.rf[1], p.rf[2], -p.rf[3], p.rf[4]]; o.rf = [-p.lf[0], p.lf[1], p.lf[2], -p.lf[3], p.lf[4]];
    return o;
  };

  /* A move's keys: [seconds to reach this pose, partial pose, breath 'in'|'out'|'', step index]. Each key inherits
     the previous pose. The first key's time is the glide from the last pose back to the start (the loop). */
  TC.build = function (raw, start) {
    var keys = [], pose = merge(BASE, start || {});
    raw.forEach(function (k) {
      pose = merge(pose, k[1] || {});
      keys.push({ d: k[0], p: pose, b: k[2] || '', s: k[3] == null ? -1 : k[3] });
    });
    return settle(keys);
  };
  /* Never move both feet at once (that reads as a hop): insert weight shifts and single steps between such keys. */
  function settle(keys) {
    var out = [], tail = [];
    function moved(a, b) { return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) > 3; }
    if (keys.length < 2) return keys;
    keys.forEach(function (k, i) {
      var prev = keys[(i - 1 + keys.length) % keys.length].p;
      if (!(moved(prev.lf, k.p.lf) && moved(prev.rf, k.p.rf))) { out.push(k); return; }
      // shift onto the right foot, step the left; shift onto the new left foot, step the right; settle
      var t = Math.max(.9, k.d / 4), a = clone(prev);
      a.px = prev.rf[0] * .8 + prev.lf[0] * .2; a.pz = prev.rf[1] * .8 + prev.lf[1] * .2; a.sink = Math.max(6, prev.sink);
      a.lh = k.p.lh.slice(); a.rh = k.p.rh.slice(); a.hy = 0; a.wy = 0; a.lean = 0; a.hdy = 0;
      var b2 = clone(a); b2.lf = k.p.lf.slice();
      var c = clone(b2); c.px = b2.lf[0] * .8 + b2.rf[0] * .2; c.pz = b2.lf[1] * .8 + b2.rf[1] * .2;
      var e = clone(c); e.rf = k.p.rf.slice();
      var extra = [a, b2, c, e].map(function (p) { return { d: t, p: p, b: k.b, s: k.s }; });
      var last = { d: t, p: k.p, b: k.b, s: k.s };
      if (i === 0) { tail = extra; out.push(last); } else { out.push.apply(out, extra); out.push(last); }
    });
    return out.concat(tail);
  }
  TC.mirrorKeys = function (keys) {
    return keys.map(function (k) { return { d: k.d, p: TC.mirrorPose(k.p), b: k.b, s: k.s }; });
  };
  TC.loopLength = function (keys) { return keys.reduce(function (s, k) { return s + k.d; }, 0); };

  /* ---------------------------------------------------------------- sampling */
  function cr(p0, p1, p2, p3, u) {  // Catmull-Rom
    var u2 = u * u, u3 = u2 * u;
    return .5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (-p0 + 3 * p1 - 3 * p2 + p3) * u3);
  }
  function smooth(u) { return u * u * (3 - 2 * u); }
  /* Pose at time t (seconds, looping) + where we are: {pose, seg, u, key} */
  TC.sample = function (keys, t) {
    var n = keys.length, T = TC.loopLength(keys);
    if (n === 1) return { pose: keys[0].p, key: keys[0], u: 0, idx: 0 };
    t = ((t % T) + T) % T;
    // segment i goes from key i-1 to key i, lasting keys[i].d; the loop segment (to key 0) comes last
    var order = [], acc = 0, i;
    for (i = 1; i < n; i++) order.push(i);
    order.push(0);
    var seg = 0, u = 0;
    for (i = 0; i < order.length; i++) {
      var d = keys[order[i]].d;
      if (t < acc + d || i === order.length - 1) { seg = order[i]; u = d ? Math.min(1, (t - acc) / d) : 1; break; }
      acc += d;
    }
    var i2 = seg, i1 = (seg - 1 + n) % n, i0 = (seg - 2 + n * 2) % n, i3 = (seg + 1) % n;
    var a = keys[i0].p, b = keys[i1].p, c = keys[i2].p, e = keys[i3].p, o = {};
    var ue = u * .7 + smooth(u) * .3;
    KEYS.forEach(function (k) { o[k] = cr(a[k], b[k], c[k], e[k], ue); });
    ['lh', 'rh'].forEach(function (k) { o[k] = [0, 1, 2].map(function (j) { return cr(a[k][j], b[k][j], c[k][j], e[k][j], ue); }); });
    var s = smooth(u);
    ['lf', 'rf'].forEach(function (k) {
      var f = [0, 1, 2, 3, 4].map(function (j) { return b[k][j] + (c[k][j] - b[k][j]) * s; });
      var step = Math.abs(c[k][0] - b[k][0]) + Math.abs(c[k][1] - b[k][1]);
      if (step > 3 && b[k][2] < 3 && c[k][2] < 3) f[2] += Math.min(9, 3 + step * .12) * Math.sin(Math.PI * u);
      o[k] = f;
    });
    return { pose: o, key: keys[seg], idx: seg, u: u };
  };

  /* ---------------------------------------------------------------- skeleton from a pose */
  function skeleton(p) {
    var pel = v(p.px, B.hip - p.sink, p.pz), hy = p.hy * D, ty = (p.hy + p.wy) * D;
    function torso(q) { return rotY(rotX(rotZ(q, -p.side * D), p.lean * D), ty); }
    var chest = add(pel, torso([0, B.spine, 0]));
    var J = { pel: pel, chest: chest };
    J.neck = add(chest, torso([0, 2, 0]));
    var headOff = rotY(rotX([0, B.neck + B.headR, 1.5], p.hdp * D), p.hdy * D);
    J.head = add(chest, torso(headOff));
    J.bun = add(J.head, torso(rotY(rotX([0, B.headR * .72, -B.headR * .62], p.hdp * D), p.hdy * D)));
    J.nose = add(J.head, torso(rotY(rotX([0, -1.5, B.headR], p.hdp * D), p.hdy * D)));
    J.eyeL = add(J.head, torso(rotY(rotX([3.6, 1, B.headR * .93], p.hdp * D), p.hdy * D)));
    J.eyeR = add(J.head, torso(rotY(rotX([-3.6, 1, B.headR * .93], p.hdp * D), p.hdy * D)));
    ['l', 'r'].forEach(function (s) {
      var side = s === 'l' ? 1 : -1, hand = p[s + 'h'], foot = p[s + 'f'];
      var sh = add(chest, torso([side * B.shW, p.sh, 0]));
      var tgt = add(chest, torso(hand));
      var arm = ik(sh, tgt, B.upper, B.fore, torso([side * .45, -1, -.5]));
      J[s + 'sh'] = sh; J[s + 'el'] = arm.mid; J[s + 'wr'] = arm.end;
      J[s + 'hd'] = add(arm.end, mul(norm(sub(arm.end, arm.mid)), 5.5));
      var hip = add(pel, rotY([side * B.hipW, 0, 0], hy));
      var fy = foot[3] * D, fwd = rotY([0, 0, 1], fy);
      var ank = v(foot[0], B.ankle + foot[2], foot[1]);
      var leg = ik(hip, ank, B.thigh, B.shin, rotY([side * .25, .1, 1], (foot[3] * .5 + p.hy * .5) * D));
      J[s + 'hp'] = hip; J[s + 'kn'] = leg.mid; J[s + 'an'] = leg.end;
      var toeUp = foot[4] || 0, a = leg.end;
      J[s + 'to'] = foot[2] > 12 ? add(a, add(mul(fwd, 10), [0, 6, 0]))
        : [a[0] + fwd[0] * 14, 1 + toeUp * 7 + Math.max(0, foot[2] - 6) * .6, a[2] + fwd[2] * 14];
      J[s + 'he'] = foot[2] > 12 ? add(a, mul(fwd, -3)) : [a[0] - fwd[0] * 3, Math.max(1, a[1] - B.ankle), a[2] - fwd[2] * 3];
    });
    return J;
  }
  TC.skeleton = skeleton;

  /* ---------------------------------------------------------------- the figure */
  TC.Figure = function (svg, opts) {
    opts = opts || {};
    var self = this;
    var cam = { yaw: opts.yaw == null ? 28 : opts.yaw, pitch: opts.pitch == null ? 11 : opts.pitch };
    var W = 400, H = 300, scale = 1, cx = 0, cz = 0, keys = null, t = 0, speed = 1, playing = false, last = 0, raf = 0;
    var trails = { l: [], r: [] }, showTrails = opts.trails !== false, mirror = !!opts.mirror, onKey = opts.onKey, lastSeg = -1;
    var still = opts.pose ? merge(BASE, opts.pose) : merge(BASE, {});
    svg.setAttribute('class', 'tc-fig');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', opts.label || 'A tai chi teacher showing the move');

    function measure() {
      var r = svg.getBoundingClientRect();
      W = Math.max(120, r.width || 400); H = Math.max(120, r.height || 300);
      scale = Math.min(H / 205, W / 170);
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    }
    function proj(p) {
      var q = [p[0] - cx, p[1], p[2] - cz];
      q = rotY(q, -cam.yaw * D);
      q = rotX(q, cam.pitch * D);
      var x = q[0] * scale * (mirror ? -1 : 1);
      return [W / 2 + x, H * .9 - q[1] * scale, q[2]];
    }
    function f1(n) { return Math.round(n * 10) / 10; }
    function draw(pose) {
      var J = skeleton(pose), P = {};
      // the camera follows the figure a little, so travelling moves stay in frame
      cx += (pose.px * .8 - cx) * .06; cz += (pose.pz * .8 - cz) * .06;
      for (var k in J) P[k] = proj(J[k]);
      self.P = P;  // screen positions of the joints (for overlays such as the lymph map)
      var out = [];
      // mat + shadow on the ground
      var mat = [];
      for (var i = 0; i < 28; i++) { var a = i / 28 * Math.PI * 2, m = proj([Math.cos(a) * 62, 0, Math.sin(a) * 62]); mat.push(f1(m[0]) + ',' + f1(m[1])); }
      out.push('<polygon class="mat" points="' + mat.join(' ') + '"/>');
      var sh = [];
      for (i = 0; i < 18; i++) { a = i / 18 * Math.PI * 2; m = proj([pose.px + Math.cos(a) * 22, 0, pose.pz + Math.sin(a) * 13]); sh.push(f1(m[0]) + ',' + f1(m[1])); }
      out.push('<polygon class="shadow" points="' + sh.join(' ') + '"/>');
      // hand trails
      if (showTrails) {
        ['l', 'r'].forEach(function (s) {
          var tr = trails[s];
          tr.push(J[s + 'hd']);
          if (tr.length > 46) tr.shift();
          if (tr.length > 3) {
            var pts = tr.map(function (p) { var q = proj(p); return f1(q[0]) + ',' + f1(q[1]); });
            var half = Math.floor(pts.length / 2);
            out.push('<polyline class="trail" stroke-width="' + f1(1.4 * scale) + '" opacity=".22" points="' + pts.slice(0, half + 1).join(' ') + '"/>');
            out.push('<polyline class="trail" stroke-width="' + f1(1.8 * scale) + '" opacity=".5" points="' + pts.slice(half).join(' ') + '"/>');
          }
        });
      }
      // body parts, depth-sorted (far first). Each: [depth, svg]
      var parts = [], s = scale;
      function seg(a, b, w, cls, z) {
        var A = P[a], Bp = P[b];
        var d = 'M' + f1(A[0]) + ' ' + f1(A[1]) + 'L' + f1(Bp[0]) + ' ' + f1(Bp[1]);
        parts.push([z == null ? (A[2] + Bp[2]) / 2 : z, '<path class="ln" stroke-width="' + f1(w * s + 2.6) + '" d="' + d + '"/><path class="ln ' + cls + '" stroke-width="' + f1(w * s) + '" d="' + d + '"/>']);
      }
      var depthPel = P.pel[2];
      ['l', 'r'].forEach(function (sd) {
        var far = (P[sd + 'kn'][2] + P[sd + 'an'][2]) / 2 < depthPel - 1;
        seg(sd + 'hp', sd + 'kn', 13, far ? 'pants2' : 'pants');
        seg(sd + 'kn', sd + 'an', 10.5, far ? 'pants2' : 'pants');
        seg(sd + 'he', sd + 'to', 7, 'pants', (P[sd + 'he'][2] + P[sd + 'to'][2]) / 2 - .5);
        var farA = (P[sd + 'el'][2] + P[sd + 'wr'][2]) / 2 < P.chest[2] - 2;
        seg(sd + 'sh', sd + 'el', 9.5, farA ? 'robe2' : 'robe');
        seg(sd + 'el', sd + 'wr', 8, farA ? 'robe2' : 'robe');
        seg(sd + 'wr', sd + 'hd', 7.4, farA ? 'skin2' : 'skin', (P[sd + 'wr'][2] + P[sd + 'hd'][2]) / 2 + .3);
      });
      // torso: a jacket from shoulders to hips with a sash
      var tz = (P.chest[2] + P.pel[2]) / 2;
      var hpL = mid(P.pel, P.lhp, 1.55), hpR = mid(P.pel, P.rhp, 1.55);
      var poly = [P.lsh, P.rsh, hpR, hpL].map(function (q) { return f1(q[0]) + ',' + f1(q[1]); });
      var sashA = mid(hpL, P.lsh, .16), sashB = mid(hpR, P.rsh, .16);
      parts.push([tz, '<path class="ln" stroke-width="' + f1(14 * s + 2.6) + '" d="M' + f1(P.chest[0]) + ' ' + f1(P.chest[1] + 4 * s) + 'L' + f1(P.pel[0]) + ' ' + f1(P.pel[1]) + '"/>' +
        '<polygon class="f-robe" stroke-width="2.6" points="' + poly.join(' ') + '"/>' +
        '<path class="ln robe" stroke-width="' + f1(14 * s) + '" d="M' + f1(P.chest[0]) + ' ' + f1(P.chest[1] + 4 * s) + 'L' + f1(P.pel[0]) + ' ' + f1(P.pel[1]) + '"/>' +
        '<path class="sash" stroke-width="' + f1(3.2 * s) + '" d="M' + f1(sashA[0]) + ' ' + f1(sashA[1]) + 'L' + f1(sashB[0]) + ' ' + f1(sashB[1]) + '"/>']);
      // neck + head (+ hair bun so you can see which way the head faces)
      seg('chest', 'neck', 6, 'skin', P.chest[2] + .1);
      var hr = B.headR * s;
      parts.push([P.head[2] + .2, '<circle class="f-skin" stroke-width="2.4" cx="' + f1(P.head[0]) + '" cy="' + f1(P.head[1]) + '" r="' + f1(hr) + '"/>' +
        '<circle class="f-hair" cx="' + f1(P.head[0] + (P.bun[0] - P.head[0]) * .55) + '" cy="' + f1(P.head[1] + (P.bun[1] - P.head[1]) * .55 - hr * .05) + '" r="' + f1(hr * .82) + '" opacity=".92"/>']);
      parts.push([P.bun[2] + (P.bun[2] < P.head[2] ? -0.5 : .5), '<circle class="f-hair" cx="' + f1(P.bun[0]) + '" cy="' + f1(P.bun[1]) + '" r="' + f1(4 * s) + '"/>']);
      // the face side gets a small skin patch (drawn just in front of the hair cap)
      var faceVis = P.nose[2] > P.head[2] - 3;
      if (faceVis) {
        var fx = P.head[0] + (P.nose[0] - P.head[0]) * .45, fy = P.head[1] + (P.nose[1] - P.head[1]) * .45 + hr * .12;
        var eyes = ['eyeL', 'eyeR'].filter(function (k) { return P[k][2] > P.head[2] + 1; }).map(function (k) {
          var e = P[k], w = 1.7 * s;  // calm, closed eyes: two small downward arcs
          return '<path d="M' + f1(e[0] - w) + ' ' + f1(e[1]) + 'q' + f1(w) + ' ' + f1(w * .8) + ' ' + f1(w * 2) + ' 0" style="fill:none;stroke:var(--fig-line);stroke-width:' + f1(Math.max(1.2, .55 * s)) + ';stroke-linecap:round"/>';
        }).join('');
        parts.push([P.head[2] + .4, '<circle cx="' + f1(fx) + '" cy="' + f1(fy) + '" r="' + f1(hr * .74) + '" style="fill:var(--fig-skin)"/>' + eyes]);
      }
      parts.sort(function (a, b) { return a[0] - b[0]; });
      parts.forEach(function (p) { out.push(p[1]); });
      svg.innerHTML = out.join('');
    }
    function mid(a, b, u) { return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]; }

    function frame(now) {
      raf = 0;
      if (!svg.isConnected) { self.stop(); return; }
      var dt = last ? Math.min(.1, (now - last) / 1000) : 0;
      last = now;
      if (playing && keys) t += dt * speed;
      var pose = still;
      if (keys) {
        var sm = TC.sample(keys, t);
        pose = sm.pose;
        if (onKey && sm.idx !== lastSeg) { lastSeg = sm.idx; onKey(sm.key, sm); }
        self.state = sm;
      }
      draw(pose);
      if (playing || dragging) raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } }

    // drag to look around
    var dragging = false, dx0 = 0, dy0 = 0, y0 = 0, p0 = 0;
    svg.addEventListener('pointerdown', function (e) {
      dragging = true; dx0 = e.clientX; dy0 = e.clientY; y0 = cam.yaw; p0 = cam.pitch;
      try { svg.setPointerCapture(e.pointerId); } catch (err) {}
      kick();
    });
    svg.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      cam.yaw = y0 - (e.clientX - dx0) * .5 * (mirror ? -1 : 1);
      cam.pitch = Math.max(-5, Math.min(40, p0 + (e.clientY - dy0) * .25));
      if (!playing) draw(keys ? TC.sample(keys, t).pose : still);
    });
    function up() { dragging = false; }
    svg.addEventListener('pointerup', up);
    svg.addEventListener('pointercancel', up);
    var ro = window.ResizeObserver ? new ResizeObserver(function () { measure(); kick(); }) : null;
    if (ro) ro.observe(svg);
    measure();

    this.state = null;
    this.setKeys = function (k, keepTime) { keys = k; if (!keepTime) t = 0; lastSeg = -1; trails = { l: [], r: [] }; kick(); return self; };
    this.setPose = function (p) { keys = null; still = merge(BASE, p || {}); kick(); return self; };
    this.play = function () { playing = true; kick(); return self; };
    this.pause = function () { playing = false; return self; };
    this.toggle = function () { return playing ? self.pause() : self.play(); };
    this.playing = function () { return playing; };
    this.time = function (v) { if (v != null) { t = v; kick(); } return t; };
    this.speed = function (v) { if (v != null) speed = v; return speed; };
    this.view = function (yaw, pitch) { if (yaw != null) cam.yaw = yaw; if (pitch != null) cam.pitch = pitch; kick(); return cam; };
    this.mirror = function (v) { if (v != null) { mirror = !!v; trails = { l: [], r: [] }; kick(); } return mirror; };
    this.trails = function (v) { if (v != null) { showTrails = !!v; trails = { l: [], r: [] }; kick(); } return showTrails; };
    this.redraw = function () { measure(); kick(); };
    this.drawNow = function () { measure(); draw(keys ? TC.sample(keys, t).pose : still); return self.P; };
    this.size = function () { return { w: W, h: H, scale: scale }; };
    this.stop = function () { playing = false; if (raf) cancelAnimationFrame(raf); raf = 0; if (ro) ro.disconnect(); };
    kick();
  };

  /* ---------------------------------------------------------------- bamboo backdrop */
  function rng(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
  TC.stage = function (opts) {
    opts = opts || {};
    var r = rng(opts.seed || 7), W = 400, H = 300, out = [];
    out.push('<svg class="tc-bg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMax slice" aria-hidden="true">' +
      '<defs><linearGradient id="tcMist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--c-bg)" stop-opacity="0"/>' +
      '<stop offset=".65" stop-color="var(--c-bg)" stop-opacity=".55"/><stop offset="1" stop-color="var(--c-bg)" stop-opacity=".9"/></linearGradient></defs>');
    out.push('<circle class="sunglow" cx="' + (opts.sunX || 300) + '" cy="72" r="58"/><circle class="sun" cx="' + (opts.sunX || 300) + '" cy="72" r="30"/>');
    [['far', 15, 4, 7, .6], ['mid', 9, 7, 11, 1], ['near', 5, 11, 16, 1.5]].forEach(function (L) {
      var cls = L[0], n = L[1], wMin = L[2], wMax = L[3], amp = L[4];
      for (var i = 0; i < n; i++) {
        var x = (i + r() * .8) / n * (W + 40) - 20;
        if (cls === 'near' && x > W * .3 && x < W * .7) x = x < W / 2 ? W * .3 - r() * 60 : W * .7 + r() * 60;
        var w = wMin + r() * (wMax - wMin), lean = (r() - .5) * 10, top = -20 + r() * 40;
        var g = '<g class="stalk" style="--sw:' + (7 + r() * 6).toFixed(1) + 's;--sa:' + (amp * (.5 + r())).toFixed(2) + 'deg;animation-delay:-' + (r() * 8).toFixed(1) + 's">';
        g += '<path class="' + cls + '" d="M' + (x - w / 2).toFixed(1) + ' ' + H + 'L' + (x - w / 2 + lean).toFixed(1) + ' ' + top.toFixed(1) +
          'L' + (x + w / 2 + lean).toFixed(1) + ' ' + top.toFixed(1) + 'L' + (x + w / 2).toFixed(1) + ' ' + H + 'Z"/>';
        var segH = 34 + r() * 26;
        for (var y = H - segH; y > top + 10; y -= segH) {
          var lx = x + lean * (1 - (y - top) / (H - top));
          g += '<path class="node" stroke-width="' + (cls === 'near' ? 1.6 : 1) + '" d="M' + (lx - w / 2).toFixed(1) + ' ' + y.toFixed(1) + 'h' + w.toFixed(1) + '"/>';
          if (r() < (cls === 'far' ? .35 : .5)) {
            var dir = r() < .5 ? -1 : 1, Ls = (cls === 'near' ? 26 : cls === 'mid' ? 19 : 13) * (.7 + r() * .5);
            for (var j = 0; j < 3; j++) {
              var ang = (dir * (20 + j * 18 + r() * 10)) * D, ex = lx + Math.sin(ang) * Ls, ey = y - 4 + Math.cos(ang) * Ls * .35 + j * 4;
              var mx = (lx + ex) / 2, my = (y + ey) / 2 - 3;
              g += '<path class="leaf ' + cls + '" d="M' + lx.toFixed(1) + ' ' + y.toFixed(1) + 'Q' + mx.toFixed(1) + ' ' + (my - 4).toFixed(1) + ' ' + ex.toFixed(1) + ' ' + ey.toFixed(1) +
                'Q' + mx.toFixed(1) + ' ' + (my + 3).toFixed(1) + ' ' + lx.toFixed(1) + ' ' + y.toFixed(1) + 'Z"/>';
            }
          }
        }
        out.push(g + '</g>');
      }
      if (cls === 'far') out.push('<rect class="mist" x="0" y="0" width="' + W + '" height="' + H + '" opacity=".7"/>');
    });
    out.push('<rect class="mist" x="0" y="' + (H * .55) + '" width="' + W + '" height="' + (H * .45) + '"/>');
    return out.join('') + '</svg>';
  };

  /* ---------------------------------------------------------------- sound (the voice is in _voice.html) */
  var ctxA = null;
  function audio() {
    if (!ctxA) { try { ctxA = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (ctxA.state === 'suspended') ctxA.resume();
    return ctxA;
  }
  TC.unlockAudio = function () { audio(); };
  TC.audioCtx = audio;
  /* A soft singing-bowl tone: a few inharmonic partials that ring and fade. */
  TC.bell = function (vol) {
    var a = audio(); if (!a) return;
    var now = a.currentTime, g = a.createGain();
    g.gain.value = 0; g.connect(a.destination);
    g.gain.linearRampToValueAtTime((vol || .16), now + .02);
    g.gain.exponentialRampToValueAtTime(.0001, now + 4.5);
    [[293.7, 1], [587, .35], [880.8, .22], [1240, .08]].forEach(function (p) {
      var o = a.createOscillator(), og = a.createGain();
      o.type = 'sine'; o.frequency.value = p[0]; og.gain.value = p[1];
      o.frequency.linearRampToValueAtTime(p[0] * 1.003, now + 4);
      o.connect(og); og.connect(g); o.start(now); o.stop(now + 4.6);
    });
  };
  /* Forest wind: filtered noise that swells slowly. Returns a stop function. */
  TC.wind = function () {
    var a = audio(); if (!a) return function () {};
    var buf = a.createBuffer(1, a.sampleRate * 4, a.sampleRate), d = buf.getChannelData(0), last = 0;
    for (var i = 0; i < d.length; i++) { last = (last + .02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.2; }
    var src = a.createBufferSource(); src.buffer = buf; src.loop = true;
    var f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 520;
    var g = a.createGain(); g.gain.value = 0; g.gain.linearRampToValueAtTime(.12, a.currentTime + 3);
    var lfo = a.createOscillator(), lg = a.createGain(); lfo.frequency.value = .07; lg.gain.value = .05;
    lfo.connect(lg); lg.connect(g.gain);
    src.connect(f); f.connect(g); g.connect(a.destination); src.start(); lfo.start();
    return function () { try { g.gain.linearRampToValueAtTime(0, a.currentTime + .8); setTimeout(function () { src.stop(); lfo.stop(); }, 900); } catch (e) {} };
  };

  /* ---------------------------------------------------------------- small helpers */
  TC.mmss = function (s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); };
  TC.today = function (d) {
    d = d || new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  };
  TC.greeting = function () {
    var h = new Date().getHours();
    return h < 5 ? 'Still night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  };
})();
