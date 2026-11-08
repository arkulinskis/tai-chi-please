from anvil import *

from ._anvil_designer import FeelPickerTemplate
from ... import state, tc


class FeelPicker(FeelPickerTemplate):
    """Five feeling buttons; .value is 1-5 or None; raises "change"."""

    def __init__(self, **properties):
        self._value, self._label, self._ready = None, "How do you feel?", False
        super().__init__(**properties)
        self.chips.add_event_handler("x-pick", self._pick)
        self._ready = True
        self._draw()

    def _draw(self):
        if self._ready:
            state.set_attr(self.group, "aria-label", self._label)
            self.chips.items = [{"v": v, "name": name, "on": v == self._value} for v, name in tc.catalog()["feels"]]

    def _pick(self, value=None, **event_args):
        key = state.focus_key()
        self._value = None if value == self._value else value
        self._draw()
        state.refocus(self.chips, key)
        self.raise_event("change")

    @property
    def value(self):
        return self._value

    @value.setter
    def value(self, v):
        self._value = v
        self._draw()

    @property
    def label(self):
        return self._label

    @label.setter
    def label(self, v):
        self._label = v or "How do you feel?"
        self._draw()
