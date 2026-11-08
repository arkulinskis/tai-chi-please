from anvil import *

from ._anvil_designer import StatCardTemplate


class StatCard(StatCardTemplate):
    """A number with its caption (Admin -> Practice). item = {n, label}."""

    def __init__(self, **properties):
        super().__init__(**properties)
        self.n.text = str(self.item["n"])
        self.label.text = self.item["label"]
