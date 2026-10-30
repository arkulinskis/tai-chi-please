"""Morning practice: logging sessions, the journal, streaks, move progress, preferences, the morning circle.

Move ids and session kinds come from the browser (web/pages/_moves.html holds the content); the server only
checks their shape. Days are the person's local date ('YYYY-MM-DD', sent by the browser), so a streak follows
their mornings, not UTC.
"""
import datetime as dt
import re

import anvil.server
from anvil.tables import app_tables
import anvil.tables as tables

from . import common as C
from . import DemoData

KINDS = {"morning", "lymph", "qigong", "form", "full24", "move", "custom"}
DAY_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
MOVE_RE = re.compile(r"^[a-z0-9-]{2,30}$")
TIME_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")
PREF_DEFAULTS = {"minutes": 15, "time": "07:00", "voice": True, "bell": True, "wind": False,
                 "mirror": False, "trails": True, "circle": False}


# ---------------------------------------------------------------------------------------------- cleaning
def clean_day(value):
    s = C.text(value, 10)
    if not DAY_RE.match(s):
        return None
    try:
        d = dt.date.fromisoformat(s)
    except ValueError:
        return None
    today = C.now().date()
    if d > today + dt.timedelta(days=1) or d < today - dt.timedelta(days=3650):
        return None
    return s


def clean_feel(value):
    if isinstance(value, bool):
        return None
    try:
        n = int(value)
    except (TypeError, ValueError):
        return None
    return n if 1 <= n <= 5 else None


def clean_moves(value):
    if not isinstance(value, (list, tuple)):
        return []
    out = []
    for m in value[:60]:
        m = C.text(m, 30)
        if MOVE_RE.match(m) and m not in out:
            out.append(m)
    return out


def clean_session(data):
    """A session dict from the browser -> (fields, None) or (None, error message)."""
    if not isinstance(data, dict):
        return None, "That session didn't arrive properly."
    day = clean_day(data.get("day"))
    if day is None:
        return None, "That date doesn't look right."
    kind = C.text(data.get("kind"), 20)
    if kind not in KINDS:
        return None, "Unknown kind of session."
    try:
        minutes = round(float(data.get("minutes")), 1)
    except (TypeError, ValueError):
        return None, "How long was the session?"
    if not 0.2 <= minutes <= 240:
        return None, "A session lasts between a few seconds and four hours."
    return {"day": day, "kind": kind, "minutes": minutes, "title": C.text(data.get("title"), 80),
            "moves": clean_moves(data.get("moves")), "feel_before": clean_feel(data.get("feel_before")),
            "feel_after": clean_feel(data.get("feel_after")), "note": C.text(data.get("note"), 1000, multiline=True)}, None


# ---------------------------------------------------------------------------------------------- reading
def session_dict(r):
    return {"id": r.get_id(), "day": r["day"], "created": C.iso(r["created"]), "minutes": r["minutes"] or 0,
            "kind": r["kind"], "title": r["title"] or "", "moves": list(r["moves"] or []),
            "feel_before": r["feel_before"], "feel_after": r["feel_after"], "note": r["note"] or ""}


def rows_of(user):
    """The person's sessions, newest practice day first (then newest first within a day)."""
    rows = list(app_tables.sessions.search(tables.order_by("created", ascending=False), user=user))
    rows.sort(key=lambda r: r["day"] or "", reverse=True)  # stable: keeps the created order within a day
    return rows


def streaks(days, today):
    have = set(days)

    def prev(d):
        return (dt.date.fromisoformat(d) - dt.timedelta(days=1)).isoformat()

    cur, d = 0, today if today in have else prev(today)
    while d in have:
        cur += 1
        d = prev(d)
    best, run, last = 0, 0, None
    for x in sorted(have):
        run = run + 1 if last and prev(x) == last else 1
        best = max(best, run)
        last = x
    return cur, best


def stats_of(rows, today):
    days = sorted({r["day"] for r in rows if r["day"]})
    cur, best = streaks(days, today)
    lifts = [r["feel_after"] - r["feel_before"] for r in rows if r["feel_after"] and r["feel_before"]]
    progress = {}
    for r in rows:
        for m in set(r["moves"] or []):
            progress[m] = progress.get(m, 0) + 1
    stats = {"sessions": len(rows), "minutes": int(round(sum(r["minutes"] or 0 for r in rows))), "streak": cur,
             "best": best, "days": days, "practiced_today": today in days,
             "lift": round(sum(lifts) / len(lifts), 1) if lifts else None}
    return stats, progress


def prefs_of(user):
    p = dict(PREF_DEFAULTS)
    p.update(user["prefs"] or {})
    return p


def _today(value):
    return clean_day(value) or C.now().date().isoformat()


def circle():
    """Who practised in the last 24 hours: a count for everyone, first names only for people who opted in."""
    since = C.now() - dt.timedelta(hours=24)
    rows = [r for r in app_tables.sessions.search(tables.order_by("created", ascending=False)) if r["created"] and r["created"] >= since]
    people, names = [], []
    for r in rows:
        u = r["user"]
        if u is None or u in people:
            continue
        people.append(u)
        if prefs_of(u).get("circle") and len(names) < 8:
            names.append(C.name_of(u).split(" ")[0])
    return {"count": len(people), "names": names, "minutes": int(round(sum(r["minutes"] or 0 for r in rows)))}


# ---------------------------------------------------------------------------------------------- callables
@anvil.server.callable
def get_circle():
    """The morning circle, for the landing page and visitors (no names unless people opted in)."""
    DemoData.ensure_loaded()
    return circle()


@anvil.server.callable(require_user=True)
def get_today(today=None):
    """Everything the Today page needs: prefs, stats, move progress, recent sessions, the circle."""
    me = C.require_user()
    DemoData.ensure_loaded()
    rows = rows_of(me)
    stats, progress = stats_of(rows, _today(today))
    return {"prefs": prefs_of(me), "stats": stats, "progress": progress,
            "recent": [session_dict(r) for r in rows[:5]], "circle": circle()}


@anvil.server.callable(require_user=True)
def get_progress():
    me = C.require_user()
    stats, progress = stats_of(rows_of(me), C.now().date().isoformat())
    return {"progress": progress, "prefs": prefs_of(me), "sessions": stats["sessions"]}


@anvil.server.callable(require_user=True)
def log_session(data, today=None):
    me = C.require_user()
    fields, err = clean_session(data)
    if err:
        return C.fail(err)
    if C.rate_limited("log_session", 40, 3600):
        return C.fail("That's a lot of sessions in one hour. Rest a little and try again later.")
    r = app_tables.sessions.add_row(user=me, created=C.now(), source="app", is_demo=False, **fields)
    stats, progress = stats_of(rows_of(me), _today(today or fields["day"]))
    return C.ok(session=session_dict(r), stats=stats, progress=progress)


@anvil.server.callable(require_user=True)
def list_sessions(today=None):
    """The journal: every session (newest first, up to a year's worth), stats and progress."""
    me = C.require_user()
    rows = rows_of(me)
    stats, progress = stats_of(rows, _today(today))
    return {"sessions": [session_dict(r) for r in rows[:400]], "stats": stats, "progress": progress}


def _own(session_id):
    me = C.require_user()
    r = C.row_by_id(app_tables.sessions, session_id)
    if r is None or r["user"] != me:
        return me, None
    return me, r


@anvil.server.callable(require_user=True)
def update_session(session_id, note=None, feel_after=None):
    me, r = _own(session_id)
    if r is None:
        return C.fail("That session isn't in your journal.")
    r["note"] = C.text(note, 1000, multiline=True)
    if feel_after is not None:
        r["feel_after"] = clean_feel(feel_after)
    return C.ok(session=session_dict(r))


@anvil.server.callable(require_user=True)
def delete_session(session_id):
    me, r = _own(session_id)
    if r is None:
        return C.fail("That session isn't in your journal.")
    r.delete()
    return C.ok()


@anvil.server.callable(require_user=True)
def import_guest_sessions(items):
    """Sessions done before signing up (kept in the browser) move into the account. Duplicates are skipped."""
    me = C.require_user()
    if not isinstance(items, (list, tuple)):
        return C.fail("Nothing to import.")
    have = {C.iso(r["created"]) for r in rows_of(me)}
    added = 0
    for it in list(items)[:300]:
        fields, err = clean_session(it)
        if err:
            continue
        created = None
        try:
            created = dt.datetime.fromisoformat(C.text(it.get("started"), 40).replace("Z", "+00:00"))
            if created.tzinfo is None:
                created = created.replace(tzinfo=dt.timezone.utc)
        except (ValueError, AttributeError):
            created = None
        if created is None or created > C.now() + dt.timedelta(minutes=5):
            created = C.now()
        if C.iso(created) in have:
            continue
        have.add(C.iso(created))
        app_tables.sessions.add_row(user=me, created=created, source="guest", is_demo=False, **fields)
        added += 1
    return C.ok(added=added)


@anvil.server.callable(require_user=True)
def save_prefs(prefs):
    me = C.require_user()
    if not isinstance(prefs, dict):
        return C.fail("Those settings didn't arrive properly.")
    p = prefs_of(me)
    if "minutes" in prefs:
        try:
            m = int(prefs["minutes"])
        except (TypeError, ValueError):
            return C.fail("Pick 7, 15 or 25 minutes.")
        if m not in (7, 15, 25):
            return C.fail("Pick 7, 15 or 25 minutes.")
        p["minutes"] = m
    if "time" in prefs:
        t = C.text(prefs["time"], 5)
        if not TIME_RE.match(t):
            return C.fail("Give the time as HH:MM.")
        p["time"] = t
    for k in ("voice", "bell", "wind", "mirror", "trails", "circle"):
        if k in prefs:
            p[k] = bool(prefs[k])
    me["prefs"] = p
    return C.ok(prefs=p)


@anvil.server.callable(require_user=True)
def admin_practice_stats():
    C.require_admin()
    now = C.now()
    rows = list(app_tables.sessions.search(tables.order_by("created", ascending=False)))
    week = [r for r in rows if r["created"] and r["created"] >= now - dt.timedelta(days=7)]
    day = [r for r in rows if r["created"] and r["created"] >= now - dt.timedelta(hours=24)]
    lifts = [r["feel_after"] - r["feel_before"] for r in rows if r["feel_after"] and r["feel_before"]]
    moves, kinds, per_day = {}, {}, {}
    for r in rows:
        kinds[r["kind"]] = kinds.get(r["kind"], 0) + 1
        for m in set(r["moves"] or []):
            moves[m] = moves.get(m, 0) + 1
    for i in range(14):
        per_day[(now.date() - dt.timedelta(days=13 - i)).isoformat()] = 0
    for r in rows:
        d = C.iso(r["created"].date()) if r["created"] else None
        if d in per_day:
            per_day[d] += 1
    return {"total": len(rows), "today": len(day), "week": len(week),
            "people_week": len({r["user"].get_id() for r in week if r["user"] is not None}),
            "minutes_week": int(round(sum(r["minutes"] or 0 for r in week))),
            "real": len([r for r in rows if not r["is_demo"]]), "guest_imports": len([r for r in rows if r["source"] == "guest"]),
            "lift": round(sum(lifts) / len(lifts), 1) if lifts else None,
            "top_moves": sorted(moves.items(), key=lambda kv: -kv[1])[:10],
            "kinds": sorted(kinds.items(), key=lambda kv: -kv[1]),
            "per_day": sorted(per_day.items())}
