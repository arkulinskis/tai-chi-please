from anvil import *

from ._anvil_designer import MoveCatTemplate
from ... import tc


class MoveCat(MoveCatTemplate):
    """All moves: one category with a card per move. item = {cat, progress}."""

    def __init__(self, **properties):
        super().__init__(**properties)
        c = tc.cat(self.item["cat"])
        self.icon.classes.add("ic-" + (c.get("icon") or "leaf"))
        self.name.text = c.get("name") or ""
        self.blurb.text = c.get("blurb") or ""
        p = self.item["progress"]
        self.cards.items = [{"id": m["id"], "progress": p} for m in tc.moves() if m["cat"] == self.item["cat"]]
