from anvil import *

from ._anvil_designer import DayCountTemplate
from ... import state


class DayCount(DayCountTemplate):
    """Sessions on one day (Admin -> Practice, last 14 days). item = [iso day, count]."""

    def __init__(self, **properties):
        super().__init__(**properties)
        day, n = self.item[0], self.item[1]
        self.day.text = state.short_date(day)
        self.n.text = str(n)
        state.set_attr(self.cell, "title", day)
