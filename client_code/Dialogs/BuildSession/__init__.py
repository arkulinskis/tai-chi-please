from anvil import *

from ._anvil_designer import BuildSessionTemplate
from ... import state, tc

CATS = ["warm", "qigong", "lymph", "form", "cool"]


class BuildSession(BuildSessionTemplate):
    """Pick any moves for a session; closes with the move ids in library order, or None."""

    def __init__(self, **properties):
        super().__init__(**properties)
        self.picked = set()
        self.cats.items = [{"cat": c, "host": self} for c in CATS]
        state.live(self.count)

    def changed(self, move_id, on):
        if on:
            self.picked.add(move_id)
        else:
            self.picked.discard(move_id)
        n = len(self.picked)
        self.count.text = state.plural(n, "move") + " · about %d min" % n if n else "Nothing picked yet"
        self.start_button.enabled = bool(n)

    @handle("cancel_button", "click")
    def cancel_button_click(self, **event_args):
        self.raise_event("x-close-alert", value=None)

    @handle("start_button", "click")
    def start_button_click(self, **event_args):
        ids = [m["id"] for m in tc.moves() if m["id"] in self.picked]
        self.raise_event("x-close-alert", value=ids)
