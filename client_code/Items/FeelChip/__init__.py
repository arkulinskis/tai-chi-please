from anvil import *

from ._anvil_designer import FeelChipTemplate
from ... import state


class FeelChip(FeelChipTemplate):
    """One feeling button. item = {v, name, on}."""

    def __init__(self, **properties):
        super().__init__(**properties)
        i = self.item
        self.chip.text = i["name"]
        self.chip.role = ["feel", "feel-%d" % i["v"]] + (["on"] if i["on"] else [])
        state.set_control_attr(self.chip, "role", "radio")
        state.set_control_attr(self.chip, "aria-checked", "true" if i["on"] else "false")
        state.set_control_attr(self.chip, "data-key", "feel-%d" % i["v"])

    @handle("chip", "click")
    def chip_click(self, **event_args):
        self.parent.raise_event("x-pick", value=self.item["v"])
