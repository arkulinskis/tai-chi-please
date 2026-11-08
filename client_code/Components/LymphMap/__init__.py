from anvil import *
from anvil.js import window

from ._anvil_designer import LymphMapTemplate


class LymphMap(LymphMapTemplate):
    """The body map with the numbered massage places; drawn when shown, stopped when hidden."""

    def __init__(self, **properties):
        self._map = None
        super().__init__(**properties)

    @handle("", "show")
    def _show(self, **event_args):
        if self._map is None:
            self._map = window.TC.lymphMap(self.dom_nodes["box"])

    @handle("", "hide")
    def _hide(self, **event_args):
        if self._map is not None:
            self._map.stop()
            self._map = None
