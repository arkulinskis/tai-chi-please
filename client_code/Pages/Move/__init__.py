import anvil.js
from anvil import *
from anvil.js import window

from ._anvil_designer import MoveTemplate
from ... import router, state, tc

VIEWS = [28, 0, 90, 180]
BREATH = {"in": "Breathe in", "out": "Breathe out"}


class Move(MoveTemplate):
    """#move/<id>, open to everyone: one move up close. The teacher loops it (drag to look around); view, speed,
    mirror and hand trails; the steps light up as the figure performs them, with the breath; practise it
    (#session/move/<id>), and step to the previous/next move in its category.
    Feet first (form moves): the footprint map under the stage (Components/Footprints, follows Mirror).
    Flow / One step at a time: in step mode the teacher pauses whenever a new step is about to begin; Next step
    (or Space) goes on. Gentle today: higher stances and lower kicks (saved like the other settings)."""

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
        self._speed, self._last, self._last_mir = 1, -1, False
        self._mirror, self._trails = bool(prefs.get("mirror")), bool(prefs.get("trails"))
        self._gentle, self._step, self._unspace = bool(prefs.get("gentle")), False, None
        st_ = self.stage
        st_.seed, st_.mirror, st_.trails, st_.gentle = 2 + len(mid), self._mirror, self._trails, self._gentle
        st_.label = "The teacher demonstrating " + m["name"]
        st_.on_key = self._on_key
        st_.move = mid
        self._toggles()
        state.live(self.breath)
        # feet first: every form move gets the footprint map
        is_form = m["cat"] == "form"
        self.feet_card.visible = is_form
        self.left_col.classes["has-feet"] = is_form
        if is_form:
            self.feet.stage_node = anvil.js.get_dom_node(self.stage)
            self.feet.mirror = self._mirror
            self.feet.move = mid
            self._feet_hint()
        # gentle today
        self.t_gentle.checked = self._gentle
        self._gentle_box()
        state.live(self.step_note)

    @handle("", "show")
    def _on_show(self, **event_args):
        if self._unspace is None:
            self._unspace = window.TC.onSpace(self._space)

    @handle("", "hide")
    def _on_hide(self, **event_args):
        if self._unspace is not None:
            self._unspace()
            self._unspace = None

    def _space(self):
        """Space: the next step in step mode, otherwise play / pause."""
        if self._step:
            self.next_button_click()
        else:
            self.play_button_click()

    def _feet_hint(self):
        self.feet_hint.text = "Seen from above, forward is up" + (" · mirrored" if self._mirror else "")

    def _gentle_box(self):
        self.gentle_box.visible = self._gentle
        tip = self.m.get("gentle_tip") or ""
        chair = tc.catalog().get("gentle_chair") or "Keep a chair beside you, and stop if anything hurts."
        self.gentle_tip.text = (tip + " " if tip else "Gentle: the teacher stands taller and keeps kicks low. ") + chair

    def _sync_play(self):
        fig = self.stage.fig
        on = bool(fig is not None and fig.playing())
        self.play_button.text = "Pause" if on else "Play"
        self.play_button.role = ["btn", "btn-primary", "btn-icon", "ic-pause" if on else "ic-play"]

    def _toggles(self):
        for b, on in ((self.mirror_button, self._mirror), (self.trails_button, self._trails)):
            icon = "ic-mirror" if b is self.mirror_button else "ic-trail"
            b.role = ["btn", "btn-ghost", "btn-icon", icon, "tog"] + (["on"] if on else [])
            state.set_control_attr(b, "aria-pressed", "true" if on else "false")

    def _on_key(self, key, *rest):
        """The teacher reached a keyframe: light its step, say the breath. In step mode, pause before a new step."""
        s = getattr(key, "s", -1)
        mir = bool(getattr(key, "mir", False))
        if s is not None and s >= 0 and (s != self._last or mir != self._last_mir):
            begun = self._last >= 0
            self._last, self._last_mir = s, mir
            for j, row in enumerate(self.steps.get_components()):
                getattr(row, "light")(j == s)
            fig = self.stage.fig
            if self._step and begun and fig is not None and fig.playing():
                fig.pause()
                self._sync_play()
                self.next_button.enabled = True
                self.step_note.text = "Paused. Up next: step %d%s. Press Next step, or Space." % (s + 1, ", other side" if mir else "")
        b = getattr(key, "b", "") or ""
        self.breath.text = BREATH.get(b, "Breathe naturally") + (" · other side" if getattr(key, "mir", False) else "")

    @handle("play_button", "click")
    def play_button_click(self, **event_args):
        fig = self.stage.fig
        if fig is None:
            return
        fig.toggle()
        self._sync_play()

    def _mode(self, step):
        self._step = step
        self.flow_button.role = ["seg"] + ([] if step else ["on"])
        self.step_button.role = ["seg"] + (["on"] if step else [])
        self.next_button.visible = step
        self.step_note.visible = step
        fig = self.stage.fig
        if step:
            self.step_note.text = "The teacher pauses before each new step. Press Next step, or Space."
            if fig is not None:
                self._last, self._last_mir = -1, False
                fig.setKeys(window.TC.moveKeys(self.m["id"]))  # from the top (also resets the keyframe counter)
                fig.play()
        elif fig is not None:
            fig.play()
        self._sync_play()

    @handle("flow_button", "click")
    def flow_button_click(self, **event_args):
        self._mode(False)

    @handle("step_button", "click")
    def step_button_click(self, **event_args):
        self._mode(True)

    @handle("next_button", "click")
    def next_button_click(self, **event_args):
        fig = self.stage.fig
        if fig is None:
            return
        if not fig.playing():
            fig.play()
            self.step_note.text = "Step %d%s. The teacher pauses again when it's done." % (max(0, self._last) + 1, ", other side" if self._last_mir else "")
        self._sync_play()

    @handle("t_gentle", "change")
    def t_gentle_change(self, **event_args):
        self._gentle = bool(self.t_gentle.checked)
        self.stage.gentle = self._gentle
        self._gentle_box()
        tc.set_prefs({"gentle": self._gentle})

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
        if self.feet_card.visible:
            self.feet.mirror = self._mirror
            self._feet_hint()
        self._toggles()
        tc.set_prefs({"mirror": self._mirror})

    @handle("trails_button", "click")
    def trails_button_click(self, **event_args):
        self._trails = not self._trails
        if self.stage.fig is not None:
            self.stage.fig.trails(self._trails)
        self._toggles()
        tc.set_prefs({"trails": self._trails})
