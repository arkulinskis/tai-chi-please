from anvil import *

from ._anvil_designer import LearnTemplate
from ... import router, state, tc

TABS = ["path", "moves", "form", "lymph"]
LYMPH = [("collarbone", "Above the collarbones"), ("neck-sides", "Sides of the neck"), ("ears", "Around the ears"),
         ("armpits", "Armpits"), ("belly", "Belly"), ("groin", "Hip creases"), ("thighs", "Thighs and behind the knees")]


class Learn(LearnTemplate):
    """#learn/<tab>, open to everyone. Path: the 24-step form in six stages of the grove (a move counts as learned
    after tc.learned_at() sessions). All moves: the library by category with a still of each. The 24 steps in
    order. Lymph guide: how the massage works, the order, a body map, and who should check with a doctor first."""

    def __init__(self, args=(), **properties):
        super().__init__(**properties)
        self.tab = args[0] if args and args[0] in TABS else "path"
        parts = {"path": self.path_part, "moves": self.moves_part, "form": self.form_part, "lymph": self.lymph_part}
        tabs = {"path": self.tab_path, "moves": self.tab_moves, "form": self.tab_form, "lymph": self.tab_lymph}
        for name in TABS:
            parts[name].visible = name == self.tab
            tabs[name].classes["on"] = name == self.tab
            if name == self.tab:
                state.set_attr(tabs[name], "aria-current", "page")
        getattr(self, "_" + self.tab)()

    def _path(self):
        progress = tc.progress()
        nx = tc.next_move(progress)
        la = tc.learned_at()
        self.path_intro.text = ("The 24-step form, grown one move at a time. Each morning flow teaches the next move on "
                                "your path; a move counts as learned after %d sessions with it. You can open any move "
                                "at any time." % la)
        self.learned_badge.text = "%d of %d learned" % (len(tc.learned(progress)), len(tc.catalog()["path"]))
        self.next_link.visible, self.all_badge.visible = bool(nx), not nx
        if nx:
            state.set_attr(self.next_link, "href", router.href("session", "move", nx))
            self.next_text.text = "Practise " + tc.move(nx)["name"]
        rows, seen_next = [], False
        for s in tc.catalog()["stages"]:
            cards = []
            for mid in s["moves"]:
                is_next = mid == nx
                locked = seen_next and not is_next and tc.status(mid, progress) == "new"
                if is_next:
                    seen_next = True
                cards.append({"id": mid, "progress": progress, "next": is_next, "locked": locked})
            done = all(tc.status(mid, progress) == "learned" for mid in s["moves"])
            rows.append({"stage": s, "cards": cards, "state": "done" if done else "now" if nx in s["moves"] else "todo"})
        self.stages.items = rows

    def _moves(self):
        progress = tc.progress()
        self.cats.items = [{"cat": c, "progress": progress} for c in ["warm", "qigong", "lymph", "form", "cool"]]

    def _form(self):
        self.form24.items = [{"n": f[0], "name": f[1], "zh": f[2], "id": f[3]} for f in tc.catalog()["form24"]]

    def _lymph(self):
        rows = []
        for mid, name in LYMPH:
            about = (tc.move(mid) or {}).get("about") or ""
            first = about.split(". ")[0].rstrip(".")
            rows.append({"n": len(rows) + 1, "id": mid, "name": name, "text": ", " + first + "."})
        self.lymph_steps.items = rows
