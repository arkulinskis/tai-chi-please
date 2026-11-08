from anvil import *

from ._anvil_designer import EditSessionTemplate
from ... import state, tc


class EditSession(EditSessionTemplate):
    """Journal: change a session's feeling after and its note. Closes with the saved session, or None."""

    def __init__(self, session=None, **properties):
        super().__init__(**properties)
        self.s = session or {}
        self.day.text = tc.day_name(self.s.get("day")) if self.s.get("day") else ""
        self.feel.value = self.s.get("feel_after")
        self.note_box.text = self.s.get("note") or ""

    @handle("cancel_button", "click")
    def cancel_button_click(self, **event_args):
        self.raise_event("x-close-alert", value=None)

    @handle("save_button", "click")
    def save_button_click(self, **event_args):
        r = state.call("update_session", self.s["id"], (self.note_box.text or "")[:1000], self.feel.value)
        if r:
            self.raise_event("x-close-alert", value=r["session"])
