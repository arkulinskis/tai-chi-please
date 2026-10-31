# Tai Chi Please

A gentle morning practice in a bamboo forest: guided tai chi, qigong and lymphatic self-massage sessions with an animated 3D teacher, a learning path through the 24-step Yang form, and a practice journal. Anyone can do a session without signing up; an account keeps the journal, streak and path on every device. Built on [Anvil](https://anvil.works).

- **App repo:** github.com/arkulinskis/tai-chi-please (branch `master`). Anvil pulls `master`.
- **Live:** https://tai-chi-please.anvil.app

## What it does

Keep this list current: it is the first thing read before every change.

**The teacher:** a small 3D figure in a tai chi outfit (jade jacket, gold sash, hair bun, calm closed eyes), drawn in SVG.
Poses are keyframes (pelvis, waist turn, hand and foot targets); arms and legs are solved with inverse kinematics, the
scene is projected with an orbiting camera and depth-sorted. Drag to look around; front / side / back / three-quarter views;
mirror mode; 0.5x / 0.75x speed; golden hand trails. It stands in a bamboo forest backdrop (morning sun and mist in light
mode, moonlit grove in dark mode, swaying stalks).

**For everyone (no account needed):**
- **Landing:** the teacher cycling through form moves in the hero, "A morning in the forest" arc, features, the lymph section
  (teacher doing the neck massage), FAQ, the live "N people practised today" badge. Main button: a 7-minute session now.
- **Practice** (`#practice`): Morning flow 7/15/25 min (warm-up, qigong, lymph self-massage, your next form move, stillness),
  Lymph flow (9 min), Morning qigong (5 of the Eight Brocades), Form practice, the whole 24-step form, Build your own
  (pick any moves), and the morning thought (a Taoist / tai chi line that changes daily).
- **Session player** (`#session/...`, full screen): intro with "how do you feel?" and sound settings; the teacher performs each
  step while its instruction lights up; breathing orb (follows the move's in/out breath, or a natural 4-in / 5-out rhythm);
  spoken guidance (speech synthesis), a singing-bowl bell between steps (Web Audio), optional forest wind sound; screen wake
  lock; segmented progress bar; prev / pause / next, view and speed; space and arrow keys. Done screen: a red "好" seal,
  minutes, moves, streak, the grove growing a stalk, "how do you feel now?", a journal note.
- **Learn** (`#learn`): Your path (the 24-step form in six stages: Seed, Shoot, Stalk, Node, Leaf, Grove; a move is learned
  after 3 sessions), All moves (43, by category, each with a still of its most telling moment), The 24 steps (the form in
  order), Lymph guide (body map with numbered points on the teacher, the order, four rules, who should ask a doctor first).
- **Move** (`#move/<id>`): one move up close, steps lighting up with the animation, Chinese name + pinyin, form step numbers,
  breath badge, "Practise it, 3 minutes", previous / next.
- **Guests:** sessions are kept in the browser (grove, streak and path work); they move into the account on sign-up.
- Sign-up / sign-in, the feedback form, Privacy & Terms (`#legal`).

**For members:**
- **Today** (`#home`): greeting + morning thought, start button with the preferred length, streak / sessions / minutes /
  mood lift, the grove (one bamboo stalk per morning over 4 weeks; streaks grow taller), this week, next move on the path,
  the morning circle (count of people who practised in 24 h, first names only of those who opted in), the daily calendar
  reminder (.ics download), recent sessions.
- **Journal** (`#journal`): stats, month calendar of mornings, every session with feeling before -> after and a note;
  edit or delete.
- **Profile:** practice settings (length, morning time, voice, bell, forest sound, mirror, trails, show my first name in the
  morning circle), the calendar reminder, name, appearance, password reset.

**For admins** (`#admin`; arkulinskis@gmail.com becomes an admin on first sign-in):
- **Practice:** sessions in the last 24 h / week, people this week, minutes, average mood lift, most practised moves, kinds
  of session, the last 14 days, sessions imported from guests.
- **Feedback inbox:** New / Read / Done, private notes.
- **Users:** search, make admin, disable an account.
- **Demo data:** six fictional early risers with a month of sessions (some this morning), so the circle and stats are alive; remove or reload it.

## Setting it up in Anvil (once)

1. In the Anvil editor: **Create app → Clone from GitHub**, and paste `https://github.com/arkulinskis/tai-chi-please`.
2. **Users** service: email + password, sign-up allowed (already set in `anvil.yaml`; check it).
3. Open the app in the editor. If it shows a **Schema Mismatch** alert, choose **"The schema of the source code is correct"** so Anvil creates the tables.
4. **Run** it and sign up with **arkulinskis@gmail.com** straight away (that account becomes the admin).
5. **Publish** (Publish → public URL, or your own domain).

<!-- libraries:start -->
## Libraries and outside services

What this project uses besides its own code. Generated by `APP_MAKER/tools/libraries.py`; to change it, edit `APP_MAKER/libraries/catalog.py` and re-run the script.

| Name | How it gets in | Used here for |
|---|---|---|
| [Google Fonts](https://fonts.google.com) | Loaded from a CDN | Noto Serif SC, Nunito Sans, Shippori Mincho B1 |

**Built into the browser:** Speech synthesis (the teacher's spoken cues), Web Audio API, Screen Wake Lock, localStorage, File downloads (Blob).

**Anvil platform:** Anvil, Anvil Data Tables, Anvil JS bridge (anvil.js), Anvil Users.

**Build and test tools (not shipped):** Node.js, Headless Chrome (DevTools Protocol), PyYAML.

<!-- libraries:end -->

## Working on it

See `.claude/skills/taichiplease/SKILL.md`. In short:

```
python -I tools/check.py --ui                    # syntax, server tests, headless UI tests → ALL CHECKS PASSED
python -I tools/preview/devserver.py 8765        # the app on in-memory data: http://localhost:8765/  (?as=ana#home, ?as=admin#admin)
python tools/deploy.py                           # dry run (needs PyYAML, so no -I)
python tools/deploy.py --push "Message"          # deploy: commit + push to GitHub, Anvil pulls it
```

## Project layout

```
web/            the interface: core.js/core.css (shared engine + design tokens), app.js (header, footer), pages/*.html
                pages/_figure.html (3D teacher + bamboo stage + sound), _moves.html (all content), _state.html (shared helpers)
client_code/    Main.py (the only Anvil form: bridge to the server, sign-in), legal.py
server_code/    common.py, Accounts.py, Feedback.py, Admin.py, DemoData.py, legal_server.py, Practice.py (sessions, journal, prefs, circle)
assets/         icon.svg + generated PNG icons, pictures (served at _/theme/<name>)
tools/          sync_to_anvil.py (settings + table schema), deploy.py, check.py, preview/ (dev server, UI tests, screenshots), testing/
```
