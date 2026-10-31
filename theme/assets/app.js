/* core.js: the shared front-end engine (window.UI). Same in every app made from APP_MAKER/template;
   app-specific things live in web/app.js (brand, nav, footer) and web/pages/*.html (the pages).

   Pages:   UI.page(name, {title, nav, icon, auth, order, chrome}, mount)
              auth: null (anyone) | 'guest' (signed-out only) | 'user' | 'admin'
              nav: label for the header / phone tab bar (omit to keep it out of the menus)
              mount(view, ctx) draws into `view`; ctx = {args, me, go, api}. Return a Promise (the page
              is "ready" when it resolves) or {ready, destroy}. URLs are #name/arg1/arg2.
   Server:  UI.api(fn, ...args) -> Promise of the server function's return value. A reply of
              {ok: false, error} rejects with that message (shown as a toast unless you .catch it).
            UI.apiQuiet(fn, ...args) is the same without Anvil's loading spinner.
   Auth:    UI.auth('login'|'signup'|'reset'|'logout', {...}) -> Promise of {ok, me, message}
   Helpers: UI.esc, UI.icon, UI.toast, UI.modal, UI.confirm, UI.busy, UI.formData, UI.fmtDate, UI.ago,
            UI.store, UI.setTheme, UI.feedback, UI.go, UI.refresh
   Tests:   window.UI_READY is true when the current page has finished loading. */
(function () {
  'use strict';
  if (window.UI && window.UI.__v) return;
  var UI = window.UI = { __v: 1, pages: {}, me: null, config: { name: 'App', key: 'app', home: 'home', landing: 'landing' } };
  window.UI_READY = false;

  UI.configure = function (cfg) { Object.keys(cfg).forEach(function (k) { UI.config[k] = cfg[k]; }); };

  /* ------------------------------------------------------------------ small helpers */
  UI.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  UI.plural = function (n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); };
  UI.initials = function (name) {
    var p = String(name || '?').trim().split(/\s+/);
    return ((p[0] || '?')[0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
  };
  UI.fmtDate = function (iso, opts) {
    if (!iso) return '';
    var d = iso.length <= 10 ? new Date(iso + 'T12:00:00') : new Date(iso);
    return d.toLocaleDateString(undefined, opts || { day: 'numeric', month: 'short', year: 'numeric' });
  };
  UI.fmtDateTime = function (iso) {
    return iso ? new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
  };
  UI.ago = function (iso) {
    if (!iso) return '';
    var s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 60) return 'just now';
    var steps = [[60, 'minute'], [24, 'hour'], [7, 'day'], [4.35, 'week'], [12, 'month'], [Infinity, 'year']], n = s / 60;
    for (var i = 0; i < steps.length; i++) {
      if (n < steps[i][0]) { n = Math.floor(n); return UI.plural(n, steps[i][1]) + ' ago'; }
      n = n / steps[i][0];
    }
    return '';
  };
  UI.store = {
    get: function (k, dflt) { try { var v = localStorage.getItem(UI.config.key + '.' + k); return v == null ? dflt : JSON.parse(v); } catch (e) { return dflt; } },
    set: function (k, v) { try { localStorage.setItem(UI.config.key + '.' + k, JSON.stringify(v)); } catch (e) {} }
  };
  UI.formData = function (form) {
    var out = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name || el.disabled) return;
      if (el.type === 'checkbox') out[el.name] = el.checked;
      else if (el.type === 'radio') { if (el.checked) out[el.name] = el.value; }
      else out[el.name] = el.value;
    });
    return out;
  };
  /* Disable a button while a Promise runs; returns the Promise. */
  UI.busy = function (btn, promise) {
    if (!btn) return promise;
    btn.disabled = true; btn.classList.add('is-busy');
    var done = function () { btn.disabled = false; btn.classList.remove('is-busy'); };
    promise.then(done, done);
    return promise;
  };

  var ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7"/><path d="M18 14.7c2.2.6 3.5 2.4 3.5 5.3"/>',
    sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
    shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z"/>',
    bell: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    back: '<path d="M19 12H5M11 18l-6-6 6-6"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    bug: '<rect x="7" y="8" width="10" height="12" rx="5"/><path d="M12 8V5M9 5.5 7.5 4M15 5.5 16.5 4M7 13H3M21 13h-4M7.5 18l-3 2M16.5 18l3 2M7.5 9.5l-3-2M16.5 9.5l3-2"/>',
    bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    inbox: '<path d="M3 13h5l1.5 3h5L16 13h5"/><path d="M5 5h14l2 8v6H3v-6z"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
    database: '<ellipse cx="12" cy="5.5" rx="7.5" ry="2.5"/><path d="M4.5 5.5v13c0 1.4 3.4 2.5 7.5 2.5s7.5-1.1 7.5-2.5v-13"/><path d="M4.5 12c0 1.4 3.4 2.5 7.5 2.5s7.5-1.1 7.5-2.5"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.3-4.9L4 8"/><path d="M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.3 4.9L20 16"/><path d="M20 20v-4h-4"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
    pin: '<path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3v12H4z"/><circle cx="12" cy="13.5" r="3.5"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
    filter: '<path d="M4 5h16l-6 7.5V19l-4 1.5v-8z"/>',
    more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>'
  };
  UI.ICONS = ICONS;
  UI.icon = function (name, cls) {
    return '<svg class="ui-ic ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || ICONS.sparkle) + '</svg>';
  };

  /* ------------------------------------------------------------------ toasts, modals */
  UI.toast = function (msg, kind) {
    var box = document.querySelector('.ui-toasts');
    if (!box) { box = document.createElement('div'); box.className = 'ui ui-toasts'; box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
    var t = document.createElement('div');
    t.className = 'ui-toast' + (kind ? ' ' + kind : '');
    t.innerHTML = (kind === 'error' ? UI.icon('info') : kind === 'ok' ? UI.icon('check') : '') + '<span>' + UI.esc(msg) + '</span>';
    box.appendChild(t);
    setTimeout(function () { t.classList.add('out'); setTimeout(function () { t.remove(); }, 300); }, kind === 'error' ? 6500 : 3200);
  };
  UI.modal = function (html, opts) {
    opts = opts || {};
    var prev = document.activeElement;
    var wrap = document.createElement('div');
    wrap.className = 'ui ui-modal-wrap';
    wrap.innerHTML = '<div class="ui-modal' + (opts.wide ? ' wide' : '') + '" role="dialog" aria-modal="true">' +
      '<button class="ui-btn ghost icon ui-modal-x" data-close aria-label="Close">' + UI.icon('x') + '</button>' + html + '</div>';
    document.body.appendChild(wrap);
    document.documentElement.classList.add('ui-modal-open');
    function key(e) { if (e.key === 'Escape') close(); }
    function close() {
      if (!wrap.parentNode) return;
      wrap.remove(); document.removeEventListener('keydown', key);
      if (!document.querySelector('.ui-modal-wrap')) document.documentElement.classList.remove('ui-modal-open');
      if (opts.onclose) opts.onclose();
      if (prev && prev.focus) prev.focus();
    }
    document.addEventListener('keydown', key);
    wrap.addEventListener('mousedown', function (e) { if (e.target === wrap) close(); });
    wrap.addEventListener('click', function (e) { if (e.target.closest('[data-close]')) close(); });
    var first = wrap.querySelector('input, textarea, select');
    setTimeout(function () { (first || wrap.querySelector('.ui-modal')).focus && (first || wrap.querySelector('.ui-modal')).focus(); }, 30);
    return { el: wrap.querySelector('.ui-modal'), close: close };
  };
  UI.confirm = function (o) {
    o = typeof o === 'string' ? { title: o } : (o || {});
    return new Promise(function (resolve) {
      var answered = false;
      var m = UI.modal('<h2>' + UI.esc(o.title || 'Are you sure?') + '</h2>' + (o.text ? '<p class="muted">' + UI.esc(o.text) + '</p>' : '') +
        '<div class="ui-row end" style="margin-top:20px"><button class="ui-btn ghost" data-close>' + UI.esc(o.cancel || 'Cancel') + '</button>' +
        '<button class="ui-btn ' + (o.danger ? 'danger solid' : 'primary') + '" data-ok>' + UI.esc(o.ok || 'OK') + '</button></div>',
      { onclose: function () { if (!answered) resolve(false); } });
      m.el.querySelector('[data-ok]').onclick = function () { answered = true; m.close(); resolve(true); };
    });
  };

  /* ------------------------------------------------------------------ theme */
  UI.theme = function () { return UI.store.get('theme', 'auto'); };
  UI.applyTheme = function (t) {
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
    else document.documentElement.removeAttribute('data-theme');
    var dark = t === 'dark' || (t !== 'light' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('ui-dark', !!dark);
  };
  UI.setTheme = function (t) { UI.store.set('theme', t); UI.applyTheme(t); };
  UI.applyTheme(UI.theme());
  if (window.matchMedia) {
    try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { UI.applyTheme(UI.theme()); }); } catch (e) {}
  }

  /* ------------------------------------------------------------------ server bridge */
  var bridge = null;
  function send(kind, payload) {
    if (!bridge) return Promise.reject(new Error('The app is still starting.'));
    var out;
    try { out = bridge(kind, JSON.stringify(payload || {})); } catch (e) { return Promise.reject(e); }
    return Promise.resolve(out).then(function (r) {
      r = typeof r === 'string' ? JSON.parse(r) : (r || {});
      if (r.error) {
        var err = new Error(r.error); err.uiApi = true; err.denied = !!r.denied;
        if (r.detail) console.error(kind, payload && payload.fn, r.detail);
        if (r.reload) setTimeout(function () { location.reload(); }, 2500);
        throw err;
      }
      return r.result;
    });
  }
  function apiCall(quiet, fn, args) {
    return send('call', { fn: fn, args: args, quiet: quiet }).then(function (res) {
      if (res && typeof res === 'object' && res.ok === false) {
        var err = new Error(res.error || 'That didn\'t work.'); err.uiApi = true; err.expected = true; err.result = res;
        throw err;
      }
      return res;
    });
  }
  UI.api = function (fn) { return apiCall(false, fn, Array.prototype.slice.call(arguments, 1)); };
  UI.apiQuiet = function (fn) { return apiCall(true, fn, Array.prototype.slice.call(arguments, 1)); };
  /* Errors nobody caught become a toast, so a failed action is never silent. */
  window.addEventListener('unhandledrejection', function (e) {
    if (e.reason && e.reason.uiApi) { e.preventDefault(); UI.toast(e.reason.message, 'error'); }
  });

  /* Sign in / up / out. On success it navigates: to where the visitor was heading (UI.after) or home
     after signing in, to the landing page after signing out. */
  UI.auth = function (kind, payload) {
    return send(kind, payload || {}).then(function (r) {
      if (r && r.ok === false) { var err = new Error(r.error); err.uiApi = true; err.expected = true; throw err; }
      if (r && 'me' in r && (r.me || kind === 'logout')) {
        UI.me = r.me || null;
        var target = r.me ? (UI.after || '#' + UI.config.home) : '#' + UI.config.landing;
        UI.after = null;
        if (location.hash === target) route(); else location.hash = target;
      }
      return r;
    });
  };
  /* Update the signed-in user's details (e.g. a new name) and redraw the header, without reloading the page. */
  UI.setMe = function (me) {
    UI.me = me || null;
    if (shellRoot) renderChrome(current.name);
  };

  /* ------------------------------------------------------------------ pages and routing */
  UI.page = function (name, opts, mount) {
    if (typeof opts === 'function') { mount = opts; opts = {}; }
    opts.name = name; opts.mount = mount;
    UI.pages[name] = opts;
  };
  UI.allowed = function (p) {
    if (!p) return false;
    if (p.auth === 'user') return !!UI.me;
    if (p.auth === 'admin') return !!(UI.me && UI.me.is_admin);
    if (p.auth === 'guest') return !UI.me;
    return true;
  };
  UI.navPages = function () {
    return Object.keys(UI.pages).map(function (k) { return UI.pages[k]; })
      .filter(function (p) { return p.nav && UI.allowed(p) && (!p.when || p.when()); })
      .sort(function (a, b) { return (a.order || 50) - (b.order || 50); });
  };
  UI.parseHash = function () {
    var h = (location.hash || '').replace(/^#!?\/?/, '');
    var parts = h.split('?')[0].split('/').filter(function (x) { return x !== ''; }).map(decodeURIComponent);
    return { name: parts[0] || '', args: parts.slice(1) };
  };
  UI.hashFor = function (name) {
    var args = Array.prototype.slice.call(arguments, 1).filter(function (a) { return a != null && a !== ''; });
    return '#' + [name].concat(args.map(encodeURIComponent)).join('/');
  };
  UI.go = function (name) {
    var h = UI.hashFor.apply(null, arguments);
    if (location.hash === h) route(); else location.hash = h;
  };
  UI.refresh = function () { route(); };
  UI.after = null;  // where to go after signing in

  var shellRoot = null, view = null, current = { name: null, destroy: null }, routeSeq = 0;

  function defaultPage() { return UI.me ? UI.config.home : UI.config.landing; }

  function route() {
    var r = UI.parseHash(), name = r.name || defaultPage(), p = UI.pages[name];
    if (!p) { name = defaultPage(); p = UI.pages[name]; r.args = []; }
    if (p.auth === 'guest' && UI.me) { p = UI.pages[UI.config.home]; name = UI.config.home; r.args = []; }
    if ((p.auth === 'user' || p.auth === 'admin') && !UI.me) {
      UI.after = location.hash && location.hash !== '#' ? location.hash : null;
      p = UI.pages.auth; name = 'auth'; r.args = [];
    }
    if (p.auth === 'admin' && !(UI.me && UI.me.is_admin)) {
      UI.toast('That page is for admins only.', 'error');
      p = UI.pages[UI.config.home]; name = UI.config.home; r.args = [];
    }
    var seq = ++routeSeq;
    window.UI_READY = false;
    if (current.destroy) { try { current.destroy(); } catch (e) { console.error(e); } }
    current = { name: name, args: r.args, destroy: null };
    if (shellRoot) {
      shellRoot.className = 'ui ui-shell page-' + name + (UI.me ? ' signed-in' : ' signed-out') + (p.chrome === false ? ' no-chrome' : '');
      renderChrome(name);
    }
    // A fresh element for every page, so listeners a page adds to `view` never pile up.
    var fresh = view.cloneNode(false);
    view.parentNode.replaceChild(fresh, view);
    view = fresh;
    window.scrollTo(0, 0);
    document.title = (p.title ? (typeof p.title === 'function' ? p.title(r.args) : p.title) + ' · ' : '') + UI.config.name;
    var ctx = { name: name, args: r.args, me: UI.me, go: UI.go, api: UI.api, page: p };
    var out;
    try { out = p.mount(view, ctx); } catch (e) { console.error(e); out = Promise.reject(e); }
    var ready = out && typeof out.then === 'function' ? out : (out && out.ready) || Promise.resolve();
    if (out && out.destroy) current.destroy = out.destroy;
    Promise.resolve(ready).then(function () { if (seq === routeSeq) window.UI_READY = true; },
      function (e) {
        if (seq !== routeSeq) return;
        console.error(e);
        if (!view.innerHTML) view.innerHTML = '<div class="ui-wrap"><div class="ui-empty">' + UI.icon('info') +
          '<h3>This page didn\'t load</h3><p class="muted">' + UI.esc(e && e.message || 'Something went wrong.') + '</p>' +
          '<button class="ui-btn" onclick="UI.refresh()">Try again</button></div></div>';
        window.UI_READY = true;
      });
  }
  UI.current = function () { return current; };

  /* The shell's parts come from web/app.js: UI.shell = {header(me, active), footer(me), tabbar(me, active)} */
  function renderChrome(active) {
    var S = UI.shell || {};
    var hd = shellRoot.querySelector('[data-ui-header]'), ft = shellRoot.querySelector('[data-ui-footer]'), tb = shellRoot.querySelector('[data-ui-tabbar]');
    if (hd) hd.innerHTML = S.header ? S.header(UI.me, active) : '';
    if (ft) ft.innerHTML = S.footer ? S.footer(UI.me, active) : '';
    if (tb) tb.innerHTML = S.tabbar ? S.tabbar(UI.me, active) : '';
  }
  UI.renderChrome = function () { if (shellRoot) renderChrome(current.name); };

  /* Called by client_code/Main.py (and by the local harness) once the page is up. */
  UI.start = function (node, bridgeFn, bootJson) {
    bridge = bridgeFn;
    var boot = typeof bootJson === 'string' ? JSON.parse(bootJson || '{}') : (bootJson || {});
    UI.me = boot.me || null;
    var host = node && node.matches && node.matches('[data-ui-app]') ? node : (node && node.querySelector('[data-ui-app]')) || node || document.body;
    host.innerHTML = '<div class="ui ui-shell">' +
      '<header class="ui-header" data-ui-header></header>' +
      '<main class="ui-main" data-ui-view></main>' +
      '<footer class="ui-footer" data-ui-footer></footer>' +
      '<nav class="ui-tabbar" data-ui-tabbar aria-label="Main"></nav></div>';
    shellRoot = host.firstChild;
    view = host.querySelector('[data-ui-view]');
    if (UI.shell && UI.shell.wire) UI.shell.wire(shellRoot);
    window.addEventListener('hashchange', route);
    route();
  };

  /* ------------------------------------------------------------------ feedback form (footer + menu) */
  UI.feedback = function (kind) {
    var kinds = [['bug', 'Something\'s broken', 'bug'], ['idea', 'An idea', 'bulb'], ['question', 'A question', 'info'], ['other', 'Something else', 'chat']];
    var m = UI.modal('<h2>Send feedback</h2><p class="muted">Found a bug or have an idea? It goes straight to the people who make ' + UI.esc(UI.config.name) + '.</p>' +
      '<form class="ui-stack" data-fb>' +
      '<div class="ui-choices">' + kinds.map(function (k) {
        return '<label class="ui-choice"><input type="radio" name="kind" value="' + k[0] + '"' + ((kind || 'bug') === k[0] ? ' checked' : '') + '>' +
          '<span>' + UI.icon(k[2]) + UI.esc(k[1]) + '</span></label>';
      }).join('') + '</div>' +
      '<label class="ui-field"><span>What happened, or what would you like?</span><textarea name="message" rows="5" required minlength="5" placeholder="The more detail, the better."></textarea></label>' +
      (UI.me ? '' : '<label class="ui-field"><span>Your email <em>(optional, if you\'d like a reply)</em></span><input type="email" name="email" autocomplete="email"></label>') +
      '<p class="ui-hint">We also send the page you were on, your screen size and browser, to help us fix bugs.</p>' +
      '<div class="ui-row end"><button type="button" class="ui-btn ghost" data-close>Cancel</button><button class="ui-btn primary" type="submit">' + UI.icon('arrow') + 'Send</button></div></form>');
    var form = m.el.querySelector('[data-fb]');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = UI.formData(form);
      var ctx = { page: location.hash || '#', screen: innerWidth + 'x' + innerHeight, browser: navigator.userAgent.slice(0, 280), theme: UI.theme() };
      UI.busy(form.querySelector('[type=submit]'), UI.api('submit_feedback', v.kind, v.message, v.email || null, ctx)).then(function () {
        m.close(); UI.toast('Thank you! Your message was sent.', 'ok');
      });
    });
    return m;
  };

  /* Shared clicks: [data-go="page/arg"], [data-feedback], [data-theme-set] anywhere in the app. */
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('[data-go],[data-feedback],[data-theme-set]');
    if (!el) return;
    if (el.hasAttribute('data-go')) { e.preventDefault(); UI.go.apply(null, el.getAttribute('data-go').split('/')); }
    else if (el.hasAttribute('data-feedback')) { e.preventDefault(); UI.feedback(el.getAttribute('data-feedback') || null); }
    else if (el.hasAttribute('data-theme-set')) { e.preventDefault(); UI.setTheme(el.getAttribute('data-theme-set')); if (UI.shell && UI.shell.onTheme) UI.shell.onTheme(); }
  });
})();


/* app.js: this app's identity and frame: name, header, footer, phone tab bar.
   Pages live in web/pages/*.html. The engine (window.UI) is web/core.js.
   Guests see the Practice and Learn pages in the header and the phone tab bar too: a session needs no account. */
(function () {
  'use strict';
  UI.configure({
    name: 'Tai Chi Please',
    key: 'taichiplease',          // prefix for this app's browser storage
    tagline: 'Morning tai chi and lymph self-massage in the bamboo forest.',
    home: 'home',                // first page after signing in
    landing: 'landing'           // first page for visitors who aren't signed in
  });

  var esc = UI.esc;

  function brand() {
    return '<a class="ui-brand" href="#" data-go="' + (UI.me ? UI.config.home : UI.config.landing) + '" aria-label="' + esc(UI.config.name) + ' home">' +
      '<img src="_/theme/icon.svg" alt="" width="32" height="32"><span>' + esc(UI.config.name) + '</span></a>';
  }

  function themeSwitch() {
    var t = UI.theme();
    return '<div class="ui-seg" role="group" aria-label="Appearance">' + [['auto', 'Auto'], ['light', 'Morning'], ['dark', 'Night']].map(function (o) {
      return '<button type="button" data-theme-set="' + o[0] + '" class="' + (t === o[0] ? 'on' : '') + '">' + o[1] + '</button>';
    }).join('') + '</div>';
  }

  function userMenu(me) {
    return '<div class="ui-menu" data-menu hidden>' +
      '<div class="ui-menu-head"><strong>' + esc(me.name) + '</strong><span class="muted small">' + esc(me.email) + '</span></div>' +
      '<a href="#profile" data-go="profile">' + UI.icon('user') + 'Profile and settings</a>' +
      '<a href="#journal" data-go="journal">' + UI.icon('calendar') + 'Your journal</a>' +
      (me.is_admin ? '<a href="#admin" data-go="admin">' + UI.icon('shield') + 'Admin</a>' : '') +
      '<div class="ui-menu-block"><span class="small muted">Appearance</span>' + themeSwitch() + '</div>' +
      '<button type="button" data-feedback>' + UI.icon('chat') + 'Send feedback</button>' +
      '<button type="button" data-lk-open="overview">' + UI.icon('lock') + 'Privacy &amp; Terms</button>' +
      '<button type="button" data-signout>' + UI.icon('logout') + 'Sign out</button></div>';
  }

  UI.shell = {
    header: function (me, active) {
      var nav = UI.navPages();
      return '<div class="ui-header-in">' + brand() +
        '<nav class="ui-nav" aria-label="Main">' + nav.map(function (p) {
          return '<a href="#' + p.name + '" class="' + (p.name === active || (p.name === 'learn' && active === 'move') ? 'on' : '') + '">' + UI.icon(p.icon) + '<span>' + esc(p.nav) + '</span></a>';
        }).join('') + '</nav>' +
        '<div class="ui-header-right">' +
        (me ? '<button type="button" class="ui-avatar-btn" data-menu-toggle aria-label="Your account" aria-haspopup="true">' + esc(UI.initials(me.name)) + '</button>' + userMenu(me)
          : (active === 'auth' ? '' : '<a class="ui-btn ghost" href="#auth" data-go="auth">Sign in</a><a class="ui-btn primary" href="#auth/signup" data-go="auth/signup">Join free</a>')) +
        '</div></div>';
    },
    footer: function (me) {
      return '<div class="ui-footer-in"><div class="ui-footer-brand">' + brand() + '<p class="muted small">' + esc(UI.config.tagline) + '</p>' +
        '<p class="muted small" style="max-width:34em">Gentle movement and self-massage, not medical treatment. If you have a health condition, are pregnant or recovering from surgery, check with your doctor first.</p></div>' +
        '<div class="ui-footer-links">' +
        '<a href="#practice" data-go="practice">Practice</a>' +
        '<a href="#learn" data-go="learn">Learn</a>' +
        '<a href="#learn/lymph" data-go="learn/lymph">Lymph guide</a>' +
        '<a href="#landing" data-go="landing">About</a>' +
        '<a href="https://prepsto.com/#f/dudgtyt" target="_blank" rel="noopener" data-prepsto-open>Suggest an idea</a>' +
        '<button type="button" data-feedback>Send feedback</button>' +
        '<button type="button" data-lk-open="overview">Privacy &amp; Terms</button>' +
        '</div><p class="ui-footer-legal small muted">© ' + new Date().getFullYear() + ' ' + esc(UI.config.name) + ' · made in Montréal by Arkvital</p></div>';
    },
    tabbar: function (me, active) {
      var nav = UI.navPages();
      if (!me && (active === 'landing' || active === 'auth')) return '';
      if (nav.length < 2) return '';
      return nav.slice(0, 4).map(function (p) {
        return '<a href="#' + p.name + '" class="' + (p.name === active || (p.name === 'learn' && active === 'move') ? 'on' : '') + '">' + UI.icon(p.icon) + '<span>' + esc(p.nav) + '</span></a>';
      }).join('') + (me ? '<a href="#profile" class="' + (active === 'profile' ? 'on' : '') + '">' + UI.icon('user') + '<span>You</span></a>'
        : '<a href="#auth/signup">' + UI.icon('leaf') + '<span>Join</span></a>');
    },
    wire: function (root) {
      root.addEventListener('click', function (e) {
        var t = e.target.closest('[data-menu-toggle]');
        var menu = root.querySelector('[data-menu]');
        if (t && menu) { menu.hidden = !menu.hidden; t.setAttribute('aria-expanded', String(!menu.hidden)); return; }
        if (e.target.closest('[data-signout]')) { UI.auth('logout').then(function () { UI.toast('Signed out. See you tomorrow morning!'); }); }
        if (menu && !menu.hidden && !e.target.closest('[data-menu] .ui-seg')) menu.hidden = true;
      });
      document.addEventListener('keydown', function (e) {
        var menu = root.querySelector('[data-menu]');
        if (e.key === 'Escape' && menu) menu.hidden = true;
      });
    },
    onTheme: function () {  // redraw the menu's Auto/Light/Dark buttons and keep the menu open
      var menu = document.querySelector('[data-menu]'), open = menu && !menu.hidden;
      UI.renderChrome();
      if (open) document.querySelector('[data-menu]').hidden = false;
    }
  };
})();


/* ===== _figure.html ===== */
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

  /* ---------------------------------------------------------------- sound + voice */
  var ctxA = null;
  function audio() {
    if (!ctxA) { try { ctxA = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (ctxA.state === 'suspended') ctxA.resume();
    return ctxA;
  }
  TC.unlockAudio = function () { audio(); };
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
  TC.say = function (text) {
    if (!window.speechSynthesis || !text) return;
    try {
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.rate = .9; u.pitch = .95; u.volume = .9;
      var vs = speechSynthesis.getVoices().filter(function (x) { return /^en/i.test(x.lang); });
      var pick = vs.filter(function (x) { return /natural|google uk|samantha|serena|libby|sonia/i.test(x.name); })[0] || vs[0];
      if (pick) u.voice = pick;
      speechSynthesis.speak(u);
    } catch (e) {}
  };
  TC.hush = function () { try { window.speechSynthesis && speechSynthesis.cancel(); } catch (e) {} };

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

/* ===== _moves.html ===== */
(function () {
  'use strict';
  var TC = window.TC;
  function F(x, z, lift, yaw, toe) { return [x, z, lift || 0, yaw || 0, toe || 0]; }
  var READY = { px: 0, pz: 0, sink: 8, hy: 0, wy: 0, lean: 0, side: 0, hdy: 0, hdp: 0, sh: 0,
    lf: F(15, 0, 0, 3), rf: F(-15, 0, 0, -3), lh: [16, -44, 18], rh: [-16, -44, 18] };
  var STAND = { lf: F(13, 0, 0, 4), rf: F(-13, 0, 0, -4), sink: 3, lh: [21, -52, 6], rh: [-21, -52, 6] };
  var HIPS = { lh: [15, -45, 2], rh: [-15, -45, 2] };
  function x(a, b) { var o = {}, k; for (k in a) o[k] = a[k]; for (k in b) o[k] = b[k]; return o; }

  TC.CATS = {
    warm: { name: 'Warm-ups', short: 'Warm-up', icon: 'sunrise', blurb: 'Wake the joints, loosen the spine, arrive in the body.' },
    qigong: { name: 'Morning qigong', short: 'Qigong', icon: 'wind', blurb: 'Five pieces of the Eight Brocades (Ba Duan Jin), the classic 800-year-old morning set.' },
    lymph: { name: 'Lymph self-massage', short: 'Lymph', icon: 'drop', blurb: 'Feather-light strokes that help lymph flow back toward the heart. Neck first, then armpits, belly, groin.' },
    form: { name: 'The 24-step form', short: 'Form', icon: 'bamboo', blurb: 'Yang-style simplified tai chi, the most practised form in the world, learned one move at a time.' },
    cool: { name: 'Cool-down', short: 'Cool-down', icon: 'lotus', blurb: 'Gather the energy, settle the breath, carry the calm into the day.' }
  };

  var M = [
    /* ------------------------------------------------------------- warm-ups */
    { id: 'wuji', cat: 'warm', name: 'Wuji standing', zh: '无极桩', py: 'Wújí zhuāng', secs: 60,
      about: "Wuji means 'without limits': the empty stillness before movement. Every tai chi practice begins here, standing quietly and letting the body settle.",
      steps: ["Stand with the feet hip-width apart, knees soft, arms hanging loosely.", "Breathe in through the nose; let the crown of the head float up.", "Breathe out; let the shoulders, chest and belly soften and sink."],
      tip: "Imagine a thread lifting the top of your head while your tailbone grows heavy.",
      start: STAND, keys: [[4, {}, 'out', 2], [4, { sink: 1, sh: 1.2, lh: [22, -50, 7], rh: [-22, -50, 7] }, 'in', 1]] },
    { id: 'neck', cat: 'warm', name: 'Neck release', zh: '颈部放松', py: 'Jǐngbù fàngsōng', secs: 40,
      about: "Slow turns and nods release the neck after a night on the pillow. Move only as far as feels easy.",
      steps: ["Hands on the hips, stand tall.", "Slowly turn the head to look over the left shoulder.", "Return to the centre.", "Turn to look over the right shoulder.", "Let the chin sink toward the chest, then lift it again."],
      tip: "Lead with the eyes, and let the head follow.",
      start: x(STAND, HIPS), keys: [[2.5, { hdy: 0, hdp: 0 }, 'in', 4], [3, { hdy: 60 }, 'in', 1], [2.5, { hdy: 0 }, 'out', 2], [3, { hdy: -60 }, 'in', 3], [2.5, { hdy: 0 }, 'out', 2], [2.5, { hdp: 30 }, 'out', 4]] },
    { id: 'shoulders', cat: 'warm', name: 'Shoulder circles', zh: '肩部绕环', py: 'Jiānbù ràohuán', secs: 30,
      about: "Rolling the shoulders wakes the upper back and the muscles around the collarbones, where the lymph drains.",
      steps: ["Let the arms hang.", "Lift the shoulders forward and up toward the ears.", "Roll them back and let them drop heavily. Six slow circles, then reverse."],
      tip: "Make the circles big and slow; the arms stay heavy.",
      start: STAND, keys: [[1.3, { sh: 0, lh: [21, -52, 6], rh: [-21, -52, 6] }, 'out', 2], [1.1, { sh: 3, lh: [21, -49, 9], rh: [-21, -49, 9] }, 'in', 1], [1.1, { sh: 6, lh: [21, -46, 5], rh: [-21, -46, 5] }, 'in', 1], [1.1, { sh: 2, lh: [21, -50, 2], rh: [-21, -50, 2] }, 'out', 2]] },
    { id: 'waist', cat: 'warm', name: 'Turning the waist', zh: '转腰甩手', py: 'Zhuǎn yāo shuǎi shǒu', secs: 45,
      about: "The arms swing like the beads of a rattle drum while the waist turns. In tai chi the waist is the axle: everything moves from there.",
      steps: ["Feet a little wider than the hips, knees soft, arms loose like empty sleeves.", "Turn from the waist; let the arms swing and gently wrap around the body.", "Swing back through the centre without effort."],
      tip: "Let the hands land softly on the body: a gentle pat on the belly and lower back.",
      start: { lf: F(17, 0, 0, 6), rf: F(-17, 0, 0, -6), sink: 6, lh: [21, -50, 8], rh: [-21, -50, 8] },
      keys: [[1.3, { hy: 0, wy: 0, hdy: 0, lh: [21, -50, 8], rh: [-21, -50, 8] }, 'out', 2], [1.5, { hy: 28, wy: 32, hdy: 20, rh: [12, -40, 16], lh: [-6, -44, -14] }, 'in', 1],
        [1.3, { hy: 0, wy: 0, hdy: 0, lh: [21, -50, 8], rh: [-21, -50, 8] }, 'out', 2], [1.5, { hy: -28, wy: -32, hdy: -20, lh: [-12, -40, 16], rh: [6, -44, -14] }, 'in', 1]] },
    { id: 'hips', cat: 'warm', name: 'Hip and knee circles', zh: '转胯', py: 'Zhuǎn kuà', secs: 30,
      about: "Small circles of the hips and knees warm the legs for the low, rooted stances of the form.",
      steps: ["Feet together, hands on the hips, knees bent.", "Circle the hips and knees slowly, drawing a small circle on the floor.", "Six circles each way."],
      tip: "Keep the heels down and the circle small.",
      start: x(HIPS, { lf: F(8, 0), rf: F(-8, 0), sink: 10 }),
      keys: [[1.2, { px: 4, pz: 0, side: -3, lean: 0 }, '', 1], [1.2, { px: 0, pz: 4, side: 0, lean: -3 }, '', 1], [1.2, { px: -4, pz: 0, side: 3, lean: 0 }, '', 2], [1.2, { px: 0, pz: -4, side: 0, lean: 4 }, '', 2]] },
    { id: 'tapping', cat: 'warm', name: 'Waking tap', zh: '拍打', py: 'Pāi dǎ', secs: 50, both: true,
      about: "Tapping the body with loose, cupped hands (pai da) wakes the skin and circulation. A favourite of morning practitioners in parks across China.",
      steps: ["Hold the left arm out, relaxed. With a loose, cupped right hand, tap from the shoulder", "down the top of the arm to the hand,", "then up the inside of the arm back to the armpit. Switch sides. Finish by patting down the outside of the legs and up the inside."],
      tip: "Loose wrists, light taps: like rain on a bamboo leaf.",
      start: { lf: F(14, 0, 0, 4), rf: F(-14, 0, 0, -4), sink: 4, lh: [30, -22, 30], rh: [20, 3, 6] },
      keys: [[.9, { lh: [30, -22, 30], rh: [20, 3, 6] }, '', 0], [.25, { rh: [22, 9, 9] }, '', 0], [.25, { rh: [23, -3, 14] }, '', 1], [.25, { rh: [25, 3, 17] }, '', 1], [.25, { rh: [26, -9, 21] }, '', 1],
        [.25, { rh: [28, -3, 24] }, '', 1], [.25, { rh: [29, -14, 27] }, '', 1], [.3, { rh: [27, -20, 24] }, '', 2], [.3, { rh: [25, -18, 19] }, '', 2], [.3, { rh: [22, -14, 12] }, '', 2], [.3, { rh: [19, -9, 5] }, '', 2]] },
    { id: 'holdtree', cat: 'cool', name: 'Hugging the tree', zh: '站桩', py: 'Zhàn zhuāng', secs: 60,
      about: "Standing post: the quiet practice that builds root and calm. Masters stand for an hour; one minute is a good start.",
      steps: ["Feet shoulder-width, knees bent over the toes, tailbone dropped.", "Arms round in front of the chest as if hugging a big tree. Breathe in: the arms expand a little.", "Breathe out: sink, and let the weight drain into the feet."],
      tip: "Shoulders down, elbows heavy, a little space under each armpit, like holding an egg.",
      start: { lf: F(16, 0, 0, 4), rf: F(-16, 0, 0, -4), sink: 10, lh: [11, -15, 25], rh: [-11, -15, 25] },
      keys: [[5, { sink: 10, lh: [11, -15, 25], rh: [-11, -15, 25], sh: 0 }, 'out', 2], [4, { sink: 8.5, lh: [13, -14, 27], rh: [-13, -14, 27], sh: .5 }, 'in', 1]] },

    /* ------------------------------------------------------------- qigong */
    { id: 'heavens', cat: 'qigong', name: 'Holding up the heavens', zh: '两手托天理三焦', py: 'Liǎng shǒu tuō tiān lǐ sān jiāo', secs: 60,
      about: "The first of the Eight Brocades: a long, slow stretch up the whole front of the body, said to regulate the 'triple burner', the body's three cavities.",
      steps: ["Interlace the fingers in front of the belly, palms up.", "Breathe in and lift the hands up the centre line; turn the palms out at the chest and press up to the sky. Look at the hands.", "Stretch tall for a moment.", "Breathe out, open the arms wide and float them down to the sides."],
      tip: "Lengthen, don't strain: the shoulders stay away from the ears.",
      start: { lf: F(14, 0, 0, 3), rf: F(-14, 0, 0, -3), sink: 4, lh: [4, -48, 14], rh: [-4, -48, 14] },
      keys: [[1.8, { lh: [4, -48, 14], rh: [-4, -48, 14], sink: 4, hdp: 0, sh: 0 }, 'out', 3], [2.2, { lh: [4, -16, 22], rh: [-4, -16, 22], sink: 2 }, 'in', 1],
        [2.5, { lh: [4, 57, 4], rh: [-4, 57, 4], sink: -2, hdp: -25, sh: 3 }, 'in', 1], [1.5, { lh: [4, 59, 2], rh: [-4, 59, 2], sink: -3, hdp: -10 }, '', 2],
        [2.5, { lh: [66, 4, 8], rh: [-66, 4, 8], sink: 2, hdp: 0, sh: 0 }, 'out', 3], [2, { lh: [22, -50, 8], rh: [-22, -50, 8], sink: 5 }, 'out', 3]] },
    { id: 'archer', cat: 'qigong', name: 'Drawing the bow', zh: '左右开弓似射雕', py: 'Zuǒ yòu kāi gōng sì shè diāo', secs: 60,
      about: "Draw an imaginary bow to shoot a hawk. Opens the chest and lungs, strengthens the legs in a wide horse stance.",
      steps: ["Step wide into a horse stance; cross the wrists in front of the chest.", "Breathe in: push the left hand out to the side, index finger up, as the right hand draws the bowstring back. Look past the left fingers.", "Breathe out: bring the hands back to the centre. Then draw the bow to the right."],
      tip: "Sit only as low as your knees enjoy; the knees point the same way as the toes.",
      start: { lf: F(27, 0, 0, 10), rf: F(-27, 0, 0, -10), sink: 16, lh: [5, -12, 22], rh: [-3, -10, 20] },
      keys: [[2.4, { lh: [5, -12, 22], rh: [-3, -10, 20], hdy: 0, sink: 16 }, 'out', 2], [3, { lh: [70, 4, 6], rh: [-26, -6, 10], hdy: 70, sink: 18 }, 'in', 1],
        [2.4, { lh: [5, -12, 22], rh: [-3, -10, 20], hdy: 0, sink: 16 }, 'out', 2], [3, { rh: [-70, 4, 6], lh: [26, -6, 10], hdy: -70, sink: 18 }, 'in', 1]] },
    { id: 'separate', cat: 'qigong', name: 'Separating heaven and earth', zh: '调理脾胃须单举', py: 'Tiáo lǐ pí wèi xū dān jǔ', secs: 50,
      about: "One hand presses up, one presses down: a diagonal stretch through the side of the body, traditionally for the spleen and stomach.",
      steps: ["Hands in front of the belly, palms up, like holding a bowl.", "Breathe in: one hand presses up to the sky, palm up; the other presses down by the hip, palm down.", "Breathe out: bring them back to the bowl, and switch."],
      tip: "Feel the stretch from the lifted palm all the way down to the opposite heel.",
      start: { lf: F(14, 0, 0, 3), rf: F(-14, 0, 0, -3), sink: 5, lh: [8, -40, 18], rh: [-8, -40, 18] },
      keys: [[2.2, { lh: [8, -40, 18], rh: [-8, -40, 18], sink: 5, sh: 0 }, 'out', 2], [2.8, { lh: [10, 57, 6], rh: [-20, -54, 6], sink: 1, sh: 2 }, 'in', 1],
        [2.2, { lh: [8, -40, 18], rh: [-8, -40, 18], sink: 5, sh: 0 }, 'out', 2], [2.8, { rh: [-10, 57, 6], lh: [20, -54, 6], sink: 1, sh: 2 }, 'in', 1]] },
    { id: 'owl', cat: 'qigong', name: 'Wise owl looks back', zh: '五劳七伤往后瞧', py: 'Wǔ láo qī shāng wǎng hòu qiáo', secs: 45,
      about: "A slow twist of the neck and upper spine while the palms press down. Releases the neck and the eyes after screens.",
      steps: ["Stand tall, palms pressing down beside the hips, fingers forward.", "Breathe in: turn the head slowly to look behind over the left shoulder; the chest opens.", "Breathe out and come back to the centre. Then look over the right shoulder."],
      tip: "The shoulders stay level and quiet; only the head and upper back turn.",
      start: { lf: F(10, 0, 0, 3), rf: F(-10, 0, 0, -3), sink: 3, lh: [24, -48, 10], rh: [-24, -48, 10] },
      keys: [[2.5, { hdy: 0, wy: 0 }, 'out', 2], [3, { hdy: 75, wy: 14 }, 'in', 1], [2.5, { hdy: 0, wy: 0 }, 'out', 2], [3, { hdy: -75, wy: -14 }, 'in', 1]] },
    { id: 'bounce', cat: 'qigong', name: 'Bouncing on the toes', zh: '背后七颠百病消', py: 'Bèi hòu qī diān bǎi bìng xiāo', secs: 25,
      about: "The last of the Eight Brocades: 'seven bounces and the hundred illnesses vanish'. A gentle jolt that shakes the whole body awake, and a lovely pump for the lymph in the legs.",
      steps: ["Feet together, arms relaxed.", "Breathe in and rise onto the balls of the feet, lifting the crown.", "Breathe out and drop the heels lightly to the ground. Seven times."],
      tip: "Soft knees as you land. Skip the drop if your heels or back complain; just rise and lower.",
      start: { lf: F(9, 0, 0, 3), rf: F(-9, 0, 0, -3), sink: 1, lh: [19, -54, 4], rh: [-19, -54, 4] },
      keys: [[.9, { sink: 1, lf: F(9, 0, 0, 3), rf: F(-9, 0, 0, -3), sh: 0 }, '', 2], [1.4, { sink: -6, lf: F(9, 0, 6, 3), rf: F(-9, 0, 6, -3), sh: 1 }, 'in', 1], [.35, { sink: 1.5, lf: F(9, 0, 0, 3), rf: F(-9, 0, 0, -3), sh: 0 }, 'out', 2]] },

    /* ------------------------------------------------------------- lymph self-massage */
    { id: 'lbreath', cat: 'lymph', name: 'Belly breathing', secs: 40,
      about: "Deep breathing is the main pump of the lymph system: as the diaphragm moves, it draws lymph up the large duct in the chest. Always start and finish here.",
      steps: ["Hands resting on the belly below the navel.", "Breathe in slowly through the nose and let the belly swell into the hands.", "Breathe out for longer than you breathed in; feel the belly fall back."],
      tip: "Five slow breaths. If your mind wanders, count the out-breaths.",
      start: STAND, keys: [[5, { lh: [6, -42, 14], rh: [-6, -42, 14], sink: 3, sh: 0 }, 'out', 2], [4, { lh: [6, -41, 18], rh: [-6, -41, 18], sink: 2, sh: 1 }, 'in', 1]] },
    { id: 'collarbone', cat: 'lymph', name: 'Above the collarbones', secs: 35,
      about: "The hollows above the collarbones are where lymph finally returns to the blood. Clearing them first makes room for everything that follows.",
      steps: ["Rest the fingers flat in the soft hollows just above the collarbones.", "Very lightly stretch the skin", "down and in toward the centre, then release. Ten slow, gentle pumps."],
      tip: "The pressure of a coin resting on the skin. Lymph vessels lie just under the surface; pressing hard flattens them.",
      start: STAND, keys: [[.9, { lh: [10, 2, 5], rh: [-10, 2, 5] }, '', 1], [1.1, { lh: [7, -2, 6], rh: [-7, -2, 6] }, '', 2]] },
    { id: 'neck-sides', cat: 'lymph', name: 'Sides of the neck', secs: 35,
      about: "The neck holds hundreds of lymph nodes. Slow, light strokes toward the collarbones help the head and face drain.",
      steps: ["Place the flat hands on the sides of the neck, just below the ears.", "With the lightest touch, stretch the skin", "down toward the collarbones, then release. Ten slow strokes."],
      tip: "Slow is the secret: about one second down, one second to release.",
      start: STAND, keys: [[.9, { lh: [9, 16, 1], rh: [-9, 16, 1] }, '', 1], [1.6, { lh: [10, 2, 4], rh: [-10, 2, 4] }, '', 2]] },
    { id: 'ears', cat: 'lymph', name: 'Around the ears', secs: 30,
      about: "Small circles around the ears move lymph from the face and scalp toward the neck.",
      steps: ["Make a V with the index and middle fingers and slip it around each ear.", "Make small, slow circles, back and down, the skin moving over the bone.", "Ten circles, then one long stroke down the side of the neck."],
      tip: "Lovely for a puffy morning face.",
      start: STAND, keys: [[.6, { lh: [13, 21, 1], rh: [-13, 21, 1] }, '', 1], [.6, { lh: [13, 18, -2], rh: [-13, 18, -2] }, '', 1], [.6, { lh: [12, 14, 1], rh: [-12, 14, 1] }, '', 2], [.6, { lh: [12, 17, 3], rh: [-12, 17, 3] }, '', 1]] },
    { id: 'face', cat: 'lymph', name: 'Face sweeps', secs: 30,
      about: "Feather-light sweeps from the centre of the face outward and down, toward the nodes in front of the ears and under the jaw.",
      steps: ["Fingertips in the middle of the forehead.", "Sweep out to the temples, then down in front of the ears along the jaw,", "and down the neck to the collarbones. Five times."],
      tip: "No oil needed; the skin should move, not the fingers slide.",
      start: STAND, keys: [[1, { lh: [3, 26, 9], rh: [-3, 26, 9] }, '', 0], [1, { lh: [12, 24, 5], rh: [-12, 24, 5] }, '', 1], [1, { lh: [10, 13, 6], rh: [-10, 13, 6] }, '', 1], [1.2, { lh: [10, 4, 4], rh: [-10, 4, 4] }, '', 2]] },
    { id: 'armpits', cat: 'lymph', name: 'Armpit pumps', secs: 50, both: true,
      about: "The armpits hold the nodes that drain the arms, the chest and the upper back. Soft pumping encourages them to empty.",
      steps: ["Lift the left arm a little. Cup the right hand into the left armpit.", "Gently pump upward and in, deep into the hollow, with a soft hand. Ten times.", "Switch sides."],
      tip: "Relax the arm being treated; let it hang heavy.",
      start: { lf: F(13, 0, 0, 4), rf: F(-13, 0, 0, -4), sink: 3, lh: [30, -36, 10], rh: [13, -10, 5] },
      keys: [[1.2, { lh: [30, -36, 10], rh: [13, -10, 5] }, '', 0], [.7, { rh: [12, -5, 2] }, '', 1], [.7, { rh: [13, -10, 5] }, '', 1], [.7, { rh: [12, -5, 2] }, '', 1], [.7, { rh: [13, -10, 5] }, '', 1], [.7, { rh: [12, -5, 2] }, '', 2]] },
    { id: 'arm-sweeps', cat: 'lymph', name: 'Arm sweeps', secs: 55, both: true,
      about: "Long strokes from the wrist to the armpit, always toward the nodes you have just cleared.",
      steps: ["Hold the left arm out in front, relaxed. Rest the right palm on the left wrist.", "Stroke slowly up the arm, over the elbow, to the armpit, the skin barely moving.", "Lift off, go back to the wrist and repeat on the inside of the arm. Then switch arms."],
      tip: "Always work toward the body, never away from it.",
      start: { lf: F(13, 0, 0, 4), rf: F(-13, 0, 0, -4), sink: 3, lh: [26, -32, 42], rh: [24, -24, 38] },
      keys: [[1.2, { lh: [26, -32, 42], rh: [24, -24, 38] }, '', 0], [.9, { rh: [22, -13, 23] }, '', 1], [.9, { rh: [18, -2, 8] }, '', 1], [.6, { rh: [22, -4, 26] }, '', 2], [.6, { rh: [24, -20, 38] }, '', 2], [.9, { rh: [22, -12, 23] }, '', 1], [.9, { rh: [18, -2, 8] }, '', 1]] },
    { id: 'belly', cat: 'lymph', name: 'Belly circles', secs: 45,
      about: "Broad, slow circles over the belly follow the direction of the bowel and stir the deep lymph vessels of the abdomen.",
      steps: ["Hands flat on the belly, one over the other.", "Slow circles: up the right side, across under the ribs, down the left side,", "and across above the pubic bone. Ten circles, gentle and broad."],
      tip: "Breathe into the hands as they circle. Skip this one if you are pregnant or have just eaten.",
      start: STAND, keys: [[1.1, { lh: [-6, -48, 15], rh: [-9, -49, 16] }, '', 1], [1.1, { lh: [-6, -34, 14], rh: [-9, -35, 15] }, '', 1], [1.1, { lh: [9, -34, 14], rh: [6, -35, 15] }, '', 1], [1.1, { lh: [9, -48, 15], rh: [6, -49, 16] }, '', 2]] },
    { id: 'groin', cat: 'lymph', name: 'Hip creases', secs: 35,
      about: "The nodes in the creases where the legs meet the body drain the legs. Clear them before working on the thighs.",
      steps: ["Rest the flat hands in the creases where the legs meet the body.", "Gently stretch the skin up toward the waist,", "and release. Ten slow pumps."],
      tip: "Stand tall or lie on your back: both work.",
      start: STAND, keys: [[1, { lh: [11, -52, 12], rh: [-11, -52, 12], lean: 5 }, '', 1], [1.2, { lh: [14, -46, 10], rh: [-14, -46, 10], lean: 3 }, '', 2]] },
    { id: 'thighs', cat: 'lymph', name: 'Thigh sweeps', secs: 45,
      about: "Upward strokes on the thighs carry lymph toward the hip creases. Finish with soft pumps behind the knees.",
      steps: ["Bend the knees and place the hands above the knees.", "Sweep up the front and sides of the thighs to the hip creases.", "Lift off and repeat. Then pump softly behind each knee with the fingertips, ten times."],
      tip: "On days when the legs feel heavy, do this lying down with the legs up the wall.",
      start: STAND, keys: [[1.3, { lean: 28, sink: 12, lh: [12, -56, 17], rh: [-12, -56, 17] }, '', 0], [1.4, { lean: 12, sink: 6, lh: [13, -50, 12], rh: [-13, -50, 12] }, '', 1], [.9, { lean: 4, sink: 4, lh: [12, -46, 12], rh: [-12, -46, 12] }, '', 2]] },

    /* ------------------------------------------------------------- the 24-step form */
    { id: 'commence', cat: 'form', name: 'Commencing form', zh: '起势', py: 'Qǐ shì', secs: 60, form: [1],
      about: "The opening: the arms float up as if lifted by water, then sink. Simple to learn, a lifetime to master.",
      steps: ["Stand with the feet together, then shift onto the right foot and step the left foot out to shoulder width.", "Breathe in: let the arms float up in front to shoulder height, wrists leading, palms down.", "Breathe out: sink the hips, bend the knees and press the palms down to the belly.", "Rest, rooted, ready.", "Return to the start."],
      tip: "The arms don't lift themselves; they float up because the breath fills you.",
      start: { lf: F(5, 0, 0, 2), rf: F(-5, 0, 0, -2), sink: 0, lh: [20, -53, 5], rh: [-20, -53, 5] },
      keys: [[3, { lf: F(5, 0, 0, 2), sink: 0, px: 0, lh: [20, -53, 5], rh: [-20, -53, 5] }, 'out', 4], [1.5, { sink: 3, px: -4 }, '', 0], [1.5, { lf: F(15, 0, 0, 3) }, '', 0], [1.2, { px: 0 }, '', 0],
        [3.5, { lh: [15, -2, 44], rh: [-15, -2, 44], sink: 2 }, 'in', 1], [3.5, { lh: [15, -42, 24], rh: [-15, -42, 24], sink: 10 }, 'out', 2], [1.5, {}, '', 3]] },
    { id: 'horse-mane', cat: 'form', name: "Part the wild horse's mane", zh: '野马分鬃', py: 'Yě mǎ fēn zōng', secs: 75, both: true, form: [2],
      about: "The hands part like the mane of a galloping horse. Teaches the bow stance and the spiral of the waist.",
      steps: ["Shift onto the right leg and turn a little right; hold an imaginary ball, right hand on top.", "Step the left foot forward, heel first.", "Breathe out: shift into a bow stance and part the hands, the left hand rising to eye height, the right hand settling by the right hip.", "Sit back, toes lifting, ready to continue.", "Return, and repeat on the other side."],
      tip: "Step like a cat: place the heel without weight, then pour the weight in.",
      start: READY, keys: [[2.5, READY, 'out', 4], [2.5, { px: -9, hy: -25, rh: [-10, -12, 22], lh: [-6, -42, 20], lf: F(-2, 4, 3) }, 'in', 0], [2, { lf: F(14, 34, 0, 0, 1), hy: -5 }, '', 1],
        [3, { px: 7, pz: 20, sink: 10, hy: 15, lh: [10, 10, 40], rh: [-24, -48, 10], lf: F(14, 34), rf: F(-15, 0, 0, -45) }, 'out', 2], [2, { px: -4, pz: 6, sink: 11, hy: 5, lf: F(14, 34, 0, 0, 1) }, 'in', 3]] },
    { id: 'crane', cat: 'form', name: 'White crane spreads its wings', zh: '白鹤亮翅', py: 'Bái hè liàng chì', secs: 50, form: [3],
      about: "A crane opening its wings in the morning mist: light on the front foot, one hand high, one hand low.",
      steps: ["Turn slightly left and hold a ball in front of the left chest, left hand on top.", "Sit back onto the right leg; the left foot slides in front, only the ball of the foot touching.", "Separate the hands: the right hand rises beside the right temple, palm in; the left hand presses down beside the left hip.", "Return to the start."],
      tip: "All the weight on the back leg; the front foot could lift at any moment.",
      start: READY, keys: [[2.5, READY, 'out', 3], [2.2, { hy: 20, px: 4, lh: [10, -12, 22], rh: [6, -42, 20] }, 'in', 0], [1.8, { px: -10, pz: -3, sink: 12, hy: -10, rf: F(-15, 0, 0, -20), lf: F(9, 17, 3, 0) }, '', 1],
        [3, { hy: 0, rh: [-20, 24, 18], lh: [24, -48, 12] }, 'in', 2], [1.5, {}, 'out', 2]] },
    { id: 'brush-knee', cat: 'form', name: 'Brush knee and push', zh: '搂膝拗步', py: 'Lǒu xī ǎo bù', secs: 75, both: true, form: [4],
      about: "One hand sweeps past the knee, the other pushes from the ear. The opposite hand and foot work together: a key coordination of tai chi.",
      steps: ["Turn right; the right hand circles down and back up beside the right ear, the left hand comes across to the right chest.", "Step the left foot forward, heel first.", "Breathe out: the left hand brushes past the left knee as the right palm pushes forward from the ear, into a bow stance.", "Sit back, toes lifting.", "Return, and repeat on the other side."],
      tip: "The push comes from the back foot, through the waist, out of the palm.",
      start: READY, keys: [[2.5, READY, 'out', 4], [2.5, { px: -9, hy: -30, wy: -8, rh: [-24, 12, 4], lh: [-8, -14, 18], lf: F(-3, 4, 3) }, 'in', 0], [1.8, { lf: F(14, 34, 0, 0, 1), hy: -12 }, '', 1],
        [3, { px: 7, pz: 20, sink: 10, hy: 0, wy: 0, lh: [26, -46, 14], rh: [-4, -4, 46], lf: F(14, 34), rf: F(-15, 0, 0, -45) }, 'out', 2], [2, { px: -4, pz: 6, sink: 11, lf: F(14, 34, 0, 0, 1) }, 'in', 3]] },
    { id: 'lute', cat: 'form', name: 'Play the lute', zh: '手挥琵琶', py: 'Shǒu huī pí pá', secs: 45, form: [5],
      about: "The hands hold an imaginary pipa, the Chinese lute, in front of the body. An 'empty stance' that trains balance.",
      steps: ["Reach the right hand forward.", "Sit back on the right leg; the left heel touches down in front, toes up. Raise the left hand to nose height, the right hand by the left elbow, as if holding a lute.", "Return to the start."],
      tip: "Close the elbows a little, as if hugging the lute to you.",
      start: READY, keys: [[2.5, READY, 'in', 2], [2, { rh: [-4, -6, 44], lh: [20, -40, 14] }, 'in', 0], [2.8, { px: -10, pz: -3, sink: 12, rf: F(-15, 0, 0, -20), lf: F(10, 22, 0, 0, 1), lh: [4, 6, 38], rh: [0, -18, 24] }, 'out', 1], [1.5, {}, '', 1]] },
    { id: 'monkey', cat: 'form', name: 'Repulse the monkey', zh: '倒卷肱', py: 'Dào juǎn gōng', secs: 70, both: true, form: [6],
      about: "Stepping backward while pushing forward: you retreat without losing your centre. The steps go straight back, like walking on two rails.",
      steps: ["Left foot in front, light on the ball of the foot; left hand forward, palm up.", "Turn right as the right hand circles down and back, then up beside the ear.", "Step the left foot back, landing on the toes.", "Breathe out: sink onto the left leg, push the right palm forward past the ear while the left hand draws back to the waist.", "In the form you keep stepping back, alternating sides. Here we return to the start."],
      tip: "Look at the back hand as it circles, then let the eyes follow the push.",
      start: READY, keys: [[2, READY, '', 4], [2.2, { px: -8, pz: -1, sink: 10, lf: F(10, 20, 3, 0, 0), lh: [8, -6, 40], rh: [-16, -44, 16] }, 'out', 0], [1.8, { hy: -28, rh: [-30, -10, -14] }, 'in', 1],
        [1.6, { hy: -15, rh: [-16, 10, 6] }, 'in', 1], [1.6, { lf: F(14, -24, 0, 10, 0) }, '', 2], [2.6, { px: 8, pz: -18, sink: 11, hy: 0, rh: [-6, -4, 44], lh: [20, -36, 4], rf: F(-12, 0, 3, 0, 0) }, 'out', 3],
        [1.8, { px: -6, pz: -4, sink: 9, rf: F(-15, 0, 0, -3, 0) }, '', 4]] },
    { id: 'bird-tail', cat: 'form', name: "Grasp the bird's tail", zh: '揽雀尾', py: 'Lǎn què wěi', secs: 110, both: true, form: [7, 8],
      about: "The heart of Yang-style tai chi: four energies in one flowing move. Ward off (peng), roll back (lu), press (ji) and push (an).",
      steps: ["Hold the ball on the right, then step the left foot forward, heel first.", "Ward off: shift forward, the left forearm rounds up in front of the chest like a shield; the right hand sinks by the hip.", "Roll back: reach both hands forward, then sit back and turn right, drawing the hands down and back in an arc.", "Press: turn back, the right palm joins the left wrist, and press forward as the weight shifts.", "Push: separate the hands, sit back drawing them to the belly, then push forward and up with the whole body.", "Sit back and return; then the right side."],
      tip: "Each part is a breath. Ward off and push go out; roll back and gathering come in.",
      start: READY, keys: [[2.5, READY, 'out', 5], [2.2, { px: -9, hy: -25, rh: [-10, -12, 22], lh: [-5, -42, 20], lf: F(-2, 4, 3) }, 'in', 0], [1.6, { lf: F(14, 34, 0, 0, 1), hy: -8 }, '', 0],
        [2.6, { px: 6, pz: 18, sink: 10, hy: 0, lh: [0, -12, 32], rh: [-22, -46, 12], lf: F(14, 34), rf: F(-15, 0, 0, -45) }, 'out', 1], [1.8, { hy: 12, lh: [6, -4, 42], rh: [2, -16, 34] }, 'in', 2],
        [2.6, { px: -6, pz: 4, sink: 12, hy: -35, lh: [-4, -30, 26], rh: [-26, -30, 4] }, 'in', 2], [1.8, { hy: 0, lh: [2, -14, 28], rh: [-2, -16, 24] }, '', 3],
        [2, { px: 6, pz: 18, sink: 10, lh: [2, -12, 42], rh: [-2, -13, 40] }, 'out', 3], [2.4, { px: -6, pz: 4, sink: 12, lh: [14, -34, 22], rh: [-14, -34, 22], lf: F(14, 34, 0, 0, 1) }, 'in', 4],
        [2.6, { px: 6, pz: 18, sink: 10, lh: [14, -6, 44], rh: [-14, -6, 44], lf: F(14, 34) }, 'out', 4], [2, { px: -4, pz: 6, sink: 11, lf: F(14, 34, 0, 0, 1) }, 'in', 5]] },
    { id: 'single-whip', cat: 'form', name: 'Single whip', zh: '单鞭', py: 'Dān biān', secs: 60, form: [9, 11],
      about: "The body is the handle of a whip, the hook its tip. One of the most recognisable postures of tai chi, it comes twice in the form.",
      steps: ["Turn right; the right hand forms a hook (fingertips pinched, pointing down) out to the right; the left hand comes under it.", "Draw the left foot in, then turn left and step out to the left-forward corner, heel first.", "Breathe out: bow stance; the left palm turns out and pushes forward while the hook stays behind.", "Return to the start."],
      tip: "Keep the left elbow over the left knee, the nose over the left palm.",
      start: READY, keys: [[2.5, READY, 'out', 3], [2.5, { px: -9, hy: -40, rh: [-34, -6, 30], lh: [-6, -28, 22] }, 'in', 0], [1.2, { lf: F(2, 4, 3) }, '', 1], [1.8, { hy: 20, lf: F(30, 28, 0, 40, 1) }, '', 1],
        [3, { px: 13, pz: 13, sink: 11, hy: 45, lh: [6, -4, 44], rh: [-64, -2, 10], rf: F(-15, 0, 0, -10), lf: F(30, 28, 0, 40, 0) }, 'out', 2], [2, { px: 0, pz: 3, sink: 11, lf: F(30, 28, 0, 40, 1) }, 'in', 3]] },
    { id: 'clouds', cat: 'form', name: 'Wave hands like clouds', zh: '云手', py: 'Yún shǒu', secs: 70, form: [10],
      about: "The hands drift past the face like clouds past a mountain while you step sideways. Many teachers' favourite: pure waist, pure flow.",
      steps: ["Turn left from the waist: the left hand floats up in front of the face, palm in, the right hand sweeps low across the belly.", "Turn right: the hands change places, like clouds drifting past.", "With the weight on the left, bring the right foot in beside it.", "Step the left foot out to the side, toes first.", "Drift back the other way."],
      tip: "The hands never move by themselves: the waist turns, the hands are carried.",
      start: x(READY, { sink: 10, hy: -30, rh: [-6, 4, 28], lh: [2, -38, 22] }),
      keys: [[2.4, { px: 0, hy: -30, rh: [-6, 4, 28], lh: [2, -38, 22], lf: F(15, 0, 0, 3), rf: F(-15, 0, 0, -3), sink: 10 }, 'in', 1], [2.4, { px: 9, hy: 30, lh: [6, 4, 28], rh: [-2, -38, 22] }, 'in', 0],
        [1.6, { rf: F(5, 0, 0, -3) }, 'out', 2], [2.4, { px: 6, hy: -30, rh: [-6, 4, 28], lh: [2, -38, 22] }, 'in', 1], [1.6, { lf: F(31, 0, 0, 3) }, 'out', 3],
        [2.4, { px: 24, hy: 30, lh: [6, 4, 28], rh: [-2, -38, 22] }, 'in', 0], [1.6, { rf: F(21, 0, 0, -3) }, 'out', 2], [2.4, { px: 22, hy: -30, rh: [-6, 4, 28], lh: [2, -38, 22] }, 'in', 1],
        [2.4, { px: 29, hy: 30, lh: [6, 4, 28], rh: [-2, -38, 22] }, 'in', 4], [1.6, { rf: F(5, 0, 0, -3) }, 'out', 4], [2.4, { px: 7, hy: -30, rh: [-6, 4, 28], lh: [2, -38, 22] }, 'in', 4],
        [1.6, { lf: F(15, 0, 0, 3) }, 'out', 4], [2.4, { px: 13, hy: 30, lh: [6, 4, 28], rh: [-2, -38, 22] }, 'in', 4], [1.6, { rf: F(-15, 0, 0, -3) }, 'out', 4]] },
    { id: 'high-pat', cat: 'form', name: 'High pat on horse', zh: '高探马', py: 'Gāo tàn mǎ', secs: 45, form: [12],
      about: "Patting a tall horse: a higher stance, the front hand reaching forward at face height.",
      steps: ["Turn both palms up and open the arms a little.", "Draw the left foot in onto its toes; the right hand passes by the ear and pats forward at face height, palm down, while the left hand withdraws, palm up, to the waist.", "Return to the start."],
      tip: "Stand a little taller here, but keep the back knee soft.",
      start: READY, keys: [[2.5, READY, 'out', 2], [2, { lh: [38, -8, 18], rh: [-38, -8, 18], px: -3 }, 'in', 0], [2.8, { px: -9, pz: -2, sink: 6, lf: F(10, 18, 3, 0, 0), rh: [-2, 8, 42], lh: [16, -34, 12], rf: F(-15, 0, 0, -25) }, 'out', 1], [1.5, {}, '', 1]] },
    { id: 'heel-kick', cat: 'form', name: 'Kick with the heel', zh: '蹬脚', py: 'Dēng jiǎo', secs: 60, both: true, form: [13, 15],
      about: "A slow kick with the heel while the arms open like wings. Balance comes from the root of the standing leg, not from holding your breath.",
      steps: ["Shift onto the left leg; the wrists cross in front of the chest, right hand outside.", "Lift the right knee.", "Breathe out: open the arms like wings and kick slowly forward with the heel, toes pulled back.", "Draw the knee back in.", "Lower the foot and settle. Then the left heel."],
      tip: "Kick only as high as stays comfortable. Waist height is perfect; knee height is fine.",
      start: READY, keys: [[2.6, READY, 'out', 4], [2.4, { px: 9, lh: [3, -12, 26], rh: [-1, -10, 28], rf: F(-5, 4, 3) }, 'in', 0], [1.8, { sink: 6, rf: F(-10, 22, 40, 0) }, 'in', 1],
        [1.6, { sink: 6, rf: F(-10, 82, 64, 0), rh: [-12, 2, 48], lh: [56, 4, -4], lean: -4 }, 'out', 2], [1.6, { rf: F(-10, 22, 40, 0), lh: [3, -12, 26], rh: [-1, -10, 28], lean: 0 }, 'in', 3]] },
    { id: 'ears-fists', cat: 'form', name: 'Strike the ears with both fists', zh: '双峰贯耳', py: 'Shuāng fēng guàn ěr', secs: 50, form: [14],
      about: "The two fists circle up like two mountain peaks meeting. Strong in shape, soft in effort.",
      steps: ["Lift the right knee; both palms turn up and lower either side of the knee.", "Step the right foot forward, heel first, the hands sinking beside the hips and closing into loose fists.", "Breathe out: shift forward and circle the fists up and in to ear height.", "Return to the start."],
      tip: "Loose fists, elbows down, shoulders relaxed: the strike is in the shape, not the force.",
      start: READY, keys: [[2.6, READY, 'out', 3], [2.2, { px: 9, sink: 6, rf: F(-10, 20, 36, 0), lh: [8, -30, 30], rh: [-8, -30, 30] }, 'in', 0], [1.8, { rf: F(-14, 34, 0, 0, 1), lh: [20, -44, 10], rh: [-20, -44, 10], sink: 10 }, '', 1],
        [2.6, { px: -5, pz: 18, sink: 10, lh: [10, 14, 40], rh: [-10, 14, 40], rf: F(-14, 34), lf: F(15, 0, 0, 45) }, 'out', 2], [2, { px: 2, pz: 6, rf: F(-14, 34, 0, 0, 1) }, 'in', 3]] },
    { id: 'snake-rooster', cat: 'form', name: 'Snake creeps down, golden rooster', zh: '下势独立', py: 'Xià shì dú lì', secs: 90, both: true, form: [16, 17],
      about: "Sink low like a snake gliding through grass, then rise and stand on one leg like a rooster at dawn. The deepest and the tallest moments of the form.",
      steps: ["Turn right; the right hand forms a hook out to the right, the left hand comes to the right shoulder. Step the left foot out wide.", "Snake creeps down: sink onto the right leg (only as low as is comfortable!), the left hand sliding down along the inside of the left leg.", "Rise forward onto the left leg, the left hand leading up; the hook drops behind.", "Golden rooster: lift the right knee, the right hand rising above it, fingers up; the left hand presses down by the hip. Stand on one leg.", "Step down and return. Then the other side."],
      tip: "Beginners: a shallow crouch is still the snake. Hold a chair back for the rooster if you like.",
      start: READY, keys: [[2.6, READY, 'out', 4], [2.4, { px: -10, hy: -30, rh: [-46, -4, 22], lh: [-8, -6, 14] }, 'in', 0], [1.6, { lf: F(40, 6, 0, 10) }, '', 0],
        [3, { px: -16, sink: 32, lean: 14, hy: 25, lh: [16, -56, 30], rf: F(-15, 0, 0, -40) }, 'out', 1], [2.6, { px: 34, pz: 6, sink: 10, lean: 0, hy: 30, lh: [8, 0, 40], rh: [-44, -16, -12], lf: F(40, 6, 0, 30) }, 'in', 2],
        [2.6, { px: 39, pz: 6, sink: 3, hy: 10, rf: F(32, 22, 42, 10), rh: [-4, 12, 26], lh: [22, -46, 8] }, 'in', 3], [2, {}, 'out', 3], [1.8, { rf: F(26, -6, 0, -10), sink: 6 }, '', 4]] },
    { id: 'shuttles', cat: 'form', name: 'Fair lady works the shuttles', zh: '玉女穿梭', py: 'Yù nǚ chuān suō', secs: 70, both: true, form: [18],
      about: "A weaver throwing the shuttle through the loom, to one corner and then the other. One arm shields above, the other pushes.",
      steps: ["Hold a ball on the right, right hand on top.", "Step the left foot out to the left-forward corner, heel first.", "Breathe out: bow stance; the left forearm rises and turns above the forehead, palm out, as the right palm pushes forward.", "Return, and work the shuttle on the other side."],
      tip: "The upper arm protects the head; keep its shoulder down.",
      start: READY, keys: [[2.6, READY, 'out', 3], [2.2, { px: -9, hy: -25, rh: [-10, -12, 22], lh: [-5, -42, 20], lf: F(0, 6, 3) }, 'in', 0], [1.6, { lf: F(22, 34, 0, 30, 1), hy: 5 }, '', 1],
        [2.6, { px: 12, pz: 19, sink: 10, hy: 30, lh: [6, 26, 24], rh: [-4, -6, 44], rf: F(-15, 0, 0, -15), lf: F(22, 34, 0, 30) }, 'out', 2], [2, { px: 0, pz: 6, sink: 11, lf: F(22, 34, 0, 30, 1) }, 'in', 3]] },
    { id: 'needle', cat: 'form', name: 'Needle at the sea bottom', zh: '海底针', py: 'Hǎi dǐ zhēn', secs: 45, form: [19],
      about: "The fingertips dive like a needle to the sea floor. A forward fold with a long, straight back.",
      steps: ["Sit back on the right leg, left foot light in front. The right hand rises beside the ear.", "Breathe out: bend forward from the hips and send the right fingertips down and forward.", "Keep the back long, the head in line with the spine.", "Rise and return."],
      tip: "Fold from the hips, not the waist; the back stays like a bamboo pole.",
      start: READY, keys: [[2.6, READY, 'in', 3], [2.4, { px: -9, pz: -3, sink: 10, lf: F(10, 18, 3), rh: [-16, 10, 10], lh: [8, -20, 24], rf: F(-15, 0, 0, -20) }, 'in', 0],
        [2.6, { sink: 16, lean: 32, rh: [-2, -58, 32], lh: [20, -46, 10] }, 'out', 1], [1.6, {}, '', 2]] },
    { id: 'fan-back', cat: 'form', name: 'Fan through the back', zh: '闪通臂', py: 'Shǎn tōng bì', secs: 50, form: [20],
      about: "The arms open like a folding fan, the power spreading through the back.",
      steps: ["Raise both hands in front of the chest, the left palm near the right wrist; draw the left foot up.", "Step forward with the left foot, heel first.", "Breathe out: bow stance; the right hand opens up above the right temple, palm out, as the left palm pushes forward.", "Return to the start."],
      tip: "Feel the shoulder blades spread apart as the hands open.",
      start: READY, keys: [[2.6, READY, 'out', 3], [2.2, { px: -8, sink: 9, lf: F(8, 10, 4), rh: [-2, 0, 36], lh: [4, -4, 30] }, 'in', 0], [1.6, { lf: F(14, 34, 0, 0, 1) }, '', 1],
        [2.6, { px: 6, pz: 18, sink: 10, hy: -15, rh: [-18, 26, 14], lh: [8, -2, 44], lf: F(14, 34), rf: F(-15, 0, 0, -50) }, 'out', 2], [2, { px: -4, pz: 6, sink: 11, hy: 0, lf: F(14, 34, 0, 0, 1) }, 'in', 3]] },
    { id: 'parry-punch', cat: 'form', name: 'Deflect, parry and punch', zh: '转身搬拦捶', py: 'Zhuǎn shēn bān lán chuí', secs: 70, form: [21],
      about: "Three actions in one: the fist deflects, the palm parries, the fist punches. Even the punch is soft, a loose fist driven by the legs.",
      steps: ["Shift onto the left leg; the right fist circles down to the left ribs, the left palm rises.", "Step the right foot forward, toes turned out, and turn the fist over in a back-fist (deflect).", "Shift onto the right leg; the left hand parries forward as the right fist draws back to the waist. Step the left foot forward.", "Breathe out: bow stance and punch with the right fist at chest height, fist vertical, the left hand guarding at the forearm.", "Return to the start."],
      tip: "The fist stays loose until the very end of the punch.",
      start: READY, keys: [[2.8, READY, 'out', 4], [2, { px: 9, hy: -20, rh: [4, -34, 16], lh: [22, 8, 20] }, 'in', 0], [2, { rf: F(-12, 30, 0, -40, 1), rh: [-6, -8, 40], lh: [22, -44, 10], hy: -10 }, 'out', 1],
        [2, { px: -10, pz: 24, sink: 10, hy: -30, rh: [-22, -36, 2], lh: [8, -4, 40], rf: F(-12, 30, 0, -40) }, 'in', 2], [1.6, { lf: F(12, 60, 0, 0, 1) }, '', 2],
        [2.2, { px: 6, pz: 46, sink: 10, hy: 0, rh: [-4, -12, 48], lh: [2, -12, 28], lf: F(12, 60) }, 'out', 3], [1.6, { px: 2, pz: 34, sink: 11, lf: F(12, 60, 0, 0, 1) }, 'in', 4]] },
    { id: 'close-up', cat: 'form', name: 'Apparent close-up', zh: '如封似闭', py: 'Rú fēng sì bì', secs: 55, form: [22],
      about: "As if sealing a door: withdraw, then push. Yielding and returning in one breath.",
      steps: ["From a bow stance with the right fist forward, slip the left hand under the right forearm.", "Open the hands, palms up then in, and sit back, drawing them toward the chest.", "Breathe out: shift forward and push with both palms.", "Return to the start."],
      tip: "Sit back without leaning back: the spine stays upright.",
      start: READY, keys: [[2.6, READY, 'out', 3], [1.8, { lf: F(14, 34, 0, 0, 1), px: -6 }, '', 0], [2.2, { px: 6, pz: 18, sink: 10, lf: F(14, 34), rf: F(-15, 0, 0, -45), rh: [-4, -12, 46], lh: [4, -16, 28] }, 'out', 0],
        [2.6, { px: -6, pz: 4, sink: 12, lh: [13, -18, 24], rh: [-13, -18, 24], lf: F(14, 34, 0, 0, 1) }, 'in', 1], [2.6, { px: 6, pz: 18, sink: 10, lh: [14, -6, 44], rh: [-14, -6, 44], lf: F(14, 34) }, 'out', 2],
        [2, { px: -4, pz: 6, sink: 11, lf: F(14, 34, 0, 0, 1) }, 'in', 3]] },
    { id: 'cross-hands', cat: 'form', name: 'Cross hands', zh: '十字手', py: 'Shí zì shǒu', secs: 50, form: [23],
      about: "The arms open in a great circle and close crossed at the chest, gathering everything back to the centre.",
      steps: ["Turn right; open both arms up and out in a big circle.", "Breathe out: sink, and circle the hands down to cross in front of the belly.", "Breathe in: rise a little, lifting the crossed wrists to the chest, right hand outside. Arms round, like holding a ring.", "Return to the start."],
      tip: "Round arms: the crossed wrists sit about a forearm's length from the chest.",
      start: READY, keys: [[2.6, READY, 'out', 3], [2.6, { px: -8, hy: -35, rh: [-46, 12, 18], lh: [42, 12, 16] }, 'in', 0], [2.6, { px: 0, hy: 0, sink: 14, lh: [4, -44, 24], rh: [-4, -44, 24] }, 'out', 1],
        [2.6, { sink: 7, lh: [2, -12, 24], rh: [-1, -10, 26] }, 'in', 2], [2, {}, 'out', 2]] },
    { id: 'closing', cat: 'form', name: 'Closing form', zh: '收势', py: 'Shōu shì', secs: 50, form: [24],
      about: "The hands sink, the feet come together, and you stand where you began, a little different.",
      steps: ["Turn the palms down and separate the hands to shoulder width.", "Breathe out slowly as the hands float down to the sides.", "Bring the left foot back beside the right.", "Stand quietly. Notice how you feel.", "Return to the start of the movement."],
      tip: "Stay still for three breaths after the last movement. That stillness is part of the form.",
      start: x(READY, { lh: [2, -12, 24], rh: [-1, -10, 26], sink: 7 }),
      keys: [[2.6, { lf: F(15, 0, 0, 3), rf: F(-15, 0, 0, -3), px: 0, sink: 7, lh: [2, -12, 24], rh: [-1, -10, 26] }, 'in', 4], [2.2, { lh: [15, -12, 32], rh: [-15, -12, 32] }, 'in', 0],
        [4, { lh: [20, -50, 8], rh: [-20, -50, 8], sink: 2 }, 'out', 1], [1.4, { px: -5 }, '', 2], [1.6, { lf: F(5, 0, 0, 2), px: 0, sink: 0 }, '', 2], [3, { lh: [20, -53, 5], rh: [-20, -53, 5] }, '', 3]] },

    /* ------------------------------------------------------------- cool-down */
    { id: 'warm-hands', cat: 'cool', name: 'Warm palms, rested eyes', zh: '熨目', py: 'Yùn mù', secs: 25,
      about: "Rub the palms until they glow, then rest them over the eyes. A classic qigong close that brings you gently back.",
      steps: ["Rub the palms together briskly until they're warm.", "Cup them over the closed eyes and rest in the warm dark.", "Slowly open the hands and the eyes to the morning."],
      tip: "Smile a little as you open your eyes. It counts.",
      start: { lf: F(13, 0, 0, 4), rf: F(-13, 0, 0, -4), sink: 4, lh: [2, -14, 20], rh: [-2, -14, 20] },
      keys: [[1.5, { lh: [2, -14, 20], rh: [-2, -14, 20] }, '', 0], [.3, { lh: [2, -10, 22], rh: [-2, -17, 20] }, '', 0], [.3, { lh: [2, -17, 20], rh: [-2, -10, 22] }, '', 0], [.3, { lh: [2, -10, 22], rh: [-2, -17, 20] }, '', 0],
        [.3, { lh: [2, -17, 20], rh: [-2, -10, 22] }, '', 0], [1.2, { lh: [3, 20, 13], rh: [-3, 20, 13] }, 'in', 1], [3, { lh: [3, 20, 13], rh: [-3, 20, 13] }, 'out', 1], [1.5, { lh: [12, 6, 24], rh: [-12, 6, 24] }, 'in', 2]] }
  ];

  TC.MOVES = M;
  TC.MOVE = {};
  M.forEach(function (m) { TC.MOVE[m.id] = m; });
  var cache = {};
  /* The animation keys of a move (both sides when the move is done left and right). */
  TC.moveKeys = function (id) {
    if (cache[id]) return cache[id];
    var m = TC.MOVE[id]; if (!m) return null;
    var k = TC.build(m.keys, m.start);
    if (m.both) k = k.concat(TC.mirrorKeys(k).map(function (q) { q.mir = true; return q; }));
    return (cache[id] = k);
  };
  TC.moveLength = function (id) { return TC.loopLength(TC.moveKeys(id)); };
  TC.startPose = function (id) { var m = TC.MOVE[id]; return TC.merge(TC.BASE, m && m.start || READY); };

  /* ---------------------------------------------------------------- the 24-step form, in order */
  TC.FORM24 = [
    [1, 'Commencing form', '起势', 'commence', 0], [2, "Part the wild horse's mane, left and right", '左右野马分鬃', 'horse-mane', 0],
    [3, 'White crane spreads its wings', '白鹤亮翅', 'crane', 0], [4, 'Brush knee and push, left and right', '左右搂膝拗步', 'brush-knee', 0],
    [5, 'Play the lute', '手挥琵琶', 'lute', 0], [6, 'Repulse the monkey, left and right', '左右倒卷肱', 'monkey', 0],
    [7, "Grasp the bird's tail, left", '左揽雀尾', 'bird-tail', 1], [8, "Grasp the bird's tail, right", '右揽雀尾', 'bird-tail', 2],
    [9, 'Single whip', '单鞭', 'single-whip', 0], [10, 'Wave hands like clouds', '云手', 'clouds', 0], [11, 'Single whip', '单鞭', 'single-whip', 0],
    [12, 'High pat on horse', '高探马', 'high-pat', 0], [13, 'Kick with the right heel', '右蹬脚', 'heel-kick', 1],
    [14, 'Strike the ears with both fists', '双峰贯耳', 'ears-fists', 0], [15, 'Turn and kick with the left heel', '转身左蹬脚', 'heel-kick', 2],
    [16, 'Snake creeps down, golden rooster on the left', '左下势独立', 'snake-rooster', 1], [17, 'Snake creeps down, golden rooster on the right', '右下势独立', 'snake-rooster', 2],
    [18, 'Fair lady works the shuttles, left and right', '左右穿梭', 'shuttles', 0], [19, 'Needle at the sea bottom', '海底针', 'needle', 0],
    [20, 'Fan through the back', '闪通臂', 'fan-back', 0], [21, 'Turn, deflect, parry and punch', '转身搬拦捶', 'parry-punch', 0],
    [22, 'Apparent close-up', '如封似闭', 'close-up', 0], [23, 'Cross hands', '十字手', 'cross-hands', 0], [24, 'Closing form', '收势', 'closing', 0]
  ];

  /* ---------------------------------------------------------------- the path: six stages of the grove */
  TC.STAGES = [
    { key: 'seed', name: 'Seed', zh: '种', line: 'Begin. Learn to stand, to open, to part.', moves: ['commence', 'horse-mane', 'crane'] },
    { key: 'shoot', name: 'Shoot', zh: '笋', line: 'The first steps forward and back.', moves: ['brush-knee', 'lute', 'monkey'] },
    { key: 'stalk', name: 'Stalk', zh: '竿', line: 'The heart of the style: four energies, the whip, the clouds.', moves: ['bird-tail', 'single-whip', 'clouds'] },
    { key: 'node', name: 'Node', zh: '节', line: 'Balance: the high pat and the slow kicks.', moves: ['high-pat', 'heel-kick', 'ears-fists'] },
    { key: 'leaf', name: 'Leaf', zh: '叶', line: 'Low and high, near and far.', moves: ['snake-rooster', 'shuttles', 'needle', 'fan-back'] },
    { key: 'grove', name: 'Grove', zh: '林', line: 'Completing the circle.', moves: ['parry-punch', 'close-up', 'cross-hands', 'closing'] }
  ];
  TC.PATH = [].concat.apply([], TC.STAGES.map(function (s) { return s.moves; }));
  TC.LEARNED_AT = 3;   // sessions with a move before it counts as learned
  TC.status = function (id, progress) {
    var n = (progress || {})[id] || 0;
    return n >= TC.LEARNED_AT ? 'learned' : n > 0 ? 'learning' : 'new';
  };
  TC.nextMove = function (progress) {
    for (var i = 0; i < TC.PATH.length; i++) if (TC.status(TC.PATH[i], progress) !== 'learned') return TC.PATH[i];
    return null;
  };
  TC.learned = function (progress) { return TC.PATH.filter(function (id) { return TC.status(id, progress) === 'learned'; }); };
  TC.stageOf = function (progress) {
    var nx = TC.nextMove(progress);
    if (!nx) return TC.STAGES[TC.STAGES.length - 1];
    return TC.STAGES.filter(function (s) { return s.moves.indexOf(nx) >= 0; })[0];
  };

  /* ---------------------------------------------------------------- sessions */
  TC.KINDS = {
    morning: { title: 'Morning flow', icon: 'sunrise', line: 'Warm-up, lymph massage, your next tai chi move, stillness.', lengths: [7, 15, 25], dflt: 15 },
    lymph: { title: 'Lymph flow', icon: 'drop', line: 'The full self-massage sequence, neck to legs, with deep breathing.', minutes: 9 },
    qigong: { title: 'Morning qigong', icon: 'wind', line: 'Five of the Eight Brocades, framed by standing practice.', minutes: 8 },
    form: { title: 'Form practice', icon: 'bamboo', line: 'Only tai chi: the moves you know, plus the one you are learning.', minutes: 10 },
    full24: { title: 'The whole 24-step form', icon: 'leaf', line: 'All twenty-four movements in order, start to finish.', minutes: 10 },
    move: { title: 'One move', icon: 'eye' },
    custom: { title: 'Your own session', icon: 'sliders' }
  };
  function stepsFor(list) {
    return list.filter(function (s) { return TC.MOVE[s[0]]; }).map(function (s) {
      var id = s[0], L = TC.moveLength(id), secs = s[1], off = s[2] || 0;
      var reps = Math.max(1, Math.round(secs / L));
      if (s[3]) return { id: id, secs: Math.round(s[3]), offset: off, label: s[4] || '' };
      return { id: id, secs: Math.round(reps * L), offset: off, label: s[4] || '' };
    });
  }
  /* compose(kind, arg, progress) -> {kind, title, steps:[{id, secs, offset, label}], secs} */
  TC.compose = function (kind, arg, progress) {
    progress = progress || {};
    var K = TC.KINDS[kind] ? kind : 'morning', list = [], title = TC.KINDS[K].title;
    if (K === 'morning') {
      var m = [7, 15, 25].indexOf(+arg) >= 0 ? +arg : 15;
      title = 'Morning flow · ' + m + ' min';
      var head = [['wuji', 40]];
      var warm = m >= 15 ? [['neck', 35], ['shoulders', 30], ['waist', 45], ['hips', 30], ['tapping', 50]] : [['neck', 30], ['waist', 35]];
      var qi = m >= 25 ? [['heavens', 50], ['archer', 55], ['separate', 45], ['owl', 40], ['bounce', 25]] : m >= 15 ? [['heavens', 45], ['separate', 40]] : [];
      var lymph = m >= 15 ? [['lbreath', 35], ['collarbone', 30], ['neck-sides', 30], ['ears', 25], ['armpits', 45], ['arm-sweeps', 50], ['belly', 40], ['groin', 30], ['thighs', 35]]
        : [['lbreath', 30], ['collarbone', 25], ['neck-sides', 25], ['armpits', 35], ['belly', 30], ['groin', 25]];
      var close = m >= 15 ? [['holdtree', 50], ['warm-hands', 25]] : [['warm-hands', 20]];
      var used = stepsFor(head.concat(warm, qi, lymph, close)).reduce(function (s, x) { return s + x.secs; }, 0);
      var budget = Math.max(60, m * 60 - used), form = [];
      var nx = TC.nextMove(progress) || 'commence';
      var known = TC.learned(progress).filter(function (id) { return id !== nx; });
      var newSecs = Math.min(budget * .55, Math.max(60, TC.moveLength(nx) * 2));
      budget -= newSecs;
      known.slice(-6).forEach(function (id) { if (budget >= 40) { form.push([id, 40]); budget -= Math.max(40, TC.moveLength(id)); } });
      form.push([nx, newSecs, 0, null, 'new']);
      list = head.concat(warm, qi, lymph, form, close);
    } else if (K === 'lymph') {
      list = [['lbreath', 45], ['collarbone', 40], ['neck-sides', 40], ['ears', 30], ['face', 30], ['armpits', 60], ['arm-sweeps', 60], ['belly', 50], ['groin', 40], ['thighs', 50], ['lbreath', 40]];
    } else if (K === 'qigong') {
      list = [['wuji', 40], ['heavens', 70], ['archer', 70], ['separate', 60], ['owl', 50], ['bounce', 30], ['holdtree', 60], ['warm-hands', 25]];
    } else if (K === 'form') {
      var nx2 = TC.nextMove(progress) || 'closing', kn = TC.learned(progress);
      var ids = kn.length ? kn : TC.PATH.slice(0, 2);
      list = [['wuji', 30], ['commence', 30]];
      ids.forEach(function (id) { if (id !== 'commence' && id !== 'closing') list.push([id, 50]); });
      if (ids.indexOf(nx2) < 0) list.push([nx2, 90, 0, null, 'new']);
      list.push(['closing', 30]);
    } else if (K === 'full24') {
      list = [['wuji', 30]].concat(TC.FORM24.map(function (f) {
        var L = TC.moveLength(f[3]);
        if (f[4] === 0) return [f[3], L, 0, L, f[0] + '. ' + f[1]];
        return [f[3], L / 2, f[4] === 2 ? L / 2 : 0, L / 2, f[0] + '. ' + f[1]];
      }));
    } else if (K === 'move') {
      var mv = TC.MOVE[arg] ? arg : 'commence';
      title = TC.MOVE[mv].name;
      list = [['wuji', 25], [mv, 180]];
    } else if (K === 'custom') {
      var picks = String(arg || '').split(',').filter(function (id) { return TC.MOVE[id]; }).slice(0, 30);
      if (!picks.length) picks = ['wuji', 'commence', 'closing'];
      list = picks.map(function (id) { return [id, Math.max(45, TC.MOVE[id].secs)]; });
    }
    var steps = stepsFor(list);
    return { kind: K, arg: arg || '', title: title, steps: steps, secs: steps.reduce(function (s, x) { return s + x.secs; }, 0) };
  };

  /* ---------------------------------------------------------------- feelings + morning thoughts */
  TC.FEELS = [[1, 'Heavy'], [2, 'Tired'], [3, 'Okay'], [4, 'Good'], [5, 'Bright']];
  TC.feelName = function (n) { var f = TC.FEELS.filter(function (x) { return x[0] === n; })[0]; return f ? f[1] : ''; };
  TC.THOUGHTS = [
    ["A journey of a thousand miles begins beneath your feet.", "Lao Tzu, Tao Te Ching 64"],
    ["Nothing in the world is softer than water, yet nothing is better at overcoming the hard.", "after Lao Tzu, Tao Te Ching 78"],
    ["Stand like a mountain, move like a river.", "a tai chi saying"],
    ["The bamboo bends in the storm and is still standing in the morning.", "a bamboo proverb"],
    ["Be still, and the muddy water clears by itself.", "after Lao Tzu, Tao Te Ching 15"],
    ["The supple bends; the stiff breaks.", "after Lao Tzu, Tao Te Ching 76"],
    ["Seek stillness in movement.", "动中求静, from the tai chi classics"],
    ["Sink the shoulders, drop the elbows.", "沉肩坠肘, from the tai chi classics"],
    ["When one part moves, every part moves.", "from the tai chi classics"],
    ["Use the mind, not force.", "用意不用力, Yang Chengfu"],
    ["The tallest bamboo spends years growing its roots before it shows a single shoot.", "a gardener's saying"],
    ["A tree as wide as a hug grows from a tiny sprout.", "after Lao Tzu, Tao Te Ching 64"],
    ["Knowing others is wisdom; knowing yourself is light.", "after Lao Tzu, Tao Te Ching 33"],
    ["Water does not compete, and so nothing can compete with it.", "after Lao Tzu, Tao Te Ching 8"],
    ["The best time to plant bamboo was ten years ago. The next best time is this morning.", "a proverb, slightly bent"],
    ["Step like a cat walking on thin ice.", "a tai chi teaching"],
    ["Root in the feet, turn from the waist, express through the fingers.", "after the tai chi classics"],
    ["Empty space is what makes the bowl useful.", "after Lao Tzu, Tao Te Ching 11"],
    ["Slow is smooth, and smooth becomes effortless.", "a practice saying"],
    ["Breathe in the morning; breathe out the night.", "a morning saying"],
    ["Each morning we are born again. What we do today matters most.", "attributed to the Buddha"]
  ];
  TC.thought = function (d) {
    d = d || new Date();
    var n = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
    return TC.THOUGHTS[n % TC.THOUGHTS.length];
  };

  /* ---------------------------------------------------------------- local (guest) storage */
  TC.local = {
    sessions: function () { return UI.store.get('guest.sessions', []) || []; },
    add: function (s) { var a = TC.local.sessions(); a.push(s); UI.store.set('guest.sessions', a.slice(-300)); },
    clear: function () { UI.store.set('guest.sessions', []); },
    progress: function () {
      var p = {};
      TC.local.sessions().forEach(function (s) { (s.moves || []).forEach(function (id) { p[id] = (p[id] || 0) + 1; }); });
      return p;
    },
    prefs: function () { return UI.store.get('prefs', {}) || {}; },
    setPrefs: function (p) { UI.store.set('prefs', p); }
  };
  /* Streaks from a list of 'YYYY-MM-DD' days. */
  TC.streaks = function (days, today) {
    var set = {}; days.forEach(function (d) { set[d] = 1; });
    function prev(d) { var t = new Date(d + 'T12:00:00'); t.setDate(t.getDate() - 1); return TC.today(t); }
    today = today || TC.today();
    var cur = 0, d = set[today] ? today : prev(today);
    while (set[d]) { cur++; d = prev(d); }
    var best = 0, sorted = Object.keys(set).sort(), run = 0, last = null;
    sorted.forEach(function (x) { run = last && prev(x) === last ? run + 1 : 1; best = Math.max(best, run); last = x; });
    return { current: cur, best: best, days: sorted.length };
  };
})();

/* ===== _state.html ===== */
(function () {
  'use strict';
  var TC = window.TC;
  TC.PREF_DEFAULTS = { minutes: 15, time: '07:00', voice: true, bell: true, wind: false, mirror: false, trails: true, circle: false };
  TC.prefs = function () {
    var p = {}, k, l = TC.local.prefs();
    for (k in TC.PREF_DEFAULTS) p[k] = TC.PREF_DEFAULTS[k];
    for (k in l) p[k] = l[k];
    return p;
  };
  /* Change preferences: always kept in this browser, and saved to the account when signed in. */
  TC.setPrefs = function (part) {
    var p = TC.prefs();
    for (var k in part) p[k] = part[k];
    TC.local.setPrefs(p);
    if (UI.me) return UI.apiQuiet('save_prefs', part).then(function (r) { TC.local.setPrefs(r.prefs); return r.prefs; });
    return Promise.resolve(p);
  };
  TC.rememberServerPrefs = function (p) { if (p) TC.local.setPrefs(p); };
  /* Move progress {id: sessions}: from the account, or from this browser for guests. */
  TC.progress = function () {
    if (!UI.me) return Promise.resolve(TC.local.progress());
    return UI.apiQuiet('get_progress').then(function (r) { TC.rememberServerPrefs(r.prefs); return r.progress; });
  };
  /* After signing up or in: move sessions done as a guest into the account. */
  TC.importGuest = function () {
    var list = TC.local.sessions();
    if (!UI.me || !list.length) return Promise.resolve(0);
    return UI.apiQuiet('import_guest_sessions', list).then(function (r) {
      TC.local.clear();
      if (r.added) UI.toast(UI.plural(r.added, 'earlier session') + ' moved into your journal', 'ok');
      return r.added;
    });
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

  /* The five feelings, as a row of buttons. */
  TC.feelPicker = function (name, value) {
    return '<div class="tc-feel" role="radiogroup" data-feel="' + name + '">' + TC.FEELS.map(function (f) {
      return '<button type="button" role="radio" aria-checked="' + (value === f[0]) + '" data-v="' + f[0] + '" class="' + (value === f[0] ? 'on' : '') + '">' +
        '<i style="opacity:' + (.25 + f[0] * .15) + '"></i>' + f[1] + '</button>';
    }).join('') + '</div>';
  };
  TC.wireFeel = function (root, onPick) {
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-feel] button');
      if (!b) return;
      var box = b.parentNode, v = +b.getAttribute('data-v'), was = b.classList.contains('on');
      Array.prototype.forEach.call(box.children, function (x) { x.classList.remove('on'); x.setAttribute('aria-checked', 'false'); });
      if (!was) { b.classList.add('on'); b.setAttribute('aria-checked', 'true'); }
      onPick(box.getAttribute('data-feel'), was ? null : v);
    });
  };
  TC.catLabel = function (cat) { var c = TC.CATS[cat] || {}; return '<span class="tc-cat">' + UI.icon(c.icon) + UI.esc(c.short || '') + '</span>'; };
  TC.dayName = function (iso, opts) { return UI.fmtDate(iso, opts || { weekday: 'long', day: 'numeric', month: 'long' }); };
})();

/* ===== admin.html ===== */
(function () {
  var esc = UI.esc;
  var TABS = [['overview', 'Overview', 'grid'], ['practice', 'Practice', 'bamboo'], ['feedback', 'Feedback', 'inbox'], ['users', 'Users', 'users'], ['demo', 'Demo data', 'database']];

  UI.page('admin', { title: 'Admin', auth: 'admin' }, function (view, ctx) {
    var tab = TABS.some(function (t) { return t[0] === ctx.args[0]; }) ? ctx.args[0] : 'overview';
    var fbFilter = 'new';
    view.innerHTML = '<div class="ui-wrap"><div class="ui-page-head"><div><h1>Admin</h1><p class="muted">Only admins see this page.</p></div></div>' +
      '<nav class="ui-tabs">' + TABS.map(function (t) {
        return '<a href="#admin/' + t[0] + '" class="' + (t[0] === tab ? 'on' : '') + '">' + UI.icon(t[2]) + t[1] + '</a>';
      }).join('') + '</nav><div data-body><div class="ui-skel"></div></div></div>';
    var body = view.querySelector('[data-body]');

    function overview() {
      return UI.api('admin_overview').then(function (d) {
        var stat = function (n, label, go) { return '<a class="ui-card ui-stat" href="#admin/' + go + '" style="text-decoration:none;color:inherit"><b>' + n + '</b><span>' + label + '</span></a>'; };
        body.innerHTML = '<div class="ad-stats">' + stat(d.users, 'people signed up', 'users') + stat(d.admins, UI.plural(d.admins, 'admin').replace(/^\d+ /, ''), 'users') +
          stat(d.feedback_new, 'new feedback', 'feedback') + stat(d.sessions, 'sessions logged', 'practice') + '</div>' +
          '<p class="muted small" style="margin-top:18px">Demo data is <b>' + esc(d.demo.state) + '</b> (' + d.demo.counts.users + ' demo people). Manage it in the Demo data tab.</p>';
      });
    }

    function feedback() {
      return UI.api('list_feedback', null).then(function (d) {
        var items = d.items.filter(function (i) { return fbFilter === 'all' || i.status === fbFilter; });
        body.innerHTML = '<div class="ui-row" style="margin-bottom:16px"><div class="ui-seg">' + [['new', 'New'], ['read', 'Read'], ['done', 'Done'], ['all', 'All']].map(function (f) {
          var n = f[0] === 'all' ? d.items.length : d.counts[f[0]];
          return '<button data-filter="' + f[0] + '" class="' + (fbFilter === f[0] ? 'on' : '') + '">' + f[1] + ' (' + n + ')</button>';
        }).join('') + '</div></div>' +
          (items.length ? '<div class="ad-fb">' + items.map(function (i) {
            var c = i.context || {};
            return '<div class="ui-item" data-id="' + esc(i.id) + '"><div class="meta"><span class="ui-badge ' + (i.kind === 'bug' ? 'bad' : i.kind === 'idea' ? 'brand' : '') + '">' + esc(i.kind_label) + '</span>' +
              '<b>' + esc(i.name) + '</b>' + (i.email ? '<a href="mailto:' + esc(i.email) + '">' + esc(i.email) + '</a>' : '') + '<span>' + esc(UI.fmtDateTime(i.created)) + '</span></div>' +
              '<p class="msg">' + esc(i.message) + '</p>' +
              '<div class="ctx">' + esc([c.page, c.screen, c.theme, c.browser].filter(Boolean).join(' · ')) + '</div>' +
              '<textarea data-note placeholder="Private note (only admins see it)">' + esc(i.note) + '</textarea>' +
              '<div class="ui-row" style="margin-top:10px">' + ['new', 'read', 'done'].map(function (s) {
                return '<button class="ui-btn sm' + (i.status === s ? ' primary' : '') + '" data-status="' + s + '">' + s[0].toUpperCase() + s.slice(1) + '</button>';
              }).join('') + '<span class="ui-spacer"></span><button class="ui-btn sm danger" data-del-fb>' + UI.icon('trash') + 'Delete</button></div></div>';
          }).join('') + '</div>'
            : '<div class="ui-empty">' + UI.icon('inbox') + '<h3>No ' + (fbFilter === 'all' ? '' : fbFilter + ' ') + 'messages</h3><p>Messages from the "Send feedback" form show up here.</p></div>');
      });
    }

    function users(query) {
      return UI.api('list_users', query || null).then(function (d) {
        body.innerHTML = '<form class="ui-row" data-search style="margin-bottom:14px"><input type="search" name="q" placeholder="Search by name or email" value="' + esc(query || '') + '" style="max-width:360px">' +
          '<button class="ui-btn" type="submit">' + UI.icon('search') + 'Search</button><span class="muted small">' + UI.plural(d.total, 'person', 'people') + '</span></form>' +
          '<table class="ad-users"><thead><tr><th>Name</th><th>Email</th><th>Joined</th><th>Admin</th><th>Active</th></tr></thead><tbody>' +
          d.users.map(function (u) {
            return '<tr data-id="' + esc(u.id) + '"><td><b>' + esc(u.name) + '</b></td><td class="email">' + esc(u.email) + '</td><td class="joined muted">' + esc(UI.fmtDate(u.joined)) + '</td>' +
              '<td><label class="ui-check"><input type="checkbox" data-admin' + (u.is_admin ? ' checked' : '') + '> Admin</label></td>' +
              '<td><label class="ui-check"><input type="checkbox" data-enabled' + (u.enabled ? ' checked' : '') + '> Active</label></td></tr>';
          }).join('') + '</tbody></table>';
      });
    }

    function demo() {
      return UI.api('admin_overview').then(function (d) {
        var c = d.demo.counts;
        body.innerHTML = '<div class="ui-card ui-narrow" style="margin:0"><h3>Demo data</h3>' +
          '<p class="muted">Example people and content, so the app never looks empty for the first visitors. Demo rows are flagged, so removing them never touches real data. Once removed, it stays removed until you load it again.</p>' +
          '<p>Status: <b>' + esc(d.demo.state) + '</b> · ' + Object.keys(c).map(function (k) { return c[k] + ' ' + esc(k); }).join(', ') + '</p>' +
          '<div class="ui-row"><button class="ui-btn primary" data-demo="load">' + UI.icon('refresh') + (d.demo.state === 'loaded' ? 'Reload demo data' : 'Load demo data') + '</button>' +
          '<button class="ui-btn danger" data-demo="remove">' + UI.icon('trash') + 'Remove demo data</button></div></div>';
      });
    }

    function practice() {
      return UI.api('admin_practice_stats').then(function (d) {
        var stat = function (n, label) { return '<div class="ui-card ui-stat"><b>' + esc(n) + '</b><span>' + esc(label) + '</span></div>'; };
        var kindName = function (k) { return (TC.KINDS[k] || { title: k }).title; };
        body.innerHTML = '<div class="ad-stats">' + stat(d.today, 'sessions in the last 24 hours') + stat(d.week, 'sessions this week') +
          stat(d.people_week, 'people practising this week') + stat(d.minutes_week, 'minutes this week') +
          stat(d.lift == null ? '-' : (d.lift > 0 ? '+' : '') + d.lift, 'average mood lift') + stat(d.real + ' / ' + d.total, 'real sessions / all (incl. demo)') + '</div>' +
          '<div class="ui-grid two" style="margin-top:16px"><div class="ui-card"><h3>Most practised moves</h3><table class="ad-users"><tbody>' +
          d.top_moves.map(function (m) { return '<tr><td>' + esc((TC.MOVE[m[0]] || { name: m[0] }).name) + '</td><td style="text-align:right"><b>' + m[1] + '</b></td></tr>'; }).join('') +
          '</tbody></table></div><div class="ui-card"><h3>Kinds of session</h3><table class="ad-users"><tbody>' +
          d.kinds.map(function (k) { return '<tr><td>' + esc(kindName(k[0])) + '</td><td style="text-align:right"><b>' + k[1] + '</b></td></tr>'; }).join('') +
          '</tbody></table><h3 style="margin-top:18px">Last 14 days</h3><div class="ad-days">' +
          d.per_day.map(function (x) { return '<span title="' + esc(x[0]) + '"><small>' + esc(UI.fmtDate(x[0], { day: 'numeric', month: 'short' })) + '</small><b>' + x[1] + '</b></span>'; }).join('') +
          '</div><p class="small muted" style="margin:12px 0 0">' + d.guest_imports + ' sessions were done before signing up and moved into accounts.</p></div></div>';
      });
    }

    var DRAW = { overview: overview, practice: practice, feedback: feedback, users: users, demo: demo };

    view.addEventListener('click', function (e) {
      var f = e.target.closest('[data-filter]');
      if (f) { fbFilter = f.getAttribute('data-filter'); feedback(); return; }
      var st = e.target.closest('[data-status]');
      if (st) {
        var card = st.closest('[data-id]');
        UI.api('set_feedback_status', card.getAttribute('data-id'), st.getAttribute('data-status'), card.querySelector('[data-note]').value).then(function () { UI.toast('Saved', 'ok'); feedback(); });
        return;
      }
      var del = e.target.closest('[data-del-fb]');
      if (del) {
        UI.confirm({ title: 'Delete this message?', ok: 'Delete', danger: true }).then(function (yes) {
          if (yes) UI.api('delete_feedback', del.closest('[data-id]').getAttribute('data-id')).then(feedback);
        });
        return;
      }
      var dm = e.target.closest('[data-demo]');
      if (dm) {
        var load = dm.getAttribute('data-demo') === 'load';
        UI.confirm({ title: load ? 'Load the demo data?' : 'Remove the demo data?', text: load ? 'Demo people and content are added (any old demo rows are replaced).' : 'Every demo row is deleted. Real data stays.', ok: load ? 'Load' : 'Remove', danger: !load })
          .then(function (yes) { if (yes) UI.busy(dm, UI.api(load ? 'demo_load' : 'demo_remove')).then(function () { UI.toast('Done', 'ok'); demo(); }); });
      }
    });
    view.addEventListener('change', function (e) {
      var row = e.target.closest('tr[data-id]');
      if (!row) return;
      var id = row.getAttribute('data-id'), box = e.target;
      var fn = box.hasAttribute('data-admin') ? 'set_admin' : box.hasAttribute('data-enabled') ? 'set_enabled' : null;
      if (fn) UI.api(fn, id, box.checked).then(function () { UI.toast('Saved', 'ok'); }, function (err) { box.checked = !box.checked; UI.toast(err.message, 'error'); });
    });
    view.addEventListener('submit', function (e) {
      if (e.target.matches('[data-search]')) { e.preventDefault(); users(UI.formData(e.target).q); }
    });
    return DRAW[tab]();
  });
})();

/* ===== auth.html ===== */
(function () {
  var esc = UI.esc;
  function pw(name, auto) {
    return '<div class="au-pw"><input type="password" name="' + name + '" autocomplete="' + auto + '" required minlength="8">' +
      '<button type="button" data-show>Show</button></div>';
  }
  UI.page('auth', { title: 'Sign in', auth: 'guest' }, function (view, ctx) {
    var mode = ['signup', 'reset'].indexOf(ctx.args[0]) >= 0 ? ctx.args[0] : 'login';
    function draw(msg, isErr) {
      var heading = { login: 'Welcome back', signup: 'Create your account', reset: 'Reset your password' }[mode];
      var sub = { login: 'Sign in to continue to ' + esc(UI.config.name) + '.', signup: 'It\'s free and takes a few seconds.',
        reset: 'We\'ll email you a link to choose a new password.' }[mode];
      view.innerHTML = '<div class="au-wrap"><div class="ui-card au-card">' +
        '<h1>' + heading + '</h1><p class="muted">' + sub + '</p>' +
        (mode !== 'reset' ? '<div class="ui-seg" role="tablist"><button type="button" data-mode="login" class="' + (mode === 'login' ? 'on' : '') + '">Sign in</button>' +
          '<button type="button" data-mode="signup" class="' + (mode === 'signup' ? 'on' : '') + '">Create account</button></div>' : '<div style="height:14px"></div>') +
        '<form class="ui-stack" data-form="' + mode + '" novalidate>' +
        (mode === 'signup' ? '<label class="ui-field"><span>Your name</span><input type="text" name="name" autocomplete="name" required maxlength="60"></label>' : '') +
        '<label class="ui-field"><span>Email</span><input type="email" name="email" autocomplete="email" required></label>' +
        (mode === 'login' ? '<label class="ui-field"><span>Password</span>' + pw('password', 'current-password') + '</label>' : '') +
        (mode === 'signup' ? '<label class="ui-field"><span>Password <em>(at least 8 characters)</em></span>' + pw('password', 'new-password') + '</label>' +
          (window.LegalKit ? '<div>' + LegalKit.consentField() + '</div>' : '') : '') +
        '<div data-msg role="alert"' + (msg ? ' class="' + (isErr ? 'ui-error' : 'ui-note') + '">' + esc(msg) : ' hidden>') + '</div>' +
        '<button class="ui-btn primary block" type="submit">' + { login: 'Sign in', signup: 'Create account', reset: 'Send the link' }[mode] + '</button></form>' +
        '<div class="au-links">' + (mode === 'login' ? '<a data-mode="reset">Forgot your password?</a>' : '<a data-mode="login">' + UI.icon('back') + ' Back to sign in</a>') +
        '<a href="#landing" data-go="landing">About ' + esc(UI.config.name) + '</a></div></div></div>';
      var first = view.querySelector('input');
      if (first && !msg) first.focus();
    }
    view.addEventListener('click', function (e) {
      var m = e.target.closest('[data-mode]');
      if (m) { e.preventDefault(); mode = m.getAttribute('data-mode'); history.replaceState(null, '', '#auth' + (mode === 'login' ? '' : '/' + mode)); draw(); return; }
      var s = e.target.closest('[data-show]');
      if (s) { var i = s.parentNode.querySelector('input'); i.type = i.type === 'password' ? 'text' : 'password'; s.textContent = i.type === 'password' ? 'Show' : 'Hide'; }
    });
    view.addEventListener('submit', function (e) {
      e.preventDefault();
      var form = e.target, v = UI.formData(form);
      var problem = !/^\S+@\S+\.\S+$/.test(v.email || '') ? 'Please enter a valid email address.'
        : mode !== 'reset' && (v.password || '').length < (mode === 'signup' ? 8 : 1) ? (mode === 'signup' ? 'Please choose a password of at least 8 characters.' : 'Please enter your password.')
        : mode === 'signup' && (v.name || '').trim().length < 2 ? 'Please tell us your name.' : null;
      if (problem) { say(problem, true); return; }
      if (mode === 'signup' && window.LegalKit && !LegalKit.consentChecked(form)) return;  // the kit shows its own message
      UI.busy(form.querySelector('[type=submit]'), UI.auth(mode, v)).then(function (r) {
        if (mode === 'reset' || (r && !r.me)) { mode = 'login'; draw(r && r.message, false); restore({ email: v.email }); }
        else UI.toast(mode === 'signup' ? 'Welcome to ' + UI.config.name + '!' : 'Welcome back!', 'ok');
      }, function (err) { say(err.message, true); });
    });
    function say(msg, isErr) {
      var box = view.querySelector('[data-msg]');
      box.className = isErr ? 'ui-error' : 'ui-note'; box.textContent = msg; box.hidden = false;
    }
    function restore(v) {
      ['name', 'email'].forEach(function (k) { var i = view.querySelector('[name=' + k + ']'); if (i && v[k]) i.value = v[k]; });
    }
    draw();
  });
})();

/* ===== home.html ===== */
(function () {
  var esc = UI.esc;
  function lift(n) { return n == null ? '–' : (n > 0 ? '+' : '') + n; }
  UI.page('home', { title: 'Today', nav: 'Today', icon: 'sunrise', auth: 'user', order: 10 }, function (view, ctx) {
    var fig = null, len = 15;
    view.innerHTML = '<div class="ui-wrap"><div class="ui-skel" style="height:300px"></div><div class="ui-skel" style="height:120px;margin-top:16px"></div></div>';
    function draw(d) {
      TC.rememberServerPrefs(d.prefs);
      var st = d.stats, p = d.prefs, nx = TC.nextMove(d.progress), th = TC.thought(), first = ctx.me.name.split(' ')[0];
      len = p.minutes || 15;
      var week = [], now = new Date(), dow = (now.getDay() + 6) % 7;
      for (var i = 0; i < 7; i++) {
        var dd = new Date(now); dd.setDate(now.getDate() - dow + i);
        var key = TC.today(dd);
        week.push('<div class="' + (st.days.indexOf(key) >= 0 ? 'on ' : '') + (i === dow ? 'today' : '') + '"><i>' + (st.days.indexOf(key) >= 0 ? UI.icon('check') : dd.getDate()) + '</i>' +
          dd.toLocaleDateString(undefined, { weekday: 'short' }) + '</div>');
      }
      var c = d.circle, others = Math.max(0, c.count - c.names.length);
      view.innerHTML = '<div class="ui-wrap">' +
        '<section class="ui-card td-hero"><div class="txt"><div class="eyebrow" style="margin:0">' + esc(TC.dayName(TC.today())) + '</div>' +
        '<h1>' + esc(TC.greeting()) + ', ' + esc(first) + '</h1><q>' + esc(th[0]) + '</q>' +
        (st.practiced_today ? '<span class="td-done">' + UI.icon('check') + 'You practised this morning</span>' : '') +
        '<div class="ui-row"><div class="ui-seg" role="group" aria-label="Length">' + [7, 15, 25].map(function (m) {
          return '<button type="button" data-len="' + m + '" class="' + (len === m ? 'on' : '') + '">' + m + ' min</button>';
        }).join('') + '</div></div>' +
        '<div class="ui-row"><a class="ui-btn primary lg" href="#session/morning/' + len + '" data-start>' + UI.icon('play') + (st.practiced_today ? 'Practise again' : 'Begin morning flow') + '</a>' +
        '<a class="ui-btn ghost" href="#practice" data-go="practice">Other sessions</a></div></div>' +
        '<div class="fig"><div class="tc-stage">' + TC.stage({ seed: 21, sunX: 290 }) + '<svg data-fig></svg></div></div></section>' +
        '<div class="td-stats">' +
        '<div class="ui-card tight td-stat"><span class="ic fire">' + UI.icon('flame') + '</span><div><b>' + st.streak + '</b><span>day streak · best ' + st.best + '</span></div></div>' +
        '<div class="ui-card tight td-stat"><span class="ic">' + UI.icon('bamboo') + '</span><div><b>' + st.sessions + '</b><span>sessions</span></div></div>' +
        '<div class="ui-card tight td-stat"><span class="ic">' + UI.icon('clock') + '</span><div><b>' + st.minutes + '</b><span>minutes in the forest</span></div></div>' +
        '<div class="ui-card tight td-stat"><span class="ic">' + UI.icon('sunrise') + '</span><div><b>' + lift(st.lift) + '</b><span>mood lift per session</span></div></div></div>' +
        '<div class="td-cols"><div class="ui-stack">' +
        '<div class="ui-card"><div class="ui-row between"><h3 style="margin:0">Your grove</h3><span class="small muted">The last 4 weeks, one stalk per morning</span></div>' + TC.grove(st.days, 28) +
        (st.sessions ? '' : '<p class="muted small" style="margin:8px 0 0">Empty ground, for now. Your first morning plants the first shoot.</p>') + '</div>' +
        '<div class="ui-card"><h3 style="margin:0">This week</h3><div class="td-week">' + week.join('') + '</div></div>' +
        (d.recent.length ? '<div class="ui-card"><div class="ui-row between"><h3 style="margin:0">Recent sessions</h3><a href="#journal" data-go="journal" class="small">Journal</a></div><div class="td-recent" style="margin-top:12px">' +
          d.recent.slice(0, 3).map(function (s) {
            return '<a href="#journal" data-go="journal">' + UI.icon(TC.KINDS[s.kind] ? TC.KINDS[s.kind].icon : 'leaf') + '<span class="grow"><b>' + esc(s.title || 'Practice') + '</b><br><small>' +
              esc(TC.dayName(s.day, { weekday: 'short', day: 'numeric', month: 'short' })) + ' · ' + Math.round(s.minutes) + ' min' +
              (s.feel_before && s.feel_after ? ' · ' + esc(TC.feelName(s.feel_before)) + ' → ' + esc(TC.feelName(s.feel_after)) : '') + '</small></span></a>';
          }).join('') + '</div></div>' : '') +
        '</div><div class="ui-stack">' +
        (nx ? '<div class="ui-card"><div class="eyebrow">Next on your path</div><div class="td-next">' + TC.thumbHtml(nx, 6) + '<div><h3 style="margin:0 0 4px">' + esc(TC.MOVE[nx].name) + '</h3>' +
          '<div class="small muted zh" style="margin-bottom:8px">' + esc(TC.MOVE[nx].zh || '') + ' · ' + esc(TC.MOVE[nx].py || '') + '</div>' +
          '<div class="small muted">' + Math.min(d.progress[nx] || 0, TC.LEARNED_AT) + ' of ' + TC.LEARNED_AT + ' sessions · stage ' + esc(TC.stageOf(d.progress).name) + '</div>' +
          '<a class="ui-btn sm" style="margin-top:10px" href="#move/' + nx + '" data-go="move/' + nx + '">' + UI.icon('eye') + 'Watch it</a></div></div></div>'
          : '<div class="ui-card"><div class="eyebrow">Your path</div><h3>All 24 steps learned</h3><p class="muted">The grove is complete. Flow through the whole form.</p><a class="ui-btn primary sm" href="#session/full24" data-go="session/full24">The whole form</a></div>') +
        '<div class="ui-card"><div class="eyebrow">The morning circle</div><div class="td-circle">' +
        (c.names.length ? '<div class="td-faces">' + c.names.slice(0, 5).map(function (n) { return '<span>' + esc(n[0]) + '</span>'; }).join('') + '</div>' : '') +
        '<p style="margin:0">' + (c.count ? (c.names.length ? esc(c.names.slice(0, 3).join(', ')) + (others ? ' and ' + UI.plural(others, 'other') : '') : UI.plural(c.count, 'person', 'people')) +
          ' practised in the last 24 hours. ' + c.minutes + ' quiet minutes together.' : 'Be the first to practise this morning.') + '</p></div>' +
        '<p class="small muted" style="margin:10px 0 0">' + (p.circle ? 'Your first name shows here when you practise.' : 'You practise anonymously.') + ' <a href="#profile" data-go="profile">Change</a></p></div>' +
        '<div class="ui-card"><div class="eyebrow">Morning reminder</div><p style="margin:0 0 10px">Add a daily ' + esc(p.time) + ' event to your phone\'s calendar. It reminds you; we never message you.</p>' +
        '<div class="ui-row"><button class="ui-btn sm" data-ics>' + UI.icon('download') + 'Add to my calendar</button><a class="small" href="#profile" data-go="profile">Change the time</a></div></div>' +
        '</div></div></div>';
      fig = new TC.Figure(view.querySelector('[data-fig]'), { trails: p.trails, label: 'The teacher in the bamboo forest' });
      fig.setKeys(TC.moveKeys(st.practiced_today ? 'holdtree' : (nx || 'clouds'))).play();
      TC.drawThumbs(view);
    }
    view.addEventListener('click', function (e) {
      var b = e.target.closest('[data-len]');
      if (b) {
        len = +b.getAttribute('data-len');
        Array.prototype.forEach.call(view.querySelectorAll('[data-len]'), function (x) { x.classList.toggle('on', x === b); });
        view.querySelector('[data-start]').setAttribute('href', '#session/morning/' + len);
        TC.setPrefs({ minutes: len });
        return;
      }
      if (e.target.closest('[data-start]')) { e.preventDefault(); UI.go('session', 'morning', len); return; }
      if (e.target.closest('[data-ics]')) { var pr = TC.prefs(); TC.downloadReminder(pr.time, pr.minutes); UI.toast('Open the downloaded file to add the daily reminder', 'ok'); }
    });
    function load() { return UI.api('get_today', TC.today()).then(draw); }
    return {
      ready: TC.importGuest().then(load, load),
      destroy: function () { if (fig) fig.stop(); }
    };
  });
})();

/* ===== journal.html ===== */
(function () {
  var esc = UI.esc;
  UI.page('journal', { title: 'Journal', nav: 'Journal', icon: 'calendar', auth: 'user', order: 40 }, function (view, ctx) {
    var data = null, month = new Date(); month.setDate(1);
    view.innerHTML = '<div class="ui-wrap"><div class="ui-skel" style="height:260px"></div></div>';
    function cal() {
      var counts = {};
      data.sessions.forEach(function (s) { counts[s.day] = (counts[s.day] || 0) + 1; });
      var y = month.getFullYear(), mo = month.getMonth(), first = (new Date(y, mo, 1).getDay() + 6) % 7, n = new Date(y, mo + 1, 0).getDate(), today = TC.today();
      var cells = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(function (d) { return '<div class="dow">' + d + '</div>'; });
      for (var i = 0; i < first; i++) cells.push('<div class="d empty"></div>');
      for (var d = 1; d <= n; d++) {
        var key = TC.today(new Date(y, mo, d)), c = counts[key] || 0;
        cells.push('<div class="d' + (c ? ' on' : '') + (c > 1 ? ' many' : '') + (key === today ? ' today' : '') + '" title="' + (c ? UI.plural(c, 'session') : '') + '">' + d + '</div>');
      }
      var monthDays = Object.keys(counts).filter(function (k) { return k.slice(0, 7) === TC.today(month).slice(0, 7); }).length;
      return '<div class="jn-cal-head"><button class="ui-btn ghost icon" data-mo="-1" aria-label="Previous month">' + UI.icon('back') + '</button><div style="text-align:center"><b>' +
        esc(month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })) + '</b><div class="small muted">' + UI.plural(monthDays, 'morning') + '</div></div>' +
        '<button class="ui-btn ghost icon" data-mo="1" aria-label="Next month">' + UI.icon('arrow') + '</button></div><div class="jn-cal">' + cells.join('') + '</div>';
    }
    function item(s) {
      var d = new Date(s.day + 'T12:00:00');
      return '<article class="ui-card tight jn-item" data-id="' + esc(s.id) + '"><div class="jn-date"><b>' + d.getDate() + '</b><span>' + esc(d.toLocaleDateString(undefined, { weekday: 'short' })) + '</span></div>' +
        '<div><h3>' + esc(s.title || 'Practice') + '</h3><div class="small muted">' + UI.icon('clock') + ' ' + (Math.round(s.minutes * 10) / 10) + ' min · ' + UI.plural(s.moves.length, 'move') +
        ' · ' + esc(new Date(s.created).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })) + '</div>' +
        (s.feel_before || s.feel_after ? '<div class="jn-feel" style="margin-top:6px">' + (s.feel_before ? '<span class="ui-badge">' + esc(TC.feelName(s.feel_before)) + '</span>' : '') +
          (s.feel_before && s.feel_after ? UI.icon('arrow') : '') + (s.feel_after ? '<span class="ui-badge good">' + esc(TC.feelName(s.feel_after)) + '</span>' : '') + '</div>' : '') +
        (s.note ? '<p class="jn-note">' + esc(s.note) + '</p>' : '') + '</div>' +
        '<div class="ui-row acts"><button class="ui-btn ghost icon" data-edit aria-label="Edit the note">' + UI.icon('edit') + '</button><button class="ui-btn ghost icon" data-del aria-label="Delete">' + UI.icon('trash') + '</button></div></article>';
    }
    function draw() {
      var st = data.stats, groups = [], cur = null;
      data.sessions.forEach(function (s) {
        var k = s.day.slice(0, 7);
        if (!cur || cur.k !== k) { cur = { k: k, items: [] }; groups.push(cur); }
        cur.items.push(s);
      });
      view.innerHTML = '<div class="ui-wrap"><div class="ui-page-head"><div><h1>Your journal</h1><p class="muted">Every morning you\'ve given yourself, and how it felt.</p></div>' +
        '<a class="ui-btn primary" href="#practice" data-go="practice">' + UI.icon('play') + 'Practise</a></div>' +
        '<div class="jn-top"><div class="jn-stats">' +
        [[st.streak, 'day streak'], [st.best, 'best streak'], [st.sessions, 'sessions'], [st.minutes, 'minutes'], [st.days.length, 'mornings'],
          [st.lift == null ? '–' : (st.lift > 0 ? '+' : '') + st.lift, 'average mood lift']].map(function (x) {
          return '<div class="ui-card tight ui-stat"><b>' + x[0] + '</b><span>' + x[1] + '</span></div>';
        }).join('') + '</div><div class="ui-card" data-cal>' + cal() + '</div></div>' +
        (groups.length ? groups.map(function (g) {
          return '<h2 class="jn-month">' + esc(new Date(g.k + '-15T12:00:00').toLocaleDateString(undefined, { month: 'long', year: 'numeric' })) + '</h2><div class="jn-list">' + g.items.map(item).join('') + '</div>';
        }).join('') : '<div class="ui-empty" style="margin-top:24px">' + UI.icon('bamboo') + '<h3>Your journal is waiting</h3><p>Finish a session and it appears here, with how you felt before and after.</p>' +
          '<a class="ui-btn primary" href="#session/morning/15" data-go="session/morning/15">Begin a morning flow</a></div>') + '</div>';
    }
    function edit(s) {
      var feel = s.feel_after;
      var m = UI.modal('<h2>' + esc(s.title || 'Practice') + '</h2><p class="muted">' + esc(TC.dayName(s.day)) + '</p><form class="ui-stack" data-ed>' +
        '<div><b>How did you feel after?</b><div style="margin-top:8px">' + TC.feelPicker('after', feel) + '</div></div>' +
        '<label class="ui-field"><span>Note</span><textarea name="note" maxlength="1000">' + esc(s.note) + '</textarea></label>' +
        '<div class="ui-row end"><button type="button" class="ui-btn ghost" data-close>Cancel</button><button class="ui-btn primary" type="submit">Save</button></div></form>');
      TC.wireFeel(m.el, function (n, v) { feel = v; });
      m.el.querySelector('[data-ed]').addEventListener('submit', function (e) {
        e.preventDefault();
        UI.busy(e.target.querySelector('[type=submit]'), UI.api('update_session', s.id, e.target.note.value, feel)).then(function (r) {
          var i = data.sessions.indexOf(s); data.sessions[i] = r.session; m.close(); draw(); UI.toast('Saved', 'ok');
        });
      });
    }
    view.addEventListener('click', function (e) {
      var mo = e.target.closest('[data-mo]');
      if (mo) { month.setMonth(month.getMonth() + +mo.getAttribute('data-mo')); view.querySelector('[data-cal]').innerHTML = cal(); return; }
      var card = e.target.closest('[data-id]');
      if (!card) return;
      var s = data.sessions.filter(function (x) { return x.id === card.getAttribute('data-id'); })[0];
      if (e.target.closest('[data-edit]')) edit(s);
      if (e.target.closest('[data-del]')) {
        UI.confirm({ title: 'Delete this session?', text: 'It leaves your journal, your streak and your progress on the path.', ok: 'Delete', danger: true }).then(function (yes) {
          if (yes) UI.api('delete_session', s.id).then(load);
        });
      }
    });
    function load() { return UI.api('list_sessions', TC.today()).then(function (d) { data = d; draw(); }); }
    return load();
  });
})();

/* ===== landing.html ===== */
(function () {
  var COPY = {
    eyebrow: 'Morning tai chi · 7 to 25 minutes',
    title: 'Tai chi, <em>please</em>.<br>Every morning, among the bamboo.',
    lead: 'A gentle guided practice for the start of your day. Wake the body, help your lymph flow with a feather-light self-massage, and learn the 24-step tai chi form one move at a time, following a teacher you can watch from any angle.',
    cta: 'Begin 7 minutes now',
    proof: ['No sign-up to try', 'Free, no ads', 'Phone, tablet or computer'],
    flowTitle: 'A morning in the forest',
    flowLead: 'Every morning flow follows the same gentle arc. You choose 7, 15 or 25 minutes.',
    flow: [['sunrise', 'Arrive', 'Standing still, breathing'], ['wind', 'Wake up', 'Neck, shoulders, waist, qigong'], ['drop', 'Flow', 'Lymph self-massage, neck to legs'],
           ['bamboo', 'Learn', 'Your next tai chi move'], ['lotus', 'Stillness', 'Hugging the tree, warm palms']],
    stepsTitle: 'How it works',
    steps: [['Press begin', 'No account, no setup. Your teacher guides each step with a calm voice, a soft bell and a breathing orb.'],
            ['Move with the teacher', 'Watch from the front, the side or as a mirror. Slow it down. The instructions light up as the teacher performs them.'],
            ['Grow your grove', 'Every morning adds a bamboo stalk. Every few sessions, a new move of the 24-step form joins your practice.']],
    featuresTitle: 'Everything for a good morning',
    features: [['bamboo', 'The 24-step form, step by step', 'The most practised tai chi form in the world, in six stages from Seed to Grove. A new move when you are ready for it.'],
               ['drop', 'Lymph self-massage', 'Collarbones, neck, armpits, belly, hip creases: the gentle sequence that helps lymph flow, in the right order and with the right feather-light touch.'],
               ['wind', 'Morning qigong', 'Five pieces of the Eight Brocades, the 800-year-old morning set for posture, breath and calm.'],
               ['eye', 'A teacher you can walk around', 'Drag to see any move from the side or from behind, mirror it, slow it to half speed, follow the hand trails.'],
               ['calendar', 'A journal that notices', 'How you felt before and after, your notes, streaks and a calendar of your mornings.'],
               ['sunrise', 'Made for mornings', 'A daily calendar reminder, forest sound, spoken cues you can switch off, and a screen that stays awake.']],
    faq: [['Do I need an account?', 'No. Press Begin and practise. Your sessions are kept on this device; create a free account whenever you want your journal, streak and path on every device, and they come with you.'],
          ['I have never done tai chi. Is this for me?', 'Yes. Start with the 7-minute morning flow. Every move is shown slowly, from any angle, with each step explained, and you learn one new move only when the last one feels familiar.'],
          ['What is lymphatic self-massage? Is it safe?', 'Light, slow strokes that stretch the skin toward the lymph nodes, helping fluid move back toward the heart. For most people it is gentle and safe. If you have an infection, a blood clot, heart failure, kidney disease, cancer or lymphedema, ask your doctor first. It is a wellness practice, not a treatment.'],
          ['How much space do I need?', 'About two steps in every direction. A bedroom, a balcony, a quiet corner of a park.'],
          ['Is it free?', 'Yes. No ads, no subscriptions.'],
          ['Who can see my practice?', 'Only you. Others see how many people practised this morning, and your first name only if you choose to join the morning circle.']],
    bandTitle: 'Tomorrow at seven?',
    bandLead: 'Or right now. The bamboo is waiting.'
  };
  var CYCLE = ['clouds', 'horse-mane', 'crane', 'heel-kick', 'single-whip', 'snake-rooster'];

  UI.page('landing', { title: 'Morning tai chi in the bamboo forest' }, function (view, ctx) {
    var me = ctx.me, C = COPY, esc = UI.esc, figs = [], timer = 0;
    var primary = me ? '<a class="ui-btn primary lg" href="#home" data-go="home">Open today ' + UI.icon('arrow') + '</a>'
      : '<a class="ui-btn primary lg" href="#session/morning/7" data-go="session/morning/7">' + UI.icon('play') + esc(C.cta) + '</a>' +
        '<a class="ui-btn lg" href="#auth/signup" data-go="auth/signup">Create a free account</a>';
    view.innerHTML =
      '<section class="lp-hero"><div class="ui-wrap"><div>' +
        '<div class="eyebrow">' + esc(C.eyebrow) + '</div><h1>' + C.title + '</h1><p class="lp-lead">' + esc(C.lead) + '</p>' +
        '<div class="lp-cta">' + primary + '</div>' +
        '<div class="lp-proof">' + C.proof.map(function (p) { return '<span>' + UI.icon('check') + esc(p) + '</span>'; }).join('') + '</div>' +
      '</div><div class="tc-stage lp-art">' + TC.stage({ seed: 7, sunX: 290 }) + '<svg data-hero></svg>' +
        '<div class="cap" data-cap></div><span class="ui-badge good circle" data-circle hidden></span></div></div></section>' +
      '<section class="lp-section"><div class="ui-wrap"><div class="lp-head"><h2>' + esc(C.flowTitle) + '</h2><p>' + esc(C.flowLead) + '</p></div>' +
        '<div class="lp-flow">' + C.flow.map(function (f) { return '<div><span class="ic">' + UI.icon(f[0]) + '</span><span><b>' + esc(f[1]) + '</b><small>' + esc(f[2]) + '</small></span></div>'; }).join('') + '</div></div></section>' +
      '<section class="lp-section" id="how"><div class="ui-wrap"><div class="lp-head"><h2>' + esc(C.stepsTitle) + '</h2></div>' +
        '<div class="lp-steps">' + C.steps.map(function (s) { return '<div class="ui-card lp-step"><h3>' + esc(s[0]) + '</h3><p class="muted">' + esc(s[1]) + '</p></div>'; }).join('') + '</div></div></section>' +
      '<section class="lp-section"><div class="ui-wrap"><div class="lp-head"><h2>' + esc(C.featuresTitle) + '</h2></div>' +
        '<div class="ui-grid">' + C.features.map(function (f) { return '<div class="ui-card lp-feature">' + UI.icon(f[0]) + '<h3>' + esc(f[1]) + '</h3><p>' + esc(f[2]) + '</p></div>'; }).join('') + '</div></div></section>' +
      '<section class="lp-section"><div class="ui-wrap lp-lymph"><div class="tc-stage">' + TC.stage({ seed: 13, sunX: 110 }) + '<svg data-lymph></svg></div><div>' +
        '<div class="eyebrow">Don\'t forget the lymph</div><h2>A second circulation, with no pump of its own</h2>' +
        '<p class="muted">Your lymph system carries fluid, waste and immune cells back toward the heart. It moves with breathing, movement and gentle pressure, which makes a slow morning practice its natural friend. Every morning flow includes the classic self-massage sequence:</p>' +
        '<ol><li>Deep belly breathing</li><li>The hollows above the collarbones</li><li>The sides of the neck and around the ears</li><li>The armpits, then the arms</li><li>Slow circles on the belly</li><li>The hip creases, then the thighs and the backs of the knees</li></ol>' +
        '<a class="ui-btn" href="#learn/lymph" data-go="learn/lymph">' + UI.icon('drop') + 'Read the lymph guide</a></div></div></section>' +
      '<section class="lp-section"><div class="ui-wrap"><div class="lp-head"><h2>Questions</h2></div><div class="lp-faq">' +
        C.faq.map(function (q) { return '<details><summary>' + esc(q[0]) + '</summary><p>' + esc(q[1]) + '</p></details>'; }).join('') + '</div></div></section>' +
      '<section class="lp-section"><div class="ui-wrap"><div class="lp-band"><svg class="deco" viewBox="0 0 64 64" aria-hidden="true"><path d="M20 62V4M36 62V12M50 62V22" stroke="currentColor" stroke-width="6" stroke-linecap="round"/></svg>' +
        '<div><h2>' + esc(C.bandTitle) + '</h2><p>' + esc(C.bandLead) + '</p></div>' +
        (me ? '<a class="ui-btn lg" href="#practice" data-go="practice">Practise now</a>' : '<a class="ui-btn lg" href="#session/morning/7" data-go="session/morning/7">' + UI.icon('play') + esc(C.cta) + '</a>') +
      '</div></div></section>';

    var hero = new TC.Figure(view.querySelector('[data-hero]'), { trails: true, label: 'A tai chi teacher moving through the form among bamboo' });
    var lymph = new TC.Figure(view.querySelector('[data-lymph]'), { trails: false, yaw: 15, label: 'The teacher showing the neck massage' });
    figs = [hero, lymph];
    var ci = 0;
    function show() {
      var id = CYCLE[ci % CYCLE.length], m = TC.MOVE[id];
      hero.setKeys(TC.moveKeys(id)).play();
      view.querySelector('[data-cap]').innerHTML = '<span class="tc-seal">' + esc(m.zh.slice(0, 1)) + '</span><span><b>' + esc(m.name) + '</b><small>' + esc(m.zh + ' · ' + m.py) + '</small></span>';
      clearTimeout(timer);
      timer = setTimeout(function () { ci++; show(); }, Math.max(8000, TC.moveLength(id) * 1000));
    }
    show();
    lymph.setKeys(TC.moveKeys('neck-sides')).play();
    UI.apiQuiet('get_circle').then(function (c) {
      var b = view.querySelector('[data-circle]');
      if (b && c.count) { b.hidden = false; b.innerHTML = UI.icon('users') + UI.plural(c.count, 'person', 'people') + ' practised today'; }
    }, function () {});
    return { ready: Promise.resolve(), destroy: function () { clearTimeout(timer); figs.forEach(function (f) { f.stop(); }); } };
  });
})();

/* ===== learn.html ===== */
(function () {
  var esc = UI.esc;
  var TABS = [['path', 'Your path', 'bamboo'], ['moves', 'All moves', 'grid'], ['form', 'The 24 steps', 'leaf'], ['lymph', 'Lymph guide', 'drop']];

  function dots(n) {
    var out = '';
    for (var i = 0; i < TC.LEARNED_AT; i++) out += '<i class="' + (i < n ? 'on' : '') + '"></i>';
    return '<span class="ln-dots" title="' + Math.min(n, TC.LEARNED_AT) + ' of ' + TC.LEARNED_AT + ' sessions">' + out + '</span>';
  }
  function moveCard(id, progress, opts) {
    opts = opts || {};
    var m = TC.MOVE[id], n = progress[id] || 0, st = TC.status(id, progress);
    return '<a class="ln-move' + (opts.next ? ' next' : '') + (opts.locked ? ' locked' : '') + '" href="#move/' + esc(id) + '" data-go="move/' + esc(id) + '">' + TC.thumbHtml(id, 3 + id.length) +
      '<b>' + esc(m.name) + '</b>' + (m.zh ? '<span class="zh">' + esc(m.zh) + ' · ' + esc(m.py) + '</span>' : '') +
      '<span class="ui-row between">' + (m.cat === 'form' ? dots(n) : TC.catLabel(m.cat)) +
      (opts.next ? '<span class="ui-badge warn">' + UI.icon('sparkle') + 'Next</span>' : st === 'learned' ? '<span class="ui-badge good">' + UI.icon('check') + 'Learned</span>' : opts.locked ? '<span class="ui-badge">' + UI.icon('lock') + 'Later</span>' : '') +
      '</span></a>';
  }

  function pathTab(progress) {
    var nx = TC.nextMove(progress), seenNext = false, learned = TC.learned(progress).length;
    return '<p class="muted" style="max-width:44em">The 24-step form, grown one move at a time. Each morning flow teaches the next move on your path; a move counts as learned after ' +
      TC.LEARNED_AT + ' sessions with it. You can open any move at any time.</p>' +
      '<div class="ui-row" style="margin:12px 0 24px"><span class="ui-badge good">' + UI.icon('check') + learned + ' of ' + TC.PATH.length + ' learned</span>' +
      (nx ? '<a class="ui-btn primary sm" href="#session/move/' + nx + '" data-go="session/move/' + nx + '">' + UI.icon('play') + 'Practise ' + esc(TC.MOVE[nx].name) + '</a>' : '<span class="ui-badge brand">The whole form is yours</span>') + '</div>' +
      '<div class="ln-stages">' + TC.STAGES.map(function (s) {
        var all = s.moves.every(function (id) { return TC.status(id, progress) === 'learned'; });
        var hasNext = s.moves.indexOf(nx) >= 0;
        var cls = all ? 'done' : hasNext ? 'now' : 'todo';
        var html = '<section class="ln-stage ' + cls + '"><div class="rail"><span class="tc-seal">' + s.zh + '</span></div><div><h3 style="margin:0">' + esc(s.name) +
          (all ? ' <span class="ui-badge good">' + UI.icon('check') + 'Grown</span>' : hasNext ? ' <span class="ui-badge warn">Growing now</span>' : '') + '</h3>' +
          '<p class="muted" style="margin:2px 0 0">' + esc(s.line) + '</p><div class="ln-moves">' + s.moves.map(function (id) {
            var isNext = id === nx, locked = seenNext && !isNext && TC.status(id, progress) === 'new';
            if (isNext) seenNext = true;
            return moveCard(id, progress, { next: isNext, locked: locked });
          }).join('') + '</div></div></section>';
        return html;
      }).join('') + '</div>';
  }
  function movesTab(progress) {
    return ['warm', 'qigong', 'lymph', 'form', 'cool'].map(function (c) {
      var C = TC.CATS[c];
      return '<section class="ln-cat"><h2 style="display:flex;gap:10px;align-items:center">' + UI.icon(C.icon) + esc(C.name) + '</h2><p class="muted">' + esc(C.blurb) + '</p>' +
        '<div class="ln-moves">' + TC.MOVES.filter(function (m) { return m.cat === c; }).map(function (m) { return moveCard(m.id, progress); }).join('') + '</div></section>';
    }).join('');
  }
  function formTab() {
    return '<p class="muted" style="max-width:44em">The simplified 24-step form was put together in Beijing in 1956 from the Yang family style, so that anyone could learn tai chi. Today it is practised by millions of people every morning. Done slowly, it takes five to seven minutes.</p>' +
      '<div class="ui-row" style="margin:12px 0 18px"><a class="ui-btn primary" href="#session/full24" data-go="session/full24">' + UI.icon('play') + 'Flow through all 24</a></div>' +
      '<ol class="ln-form">' + TC.FORM24.map(function (f) {
        return '<li><a href="#move/' + f[3] + '" data-go="move/' + f[3] + '"><span class="n">' + f[0] + '</span><span><b>' + esc(f[1]) + '</b><br><span class="zh">' + esc(f[2]) + '</span></span>' + UI.icon('arrow') + '</a></li>';
      }).join('') + '</ol>';
  }
  var MAP = [['collarbone', 'Above the collarbones', 'lsh', 'rsh', .3], ['neck-sides', 'Sides of the neck', 'neck', null, 0], ['ears', 'Around the ears', 'head', null, 0],
    ['armpits', 'Armpits', 'lsh', 'rsh', -.25], ['belly', 'Belly', 'pel', 'chest', .25], ['groin', 'Hip creases', 'lhp', 'rhp', 0], ['thighs', 'Thighs and behind the knees', 'lkn', 'rkn', 0]];
  function lymphTab() {
    return '<div class="ly-grid"><div class="tc-stage ly-map" data-lymap>' + TC.stage({ seed: 9 }) + '<svg data-lyfig></svg><svg class="dots" data-dots></svg></div>' +
      '<div class="ui-stack"><h2 style="margin:0">The lymph, gently</h2>' +
      '<p class="muted">The lymph system is a second circulation: a web of thin vessels just under the skin that carries fluid, waste and immune cells back toward the heart, through hundreds of small filters, the lymph nodes. Unlike blood, it has no pump of its own. It moves with your breathing, your muscles and gentle pressure on the skin. That makes a slow morning of breathing, movement and light massage its natural friend.</p>' +
      '<h3>The order matters</h3><p class="muted" style="margin-top:-4px">Clear the drains closest to the heart first, then send fluid toward them, working outward.</p><ol class="ly-order">' +
      MAP.map(function (m) { return '<li><span><a href="#move/' + m[0] + '" data-go="move/' + m[0] + '">' + esc(m[1]) + '</a>, ' + esc((TC.MOVE[m[0]].about || '').split('. ')[0].replace(/\.$/, '')) + '.</span></li>'; }).join('') +
      '</ol><div class="ui-row"><a class="ui-btn primary" href="#session/lymph" data-go="session/lymph">' + UI.icon('play') + 'Lymph flow, 9 minutes</a></div></div></div>' +
      '<h2 style="margin-top:34px">Four rules</h2><div class="ly-rules">' +
      [['hands', 'Feather-light', 'About the weight of a coin. The vessels lie just under the skin: you stretch the skin, you don\'t knead the muscle.'],
        ['arrow', 'Toward the nodes', 'Every stroke moves toward the nearest cleared node, and in the end toward the collarbones.'],
        ['clock', 'Slow and rhythmic', 'About one second to stretch, one to release. Ten times in each place is plenty.'],
        ['drop', 'Breathe, then drink', 'Begin and end with deep belly breaths. A glass of water afterwards is a nice habit.']].map(function (r) {
        return '<div class="ui-card"><h4>' + UI.icon(r[0]) + esc(r[1]) + '</h4><p>' + esc(r[2]) + '</p></div>';
      }).join('') + '</div>' +
      '<div class="ui-card ly-warn" style="margin-top:18px"><h3 style="margin:0">' + UI.icon('info') + ' Check with your doctor first if you have</h3><ul>' +
      ['an infection, a fever, or red, hot or painful swelling (such as cellulitis)', 'a blood clot (deep vein thrombosis) or a history of clots', 'heart failure, or serious kidney or liver disease',
        'cancer, or you are being treated for it, or you have had lymph nodes removed', 'lymphedema: a certified lymphedema therapist can teach you a routine made for you', 'a pregnancy (skip the belly circles), or recent surgery'].map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') +
      '</ul><p class="small muted" style="margin:10px 0 0">Tai Chi Please offers gentle wellness practice, not diagnosis or treatment. Stop if anything hurts, and see a professional for persistent swelling.</p></div>';
  }
  function drawLymphMap(view) {
    var host = view.querySelector('[data-lymap]');
    if (!host) return null;
    var f = new TC.Figure(host.querySelector('[data-lyfig]'), { trails: false, yaw: 0, pitch: 4, label: 'A body map of the lymph massage points' });
    f.setPose({ lf: [13, 0, 0, 4, 0], rf: [-13, 0, 0, -4, 0], sink: 3, lh: [30, -50, 6], rh: [-30, -50, 6] });
    function place() {
      var P = f.drawNow(), sz = f.size(), out = '';
      if (!P) return;
      MAP.forEach(function (m, i) {
        var pts = [];
        var a = P[m[2]], b = m[3] ? P[m[3]] : null;
        if (m[0] === 'collarbone') pts = [[(P.chest[0] * .6 + a[0] * .4), P.chest[1] + 4 * sz.scale], [(P.chest[0] * .6 + b[0] * .4), P.chest[1] + 4 * sz.scale]];
        else if (m[0] === 'armpits') pts = [[a[0] - (a[0] > P.chest[0] ? 1 : -1) * 3 * sz.scale, a[1] + 14 * sz.scale], [b[0] - (b[0] > P.chest[0] ? 1 : -1) * 3 * sz.scale, b[1] + 14 * sz.scale]];
        else if (m[0] === 'neck-sides') pts = [[a[0] - 6 * sz.scale, a[1] - 5 * sz.scale], [a[0] + 6 * sz.scale, a[1] - 5 * sz.scale]];
        else if (m[0] === 'ears') pts = [[a[0] - 11 * sz.scale, a[1]], [a[0] + 11 * sz.scale, a[1]]];
        else if (m[0] === 'belly') pts = [[a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25]];
        else if (m[0] === 'groin') pts = [[a[0], a[1] + 6 * sz.scale], [b[0], b[1] + 6 * sz.scale]];
        else pts = [[a[0], a[1]], [b[0], b[1]]];
        pts.forEach(function (p, j) {
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
  }

  UI.page('learn', { title: 'Learn', nav: 'Learn', icon: 'book', order: 30 }, function (view, ctx) {
    var tab = TABS.some(function (t) { return t[0] === ctx.args[0]; }) ? ctx.args[0] : 'path', map = null;
    view.innerHTML = '<div class="ui-wrap"><div class="ui-page-head"><div><h1>Learn</h1><p class="muted">Tai chi, qigong and lymph self-massage, one gentle move at a time.</p></div></div>' +
      '<nav class="ui-tabs">' + TABS.map(function (t) {
        return '<a href="#learn/' + t[0] + '" class="' + (t[0] === tab ? 'on' : '') + '">' + UI.icon(t[2]) + t[1] + '</a>';
      }).join('') + '</nav><div data-body><div class="ui-skel" style="height:300px"></div></div></div>';
    var body = view.querySelector('[data-body]');
    return {
      ready: TC.progress().then(function (progress) {
        body.innerHTML = tab === 'path' ? pathTab(progress) : tab === 'moves' ? movesTab(progress) : tab === 'form' ? formTab() : lymphTab();
        TC.drawThumbs(body);
        if (tab === 'lymph') map = drawLymphMap(view);
      }),
      destroy: function () { if (map) map.stop(); }
    };
  });
})();

/* ===== move.html ===== */
(function () {
  var esc = UI.esc;
  var VIEWS = [[28, '3/4'], [0, 'Front'], [90, 'Side'], [180, 'Back']];
  UI.page('move', { title: function (a) { return (TC.MOVE[a[0]] || {}).name || 'Move'; } }, function (view, ctx) {
    var id = TC.MOVE[ctx.args[0]] ? ctx.args[0] : 'commence', m = TC.MOVE[id], fig = null, speed = 1, prefs = TC.prefs();
    var same = TC.MOVES.filter(function (x) { return x.cat === m.cat; }), i = same.indexOf(m), prev = same[i - 1], next = same[i + 1];
    function draw(progress) {
      var n = progress[id] || 0, st = TC.status(id, progress), loop = TC.moveLength(id);
      view.innerHTML = '<div class="ui-wrap"><a class="ui-btn ghost sm" href="#learn/' + (m.cat === 'form' ? 'path' : m.cat === 'lymph' ? 'lymph' : 'moves') + '" data-go="learn/' + (m.cat === 'form' ? 'path' : m.cat === 'lymph' ? 'lymph' : 'moves') + '">' + UI.icon('back') + 'Learn</a>' +
        '<div class="mv-grid" style="margin-top:12px"><div class="tc-stage mv-stage">' + TC.stage({ seed: 2 + id.length }) + '<svg data-fig></svg>' +
        '<span class="mv-breath ui-badge" data-breath>' + UI.icon('wind') + 'Breathe naturally</span><span class="mv-hint">Drag to look around</span>' +
        '<div class="mv-bar"><button class="ui-btn primary icon" data-play aria-label="Pause">' + UI.icon('pause') + '</button>' +
        '<div class="ui-seg" role="group" aria-label="View">' + VIEWS.map(function (v, j) { return '<button type="button" data-view="' + j + '" class="' + (j ? '' : 'on') + '">' + v[1] + '</button>'; }).join('') + '</div>' +
        '<button class="ui-btn sm" data-speed aria-label="Speed">1×</button>' +
        '<button class="ui-btn ghost icon' + (prefs.mirror ? ' ss-tog on' : '') + '" data-mirror aria-label="Mirror">' + UI.icon('mirror') + '</button>' +
        '<button class="ui-btn ghost icon' + (prefs.trails ? ' ss-tog on' : '') + '" data-trails aria-label="Hand trails">' + UI.icon('trail') + '</button></div></div>' +
        '<div class="ui-stack"><div class="mv-head">' + TC.catLabel(m.cat) + '<h1>' + esc(m.name) + '</h1>' +
        (m.zh ? '<div class="mv-zh"><span class="zh">' + esc(m.zh) + '</span>' + esc(m.py) + '</div>' : '') + '</div>' +
        '<div class="ui-row">' + (m.form ? m.form.map(function (f) { return '<span class="ui-badge">Form step ' + f + '</span>'; }).join('') : '') +
        (m.both ? '<span class="ui-badge">Left and right</span>' : '') + '<span class="ui-badge">' + UI.icon('clock') + Math.round(loop) + ' s per round</span>' +
        (m.cat === 'form' ? (st === 'learned' ? '<span class="ui-badge good">' + UI.icon('check') + 'Learned</span>' : n ? '<span class="ui-badge warn">Learning · ' + n + ' of ' + TC.LEARNED_AT + '</span>' : '') : '') + '</div>' +
        '<p>' + esc(m.about) + '</p>' +
        '<ol class="mv-steps" data-steps>' + m.steps.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ol>' +
        (m.tip ? '<div class="ss-tip">' + UI.icon('leaf') + '<span>' + esc(m.tip) + '</span></div>' : '') +
        '<div class="ui-row"><a class="ui-btn primary" href="#session/move/' + id + '" data-go="session/move/' + id + '">' + UI.icon('play') + 'Practise it, 3 minutes</a>' +
        (m.cat === 'lymph' ? '<a class="ui-btn" href="#session/lymph" data-go="session/lymph">The full lymph flow</a>' : '') + '</div>' +
        '<div class="mv-nav">' + (prev ? '<a href="#move/' + prev.id + '" data-go="move/' + prev.id + '"><small>Previous</small><b>' + esc(prev.name) + '</b></a>' : '<span></span>') +
        (next ? '<a class="nx" href="#move/' + next.id + '" data-go="move/' + next.id + '"><small>Next</small><b>' + esc(next.name) + '</b></a>' : '') + '</div></div></div></div>';
      fig = new TC.Figure(view.querySelector('[data-fig]'), { trails: prefs.trails, mirror: prefs.mirror, onKey: onKey, label: 'The teacher demonstrating ' + m.name });
      fig.setKeys(TC.moveKeys(id)).play();
    }
    var lastS = -1;
    function onKey(key) {
      var list = view.querySelectorAll('[data-steps] li');
      if (key.s >= 0 && key.s !== lastS) {
        Array.prototype.forEach.call(list, function (li, j) { li.classList.toggle('on', j === key.s); });
        lastS = key.s;
      }
      var b = view.querySelector('[data-breath]');
      if (b) b.innerHTML = UI.icon('wind') + (key.b === 'in' ? 'Breathe in' : key.b === 'out' ? 'Breathe out' : 'Breathe naturally') + (key.mir ? ' · other side' : '');
    }
    view.addEventListener('click', function (e) {
      if (!fig) return;
      var t = e.target;
      if (t.closest('[data-play]')) { fig.toggle(); t.closest('[data-play]').innerHTML = UI.icon(fig.playing() ? 'pause' : 'play'); t.closest('[data-play]').setAttribute('aria-label', fig.playing() ? 'Pause' : 'Play'); return; }
      var v = t.closest('[data-view]');
      if (v) {
        var j = +v.getAttribute('data-view');
        fig.view(VIEWS[j][0], j === 1 ? 6 : 11);
        Array.prototype.forEach.call(view.querySelectorAll('[data-view]'), function (x) { x.classList.toggle('on', x === v); });
        return;
      }
      if (t.closest('[data-speed]')) { speed = speed === 1 ? .5 : speed === .5 ? .75 : 1; fig.speed(speed); t.closest('[data-speed]').textContent = speed + '×'; return; }
      if (t.closest('[data-mirror]')) { var mm = fig.mirror(!fig.mirror()); t.closest('[data-mirror]').classList.toggle('on', mm); t.closest('[data-mirror]').classList.toggle('ss-tog', true); TC.setPrefs({ mirror: mm }); return; }
      if (t.closest('[data-trails]')) { var tr = fig.trails(!fig.trails()); t.closest('[data-trails]').classList.toggle('on', tr); t.closest('[data-trails]').classList.toggle('ss-tog', true); TC.setPrefs({ trails: tr }); }
    });
    return {
      ready: TC.progress().then(draw),
      destroy: function () { if (fig) fig.stop(); }
    };
  });
})();

/* ===== practice.html ===== */
(function () {
  var esc = UI.esc;
  UI.page('practice', { title: 'Practice', nav: 'Practice', icon: 'play', order: 20 }, function (view, ctx) {
    var prefs = TC.prefs(), len = prefs.minutes || 15, fig = null;
    view.innerHTML = '<div class="ui-wrap"><div class="ui-skel" style="height:300px"></div></div>';
    function card(href, icon, title, line, meta) {
      return '<a class="ui-card pr-card" href="#' + href + '" data-go="' + href + '"><div class="top"><span class="ic">' + UI.icon(icon) + '</span><div><h3>' + esc(title) + '</h3>' +
        '<span class="small muted">' + esc(meta) + '</span></div></div><p>' + esc(line) + '</p><span class="go">Start ' + UI.icon('arrow') + '</span></a>';
    }
    function draw(progress) {
      var nx = TC.nextMove(progress), th = TC.thought(), K = TC.KINDS, learned = TC.learned(progress).length;
      var nxName = nx ? TC.MOVE[nx].name : 'the whole form';
      view.innerHTML = '<div class="ui-wrap">' +
        '<section class="ui-card pr-hero"><div class="txt"><div class="eyebrow" style="margin:0">' + esc(TC.greeting()) + '</div>' +
        '<h1>Morning flow</h1><p class="muted" style="margin:0">Arrive, loosen up, help the lymph flow, learn your next tai chi move (<b>' + esc(nxName) + '</b>), and finish in stillness.</p>' +
        '<div class="pr-len" role="group" aria-label="Length"><span class="small muted">Length</span><div class="ui-seg">' + [7, 15, 25].map(function (m) {
          return '<button type="button" data-len="' + m + '" class="' + (len === m ? 'on' : '') + '">' + m + ' min</button>';
        }).join('') + '</div></div>' +
        '<div class="ui-row"><a class="ui-btn primary lg" href="#session/morning/' + len + '" data-start>' + UI.icon('play') + 'Begin</a>' +
        (UI.me ? '' : '<span class="small muted">No account needed.</span>') + '</div></div>' +
        '<div class="fig"><div class="tc-stage">' + TC.stage({ seed: 4, sunX: 250 }) + '<svg data-fig></svg></div></div></section>' +
        '<div class="pr-grid">' +
        card('session/lymph', K.lymph.icon, K.lymph.title, K.lymph.line, 'About ' + K.lymph.minutes + ' min · no experience needed') +
        card('session/qigong', K.qigong.icon, K.qigong.title, K.qigong.line, 'About ' + K.qigong.minutes + ' min · gentle') +
        card('session/form', K.form.icon, K.form.title, K.form.line, learned ? UI.plural(learned, 'move') + ' learned' : 'Start with the first moves') +
        card('session/full24', K.full24.icon, K.full24.title, K.full24.line, 'About ' + K.full24.minutes + ' min · for when you know it') +
        '<button type="button" class="ui-card pr-card" data-build style="text-align:left;font:inherit;cursor:pointer"><div class="top"><span class="ic">' + UI.icon('sliders') + '</span><div><h3>Build your own</h3>' +
        '<span class="small muted">Pick any moves</span></div></div><p>Choose exactly what you want this morning: a few warm-ups, just the lymph massage, one form move on repeat.</p><span class="go">Choose ' + UI.icon('arrow') + '</span></button>' +
        card('learn', 'book', 'Learn a move first', 'Watch any move from every angle, slow it down, mirror it, and read how it works.', TC.MOVES.length + ' moves to explore') +
        '</div>' +
        '<div class="ui-card pr-thought"><div class="eyebrow">This morning\'s thought</div><q>' + esc(th[0]) + '</q><span class="small muted">' + esc(th[1]) + '</span></div></div>';
      fig = new TC.Figure(view.querySelector('[data-fig]'), { trails: true, label: 'The teacher demonstrating ' + nxName });
      fig.setKeys(TC.moveKeys(nx || 'clouds')).play();
    }
    function build() {
      var cats = ['warm', 'qigong', 'lymph', 'form', 'cool'];
      var m = UI.modal('<h2>Build your own session</h2><p class="muted">Tick the moves you want, in any order you like; they play in the order shown. About a minute each.</p>' +
        '<form data-pick><div class="pr-pick">' + cats.map(function (c) {
          return '<fieldset><legend>' + TC.catLabel(c) + '</legend><div class="opts">' + TC.MOVES.filter(function (mv) { return mv.cat === c; }).map(function (mv) {
            return '<label><input type="checkbox" name="m" value="' + esc(mv.id) + '">' + esc(mv.name) + '</label>';
          }).join('') + '</div></fieldset>';
        }).join('') + '</div><div class="ui-row end" style="margin-top:16px"><span class="small muted" data-count>Nothing picked yet</span><span class="ui-spacer"></span>' +
        '<button type="button" class="ui-btn ghost" data-close>Cancel</button><button class="ui-btn primary" type="submit" disabled>' + UI.icon('play') + 'Start</button></div></form>', { wide: true });
      var f = m.el.querySelector('[data-pick]');
      f.addEventListener('change', function () {
        var n = f.querySelectorAll('input:checked').length;
        f.querySelector('[data-count]').textContent = n ? UI.plural(n, 'move') + ' · about ' + n + ' min' : 'Nothing picked yet';
        f.querySelector('[type=submit]').disabled = !n;
      });
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var ids = Array.prototype.map.call(f.querySelectorAll('input:checked'), function (i) { return i.value; });
        m.close(); UI.go('session', 'custom', ids.join(','));
      });
    }
    view.addEventListener('click', function (e) {
      var b = e.target.closest('[data-len]');
      if (b) {
        len = +b.getAttribute('data-len');
        Array.prototype.forEach.call(view.querySelectorAll('[data-len]'), function (x) { x.classList.toggle('on', x === b); });
        view.querySelector('[data-start]').setAttribute('href', '#session/morning/' + len);
        TC.setPrefs({ minutes: len });
        return;
      }
      if (e.target.closest('[data-start]')) { e.preventDefault(); UI.go('session', 'morning', len); return; }
      if (e.target.closest('[data-build]')) build();
    });
    return {
      ready: TC.progress().then(draw),
      destroy: function () { if (fig) fig.stop(); }
    };
  });
})();

/* ===== profile.html ===== */
(function () {
  var esc = UI.esc;
  UI.page('profile', { title: 'Your profile', auth: 'user' }, function (view, ctx) {
    var me = ctx.me;
    view.innerHTML = '<div class="ui-wrap ui-narrow"><div class="pf-head"><span class="ui-avatar">' + esc(UI.initials(me.name)) + '</span>' +
      '<div><h1>' + esc(me.name) + '</h1><div class="muted">' + esc(me.email) + (me.joined ? ' · member since ' + esc(UI.fmtDate(me.joined, { month: 'long', year: 'numeric' })) : '') + '</div></div></div>' +
      '<div class="pf-grid"><form class="ui-card ui-stack" data-name><h3>Your name</h3><label class="ui-field"><span>Shown to other people</span>' +
      '<input type="text" name="name" value="' + esc(me.name) + '" maxlength="60" required></label><button class="ui-btn primary" type="submit">Save</button></form>' +
      '<div class="ui-card ui-stack"><h3>Appearance</h3><p class="muted small">Follow your device, or pick one.</p><div data-theme-box></div>' +
      '<h3 style="margin-top:22px">Password</h3><p class="muted small">We\'ll email you a link to choose a new one.</p>' +
      '<button class="ui-btn" data-reset>' + UI.icon('mail') + 'Email me a reset link</button></div></div>' +
      '<div class="ui-card" style="margin-top:16px" data-practice><div class="ui-skel" style="min-height:160px"></div></div>' +
      '<div class="ui-card" style="margin-top:16px"><div class="pf-links">' +
      (me.is_admin ? '<a href="#admin" data-go="admin">' + UI.icon('shield') + 'Admin</a>' : '') +
      '<button data-feedback>' + UI.icon('chat') + 'Send feedback</button>' +
      '<button data-lk-open="overview">' + UI.icon('lock') + 'Privacy &amp; Terms, and your data</button>' +
      '<button data-signout-here>' + UI.icon('logout') + 'Sign out</button></div></div></div>';
    function themeBox() {
      var t = UI.theme();
      view.querySelector('[data-theme-box]').innerHTML = '<div class="ui-seg">' + [['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']].map(function (o) {
        return '<button type="button" data-theme-pick="' + o[0] + '" class="' + (t === o[0] ? 'on' : '') + '">' + o[1] + '</button>';
      }).join('') + '</div>';
    }
    themeBox();
    function practice(p) {
      var tog = function (k, icon, label, hint) {
        return '<label class="tc-toggle"><span>' + UI.icon(icon) + '<span>' + label + (hint ? '<br><small class="muted">' + hint + '</small>' : '') + '</span></span>' +
          '<input type="checkbox" data-pref="' + k + '"' + (p[k] ? ' checked' : '') + '></label>';
      };
      view.querySelector('[data-practice]').innerHTML = '<h3>Your practice</h3><div class="pf-grid"><div class="ui-stack">' +
        '<div><b>Morning flow length</b><div class="ui-seg" style="margin-top:8px">' + [7, 15, 25].map(function (m) {
          return '<button type="button" data-len="' + m + '" class="' + (p.minutes === m ? 'on' : '') + '">' + m + ' min</button>';
        }).join('') + '</div></div>' +
        '<label class="ui-field"><span>Morning time <em>(for the calendar reminder)</em></span><input type="time" data-time value="' + esc(p.time) + '" style="max-width:160px"></label>' +
        '<div><button class="ui-btn" type="button" data-ics>' + UI.icon('download') + 'Add a daily reminder to my calendar</button>' +
        '<p class="ui-hint">A calendar file with a daily ' + esc(p.time) + ' event. Your calendar reminds you; we never send messages.</p></div></div>' +
        '<div>' + tog('voice', 'volume', 'Spoken guidance') + tog('bell', 'bell', 'Bell between steps') + tog('wind', 'wind', 'Forest sound') +
        tog('mirror', 'mirror', 'Mirror the teacher', 'Move as if facing a mirror') + tog('trails', 'trail', 'Hand trails') +
        tog('circle', 'users', 'Show my first name in the morning circle', 'Otherwise you are counted anonymously') + '</div></div>';
    }
    TC.progress().then(function () { practice(TC.prefs()); });
    view.addEventListener('change', function (e) {
      var t = e.target;
      if (t.matches('[data-pref]')) { var o = {}; o[t.getAttribute('data-pref')] = t.checked; TC.setPrefs(o).then(function () { UI.toast('Saved', 'ok'); }); }
      if (t.matches('[data-time]') && /^\d\d:\d\d$/.test(t.value)) TC.setPrefs({ time: t.value }).then(function (p) { practice(p); UI.toast('Morning time saved', 'ok'); });
    });
    view.addEventListener('click', function (e) {
      var ln = e.target.closest('[data-len]');
      if (ln) { TC.setPrefs({ minutes: +ln.getAttribute('data-len') }).then(function (p) { practice(p); }); return; }
      if (e.target.closest('[data-ics]')) { var pr = TC.prefs(); TC.downloadReminder(pr.time, pr.minutes); UI.toast('Open the downloaded file to add the reminder', 'ok'); return; }
    });
    view.addEventListener('click', function (e) {
      var t = e.target.closest('[data-theme-pick]');
      if (t) { UI.setTheme(t.getAttribute('data-theme-pick')); themeBox(); UI.renderChrome(); return; }
      if (e.target.closest('[data-reset]')) {
        UI.busy(e.target.closest('[data-reset]'), UI.auth('reset', { email: me.email })).then(function (r) { UI.toast(r.message, 'ok'); });
      }
      if (e.target.closest('[data-signout-here]')) UI.auth('logout');
    });
    view.querySelector('[data-name]').addEventListener('submit', function (e) {
      e.preventDefault();
      var v = UI.formData(e.target);
      UI.busy(e.target.querySelector('[type=submit]'), UI.api('update_profile', v.name)).then(function (r) {
        UI.setMe(r.me); ctx.me = r.me; UI.toast('Saved', 'ok');
        view.querySelector('.pf-head h1').textContent = r.me.name;
      });
    });
  });
})();

/* ===== session.html ===== */
(function () {
  'use strict';
  var esc = UI.esc;
  UI.page('session', { title: 'Practice', chrome: false }, function (view, ctx) {
    var kind = ctx.args[0] || 'morning', arg = ctx.args[1] || '';
    var prefs = TC.prefs();
    if (kind === 'morning' && !arg) arg = String(prefs.minutes || 15);
    var S = null, fig = null, phase = 'intro', idx = 0, el = 0, playing = false, raf = 0, last = 0, speed = 1, yawI = 0;
    var feelBefore = null, feelAfter = null, done = [], stopWind = null, wake = null, logged = null, startedAt = null;
    var lastSay = 0, lastS = -1, segBreath = '', segUntil = 0, orbState = '', saved = null, destroyed = false;
    var VIEWS = [[28, 'three-quarter'], [0, 'front'], [90, 'side'], [180, 'back']];

    view.innerHTML = '<div class="ss"><div class="ss-top"><button class="ui-btn ghost icon" data-close aria-label="Close the session">' + UI.icon('x') + '</button>' +
      '<div class="ttl"><h1 data-title>Your practice</h1><div class="left" data-left></div></div>' +
      '<button class="ui-btn ghost icon" data-theme-flip aria-label="Morning or night colours">' + UI.icon(document.documentElement.classList.contains('ui-dark') ? 'sun' : 'moon') + '</button></div>' +
      '<div class="ss-bar" data-bar></div>' +
      '<div class="ss-body" data-body><div class="tc-stage ss-stage" data-stage>' + TC.stage({ seed: 11 }) + '<svg data-fig></svg>' +
      '<div class="ss-orb" data-orb hidden><i></i><span>Breathe</span></div><div class="ss-cap" data-cap></div><span class="ss-side-badge" data-sideb></span><span class="ss-mclock" data-mclock hidden></span></div>' +
      '<div class="ss-panel" data-panel><div class="ui-skel" style="height:300px"></div></div></div>' +
      '<div class="ss-ctl" data-ctl></div></div>';
    var $ = function (s) { return view.querySelector(s); };
    fig = new TC.Figure($('[data-fig]'), { trails: prefs.trails, mirror: prefs.mirror, onKey: onKey, label: 'Your teacher, showing the current movement' });
    fig.setKeys(TC.moveKeys('wuji')).play();

    function step() { return S.steps[idx]; }
    function move() { return TC.MOVE[step().id]; }
    function total() { return S.steps.reduce(function (s, x) { return s + x.secs; }, 0); }
    function practised() { return done.reduce(function (s, x) { return s + (x || 0); }, 0); }
    function left() { var t = 0; for (var i = idx; i < S.steps.length; i++) t += S.steps[i].secs - (i === idx ? el : 0); return t; }

    /* ---------------------------------------------------------------- intro */
    function drawIntro() {
      $('[data-title]').textContent = S.title;
      $('[data-left]').textContent = 'About ' + Math.max(1, Math.round(S.secs / 60)) + ' min · ' + UI.plural(S.steps.length, 'step');
      drawBar();
      var groups = [], cur = null;
      S.steps.forEach(function (s) {
        var c = TC.MOVE[s.id].cat;
        if (!cur || cur.cat !== c) { cur = { cat: c, items: [] }; groups.push(cur); }
        cur.items.push(s);
      });
      var tog = function (k, icon, label) {
        return '<label class="tc-toggle"><span>' + UI.icon(icon) + label + '</span><input type="checkbox" data-pref="' + k + '"' + (prefs[k] ? ' checked' : '') + '></label>';
      };
      $('[data-panel]').innerHTML = '<div class="ss-intro ui-stack">' +
        '<div><div class="eyebrow" style="margin:0 0 6px">About ' + Math.max(1, Math.round(S.secs / 60)) + ' minutes' + (UI.me ? '' : ' · no account needed') + '</div>' +
        '<h2>' + esc(S.title) + '</h2>' + (TC.KINDS[S.kind].line && S.kind !== 'move' && S.kind !== 'custom' ? '<p class="muted" style="margin:4px 0 0">' + esc(TC.KINDS[S.kind].line) + '</p>' : '') + '</div>' +
        '<div><b>How do you feel this morning?</b><p class="small muted" style="margin:2px 0 8px">Optional. You\'ll see the difference at the end.</p>' + TC.feelPicker('before', feelBefore) + '</div>' +
        '<div class="ss-toggles">' + tog('voice', 'volume', 'Spoken guidance') + tog('bell', 'bell', 'Bell between steps') + tog('wind', 'wind', 'Forest sound') + tog('mirror', 'mirror', 'Mirror the teacher') + '</div>' +
        '<details><summary>What\'s inside (' + UI.plural(S.steps.length, 'step') + ')</summary><ul class="ss-intro-list">' +
        groups.map(function (g) {
          return '<li style="border:0;padding-top:10px">' + TC.catLabel(g.cat) + '</li>' + g.items.map(function (s) {
            return '<li>' + esc(s.label || TC.MOVE[s.id].name) + (s.label === 'new' ? ' <span class="ui-badge brand">New move</span>' : '') + '<span class="t">' + TC.mmss(s.secs) + '</span></li>';
          }).join('');
        }).join('') + '</ul></details>' +
        '<p class="small muted">' + UI.icon('info') + ' Move gently and within comfort. Light touch for the massage: skin moves, nothing hurts. Skip anything that doesn\'t feel right.</p></div>';
      $('[data-ctl]').innerHTML = '<button class="ui-btn primary lg" data-begin style="min-width:220px">' + UI.icon('play') + 'Begin</button>';
    }

    /* ---------------------------------------------------------------- player */
    function drawBar() {
      $('[data-bar]').innerHTML = S.steps.map(function (s, i) {
        return '<i style="--w:' + Math.max(1, s.secs) + '" class="' + (i < idx && phase !== 'intro' ? 'done ' : '') + TC.MOVE[s.id].cat + '"><b></b></i>';
      }).join('');
    }
    function drawControls() {
      $('[data-ctl]').innerHTML = '<div class="grp side"><button class="ui-btn ghost icon ss-tog' + (prefs.voice ? ' on' : '') + '" data-tog="voice" aria-label="Spoken guidance">' + UI.icon(prefs.voice ? 'volume' : 'mute') + '</button>' +
        '<button class="ui-btn ghost icon ss-tog' + (prefs.mirror ? ' on' : '') + '" data-tog="mirror" aria-label="Mirror the teacher">' + UI.icon('mirror') + '</button></div>' +
        '<div class="grp"><button class="ui-btn icon" data-prev aria-label="Previous step">' + UI.icon('prev') + '</button>' +
        '<button class="ui-btn primary icon ss-play" data-play aria-label="' + (playing ? 'Pause' : 'Play') + '">' + UI.icon(playing ? 'pause' : 'play') + '</button>' +
        '<button class="ui-btn icon" data-next aria-label="Next step">' + UI.icon('next') + '</button></div>' +
        '<div class="grp side"><button class="ui-btn ghost icon" data-view aria-label="Change the view">' + UI.icon('rotate') + '</button>' +
        '<button class="ui-btn ghost sm" data-speed aria-label="Speed">' + (speed === 1 ? '1×' : speed + '×') + '</button></div>';
    }
    function drawStep() {
      var s = step(), m = move(), n = S.steps[idx + 1];
      $('[data-panel]').innerHTML =
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
    function startStep(i, auto) {
      idx = Math.max(0, Math.min(S.steps.length - 1, i));
      el = 0; segBreath = ''; segUntil = 0;
      var s = step(), m = move();
      fig.setKeys(TC.moveKeys(s.id)); fig.time(s.offset || 0); fig.speed(speed);
      if (playing) fig.play(); else fig.pause();
      drawBar(); drawStep();
      $('[data-sideb]').innerHTML = '';
      if (auto && prefs.bell) TC.bell(.1);
      if (prefs.voice) { say(m.name + '. ' + m.steps[0], true); }
    }
    function say(text, force) {
      if (!prefs.voice) return;
      var now = Date.now();
      if (!force && (now - lastSay < 5000 || (window.speechSynthesis && speechSynthesis.speaking))) return;
      lastSay = now; TC.say(text);
    }
    function onKey(key) {
      if (phase !== 'run' || !S) return;
      var list = view.querySelectorAll('[data-steps] li');
      if (key.s >= 0 && key.s !== lastS && list[key.s]) {
        Array.prototype.forEach.call(list, function (li, j) { li.classList.toggle('on', j === key.s); });
        if (lastS !== -1) say(move().steps[key.s]);
        lastS = key.s;
      }
      $('[data-sideb]').innerHTML = key.mir ? '<span class="ui-badge brand">Other side</span>' : '';
      segBreath = key.b || '';
      segUntil = performance.now() + key.d / speed * 1000;
      if (segBreath) orb(segBreath, key.d / speed);
    }
    function orb(state, secs) {
      var o = $('[data-orb]');
      if (!o || orbState === state) return;
      orbState = state;
      o.querySelector('i').style.transitionDuration = Math.max(.6, secs) + 's';
      o.classList.toggle('in', state === 'in');
      o.querySelector('span').textContent = state === 'in' ? 'Breathe in' : 'Breathe out';
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
      var s = step(), clock = $('[data-clock]'), bars = view.querySelectorAll('[data-bar] i b');
      if (clock) clock.textContent = TC.mmss(s.secs - el);
      var mc = $('[data-mclock]');
      if (mc) { mc.hidden = false; mc.textContent = TC.mmss(s.secs - el); }
      if (bars[idx]) bars[idx].style.width = Math.min(100, el / s.secs * 100) + '%';
      $('[data-left]').textContent = TC.mmss(left()) + ' left';
      raf = requestAnimationFrame(tick);
    }
    function setPlaying(v) {
      playing = v;
      if (v) { fig.play(); last = 0; if (!raf) raf = requestAnimationFrame(tick); } else { fig.pause(); TC.hush(); }
      var b = $('[data-play]');
      if (b) { b.innerHTML = UI.icon(v ? 'pause' : 'play'); b.setAttribute('aria-label', v ? 'Pause' : 'Play'); }
    }
    function begin() {
      TC.unlockAudio();
      phase = 'run'; startedAt = new Date().toISOString();
      $('[data-orb]').hidden = false;
      if (prefs.wind) stopWind = TC.wind();
      if (navigator.wakeLock) navigator.wakeLock.request('screen').then(function (l) { wake = l; }).catch(function () {});
      if (prefs.bell) TC.bell(.14);
      playing = true;
      drawControls();
      startStep(0, false);
      last = 0; raf = requestAnimationFrame(tick);
    }

    /* ---------------------------------------------------------------- finishing */
    function sessionData() {
      var moves = [];
      S.steps.forEach(function (s, i) { if ((done[i] || 0) >= s.secs * .5 && moves.indexOf(s.id) < 0) moves.push(s.id); });
      return { day: TC.today(), kind: S.kind, minutes: Math.round(practised() / 6) / 10, title: S.title, moves: moves,
        feel_before: feelBefore, feel_after: null, note: '', started: startedAt };
    }
    function stopAll() {
      if (raf) cancelAnimationFrame(raf); raf = 0;
      TC.hush();
      if (stopWind) { stopWind(); stopWind = null; }
      if (wake) { try { wake.release(); } catch (e) {} wake = null; }
    }
    function finish() {
      if (phase === 'done') return;
      phase = 'done'; playing = false; stopAll();
      fig.setKeys(TC.moveKeys('closing')); fig.time(9); fig.pause();
      if (prefs.bell) { TC.bell(.16); setTimeout(function () { if (!destroyed) TC.bell(.1); }, 1600); }
      var data = sessionData();
      if (data.minutes < .5) { drawDone(null, true); return; }
      if (UI.me) {
        UI.api('log_session', data, TC.today()).then(function (r) { logged = r.session.id; drawDone(r.stats); },
          function (e) { TC.local.add(data); saved = 'local'; drawDone(null); UI.toast(e.message + ' (kept on this device)', 'error'); });
      } else {
        TC.local.add(data); saved = 'local';
        var all = TC.local.sessions(), st = TC.streaks(all.map(function (x) { return x.day; }));
        drawDone({ sessions: all.length, streak: st.current, days: Object.keys(all.reduce(function (o, x) { o[x.day] = 1; return o; }, {})),
          minutes: Math.round(all.reduce(function (s, x) { return s + (x.minutes || 0); }, 0)) });
      }
    }
    function drawDone(stats, tooShort) {
      var d = sessionData(), me = UI.me;
      view.querySelector('.ss').innerHTML = '<div class="ss-done">' +
        '<div class="ss-done-head"><span class="tc-seal" aria-hidden="true">好</span><div><h1>' + (tooShort ? 'A short visit' : 'Well done' + (me ? ', ' + esc(me.name.split(' ')[0]) : '') + '.') + '</h1>' +
        '<p class="muted" style="margin:0">' + (tooShort ? 'Too short to log. Even one slow breath counts, though.' : esc(TC.thought()[0])) + '</p></div></div>' +
        (tooShort ? '' : '<div class="ss-chips"><span>' + UI.icon('clock') + TC.mmss(practised()) + ' practised</span><span>' + UI.icon('bamboo') + UI.plural(d.moves.length, 'move') + '</span>' +
          (stats ? '<span>' + UI.icon('flame') + UI.plural(stats.streak || 1, 'day') + ' in a row</span>' : '') + '</div>') +
        (stats && stats.days ? '<div class="ui-card"><div class="ui-row between"><h3 style="margin:0">Your grove</h3><span class="small muted">One stalk for every morning</span></div>' + TC.grove(stats.days, 28, { grow: true }) + '</div>' : '') +
        (tooShort ? '' : '<form class="ui-card ui-stack" data-after><h3 style="margin:0">How do you feel now?</h3>' +
          (feelBefore ? '<p class="small muted" style="margin:0">Before: <b>' + esc(TC.feelName(feelBefore)) + '</b></p>' : '') + TC.feelPicker('after', null) +
          '<label class="ui-field"><span>A note for your journal <em>(optional)</em></span><textarea name="note" maxlength="1000" placeholder="What did you notice? Shoulders, breath, mood, the light…"></textarea></label>' +
          '<div class="ui-row end"><button class="ui-btn primary" type="submit">' + UI.icon('check') + 'Save</button></div></form>') +
        (!me ? '<div class="ui-card" style="background:var(--c-brand-soft);border-color:transparent"><h3>Keep growing your grove</h3><p class="muted">This session is saved on this device. Create a free account to keep your journal, your streak and your place on the path on every device. Your sessions come with you.</p>' +
          '<div class="ui-row"><a class="ui-btn primary" href="#auth/signup" data-go="auth/signup">' + UI.icon('leaf') + 'Create a free account</a><a class="ui-btn ghost" href="#practice" data-go="practice">Maybe later</a></div></div>' : '') +
        '<div class="ui-row"><a class="ui-btn" href="#' + (me ? 'home' : 'practice') + '" data-go="' + (me ? 'home' : 'practice') + '">' + UI.icon('back') + (me ? 'Back to today' : 'More sessions') + '</a>' +
        (me ? '<a class="ui-btn ghost" href="#journal" data-go="journal">' + UI.icon('calendar') + 'Journal</a>' : '') +
        '<a class="ui-btn ghost" href="#learn" data-go="learn">' + UI.icon('book') + 'Learn the moves</a></div></div>';
    }

    function closeAsk() {
      if (phase !== 'run' || practised() < 60) { stopAll(); UI.go(UI.me ? 'home' : 'practice'); return; }
      var was = playing; setPlaying(false);
      var m = UI.modal('<h2>Finish here?</h2><p class="muted">You\'ve practised ' + TC.mmss(practised()) + '. Save it to your ' + (UI.me ? 'journal' : 'grove') + '?</p>' +
        '<div class="ui-row end" style="margin-top:18px"><button class="ui-btn ghost" data-leave>Leave without saving</button><button class="ui-btn" data-close>Keep going</button>' +
        '<button class="ui-btn primary" data-fin>Save and finish</button></div>', { onclose: function () { if (was && phase === 'run' && !destroyed) setPlaying(true); } });
      m.el.querySelector('[data-fin]').onclick = function () { was = false; m.close(); finish(); };
      m.el.querySelector('[data-leave]').onclick = function () { was = false; m.close(); stopAll(); UI.go(UI.me ? 'home' : 'practice'); };
    }

    /* ---------------------------------------------------------------- events */
    view.addEventListener('click', function (e) {
      var t = e.target;
      if (t.closest('[data-close]') && t.closest('.ss-top')) return closeAsk();
      if (t.closest('[data-theme-flip]')) {
        UI.setTheme(document.documentElement.classList.contains('ui-dark') ? 'light' : 'dark');
        t.closest('[data-theme-flip]').innerHTML = UI.icon(document.documentElement.classList.contains('ui-dark') ? 'sun' : 'moon');
        return;
      }
      if (t.closest('[data-begin]')) return begin();
      if (t.closest('[data-play]')) return setPlaying(!playing);
      if (t.closest('[data-next]')) { if (idx < S.steps.length - 1) { done[idx] = Math.max(done[idx] || 0, el); startStep(idx + 1, false); } else finish(); return; }
      if (t.closest('[data-prev]')) { startStep(el > 4 ? idx : idx - 1, false); return; }
      if (t.closest('[data-view]')) { yawI = (yawI + 1) % VIEWS.length; fig.view(VIEWS[yawI][0], VIEWS[yawI][0] === 0 ? 6 : 11); UI.toast('View: ' + VIEWS[yawI][1]); return; }
      if (t.closest('[data-speed]')) { speed = speed === 1 ? .75 : speed === .75 ? .5 : 1; fig.speed(speed); t.closest('[data-speed]').textContent = speed === 1 ? '1×' : speed + '×'; return; }
      var tg = t.closest('[data-tog]');
      if (tg) {
        var k = tg.getAttribute('data-tog'), p = {}; p[k] = !prefs[k]; prefs[k] = p[k];
        TC.setPrefs(p);
        if (k === 'mirror') fig.mirror(prefs.mirror);
        if (k === 'voice' && !prefs.voice) TC.hush();
        drawControls();
      }
    });
    view.addEventListener('change', function (e) {
      var inp = e.target.closest('[data-pref]');
      if (!inp) return;
      var k = inp.getAttribute('data-pref'), p = {}; p[k] = inp.checked; prefs[k] = inp.checked;
      TC.setPrefs(p);
      if (k === 'mirror') fig.mirror(inp.checked);
      if (k === 'bell' && inp.checked) { TC.unlockAudio(); TC.bell(.1); }
    });
    TC.wireFeel(view, function (name, v) { if (name === 'before') feelBefore = v; else feelAfter = v; });
    view.addEventListener('submit', function (e) {
      if (!e.target.matches('[data-after]')) return;
      e.preventDefault();
      var note = e.target.querySelector('[name=note]').value, btn = e.target.querySelector('[type=submit]');
      if (UI.me && logged) {
        UI.busy(btn, UI.api('update_session', logged, note, feelAfter)).then(function () { UI.toast('Saved to your journal', 'ok'); UI.go('home'); });
      } else {
        var all = TC.local.sessions(), lastOne = all[all.length - 1];
        if (lastOne && lastOne.started === startedAt) { lastOne.feel_after = feelAfter; lastOne.note = note.slice(0, 1000); UI.store.set('guest.sessions', all); }
        UI.toast('Saved on this device', 'ok');
        e.target.querySelector('[type=submit]').disabled = true;
      }
    });
    function onKeyDown(e) {
      if (phase !== 'run' || /input|textarea|select/i.test((e.target.tagName || '')) || document.querySelector('.ui-modal-wrap')) return;
      if (e.key === ' ') { e.preventDefault(); setPlaying(!playing); }
      else if (e.key === 'ArrowRight') view.querySelector('[data-next]').click();
      else if (e.key === 'ArrowLeft') view.querySelector('[data-prev]').click();
    }
    document.addEventListener('keydown', onKeyDown);
    function onHide() { if (document.hidden && phase === 'run' && playing) setPlaying(false); }
    document.addEventListener('visibilitychange', onHide);

    TC.session = {
      state: function () { return { phase: phase, idx: idx, steps: S ? S.steps.length : 0, playing: playing, practised: practised(), title: S && S.title }; },
      next: function () { var b = view.querySelector('[data-next]'); if (b) b.click(); },
      finish: function () { finish(); },
      skipAhead: function (secs) { el += secs; done[idx] = Math.max(done[idx] || 0, Math.min(el, step().secs)); }
    };

    var ready = TC.progress().then(function (progress) {
      S = TC.compose(kind, arg, progress);
      prefs = TC.prefs();
      fig.mirror(prefs.mirror);
      drawIntro();
    });
    return {
      ready: ready,
      destroy: function () {
        destroyed = true; stopAll(); fig.stop();
        document.removeEventListener('keydown', onKeyDown);
        document.removeEventListener('visibilitychange', onHide);
      }
    };
  });
})();
