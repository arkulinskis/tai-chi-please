from anvil import *

from ... import router, state, tc
from ._anvil_designer import MoveCardTemplate


class MoveCard(MoveCardTemplate):
    """A move as a card: a still of its most telling moment, its names, progress dots (form moves) or category, and
    a Next / Learned / Later badge. item = {id, progress, next?, locked?}."""

    def __init__(self, **properties):
        super().__init__(**properties)
        i = self.item
        m = tc.move(i["id"])
        p = i.get("progress") or {}
        n, st = p.get(m["id"], 0), tc.status(m["id"], p)
        state.set_attr(self.card, "href", router.href("move", m["id"]))
        self.card.classes["next"] = bool(i.get("next"))
        self.card.classes["locked"] = bool(i.get("locked"))
        self.thumb.seed = 3 + len(m["id"])
        self.thumb.label = m["name"]
        self.thumb.move = m["id"]
        self.name.text = m["name"]
        self.zh.visible = bool(m["zh"])
        self.zh.text = m["zh"] + " · " + m["py"]
        is_form = m["cat"] == "form"
        self.dots.visible, self.cat_box.visible = is_form, not is_form
        la = tc.learned_at()
        state.set_attr(self.dots, "title", "%d of %d sessions" % (min(n, la), la))
        state.set_attr(self.dots, "aria-label", "%d of %d sessions" % (min(n, la), la))
        state.set_attr(self.dots, "role", "img")
        for k, d in enumerate((self.d1, self.d2, self.d3)):
            d.classes["on"] = k < n
        c = tc.cat(m["cat"])
        self.cat_icon.classes.add("ic-" + (c.get("icon") or "leaf"))
        self.cat_name.text = c.get("short") or ""
        if i.get("next"):
            self.badge.text, self.badge.role = "Next", ["badge", "badge-warn", "bic-sparkle"]
        elif st == "learned":
            self.badge.text, self.badge.role = "Learned", ["badge", "badge-good", "bic-check"]
        elif i.get("locked"):
            self.badge.text, self.badge.role = "Later", ["badge", "bic-lock"]
        else:
            self.badge.visible = False
