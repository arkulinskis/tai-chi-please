from anvil import *

from ._anvil_designer import FaceTemplate


class Face(FaceTemplate):
    """A first letter in the morning circle. item = {letter, i}."""

    def __init__(self, **properties):
        super().__init__(**properties)
        self.letter.text = self.item["letter"]
        self.face.classes["alt" + str(self.item["i"] % 3)] = True
