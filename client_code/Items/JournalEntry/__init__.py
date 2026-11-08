from anvil import *
from anvil.js import window

from ._anvil_designer import JournalEntryTemplate
from ... import state, tc


class JournalEntry(JournalEntryTemplate):
    """One session in the journal. item = {s: the session dict, host: the Journal page}."""

    def __init__(self, **properties):
        super().__init__(**properties)
        s = self.item["s"]
        d = window.Date(s["day"] + "T12:00:00")
        self.day_num.text = str(int(s["day"][8:10]))
        self.weekday.text = str(d.toLocaleDateString([], {"weekday": "short"}))
        self.title.text = s.get("title") or "Practice"
        state.heading(self.title, 3)
        when = str(window.Date(s["created"]).toLocaleTimeString([], {"hour": "2-digit", "minute": "2-digit"})) if s.get("created") else ""
        mins = round((s.get("minutes") or 0) * 10) / 10.0
        self.meta.text = "%s min · %s%s" % (("%g" % mins), state.plural(len(s.get("moves") or []), "move"), (" · " + when) if when else "")
        fb, fa = s.get("feel_before"), s.get("feel_after")
        self.feel_row.visible = bool(fb or fa)
        self.feel_before.visible, self.feel_after.visible, self.feel_arrow.visible = bool(fb), bool(fa), bool(fb and fa)
        self.feel_before.text, self.feel_after.text = tc.feel_name(fb), tc.feel_name(fa)
        self.note.visible = bool(s.get("note"))
        self.note.text = s.get("note") or ""

    @handle("edit_button", "click")
    def edit_button_click(self, **event_args):
        self.item["host"].edit(self.item["s"])

    @handle("delete_button", "click")
    def delete_button_click(self, **event_args):
        self.item["host"].delete(self.item["s"])
