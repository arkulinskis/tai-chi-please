import json

import anvil.js
import anvil.server
from anvil import *
from anvil.js import window

from ._anvil_designer import SessionTemplate
from ... import router, state, tc

TOGGLES = ["voice", "bell", "wind", "music", "mirror"]


class Session(SessionTemplate):
    """#session/<kind>/<arg>, full screen, for anyone (no account needed). kind: morning/<7|15|25>, lymph, qigong,
    form, full24, move/<id>, custom/<id,id,...> (TC.compose in tc-moves.js).
    Intro (Forms: how do you feel, sound settings, what's inside) -> the player (TC.player in tc-ui.js: the teacher,
    steps lighting up, breathing orb, voice + bell, forest sound, music, wake lock, keys) -> done (Forms: grove,
    feeling after, note; saved to the journal, or in this browser for guests)."""

    def __init__(self, args=(), **properties):
        super().__init__(**properties)
        kind = args[0] if args else "morning"
        arg = args[1] if len(args) > 1 else ""
        self.prefs = tc.prefs()
        if kind == "morning" and not arg:
            arg = str(self.prefs.get("minutes") or 15)
        progress = tc.progress()
        self.S = json.loads(window.JSON.stringify(window.TC.compose(kind, arg, progress)))
        self.player = None
        self._logged, self._data = None, None
        self.done.visible = False
        self._intro()
        self._theme_icon()

    # ---------------------------------------------------------------- intro
    def _intro(self):
        S = self.S
        mins = max(1, int(round(S["secs"] / 60.0)))
        self.title.text = S["title"]
        state.heading(self.title, 1)
        self.intro_title.text = S["title"]
        state.heading(self.intro_title, 2)
        line = tc.kind(S["kind"]).get("line") or ""
        self.intro_line.text = line
        self.intro_line.visible = bool(line) and S["kind"] not in ("move", "custom")
        self.intro_meta.text = "About %d minutes%s" % (mins, "" if state.me() else " · no account needed")
        for k in TOGGLES:
            getattr(self, "t_" + k).checked = bool(self.prefs.get(k))
        rows, cur = [], None
        for s in S["steps"]:
            c = tc.move(s["id"])["cat"]
            if c != cur:
                cur = c
                rows.append({"head": c})
            rows.append({"name": s.get("label") if s.get("label") and s.get("label") != "new" else tc.move(s["id"])["name"],
                         "new": s.get("label") == "new", "t": tc.mmss(s["secs"])})
        self.inside.items = rows
        self.inside_summary.text = "What's inside (%s)" % state.plural(len(S["steps"]), "step")

    def _theme_icon(self):
        dark = bool(window.document.querySelector("html.ui-dark"))
        self.theme_button.role = ["btn", "btn-ghost", "btn-icon", "ic-sun" if dark else "ic-moon"]

    @handle("", "show")
    def _on_show(self, **event_args):
        if self.player is None and not self.done.visible:
            nodes = {k: self.dom_nodes[k] for k in ("stage", "bar", "panel", "ctl", "left")}
            hooks = {"done": anvil.js.report_exceptions(self._done), "toast": anvil.js.report_exceptions(self._toast),
                     "pref": anvil.js.report_exceptions(self._pref)}
            self.player = window.TC.player(nodes, window.JSON.parse(json.dumps(self.S)),
                                           window.JSON.parse(json.dumps(self.prefs)), hooks)

    @handle("", "hide")
    def _on_hide(self, **event_args):
        self.leave()

    def leave(self):
        """The router calls this when another page opens: stop the sound, the clock, the wake lock and the teacher."""
        if self.player is not None:
            self.player.stop()
            self.player = None

    def _toast(self, msg):
        state.toast(str(msg))

    def _pref(self, k, v):
        tc.set_prefs({str(k): bool(v)})

    def _toggle(self, k):
        v = bool(getattr(self, "t_" + k).checked)
        self.prefs[k] = v
        tc.set_prefs({k: v})
        if self.player is not None:
            self.player.setPref(k, v)

    @handle("t_voice", "change")
    def t_voice_change(self, **event_args):
        self._toggle("voice")

    @handle("t_bell", "change")
    def t_bell_change(self, **event_args):
        self._toggle("bell")

    @handle("t_wind", "change")
    def t_wind_change(self, **event_args):
        self._toggle("wind")

    @handle("t_music", "change")
    def t_music_change(self, **event_args):
        self._toggle("music")

    @handle("t_mirror", "change")
    def t_mirror_change(self, **event_args):
        self._toggle("mirror")

    @handle("feel_before", "change")
    def feel_before_change(self, **event_args):
        if self.player is not None:
            self.player.feelBefore(self.feel_before.value)

    @handle("begin_button", "click")
    def begin_button_click(self, **event_args):
        if self.player is None:
            return
        self.intro.visible = False
        self.intro_ctl.visible = False
        self.player.begin()

    @handle("theme_button", "click")
    def theme_button_click(self, **event_args):
        dark = bool(window.document.querySelector("html.ui-dark"))
        state.set_theme("light" if dark else "dark")
        self._theme_icon()

    # ---------------------------------------------------------------- leaving and finishing
    def _away(self):
        self.leave()
        router.go("home" if state.me() else "practice")

    @handle("close_button", "click")
    def close_button_click(self, **event_args):
        p = self.player
        if p is None:
            router.go("home" if state.me() else "practice")
            return
        st = p.state()
        if st.phase != "run" or st.practised < 60:
            self._away()
            return
        was = bool(p.playing())
        p.play(False)
        p.hold(True)
        choice = alert("You've practised %s. Save it to your %s?" % (tc.mmss(st.practised), "journal" if state.me() else "grove"),
                       title="Finish here?", role="app-dialog",
                       buttons=[("Leave without saving", "leave"), ("Keep going", None), ("Save and finish", "finish")])
        if self.player is None:
            return
        p.hold(False)
        if choice == "finish":
            p.finish()
        elif choice == "leave":
            self._away()
        elif was:
            p.play(True)

    def _done(self, text):
        """The player finished (or "Save and finish"): log it, then show the done screen."""
        d = json.loads(str(text))
        data, practised = d["data"], d["practised"]
        self._data, self._practised = data, practised
        if (data.get("minutes") or 0) < 0.5:
            self._show_done(None, True)
            return
        stats = None
        if state.me():
            r: dict = {}
            try:
                r = anvil.server.call("log_session", data, tc.today())
            except Exception as e:
                r = {"ok": False, "error": str(e)}
            if r.get("ok"):
                self._logged = r["session"]["id"]
                stats = r["stats"]
            else:
                window.TC.local.add(window.JSON.parse(json.dumps(data)))
                state.toast(str(r.get("error") or "That didn't save") + " (kept on this device)", "error")
        else:
            window.TC.local.add(window.JSON.parse(json.dumps(data)))
            stats = json.loads(window.TC.guestStats())
        self._show_done(stats, False)

    def _show_done(self, stats, too_short):
        me = state.me()
        data = self._data or {}
        self.run.visible = False
        self.done.visible = True
        first = (me.get("name") or "").split(" ")[0] if me else ""
        self.done_title.text = "A short visit" if too_short else "Well done" + (", " + first if first else "") + "."
        state.heading(self.done_title, 1)
        self.done_line.text = "Too short to log. Even one slow breath counts, though." if too_short else tc.thought()[0]
        self.chips.visible = not too_short
        self.chip_time.text = tc.mmss(self._practised or 0) + " practised"
        self.chip_moves.text = state.plural(len(data.get("moves") or []), "move")
        self.streak_chip.visible = bool(stats)
        if stats:
            self.chip_streak.text = state.plural(stats.get("streak") or 1, "day") + " in a row"
        self.grove_card.visible = bool(stats and stats.get("days"))
        if stats and stats.get("days"):
            self.grove.days = stats["days"]
        self.after_card.visible = not too_short
        fb = data.get("feel_before")
        self.before_line.visible = bool(fb)
        self.before_line.text = "Before: " + tc.feel_name(fb) if fb else ""
        self.guest_card.visible = not me
        self.home_link.visible = bool(me)
        self.more_link.visible = not me
        self.journal_link.visible = bool(me)
        window.scrollTo(0, 0)

    @handle("save_button", "click")
    def save_button_click(self, **event_args):
        note = self.note_box.text or ""
        feel = self.feel_after.value
        if state.me() and self._logged:
            if state.call("update_session", self._logged, note, feel):
                state.toast("Saved to your journal", "ok")
                router.go("home")
        else:
            window.TC.local.annotate((self._data or {}).get("started"), feel, note)
            state.toast("Saved on this device", "ok")
            self.save_button.enabled = False
