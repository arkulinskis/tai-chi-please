from anvil import *
from anvil.js import window

from ._anvil_designer import GroveTemplate


class Grove(GroveTemplate):
    """One stalk per morning practised (an SVG drawn by TC.grove)."""

    def __init__(self, **properties):
        self._days, self._count, self._grow, self._ready = [], 28, False, False
        super().__init__(**properties)
        self._ready = True
        self._draw()

    def _draw(self):
        if self._ready:
            self.dom_nodes["box"].innerHTML = window.TC.grove(list(self._days or []), self._count or 28, {"grow": bool(self._grow)})

    @property
    def days(self):
        return self._days

    @days.setter
    def days(self, value):
        self._days = value or []
        self._draw()

    @property
    def count(self):
        return self._count

    @count.setter
    def count(self, value):
        self._count = value or 28
        self._draw()

    @property
    def grow(self):
        return self._grow

    @grow.setter
    def grow(self, value):
        self._grow = bool(value)
        self._draw()
