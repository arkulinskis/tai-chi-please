"""Page addresses: #name/arg1/arg2 -> a page Form (open_form), with sign-in rules. Same addresses as the JavaScript
version (#session/morning/15, #move/crane, #learn/lymph ...), so shared links and calendar reminders keep working.

Links in templates are plain <a href="#practice">; code calls router.go("session", "morning", 15).

    PAGES[name] = (who may open it, browser-tab title)   who: None = anyone, "guest" = signed out only, "user", "admin"
    NAV = the main menu (header + phone tab bar): (page, label, icon, who). Visitors see Practice and Learn (a session
          needs no account), plus "Join" in the phone tab bar; members see Today, Practice, Learn, Journal and "You".
New page: add it to PAGES, to _form() and (if it belongs in the menu) to NAV.
"""
import anvil
import anvil.js
from anvil.js import window

from . import state

PAGES = {
    "landing": (None, "Morning tai chi in the bamboo forest"),
    "auth": ("guest", "Sign in"),
    "home": ("user", "Today"),
    "practice": (None, "Practice"),
    "learn": (None, "Learn"),
    "move": (None, "Move"),
    "session": (None, "Practice"),
    "journal": ("user", "Journal"),
    "profile": ("user", "Your profile"),
    "admin": ("admin", "Admin"),
}
NAV = [("home", "Today", "sunrise", "user"), ("practice", "Practice", "play", None), ("learn", "Learn", "book", None),
       ("journal", "Journal", "calendar", "user")]
APP_NAME = "Tai Chi Please"
_r: dict = {"after": "", "listening": False, "page": None}


def nav_links(page):
    me = state.me()
    lit = "learn" if page == "move" else page  # a move belongs to Learn
    return [{"page": p, "label": label, "icon": icon, "on": p == lit} for p, label, icon, who in NAV if me or not who]


def _form(name):
    """The page's Form class (imported when first needed, so start-up stays quick)."""
    if name == "landing":
        from .Pages.Landing import Landing
        return Landing
    if name == "auth":
        from .Pages.Auth import Auth
        return Auth
    if name == "home":
        from .Pages.Home import Home
        return Home
    if name == "practice":
        from .Pages.Practice import Practice
        return Practice
    if name == "learn":
        from .Pages.Learn import Learn
        return Learn
    if name == "move":
        from .Pages.Move import Move
        return Move
    if name == "session":
        from .Pages.Session import Session
        return Session
    if name == "journal":
        from .Pages.Journal import Journal
        return Journal
    if name == "profile":
        from .Pages.Profile import Profile
        return Profile
    from .Pages.Admin import Admin
    return Admin


def parse(hash_text):
    h = (hash_text or "").lstrip("#").lstrip("!").lstrip("/").split("?")[0]
    parts = [window.decodeURIComponent(p) for p in h.split("/") if p]
    return (parts[0] if parts else ""), parts[1:]


def href(name, *args):
    """'#name/arg1/arg2' with every part URL-encoded (row ids contain brackets and commas)."""
    return "#" + "/".join([name] + [window.encodeURIComponent(str(a)) for a in args if a not in (None, "")])


def home_page():
    return "home" if state.me() else "landing"


def title_for(name, args):
    if name == "move" and args:
        from . import tc
        m = tc.move(args[0])
        if m:
            return m["name"]
    return PAGES[name][1]


def show():
    """Open the page for the current address."""
    asked = parse(window.location.hash)[0]
    name, args = parse(window.location.hash)
    if name not in PAGES:
        name, args = home_page(), []
    who = PAGES[name][0]
    if who == "guest" and state.me():
        name, args = "home", []
    elif who in ("user", "admin") and not state.me():
        _r["after"] = window.location.hash
        name, args = "auth", []
    elif who == "admin" and not state.is_admin():
        state.toast("That page is for admins only.", "error")
        name, args = "home", []
    if asked and asked != name:
        window.history.replaceState(None, "", href(name, *args))  # page and address agree after a redirect
    window.document.title = title_for(name, args) + " · " + APP_NAME
    window.UI_READY = False
    old = _r["page"]
    if old is not None and hasattr(old, "leave"):
        old.leave()  # stop the session's sound, timers and wake lock
    page = _form(name)(args=args)
    _r["page"] = page
    anvil.open_form(page)
    shell = getattr(page, "layout", None)
    if shell is not None and hasattr(shell, "refresh"):
        shell.refresh(name)  # Anvil reuses the layout between pages: tell it who is signed in and which page is open
    window.scrollTo(0, 0)
    window.UI_READY = True  # tests and screenshots wait for this


def go(name, *args):
    """Go to a page. Same address again = reload the page."""
    target = href(name, *args)
    if window.location.hash == target:
        show()
    else:
        window.location.hash = target


def replace(name, *args):
    """Change the address without opening anything (a page that switches its own view)."""
    window.history.replaceState(None, "", href(name, *args))


def after_sign_in():
    """Where to go once someone signs in: the page they were heading for, or Today."""
    target = _r["after"]
    _r["after"] = ""
    if target and target != window.location.hash:
        window.location.hash = target
    else:
        go("home")


def remember_after(target):
    _r["after"] = target


def _on_hash(event):
    show()


def start():
    if not _r["listening"]:
        window.addEventListener("hashchange", anvil.js.report_exceptions(_on_hash))
        _r["listening"] = True
    show()
