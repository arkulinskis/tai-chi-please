from anvil import *

from ._anvil_designer import CountRowTemplate


class CountRow(CountRowTemplate):
    """A name and a count (most practised moves, kinds of session). item = {name, n}."""

    def __init__(self, **properties):
        super().__init__(**properties)
        self.name.text = self.item["name"]
        self.n.text = str(self.item["n"])
