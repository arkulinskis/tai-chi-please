from anvil import *
from anvil.js import window

from ._anvil_designer import StageTemplate

DEFAULTS = {"move": "", "seed": 7, "sun_x": 0, "label": "", "trails": True, "mirror": False, "still": False, "yaw": 28}


class Stage(StageTemplate):
    """The bamboo stage + the teacher. The JS figure is made when the component is on the page (it stops itself when
    its drawing leaves the page) and stopped when it's hidden. self.fig is the live TC.Figure (or None)."""

    def __init__(self, **properties):
        self._o = dict(DEFAULTS)
        self.fig = None
        self.on_key = None
        super().__init__(**properties)

    def _opts(self):
        o = self._o
        opts = {"seed": o["seed"] or 7, "trails": bool(o["trails"]) and not o["still"], "mirror": bool(o["mirror"]),
                "label": o["label"] or "A tai chi teacher among bamboo", "yaw": o["yaw"], "move": o["move"] or None,
                "still": bool(o["still"])}
        if o["sun_x"]:
            opts["sunX"] = o["sun_x"]
        if self.on_key:
            opts["onKey"] = self.on_key
        return opts

    @handle("", "show")
    def _show(self, **event_args):
        if self.fig is None:
            self.fig = window.TC.mountStage(self.dom_nodes["box"], self._opts())

    @handle("", "hide")
    def _hide(self, **event_args):
        if self.fig is not None:
            self.fig.stop()
            self.fig = None

    def set_move(self, move_id, play=True):
        """Show another move (keeps the camera, mirror and trails)."""
        self._o["move"] = move_id
        if self.fig is not None and window.TC.moveKeys(move_id):
            self.fig.setKeys(window.TC.moveKeys(move_id))
            if self._o["still"]:
                self.fig.time(window.TC.heroTime(move_id))
            elif play:
                self.fig.play()

    def _set(self, name, value):
        self._o[name] = value
        if name == "move" and value and self.fig is not None:
            self.set_move(value)

    @property
    def move(self):
        return self._o["move"]

    @move.setter
    def move(self, v):
        self._set("move", v)

    @property
    def seed(self):
        return self._o["seed"]

    @seed.setter
    def seed(self, v):
        self._set("seed", v)

    @property
    def sun_x(self):
        return self._o["sun_x"]

    @sun_x.setter
    def sun_x(self, v):
        self._set("sun_x", v)

    @property
    def label(self):
        return self._o["label"]

    @label.setter
    def label(self, v):
        self._set("label", v)

    @property
    def trails(self):
        return self._o["trails"]

    @trails.setter
    def trails(self, v):
        self._set("trails", v)

    @property
    def mirror(self):
        return self._o["mirror"]

    @mirror.setter
    def mirror(self, v):
        self._set("mirror", v)

    @property
    def still(self):
        return self._o["still"]

    @still.setter
    def still(self, v):
        self._set("still", v)

    @property
    def yaw(self):
        return self._o["yaw"]

    @yaw.setter
    def yaw(self, v):
        self._set("yaw", v)
