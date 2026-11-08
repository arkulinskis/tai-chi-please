from anvil import *

from ._anvil_designer import RecentRowTemplate
from ... import tc


class RecentRow(RecentRowTemplate):
    """A recent session on Today. item = a session dict from the server."""

    def __init__(self, **properties):
        super().__init__(**properties)
        s = self.item
        self.icon.classes.add("ic-" + (tc.kind(s.get("kind")).get("icon") or "leaf"))
        self.title.text = s.get("title") or "Practice"
        meta = tc.day_name(s["day"], short=True) + " · %d min" % round(s.get("minutes") or 0)
        if s.get("feel_before") and s.get("feel_after"):
            meta += " · " + tc.feel_name(s["feel_before"]) + " → " + tc.feel_name(s["feel_after"])
        self.meta.text = meta
