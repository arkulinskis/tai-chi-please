from anvil import *

from ._anvil_designer import BadgeTemplate


class Badge(BadgeTemplate):
    """A small pill. item = {text, kind?: good|warn|brand, icon?}."""

    def __init__(self, **properties):
        super().__init__(**properties)
        i = self.item
        self.badge.text = i["text"]
        self.badge.role = ["badge"] + (["badge-" + i["kind"]] if i.get("kind") else []) + (["bic-" + i["icon"]] if i.get("icon") else [])
