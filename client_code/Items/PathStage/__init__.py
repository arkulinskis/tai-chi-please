from anvil import *

from ._anvil_designer import PathStageTemplate
from ... import state


class PathStage(PathStageTemplate):
    """One stage of the path (Seed ... Grove) with its moves. item = {stage, cards, state: done|now|todo}."""

    def __init__(self, **properties):
        super().__init__(**properties)
        s, st = self.item["stage"], self.item["state"]
        self.box.classes[st] = True
        self.seal.text = s["zh"]
        self.name.text = s["name"]
        state.heading(self.name, 3)
        self.badge.visible = st in ("done", "now")
        self.badge.text = "Grown" if st == "done" else "Growing now"
        self.badge.role = ["badge", "badge-good", "bic-check"] if st == "done" else ["badge", "badge-warn"]
        self.line.text = s["line"]
        self.cards.items = self.item["cards"]
