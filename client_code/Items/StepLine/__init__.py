from anvil import *

from ._anvil_designer import StepLineTemplate


class StepLine(StepLineTemplate):
    """One numbered step of a move (lights up while the teacher does it). item = {n, text, on}."""

    def __init__(self, **properties):
        super().__init__(**properties)
        self.text.text = self.item["text"]
        self.light(self.item.get("on"))

    def light(self, on):
        self.row.classes["on"] = bool(on)
