from anvil import *

from ._anvil_designer import InsideRowTemplate
from ... import tc


class InsideRow(InsideRowTemplate):
    """The session intro's list: a category heading ({head}) or a step ({name, new, t})."""

    def __init__(self, **properties):
        super().__init__(**properties)
        i = self.item
        self.head_row.visible = "head" in i
        self.step_row.visible = "head" not in i
        if "head" in i:
            c = tc.cat(i["head"])
            self.cat_icon.classes.add("ic-" + (c.get("icon") or "leaf"))
            self.cat_name.text = c.get("short") or ""
        else:
            self.name.text = i["name"]
            self.new_badge.visible = bool(i.get("new"))
            self.t.text = i["t"]
