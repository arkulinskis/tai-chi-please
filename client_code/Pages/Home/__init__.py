import datetime

import anvil.server
from anvil import *
from anvil.js import window

from ._anvil_designer import HomeTemplate
from ... import router, state, tc


def lift(n):
    return "–" if n is None else ("+" if n > 0 else "") + str(n)


class Home(HomeTemplate):
    """#home ("Today"), members only: greeting + start (length from prefs), streak and stats, the grove (28 days),
    this week, recent sessions, the next move on the path, the morning circle, the daily calendar reminder.
    Moves sessions done as a guest into the account on the first visit after signing up."""

    def __init__(self, args=(), **properties):
        super().__init__(**properties)
        try:
            tc.import_guest()
        except Exception as e:
            print("guest import:", e)
        d = anvil.server.call("get_today", tc.today())
        tc.remember_server_prefs(d["prefs"])
        st, p, prog = d["stats"], d["prefs"], d["progress"]
        nx = tc.next_move(prog)
        me = state.me()
        self.greeting.text = "%s, %s" % (tc.greeting(), (me.get("name") or "").split(" ")[0])
        state.heading(self.greeting, 1)
        self.day.text = tc.day_name(tc.today())
        self.thought.text = tc.thought()[0]
        today_done = bool(st.get("practiced_today"))
        self.done_badge.visible = today_done
        self.begin_text.text = "Practise again" if today_done else "Begin morning flow"
        self._len = p.get("minutes") or 15
        self._show_len()
        self.stage.trails = bool(p.get("trails"))
        self.stage.move = "holdtree" if today_done else (nx or "clouds")
        self.s_streak.text = str(st["streak"])
        self.s_streak_label.text = "day streak · best %s" % st["best"]
        self.s_sessions.text, self.s_minutes.text, self.s_lift.text = str(st["sessions"]), str(st["minutes"]), lift(st.get("lift"))
        self.grove.days = st["days"]
        self.grove_empty.visible = not st["sessions"]
        self.week.items = self._week(st["days"])
        recent = d.get("recent") or []
        self.recent_card.visible = bool(recent)
        self.recent.items = recent[:3]
        self.next_card.visible, self.complete_card.visible = bool(nx), not nx
        if nx:
            m = tc.move(nx)
            self.next_thumb.move = nx
            self.next_thumb.label = m["name"]
            self.next_name.text = m["name"]
            self.next_zh.text = m["zh"] + " · " + m["py"]
            la = tc.learned_at()
            self.next_progress.text = "%d of %d sessions · stage %s" % (min(prog.get(nx, 0), la), la, tc.stage_of(prog)["name"])
            state.set_attr(self.watch_link, "href", router.href("move", nx))
        c = d["circle"]
        names = c.get("names") or []
        others = max(0, c["count"] - len(names))
        self.faces_box.visible = bool(names)
        self.faces.items = [{"letter": n[:1], "i": i} for i, n in enumerate(names[:5])]
        if c["count"]:
            who = (", ".join(names[:3]) + (" and " + state.plural(others, "other") if others else "")) if names else state.plural(c["count"], "person", "people")
            self.circle_text.text = "%s practised in the last 24 hours. %s quiet minutes together." % (who, c["minutes"])
        else:
            self.circle_text.text = "Be the first to practise this morning."
        self.circle_note.text = "Your first name shows here when you practise." if p.get("circle") else "You practise anonymously."
        self.reminder_text.text = "Add a daily %s event to your phone's calendar. It reminds you; we never message you." % p["time"]

    def _week(self, days):
        today = datetime.date.today()
        monday = today - datetime.timedelta(days=today.weekday())
        out = []
        for i in range(7):
            dd = monday + datetime.timedelta(days=i)
            key = dd.isoformat()
            name = str(window.Date(key + "T12:00:00").toLocaleDateString([], {"weekday": "short"}))
            out.append({"day": dd.day, "name": name, "on": key in days, "today": dd == today})
        return out

    def _show_len(self):
        for m, b in ((7, self.len7), (15, self.len15), (25, self.len25)):
            b.role = ["seg", "on"] if m == self._len else ["seg"]
            state.set_control_attr(b, "aria-pressed", "true" if m == self._len else "false")
        state.set_attr(self.begin_link, "href", router.href("session", "morning", self._len))

    def _pick(self, m):
        self._len = m
        self._show_len()
        tc.set_prefs({"minutes": m})

    @handle("len7", "click")
    def len7_click(self, **event_args):
        self._pick(7)

    @handle("len15", "click")
    def len15_click(self, **event_args):
        self._pick(15)

    @handle("len25", "click")
    def len25_click(self, **event_args):
        self._pick(25)

    @handle("ics_button", "click")
    def ics_button_click(self, **event_args):
        tc.download_reminder()
        state.toast("Open the downloaded file to add the daily reminder", "ok")

