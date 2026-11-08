import datetime

import anvil.server
from anvil import *
from anvil.js import window

from ._anvil_designer import JournalTemplate
from ... import state, tc


def month_label(y, m):
    return str(window.Date("%04d-%02d-15T12:00:00" % (y, m)).toLocaleDateString([], {"month": "long", "year": "numeric"}))


class Journal(JournalTemplate):
    """#journal, members only: stats, a month calendar (days practised, browse months), every session with how it
    felt before and after and a note; edit the note and feeling (Dialogs/EditSession) or delete."""

    def __init__(self, args=(), **properties):
        super().__init__(**properties)
        t = datetime.date.today()
        self._y, self._m = t.year, t.month
        self.load()

    def load(self):
        self.data = anvil.server.call("list_sessions", tc.today())
        st = self.data["stats"]
        lift = st.get("lift")
        self.s_streak.text, self.s_best.text = str(st["streak"]), str(st["best"])
        self.s_sessions.text, self.s_minutes.text, self.s_days.text = str(st["sessions"]), str(st["minutes"]), str(len(st["days"]))
        self.s_lift.text = "–" if lift is None else ("+" if lift > 0 else "") + str(lift)
        groups = []
        for s in self.data["sessions"]:
            k = s["day"][:7]
            if not groups or groups[-1]["k"] != k:
                groups.append({"k": k, "name": month_label(int(k[:4]), int(k[5:7])), "items": [], "host": self})
            groups[-1]["items"].append(s)
        self.months.items = groups
        self.empty.visible = not groups
        self._cal()

    def _cal(self):
        counts: dict = {}
        for s in self.data["sessions"]:
            counts[s["day"]] = counts.get(s["day"], 0) + 1
        y, m = self._y, self._m
        first = datetime.date(y, m, 1)
        nxt = datetime.date(y + (m == 12), m % 12 + 1, 1)
        n = (nxt - first).days
        today = tc.today()
        cells: list = [{"empty": True} for _ in range(first.weekday())]
        for d in range(1, n + 1):
            key = datetime.date(y, m, d).isoformat()
            cells.append({"d": d, "count": counts.get(key, 0), "today": key == today})
        self.days.items = cells
        self.month_name.text = month_label(y, m)
        prefix = "%04d-%02d" % (y, m)
        self.month_count.text = state.plural(len([k for k in counts if k.startswith(prefix)]), "morning")

    def _shift(self, step):
        m = self._m + step
        self._y += (m - 1) // 12
        self._m = (m - 1) % 12 + 1
        self._cal()

    @handle("prev_month", "click")
    def prev_month_click(self, **event_args):
        self._shift(-1)

    @handle("next_month", "click")
    def next_month_click(self, **event_args):
        self._shift(1)

    # called by Items/JournalEntry
    def edit(self, s):
        from ...Dialogs.EditSession import EditSession
        r = alert(EditSession(session=s), buttons=[], role="app-dialog", title=s.get("title") or "Practice")
        if r:
            state.toast("Saved", "ok")
            self.load()

    def delete(self, s):
        if confirm("It leaves your journal, your streak and your progress on the path.", title="Delete this session?",
                   buttons=[("Cancel", False), ("Delete", True)], role="app-dialog"):
            if state.call("delete_session", s["id"]):
                self.load()
