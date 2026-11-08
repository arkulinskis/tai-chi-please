from anvil import *

from ._anvil_designer import MoveTemplate
from ... import router, state, tc

VIEWS = [28, 0, 90, 180]
BREATH = {"in": "Breathe in", "out": "Breathe out"}


class Move(MoveTemplate):
    """#move/<id>, open to everyone: one move up close. The teacher loops it (drag to look around); view, speed,
    mirror and hand trails; the steps light up as the figure performs them, with the breath; practise it
    (#session/move/<id>), and step to the previous/next move in its category."""

    def __init__(self, args=(), **properties):
        super().__init__(**properties)
        mid = args[0] if args and tc.move(args[0]) else "commence"
        m = self.m = tc.move(mid)
        prefs = tc.prefs()
        progress = tc.progress()
        back = "path" if m["cat"] == "form" else "lymph" if m["cat"] == "lymph" else "moves"
        state.set_attr(self.back_link, "href", router.href("learn", back))
        c = tc.cat(m["cat"])
        self.cat_icon.classes.add("ic-" + (c.get("icon") or "leaf"))
        self.cat_name.text = c.get("short") or ""
        self.title.text = m["name"]
        state.heading(self.title, 1)
        self.zh_line.visible = bool(m["zh"])
        self.zh.text, self.py.text = m["zh"], m["py"]
        n, st = progress.get(mid, 0), tc.status(mid, progress)
        badges = [{"text": "Form step %s" % f} for f in (m["form"] or [])]
        if m["both"]:
            badges.append({"text": "Left and right"})
        badges.append({"text": "%d s per round" % m["loop"], "icon": "clock"})
        if m["cat"] == "form":
            if st == "learned":
                badges.append({"text": "Learned", "kind": "good", "icon": "check"})
            elif n:
                badges.append({"text": "Learning · %d of %d" % (n, tc.learned_at()), "kind": "warn"})
        self.badges.items = badges
        self.about.text = m["about"]
        self.steps.items = [{"n": i + 1, "text": t, "on": False} for i, t in enumerate(m["steps"])]
        self.tip_box.visible = bool(m["tip"])
        self.tip.text = m["tip"]
        state.set_attr(self.practise_link, "href", router.href("session", "move", mid))
        self.lymph_link.visible = m["cat"] == "lymph"
        same = [x for x in tc.moves() if x["cat"] == m["cat"]]
        i = [x["id"] for x in same].index(mid)
        prev, nxt = (same[i - 1] if i > 0 else None), (same[i + 1] if i + 1 < len(same) else None)
        self.prev_link.visible, self.prev_gap.visible, self.next_link.visible = bool(prev), not prev, bool(nxt)
        if prev:
            state.set_attr(self.prev_link, "href", router.href("move", prev["id"]))
            self.prev_name.text = prev["name"]
        if nxt:
            state.set_attr(self.next_link, "href", router.href("move", nxt["id"]))
            self.next_name.text = nxt["name"]
        self._speed, self._last = 1, -1
        self._mirror, self._trails = bool(prefs.get("mirror")), bool(prefs.get("trails"))
        st_ = self.stage
        st_.seed, st_.mirror, st_.trails = 2 + len(mid), self._mirror, self._trails
        st_.label = "The teacher demonstrating " + m["name"]
        st_.on_key = self._on_key
        st_.move = mid
        self._toggles()
        state.live(self.breath)

    def _toggles(self):
        for b, on in ((self.mirror_button, self._mirror), (self.trails_button, self._trails)):
            icon = "ic-mirror" if b is self.mirror_button else "ic-trail"
            b.role = ["btn", "btn-ghost", "btn-icon", icon, "tog"] + (["on"] if on else [])
            state.set_control_attr(b, "aria-pressed", "true" if on else "false")

    def _on_key(self, key, *rest):
        """The teacher reached a keyframe: light its step, say the breath."""
        s = getattr(key, "s", -1)
        if s is not None and s >= 0 and s != self._last:
            self._last = s
            for j, row in enumerate(self.steps.get_components()):
                getattr(row, "light")(j == s)
        b = getattr(key, "b", "") or ""
        self.breath.text = BREATH.get(b, "Breathe naturally") + (" · other side" if getattr(key, "mir", False) else "")

    @handle("play_button", "click")
    def play_button_click(self, **event_args):
        fig = self.stage.fig
        if fig is None:
            return
        fig.toggle()
        on = bool(fig.playing())
        self.play_button.text = "Pause" if on else "Play"
        self.play_button.role = ["btn", "btn-primary", "btn-icon", "ic-pause" if on else "ic-play"]

    def _view(self, j):
        if self.stage.fig is not None:
            self.stage.fig.view(VIEWS[j], 6 if j == 1 else 11)
        for k, b in enumerate((self.v0, self.v1, self.v2, self.v3)):
            b.role = ["seg", "on"] if k == j else ["seg"]

    @handle("v0", "click")
    def v0_click(self, **event_args):
        self._view(0)

    @handle("v1", "click")
    def v1_click(self, **event_args):
        self._view(1)

    @handle("v2", "click")
    def v2_click(self, **event_args):
        self._view(2)

    @handle("v3", "click")
    def v3_click(self, **event_args):
        self._view(3)

    @handle("speed_button", "click")
    def speed_button_click(self, **event_args):
        self._speed = {1: 0.5, 0.5: 0.75}.get(self._speed, 1)
        if self.stage.fig is not None:
            self.stage.fig.speed(self._speed)
        self.speed_button.text = ("%g" % self._speed) + "×"

    @handle("mirror_button", "click")
    def mirror_button_click(self, **event_args):
        self._mirror = not self._mirror
        if self.stage.fig is not None:
            self.stage.fig.mirror(self._mirror)
        self._toggles()
        tc.set_prefs({"mirror": self._mirror})

    @handle("trails_button", "click")
    def trails_button_click(self, **event_args):
        self._trails = not self._trails
        if self.stage.fig is not None:
            self.stage.fig.trails(self._trails)
        self._toggles()
        tc.set_prefs({"trails": self._trails})
