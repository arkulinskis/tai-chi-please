from anvil import *

from ._anvil_designer import WeekDayTemplate
from ... import state


class WeekDay(WeekDayTemplate):
    """This week on Today: one day, ticked when practised. item = {day, name, on, today}."""

    def __init__(self, **properties):
        super().__init__(**properties)
        i = self.item
        self.cell.classes["on"] = bool(i["on"])
        self.cell.classes["today"] = bool(i["today"])
        self.num.text = "✓" if i["on"] else str(i["day"])
        self.name.text = i["name"]
        state.set_attr(self.cell, "aria-label", "%s %d%s" % (i["name"], i["day"], ", practised" if i["on"] else ""))
