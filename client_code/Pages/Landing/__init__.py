from anvil import *
from anvil.js import window

from ._anvil_designer import LandingTemplate
from ... import state, tc

# The app's video on the Addanapp YouTube channel (APP_MAKER/youtube/manifest.json), shown in the Watch section.
YT_VIDEO = "arxqoGf9PlM"
CYCLE = ["clouds", "horse-mane", "crane", "heel-kick", "single-whip", "snake-rooster"]


class Landing(LandingTemplate):
    """#landing (also "About" for members): a live teacher cycling through six moves of the form among the bamboo,
    the Watch section, the morning's arc, how it works, features, the lymph section, questions. Static copy lives
    in the template; the hero's caption and the morning circle are set here."""

    def __init__(self, args=(), **properties):
        super().__init__(**properties)
        me = state.me()
        self.guest_cta.visible = not me
        self.member_cta.visible = bool(me)
        self.band_guest.visible = not me
        self.band_member.visible = bool(me)
        self.circle_box.visible = False
        self._i, self._timer, self._shown = 0, None, False
        self._tick = self._next  # one Python callable for every setTimeout
        self.dom_nodes["yt_cover"].addEventListener("click", self._play)
        self._caption()
        c = state.call_quiet("get_circle")
        if c and c.get("count"):
            self.circle_label.text = state.plural(c["count"], "person", "people") + " practised today"
            self.circle_box.visible = True

    def _caption(self):
        mid = CYCLE[self._i % len(CYCLE)]
        m = tc.move(mid) or {}
        self.cap_seal.text = (m.get("zh") or "")[:1]
        self.cap_name.text = m.get("name") or ""
        self.cap_zh.text = (m.get("zh") or "") + " · " + (m.get("py") or "")
        return mid, m

    @handle("", "show")
    def _on_show(self, **event_args):
        self._shown = True
        self.hero.set_move(CYCLE[self._i % len(CYCLE)])
        self._schedule()

    @handle("", "hide")
    def _on_hide(self, **event_args):
        self._shown = False
        if self._timer:
            window.clearTimeout(self._timer)
            self._timer = None

    def _schedule(self):
        mid = CYCLE[self._i % len(CYCLE)]
        if self._timer:
            window.clearTimeout(self._timer)
        self._timer = window.setTimeout(self._tick, max(8000, (tc.move(mid) or {}).get("loop", 8) * 1000))

    def _next(self):
        self._timer = None
        if not self._shown:
            return
        self._i += 1
        mid, m = self._caption()
        self.hero.set_move(mid)
        self._schedule()

    def _play(self, event):
        """Swap the video's cover for YouTube's player (privacy-enhanced); nothing loads from YouTube before this click."""
        self.dom_nodes["yt_frame"].innerHTML = (
            '<iframe src="https://www.youtube-nocookie.com/embed/' + YT_VIDEO + '?autoplay=1&rel=0&playsinline=1" '
            'title="Tai Chi Please video" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen '
            'referrerpolicy="strict-origin-when-cross-origin"></iframe>')
