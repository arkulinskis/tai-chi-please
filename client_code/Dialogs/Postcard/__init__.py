from anvil import *
from anvil.js import window

from ._anvil_designer import PostcardTemplate
from ... import state, tc

INVITE = "#session/morning/7"


class Postcard(PostcardTemplate):
    """The done screen's "Make a postcard" (guests too): a 1080 x 1350 picture made on this device (TC.postcard in
    tc-state.js: the bamboo stage with the teacher, the seal, today's thought, the grove, "N mornings", an invitation
    to a 7-minute morning). Share (the phone's share sheet when it takes pictures), Save image, Copy link. The first
    name goes on the card only when ticked. No server, no tables. Closes with None.
    card = {days, mornings, minutes, move, gentle, first_name}"""

    def __init__(self, card=None, **properties):
        super().__init__(**properties)
        self.card = dict(card or {})
        self._img = None
        self._link = str(window.location.origin) + str(window.location.pathname) + INVITE
        self.name_box.visible = bool(self.card.get("first_name"))
        self.share_button.visible = bool(window.TC.canShareFiles())
        state.set_attr(self.img, "alt", "")
        self._busy(True)

    def _busy(self, on):
        self.wait.visible = on
        self.img.visible = not on
        for b in (self.share_button, self.save_button):
            b.enabled = not on

    def _paint(self):
        c = self.card
        th = tc.thought()
        opts = {"days": list(c.get("days") or [tc.today()]), "mornings": c.get("mornings") or 1, "minutes": c.get("minutes") or 0,
                "thought": [th[0], th[1]], "move": c.get("move") or "crane", "gentle": bool(c.get("gentle")),
                "name": c.get("first_name") if self.name_box.checked else "", "host": str(window.location.host),
                "dateText": tc.day_name(tc.today())}
        self._busy(True)
        self.problem.visible = False
        try:
            self._img = window.TC.postcard(window.JSON.parse(window.JSON.stringify(opts)))
        except Exception as e:
            self._img = None
            self.wait.visible = False
            self.problem.text = "This browser couldn't paint the postcard (%s). You can still copy the link." % str(e)[:120]
            self.problem.visible = True
            self.save_button.enabled = self.share_button.enabled = False
            return
        state.set_attr(self.img, "src", self._img.url)
        state.set_attr(self.img, "alt", "Your morning postcard: %s, %s" % (state.plural(int(opts["mornings"]), "morning"), th[0]))
        self._busy(False)

    @handle("", "show")
    def _on_show(self, **event_args):
        if self._img is None:
            self._paint()

    @handle("name_box", "change")
    def name_box_change(self, **event_args):
        self._paint()

    @handle("share_button", "click")
    def share_button_click(self, **event_args):
        if self._img is None:
            return
        r = str(window.TC.sharePostcard(self._img, "My morning tai chi in the bamboo forest. Try a 7-minute morning:", self._link))
        if r == "unsupported" or r == "error":
            self.save_button_click()

    @handle("save_button", "click")
    def save_button_click(self, **event_args):
        if self._img is None:
            return
        window.TC.saveFile(self._img.url, self._img.name)
        state.toast("Postcard saved to your downloads", "ok")

    @handle("copy_button", "click")
    def copy_button_click(self, **event_args):
        if window.TC.copyText(self._link):
            state.toast("Link copied: " + self._link.split("//")[-1], "ok")
        else:
            state.toast("Couldn't copy. The link is " + self._link, "error")

    @handle("close_button", "click")
    def close_button_click(self, **event_args):
        self.raise_event("x-close-alert", value=None)
