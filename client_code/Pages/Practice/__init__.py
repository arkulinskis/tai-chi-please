from anvil import *

from ._anvil_designer import PracticeTemplate
from ... import router, state, tc


class Practice(PracticeTemplate):
    """#practice, open to everyone: the morning flow (7/15/25 minutes, the length is remembered), the lymph flow,
    qigong, form practice, the whole 24-step form, build your own (Dialogs/BuildSession), learn first, a thought."""

    def __init__(self, args=(), **properties):
        super().__init__(**properties)
        state.heading(self.title, 1)
        progress = tc.progress()
        nx = tc.next_move(progress)
        nx_name = tc.move(nx)["name"] if nx else "the whole form"
        self.lead.text = ("%s. Arrive, loosen up, help the lymph flow, learn your next tai chi move (%s), and finish in "
                          "stillness." % (tc.greeting(), nx_name))
        self.guest_note.visible = not state.me()
        n = len(tc.learned(progress))
        self.form_meta.text = state.plural(n, "move") + " learned" if n else "Start with the first moves"
        self.learn_meta.text = "%d moves to explore" % len(tc.moves())
        self.thought.text, self.thought_by.text = tc.thought()
        self.stage.move = nx or "clouds"
        self.stage.label = "The teacher demonstrating " + nx_name
        self._len = tc.prefs().get("minutes") or 15
        self._show_len()

    def _show_len(self):
        for m, b in ((7, self.len7), (15, self.len15), (25, self.len25)):
            b.role = ["seg", "on"] if m == self._len else ["seg"]
            state.set_control_attr(b, "aria-pressed", "true" if m == self._len else "false")
        state.set_attr(self.begin_link, "href", router.href("session", "morning", self._len))

    def _pick(self, m):
        self._len = m
        self._show_len()
        tc.set_prefs({"minutes": m})

    @handle("len7", "click")
    def len7_click(self, **event_args):
        self._pick(7)

    @handle("len15", "click")
    def len15_click(self, **event_args):
        self._pick(15)

    @handle("len25", "click")
    def len25_click(self, **event_args):
        self._pick(25)

    def build_click(self, event):
        from ...Dialogs.BuildSession import BuildSession
        ids = alert(BuildSession(), buttons=[], large=True, role="app-dialog", title="Build your own session")
        if ids:
            router.go("session", "custom", ",".join(ids))
