from anvil import *

from ._anvil_designer import PickCatTemplate
from ... import tc


class PickCat(PickCatTemplate):
    """Build your own: one category's moves as tick boxes. item = {cat, host} (host = the dialog)."""

    def __init__(self, **properties):
        super().__init__(**properties)
        c = tc.cat(self.item["cat"])
        self.icon.classes.add("ic-" + (c.get("icon") or "leaf"))
        self.cat_name.text = c.get("short") or ""
        self.moves.items = [{"id": m["id"], "name": m["name"], "host": self.item["host"]}
                            for m in tc.moves() if m["cat"] == self.item["cat"]]
