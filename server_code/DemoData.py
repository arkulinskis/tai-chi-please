"""Demo content, so the app never looks empty: a handful of fictional early risers and a month of their
morning sessions (some of them this morning), so the morning circle and the admin stats are alive.
Loaded automatically the first time anyone opens the app (ensure_loaded), removed or reloaded from
Admin -> Demo data. Removing it is remembered: it doesn't come back.

Demo users have is_demo=True and @example.com emails; they can't sign in (no password). Every demo row
is flagged is_demo=True, so remove() deletes exactly what load() added.
"""
import datetime as dt

from anvil.tables import app_tables

from . import common as C

# name, email, days a week they practise (out of 7), usual length, a typical note
DEMO_USERS = [
    ("Mei Lin Okafor", "meilin.demo@example.com", 7, 25, "Mist on the window, warm tea after. The clouds felt smooth today."),
    ("Theo Martin", "theo.demo@example.com", 5, 15, "Shoulders much looser than yesterday."),
    ("Ines Ozola", "ines.demo@example.com", 6, 15, "Did the lymph flow before work. Face less puffy."),
    ("Rafael Duarte", "rafael.demo@example.com", 4, 7, "Seven minutes on the balcony. Better than none."),
    ("Hana Sato", "hana.demo@example.com", 6, 25, "Held the golden rooster for three breaths!"),
    ("Grace Mensah", "grace.demo@example.com", 3, 15, "Slept badly, felt much brighter after."),
]
KINDS = ["morning", "morning", "morning", "lymph", "qigong", "form"]
MOVES = {
    "morning": ["wuji", "neck", "waist", "lbreath", "collarbone", "neck-sides", "armpits", "belly", "groin", "commence", "horse-mane", "warm-hands"],
    "lymph": ["lbreath", "collarbone", "neck-sides", "ears", "face", "armpits", "arm-sweeps", "belly", "groin", "thighs"],
    "qigong": ["wuji", "heavens", "archer", "separate", "owl", "bounce", "holdtree", "warm-hands"],
    "form": ["wuji", "commence", "horse-mane", "crane", "brush-knee", "lute", "closing"],
}
TITLES = {"morning": "Morning flow", "lymph": "Lymph flow", "qigong": "Morning qigong", "form": "Form practice"}
# Tables that hold demo rows (each has an is_demo column). Children before parents.
DEMO_TABLES = ["sessions"]


def state():
    return C.get_setting("demo", "never")  # "never" | "loaded" | "removed"


def ensure_loaded():
    """Call from the app's main data callables: loads the demo once, unless an admin removed it."""
    if state() == "never":
        load()


def load():
    remove(remember=False)
    now = C.now()
    for i, (name, email, per_week, minutes, note) in enumerate(DEMO_USERS):
        u = app_tables.users.get(email=email) or app_tables.users.add_row(email=email, enabled=False)
        u.update(display_name=name, is_demo=True, signed_up=now - dt.timedelta(days=40 + i * 3),
                 prefs={"minutes": minutes, "time": "0%d:%s" % (6 + i % 3, "30" if i % 2 else "00"), "voice": True, "bell": True,
                        "wind": i % 2 == 0, "mirror": False, "trails": True, "circle": i != 3})
        for back in range(30):
            # a steady, slightly irregular rhythm; most people practised this morning
            if back > 0 and ((back * 7 + i * 3) % 7) >= per_week:
                continue
            if back == 0 and i == 5:
                continue
            kind = KINDS[(back + i) % len(KINDS)]
            created = now - dt.timedelta(days=back, hours=1 + (i * 37 + back * 13) % 5, minutes=(i * 11 + back * 7) % 60)
            before = 2 + (back + i) % 3
            app_tables.sessions.add_row(
                user=u, day=created.date().isoformat(), created=created, kind=kind, title=TITLES[kind],
                minutes=float(minutes if kind == "morning" else {"lymph": 9, "qigong": 8, "form": 10}[kind]),
                moves=MOVES[kind], feel_before=before, feel_after=min(5, before + 1 + (back + i) % 2),
                note=note if back % 6 == 0 else "", source="app", is_demo=True)
    C.set_setting("demo", "loaded")
    return counts()


def remove(remember=True):
    for name in DEMO_TABLES:
        for r in getattr(app_tables, name).search(is_demo=True):
            r.delete()
    for u in app_tables.users.search(is_demo=True):
        u.delete()
    if remember:
        C.set_setting("demo", "removed")
    return counts()


def counts():
    out = {"users": len(app_tables.users.search(is_demo=True))}
    for name in DEMO_TABLES:
        out[name] = len(getattr(app_tables, name).search(is_demo=True))
    return out
