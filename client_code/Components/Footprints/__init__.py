from anvil import *
from anvil.js import window

from ._anvil_designer import FootprintsTemplate


class Footprints(FootprintsTemplate):
    """"Feet first": the move's footprints seen from above, following the teacher (TC.footprints in tc-ui.js).
    stage_node = the DOM node of the Stage component the map follows. Drawn when shown, stopped when hidden."""

    def __init__(self, **properties):
        self._move, self._mirror = "", False
        self._map = None
        self.stage_node = None
        super().__init__(**properties)

    @handle("", "show")
    def _show(self, **event_args):
        if self._map is None and self._move:
            self._map = window.TC.footprints(self.dom_nodes["box"], {"move": self._move, "mirror": self._mirror, "stage": self.stage_node})

    @handle("", "hide")
    def _hide(self, **event_args):
        if self._map is not None:
            self._map.stop()
            self._map = None

    def count(self):
        """How many footprints the map shows."""
        return int(self._map.count()) if self._map is not None else 0

    @property
    def move(self):
        return self._move

    @move.setter
    def move(self, value):
        self._move = value or ""
        if self._map is not None and self._move:
            self._map.setMove(self._move)

    @property
    def mirror(self):
        return self._mirror

    @mirror.setter
    def mirror(self, value):
        self._mirror = bool(value)
        if self._map is not None:
            self._map.mirror(self._mirror)
