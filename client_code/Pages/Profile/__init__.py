import re

import anvil.js
from anvil import *

from ._anvil_designer import ProfileTemplate
from ... import auth, router, state, tc

TOGGLES = ["voice", "bell", "wind", "mirror", "trails", "circle"]


class Profile(ProfileTemplate):
    """#profile: your name, light/dark, a password reset link, your practice settings (length, morning time + the
    calendar reminder, sound, mirror, trails, the morning circle), Privacy & Terms, feedback, sign out."""

    def __init__(self, args=(), **properties):
        super().__init__(**properties)
        self._show_me()
        self._show_theme()
        tc.progress()  # brings the account's settings into this browser
        self._practice(tc.prefs())
        anvil.js.get_dom_node(self.time_box).setAttribute("type", "time")
        state.set_control_attr(self.time_box, "aria-label", "Morning time")

    def _practice(self, p):
        self._p = p
        for m, b in ((7, self.len7), (15, self.len15), (25, self.len25)):
            b.role = ["seg", "on"] if p.get("minutes") == m else ["seg"]
            state.set_control_attr(b, "aria-pressed", "true" if p.get("minutes") == m else "false")
        self.time_box.text = p.get("time") or "07:00"
        self.ics_hint.text = "A calendar file with a daily %s event. Your calendar reminds you; we never send messages." % (p.get("time") or "07:00")
        for k in TOGGLES:
            getattr(self, "t_" + k).checked = bool(p.get(k))

    def _len(self, m):
        self._practice(tc.set_prefs({"minutes": m}))

    @handle("len7", "click")
    def len7_click(self, **event_args):
        self._len(7)

    @handle("len15", "click")
    def len15_click(self, **event_args):
        self._len(15)

    @handle("len25", "click")
    def len25_click(self, **event_args):
        self._len(25)

    @handle("time_box", "change")
    def time_box_change(self, **event_args):
        t = (self.time_box.text or "").strip()
        if re.match(r"^\d\d:\d\d$", t):
            self._practice(tc.set_prefs({"time": t}))
            state.toast("Morning time saved", "ok")

    @handle("ics_button", "click")
    def ics_button_click(self, **event_args):
        tc.download_reminder()
        state.toast("Open the downloaded file to add the reminder", "ok")

    def _toggle(self, k):
        tc.set_prefs({k: bool(getattr(self, "t_" + k).checked)})
        state.toast("Saved", "ok")

    @handle("t_voice", "change")
    def t_voice_change(self, **event_args):
        self._toggle("voice")

    @handle("t_bell", "change")
    def t_bell_change(self, **event_args):
        self._toggle("bell")

    @handle("t_wind", "change")
    def t_wind_change(self, **event_args):
        self._toggle("wind")

    @handle("t_mirror", "change")
    def t_mirror_change(self, **event_args):
        self._toggle("mirror")

    @handle("t_trails", "change")
    def t_trails_change(self, **event_args):
        self._toggle("trails")

    @handle("t_circle", "change")
    def t_circle_change(self, **event_args):
        self._toggle("circle")

    def _show_me(self):
        me = state.me()
        self.initials.text = state.initials(me.get("name"))
        self.name_title.text = me.get("name") or ""
        joined = state.month_year(me.get("joined"))
        self.email_line.text = (me.get("email") or "") + (" · member since " + joined if joined else "")
        self.name_box.text = me.get("name") or ""
        self.admin_link.visible = bool(me.get("is_admin"))

    def _show_theme(self):
        t = state.theme()
        for name, el in (("auto", self.theme_auto), ("light", self.theme_light), ("dark", self.theme_dark)):
            el.classes["on"] = name == t

    def theme_click(self, event):
        state.set_theme(event.currentTarget.getAttribute("data-theme-pick"))
        self._show_theme()

    @handle("name_box", "pressed_enter")
    def name_box_pressed_enter(self, **event_args):
        self.save_button_click()

    @handle("save_button", "click")
    def save_button_click(self, **event_args):
        name = (self.name_box.text or "").strip()
        if len(name) < 2:
            state.toast("Please tell us your name.", "error")
            return
        r = state.call("update_profile", name)
        if r:
            state.set_me(r["me"])
            self._show_me()
            state.toast("Saved", "ok")

    @handle("reset_button", "click")
    def reset_button_click(self, **event_args):
        r = auth.reset(state.me()["email"])
        state.toast(r["message"], "ok")

    def feedback_click(self, event):
        state.feedback()

    def sign_out_click(self, event):
        auth.sign_out()
        state.toast("Signed out. See you tomorrow morning!")
        router.go("landing")
