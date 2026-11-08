from anvil import *

from ._anvil_designer import JournalMonthTemplate
from ... import state


class JournalMonth(JournalMonthTemplate):
    """A month in the journal. item = {k, name, items, host}."""

    def __init__(self, **properties):
        super().__init__(**properties)
        self.name.text = self.item["name"]
        state.heading(self.name, 2)
        self.entries.items = [{"s": s, "host": self.item["host"]} for s in self.item["items"]]
