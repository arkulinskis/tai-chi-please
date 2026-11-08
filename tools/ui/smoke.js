/* Smoke test (tools/ui_test.py runs it at 1280 px and at 390 px): every page address opens without errors, is not
   empty and doesn't scroll sideways, signed out (incl. a guest session run to the done screen), then as a new member
   (a session logged to the journal), then as admin (every Admin tab). Python/JS errors are also caught by ui_test.py
   from the browser log. Resolves to {ok, log}. */
(async function () {
  const log = [], bad = [];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  async function until(fn, what, ms) {
    const end = Date.now() + (ms || 20000);
    while (Date.now() < end) { try { const v = fn(); if (v) return v; } catch (e) {} await sleep(150); }
    throw new Error('timed out waiting for: ' + what);
  }
  const $ = (s) => document.querySelector(s), $$ = (s) => Array.from(document.querySelectorAll(s));
  const errs = [];
  window.addEventListener('error', (e) => errs.push(String(e.message || e)));
  function type(input, value) {
    input.focus(); input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function button(re, root) { return $$((root || '') + ' button').find((b) => re.test(b.textContent) && b.offsetParent !== null); }
  async function open(hash, expect, landed) {
    if (location.hash !== hash) window.UI_READY = false;
    location.hash = hash;
    await until(() => window.UI_READY && (landed ? landed() : location.hash === hash), hash, 30000);
    await sleep(900);
    const main = $('.ui-main') || $('.ss-page');
    const text = main ? main.innerText.trim() : '';
    const w = document.documentElement.scrollWidth, vw = screen.width <= 500 ? screen.width : window.innerWidth;
    const problems = [];
    if (text.length < 40) problems.push('empty page');
    if (expect && !new RegExp(expect.source, 'i').test(text)) problems.push('missing ' + expect);
    if (w > vw + 1) {
      const wide = $$('body *').filter((e) => { const r = e.getBoundingClientRect(); return r.width && r.right > vw + 1; })
        .slice(0, 3).map((e) => e.tagName.toLowerCase() + '.' + String(e.className).split(' ').slice(0, 2).join('.'));
      problems.push('scrolls sideways (' + w + ' > ' + vw + ') ' + wide.join(' '));
    }
    if (errs.length) problems.push('errors: ' + errs.splice(0).join(' / '));
    if (problems.length) bad.push(hash + ': ' + problems.join('; '));
    log.push((problems.length ? 'BAD  ' : 'ok   ') + hash);
  }
  async function runSession(hash, expectDone) {
    await open(hash, /How do you feel this morning/);
    if (!$('.ss-stage svg.tc-fig')) bad.push(hash + ': no teacher on the stage');
    button(/Begin/, '.ss-begin').click();
    await until(() => window.TC.session && window.TC.session.state().phase === 'run', 'the session running');
    await sleep(600);
    if (!$('.ss-steps li')) bad.push(hash + ': the step panel is empty');
    window.TC.session.skipAhead(120);
    await sleep(400);
    window.TC.session.finish();
    await until(() => /Well done|A short visit/.test(($('.ss-done') || {}).innerText || ''), 'the done screen', 30000);
    if (!new RegExp(expectDone.source).test($('.ss-done').innerText)) bad.push(hash + ': done screen missing ' + expectDone);
    log.push('ok   ' + hash + ' ran to the done screen');
  }
  async function signUp(name, email, password) {
    location.hash = '#auth/signup';
    await until(() => window.UI_READY && $$('.au-card input').length >= 3, 'sign-up form');
    await sleep(400);
    const inputs = $$('.au-card input[type=text], .au-card input[type=email], .au-card input[type=password]');
    type(inputs[0], name); type(inputs[1], email); type(inputs[2], password);
    const tick = $('.au-card input[type=checkbox]'); if (tick && !tick.checked) tick.click();
    button(/Create account/, '.au-card .anvil-role-btn-block').click();
    const end = Date.now() + 30000;
    while (Date.now() < end) {
      if (location.hash.indexOf('#home') === 0 && window.UI_READY) return true;
      const msg = $('.au-card .anvil-role-msg-error');
      if (msg && msg.offsetParent !== null && msg.textContent.trim()) { log.push('sign-up said: ' + msg.textContent.trim()); return false; }
      await sleep(200);
    }
    log.push('sign-up: still on ' + location.hash);
    return false;
  }
  async function signIn(email, password) {
    location.hash = '#auth';
    await until(() => window.UI_READY && $$('.au-card input[type=password]').length, 'sign-in form');
    await sleep(400);
    type($('.au-card input[type=email]'), email); type($('.au-card input[type=password]'), password);
    button(/Sign in/, '.au-card .anvil-role-btn-block').click();
    await until(() => location.hash.indexOf('#home') === 0 && window.UI_READY, 'signed in as ' + email, 30000);
  }
  async function signOut() {
    location.hash = '#profile';
    await until(() => window.UI_READY && location.hash === '#profile', 'profile');
    await sleep(400);
    button(/Sign out/, '.pf-links').click();
    await until(() => {
      const a = $('.anvil-role-avatar button');
      return location.hash === '#landing' && window.UI_READY && (!a || a.offsetParent === null);
    }, 'signed out');
  }
  try {
    // ---- signed out
    await open('#landing', /Every morning, among the bamboo/);
    await open('#practice', /Morning flow/);
    const build = $('.pr-build');
    if (build) {
      build.click();
      await until(() => $('.build-session input[type=checkbox]'), 'the build-your-own dialog');
      $('.build-session input[type=checkbox]').click();
      await sleep(300);
      button(/Cancel/, '.build-session').click();
      await sleep(600);
    }
    for (const t of ['path', 'moves', 'form', 'lymph']) await open('#learn/' + t, /Learn/);
    if ($$('.tc-thumb svg.tc-fig').length) log.push('ok   thumbnails drawn: ' + $$('.tc-thumb svg.tc-fig').length);
    await open('#learn/moves', /Warm-ups/);
    if (!$$('.tc-thumb svg.tc-fig path, .tc-thumb svg.tc-fig line, .tc-thumb svg.tc-fig ellipse').length) bad.push('#learn/moves: thumbnails not drawn');
    await open('#move/crane', /White crane/);
    await open('#session/custom/wuji%2Ccommence', /Your own session/);
    await runSession('#session/morning/7', /Keep growing your grove/);
    await open('#auth', /Sign in/);
    await open('#auth/signup', /Create account/);

    // ---- a new member
    const ok = await signUp('Smoke Tester', 'smoke' + Date.now() + '@example.com', 'Tc-' + Math.random().toString(36).slice(2) + '-Kq7');
    if (!ok) throw new Error('sign-up failed');
    await open('#home', /Your grove/);
    await runSession('#session/lymph', /How do you feel now/);
    await open('#journal', /Your journal/);
    if (!/Lymph flow/.test($('.ui-main').innerText)) bad.push('#journal: the logged session is missing');
    await open('#practice', /Morning flow/);
    await open('#learn/path', /Your path/);
    await open('#move/clouds', /clouds/);
    await open('#profile', /Your practice/);
    await open('#landing', /Open today/);
    await signOut();

    // ---- admin (ADMIN_EMAILS in Accounts.py): sign up the first time, sign in after that
    const adminPw = 'Tc-smoke-adm-93Kx-7q';
    if (!(await signUp('Admin Tester', 'arkulinskis@gmail.com', adminPw))) await signIn('arkulinskis@gmail.com', adminPw);
    for (const t of ['overview', 'practice', 'feedback', 'users', 'demo']) await open('#admin/' + t, /Admin/);
    await signOut();
    log.push(bad.length ? 'PROBLEMS: ' + bad.join(' | ') : 'PASSED');
    return { ok: !bad.length, log: log };
  } catch (e) {
    log.push(String(e && e.message || e));
    if (bad.length) log.push('PROBLEMS: ' + bad.join(' | '));
    return { ok: false, log: log };
  }
})();
