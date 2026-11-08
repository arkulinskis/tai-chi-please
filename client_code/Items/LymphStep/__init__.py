from anvil import *

from ... import router, state
from ._anvil_designer import LymphStepTemplate


class LymphStep(LymphStepTemplate):
    """One place in the lymph massage order. item = {n, id, name, text}."""

    def __init__(self, **properties):
        super().__init__(**properties)
        i = self.item
        self.n.text = str(i["n"])
        state.set_attr(self.link, "href", router.href("move", i["id"]))
        self.name.text = i["name"]
        self.text.text = i["text"]
