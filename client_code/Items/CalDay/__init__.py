from anvil import *

from ._anvil_designer import CalDayTemplate
from ... import state


class CalDay(CalDayTemplate):
    """One day in the journal's month calendar. item = {d, count, today} or {empty}."""

    def __init__(self, **properties):
        super().__init__(**properties)
        i = self.item
        if i.get("empty"):
            self.cell.classes["empty"] = True
            return
        c = i["count"]
        self.num.text = str(i["d"])
        self.cell.classes.update({"on": c > 0, "many": c > 1, "today": bool(i["today"])})
        if c:
            state.set_attr(self.cell, "title", state.plural(c, "session"))
