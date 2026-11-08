"""Tai Chi Please's practice helpers for the Forms pages (the engines stay JavaScript in theme/assets/tc-*.js).

    tc.move(id) / tc.MOVES / tc.cat(c) ...   the move library (from tc-moves.js, read once as JSON)
    tc.prefs() / tc.set_prefs(part)          practice settings: always kept in this browser, saved to the account too
    tc.progress()                            {move id: sessions} from the account, or this browser for guests
    tc.import_guest()                        sessions done before signing up move into the account
    tc.status / next_move / learned / stage_of   the learning path (same rules as TC.* in tc-moves.js)
    tc.today(), tc.greeting(), tc.thought(), tc.mmss(), tc.feel_name()
"""
import json

import anvil.server
from anvil.js import window

from . import state

KEY = "taichiplease"  # browser storage prefix (UI.config.key), the same as the JavaScript version
PREF_DEFAULTS = {"minutes": 15, "time": "07:00", "voice": True, "bell": True, "wind": False, "music": True,
                 "mirror": False, "trails": True, "circle": False}
_c: dict = {}


def catalog():
    if "moves" not in _c:
        data = json.loads(window.TC.catalogJSON())
        _c.update(data)
        _c["by_id"] = {m["id"]: m for m in data["moves"]}
    return _c


def moves():
    return catalog()["moves"]


def move(move_id):
    return catalog()["by_id"].get(move_id)


def cat(c):
    return catalog()["cats"].get(c) or {}


def kind(k):
    return catalog()["kinds"].get(k) or {}


def learned_at():
    return catalog()["learned_at"]


# ---------------------------------------------------------------- browser storage (plain JSON: real dicts in Python)
def _get(key, default):
    try:
        raw = window.localStorage.getItem(KEY + "." + key)
        return default if raw is None else json.loads(raw)
    except Exception:
        return default


def _set(key, value):
    try:
        window.localStorage.setItem(KEY + "." + key, json.dumps(value))
    except Exception:
        pass


def guest_sessions():
    return _get("guest.sessions", []) or []


# ---------------------------------------------------------------- preferences
def prefs():
    p = dict(PREF_DEFAULTS)
    p.update(_get("prefs", {}) or {})
    return p


def remember_server_prefs(p):
    if p:
        _set("prefs", p)


def set_prefs(part):
    """Change settings: kept in this browser, and saved to the account when signed in. Returns the new settings."""
    p = prefs()
    p.update(part)
    _set("prefs", p)
    if state.me():
        try:
            r = anvil.server.call_s("save_prefs", part)
            if isinstance(r, dict) and r.get("prefs"):
                _set("prefs", r["prefs"])
                return dict(PREF_DEFAULTS, **r["prefs"])
        except Exception as e:
            state.toast(str(e), "error")
    return p


# ---------------------------------------------------------------- progress
def local_progress():
    p: dict = {}
    for s in guest_sessions():
        for mid in s.get("moves") or []:
            p[mid] = p.get(mid, 0) + 1
    return p


def progress():
    if not state.me():
        return local_progress()
    r = anvil.server.call_s("get_progress")
    remember_server_prefs(r.get("prefs"))
    return r.get("progress") or {}


def import_guest():
    """After signing up or in: move the sessions done as a guest into the account."""
    items = guest_sessions()
    if not state.me() or not items:
        return 0
    r = anvil.server.call_s("import_guest_sessions", items)
    _set("guest.sessions", [])
    added = (r or {}).get("added") or 0
    if added:
        state.toast(state.plural(added, "earlier session") + " moved into your journal", "ok")
    return added


def status(move_id, prog):
    n = (prog or {}).get(move_id, 0)
    return "learned" if n >= learned_at() else "learning" if n > 0 else "new"


def next_move(prog):
    for mid in catalog()["path"]:
        if status(mid, prog) != "learned":
            return mid
    return None


def learned(prog):
    return [mid for mid in catalog()["path"] if status(mid, prog) == "learned"]


def stage_of(prog):
    nx = next_move(prog)
    stages = catalog()["stages"]
    if not nx:
        return stages[-1]
    return [s for s in stages if nx in s["moves"]][0]


# ---------------------------------------------------------------- small helpers
def today():
    return str(window.TC.today())


def greeting():
    return str(window.TC.greeting())


def thought():
    t = window.TC.thought()
    return str(t[0]), str(t[1])


def mmss(secs):
    return str(window.TC.mmss(secs))


def feel_name(n):
    for v, name in catalog()["feels"]:
        if v == n:
            return name
    return ""


def day_name(iso, short=False):
    """'Saturday, 7 November' (or 'Sat, 7 Nov') in the browser's language, like the JavaScript version."""
    opts = {"weekday": "short", "day": "numeric", "month": "short"} if short else {"weekday": "long", "day": "numeric", "month": "long"}
    return str(window.Date(iso + "T12:00:00").toLocaleDateString([], opts))


def download_reminder():
    p = prefs()
    window.TC.downloadReminder(p.get("time"), p.get("minutes"))
