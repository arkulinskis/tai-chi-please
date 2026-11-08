from anvil import *

from ._anvil_designer import PickMoveTemplate


class PickMove(PickMoveTemplate):
    """One move as a tick box. item = {id, name, host}."""

    def __init__(self, **properties):
        super().__init__(**properties)
        self.box.text = self.item["name"]

    @handle("box", "change")
    def box_change(self, **event_args):
        self.item["host"].changed(self.item["id"], self.box.checked)
