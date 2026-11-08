from anvil import *

from ... import router, state
from ._anvil_designer import FormStepTemplate


class FormStep(FormStepTemplate):
    """One of the 24 steps, linking to its move. item = {n, name, zh, id}."""

    def __init__(self, **properties):
        super().__init__(**properties)
        i = self.item
        state.set_attr(self.link, "href", router.href("move", i["id"]))
        self.n.text = str(i["n"])
        self.name.text = i["name"]
        self.zh.text = i["zh"]
