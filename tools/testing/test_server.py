"""Server tests against the strict mock of Anvil (tools/testing/mock).

    python tools/testing/test_server.py          (no -I: reads anvil.yaml)          -> prints ALL OK, or the first failure

call(name, ...) runs a server function the way the browser does: by name, with require_user enforced,
and the reply must be JSON (a datetime or a row in a reply fails here, like it would break the page).
Add tests for every new server function: the happy path, bad input, and someone who isn't allowed.
"""
import datetime as dt
import importlib
import json
import os
import pathlib
import shutil
import sys
import tempfile

HERE = pathlib.Path(__file__).resolve().parent
PROJECT = HERE.parents[1]
_tmp = pathlib.Path(tempfile.mkdtemp())
shutil.copytree(PROJECT / "server_code", _tmp / "app")
(_tmp / "app" / "__init__.py").write_text("")
os.environ["ANVIL_APP_YAML"] = str(PROJECT / "anvil.yaml")  # the mock's tables follow the app's own schema
sys.path[:0] = [str(HERE / "mock"), str(_tmp)]
import anvil.server  # noqa: E402
import anvil.users  # noqa: E402
from anvil.tables import app_tables as T  # noqa: E402

M = {p.stem: importlib.import_module("app." + p.stem) for p in sorted((PROJECT / "server_code").glob("*.py"))}
now = dt.datetime.now(dt.timezone.utc)


def call(name, *args):
    r = anvil.server.call(name, *args)
    json.dumps(r)  # strict: must be JSON-able
    return r


def as_user(row):
    anvil.users.CURRENT[0] = row
    anvil.server.session.use(row.get_id() if row is not None else None)


def denied(name, *args):
    try:
        call(name, *args)
    except anvil.server.PermissionDenied:
        return True
    return False


def ok(r, msg=""):
    assert isinstance(r, dict) and r.get("ok"), (msg, r)
    return r


def bad(r, msg=""):
    assert isinstance(r, dict) and r.get("ok") is False and r.get("error"), (msg, r)
    return r


def person(email, name=None, **kw):
    return T.users.add_row(email=email, enabled=True, signed_up=now, display_name=name, **kw)


# ---------------------------------------------------------------------------------- accounts
admin = person("arkulinskis@gmail.com", "The Admin")
ana = person("ana@example.com", "Ana")
bob = person("bob@example.com")

as_user(None)
assert call("get_me") is None
assert denied("update_profile", "X")
as_user(admin)
assert call("get_me")["is_admin"] is True, "ADMIN_EMAILS become admins on first sign-in"
as_user(ana)
me = call("get_me")
assert me["name"] == "Ana" and me["is_admin"] is False
assert ana["last_seen"] is not None
as_user(bob)
assert call("get_me")["name"] == "Bob", "a name comes from the email when none is set"
bad(call("update_profile", " x "))
assert ok(call("update_profile", "  Bob   Stone "))["me"]["name"] == "Bob Stone"

# ---------------------------------------------------------------------------------- feedback
as_user(None)
bad(call("submit_feedback", "bug", "hi"))
ok(call("submit_feedback", "bug", "The button is broken", "guest@example.com", {"page": "#home", "evil": "x" * 9999}))
fb = T.feedback.search()[0]
assert fb["name"] == "Guest" and fb["email"] == "guest@example.com" and "evil" not in fb["context"] and fb["status"] == "new"
for i in range(4):
    ok(call("submit_feedback", "idea", "Idea number %d" % i))
bad(call("submit_feedback", "idea", "One too many this hour"), "rate limit")
as_user(ana)
ok(call("submit_feedback", "nonsense-kind", "Signed-in feedback"))
assert T.feedback.get(message="Signed-in feedback")["kind"] == "other"
assert denied("list_feedback")
as_user(admin)
lst = call("list_feedback")
assert lst["counts"]["new"] == 6 and len(lst["items"]) == 6
fid = lst["items"][0]["id"]
ok(call("set_feedback_status", fid, "done", "Fixed it"))
assert call("list_feedback", "done")["items"][0]["note"] == "Fixed it"
bad(call("set_feedback_status", fid, "weird"))
bad(call("set_feedback_status", "nope", "done"))
ok(call("delete_feedback", fid))
assert len(call("list_feedback")["items"]) == 5

# ---------------------------------------------------------------------------------- admin
as_user(ana)
for fn, args in [("admin_overview", ()), ("list_users", ()), ("set_admin", (bob.get_id(), True)), ("demo_load", ()), ("demo_remove", ())]:
    assert denied(fn, *args), fn
as_user(admin)
ov = call("admin_overview")
assert ov["users"] == 3 and ov["admins"] == 1 and ov["feedback_new"] == 5
assert len(call("list_users")["users"]) == 3 and len(call("list_users", "bob")["users"]) == 1
ok(call("set_admin", bob.get_id(), True))
assert bob["is_admin"] is True
bad(call("set_admin", admin.get_id(), False), "can't remove your own admin")
ok(call("set_enabled", bob.get_id(), False))
assert bob["enabled"] is False
bad(call("set_enabled", admin.get_id(), False))
ok(call("set_enabled", bob.get_id(), True))
ok(call("set_admin", bob.get_id(), False))
assert bob["is_admin"] is False

# ---------------------------------------------------------------------------------- demo data + practice
today = now.date().isoformat()
yesterday = (now.date() - dt.timedelta(days=1)).isoformat()
as_user(None)
circ = call("get_circle")
assert M["DemoData"].state() == "loaded" and circ["count"] >= 4, "demo loads on first visit and people practised this morning"
assert "Rafael" not in circ["names"], "people who didn't opt in stay anonymous"
assert all("@" not in n for n in circ["names"])
assert denied("get_today", today)
assert denied("log_session", {"day": today, "kind": "morning", "minutes": 15})
assert denied("list_sessions")
assert denied("save_prefs", {"voice": False})

as_user(ana)
t0 = call("get_today", today)
assert t0["stats"]["sessions"] == 0 and t0["stats"]["streak"] == 0 and t0["prefs"]["minutes"] == 15 and t0["circle"]["count"] >= 4
good = {"day": yesterday, "kind": "morning", "minutes": 15.3, "title": "Morning flow", "moves": ["wuji", "commence", "commence", "BAD id!", "horse-mane"],
        "feel_before": 2, "feel_after": 4, "note": "Lovely"}
r = ok(call("log_session", good, today))
assert r["session"]["moves"] == ["wuji", "commence", "horse-mane"], "move ids are cleaned and de-duplicated"
assert r["stats"]["streak"] == 1 and r["progress"]["commence"] == 1
for badone in [dict(good, day="2020-13-40"), dict(good, day="nope"), dict(good, kind="party"), dict(good, minutes=0), dict(good, minutes="x"), "junk"]:
    bad(call("log_session", badone, today), badone)
r = ok(call("log_session", dict(good, day=today, feel_before=9, feel_after=True), today))
assert r["session"]["feel_before"] is None and r["session"]["feel_after"] is None, "bad feelings are dropped, not stored"
st = r["stats"]
assert st["streak"] == 2 and st["practiced_today"] and st["sessions"] == 2
assert call("get_today", today)["progress"]["commence"] == 2
j = call("list_sessions", today)
assert len(j["sessions"]) == 2 and j["stats"]["best"] == 2 and j["stats"]["lift"] == 2.0
sid = j["sessions"][0]["id"]
ok(call("update_session", sid, "  Felt like a crane  ", 5))
assert call("list_sessions")["sessions"][0]["note"] == "Felt like a crane"

as_user(bob)
bad(call("update_session", sid, "hacked"), "can't edit someone else's session")
bad(call("delete_session", sid), "can't delete someone else's session")
bad(call("delete_session", "nonsense"))
assert call("list_sessions")["sessions"] == []

# guest sessions move into the account; running it twice doesn't duplicate
guest = [{"day": yesterday, "kind": "lymph", "minutes": 9, "moves": ["belly"], "started": (now - dt.timedelta(days=1)).isoformat()},
         {"day": today, "kind": "qigong", "minutes": 8, "moves": ["heavens"], "started": now.isoformat()},
         {"day": "bad", "kind": "qigong", "minutes": 8}]
assert ok(call("import_guest_sessions", guest))["added"] == 2
assert ok(call("import_guest_sessions", guest))["added"] == 0
bad(call("import_guest_sessions", "x"))
assert call("get_today", today)["stats"]["streak"] == 2

# preferences
p = ok(call("save_prefs", {"minutes": 25, "time": "06:30", "voice": False, "circle": 1, "evil": "x"}))["prefs"]
assert p["minutes"] == 25 and p["time"] == "06:30" and p["voice"] is False and p["circle"] is True and "evil" not in p
bad(call("save_prefs", {"minutes": 12}))
bad(call("save_prefs", {"time": "25:99"}))
bad(call("save_prefs", "x"))
assert "Bob" in call("get_circle")["names"], "opting in shows your first name in the circle"

as_user(ana)
ok(call("delete_session", sid))
assert len(call("list_sessions")["sessions"]) == 1

# admin: stats, demo data
assert denied("admin_practice_stats")
as_user(admin)
ps = call("admin_practice_stats")
assert ps["today"] >= 4 and ps["guest_imports"] == 2 and ps["real"] == 3 and len(ps["per_day"]) == 14 and ps["top_moves"]
ok(call("demo_remove"))
assert M["DemoData"].state() == "removed" and not T.users.search(is_demo=True) and not T.sessions.search(is_demo=True)
assert len(T.sessions.search()) == 3, "removing demo data keeps real sessions"
as_user(None)
assert call("get_circle")["count"] == 2
assert M["DemoData"].state() == "removed", "removed demo data doesn't come back by itself"
as_user(admin)
ok(call("demo_load"))
ok(call("demo_load"))
n_demo = len(T.sessions.search(is_demo=True))
ok(call("demo_load"))
assert len(T.sessions.search(is_demo=True)) == n_demo, "reloading replaces the demo instead of doubling it"
assert call("admin_overview")["sessions"] == n_demo + 3

# ---------------------------------------------------------------------------------- Privacy & Terms
if "legal_server" in M:
    as_user(ana)
    st = call("legal_state")
    assert st["signedIn"] and st["accepted_version"] is None
    ok(call("legal_accept", st["version"], "signup"))
    assert ana["legal_source"] == "signup" and call("legal_state")["accepted_version"] == st["version"]

# ---------------------------------------------------------------------------------- every callable is covered by a permission check
# A callable that changes data without require_user / a C.require_* check is a security hole. List the public ones here.
PUBLIC = {"session_ping", "get_me", "submit_feedback", "get_circle", "legal_state", "legal_accept"}
for name, (f, need) in sorted(anvil.server.CALLABLES.items()):
    if name in PUBLIC:
        continue
    assert need, "%s is callable by anyone: add require_user=True (or list it in PUBLIC in test_server.py)" % name

print("ALL OK (%d server functions)" % len(anvil.server.CALLABLES))
