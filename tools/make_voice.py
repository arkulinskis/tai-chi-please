"""Record the teacher's voice: one MP3 per spoken line, in theme/assets/vo-<hash>.mp3.

The lines come from the app itself (TC.voiceLines() in theme/assets/tc-voice.js: the cues, every move's name + first step,
its other steps and its tip), read with Node. Each one is spoken by Kokoro (https://github.com/hexgrad/kokoro), an
open-source neural text-to-speech model (Apache 2.0), so the voice is natural and the same in every browser.

Run it after changing any move text, step, tip or cue:
    python tools/make_voice.py            # records only new or changed lines, deletes clips no line uses
    python tools/make_voice.py --all      # re-records everything
Needs: node, and a Python with `pip install kokoro soundfile` (a GPU makes it ~10x faster, the CPU works too).
To change the voice or speed, edit VOICE/SPEED here and VER in _voice.html (so every file name changes).
"""
import json
import re
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
ASSETS = HERE / "theme" / "assets"
VER = "k1"          # must match VER in theme/assets/tc-voice.js
VOICE = "af_heart"  # Kokoro's warmest English voice
SPEED = 0.86        # a little slower than conversation: this is tai chi
RATE = 24000
SAY_AS = {"in to ear height": "inward, to the height of your ears"}  # phrases the model misreads, and how to say them

NODE = r"""
const fs = require('fs'), P = process.argv[1];
function js(f) { return fs.readFileSync(P + f, 'utf8'); }
global.window = global; global.UI = { ICONS: {}, icon: () => '', esc: s => s, page() {} };
global.document = { createElementNS() { return { setAttribute() {}, appendChild() {}, style: {} }; }, createElement() { return { style: {} }; } };
for (const f of ['tc-figure.js', 'tc-moves.js', 'tc-voice.js']) eval(js(f));
console.log(JSON.stringify(TC.voiceLines()));
"""


def fnv(s):
    h = 0x811C9DC5
    for unit in [int.from_bytes(s.encode("utf-16-le")[i:i + 2], "little") for i in range(0, len(s.encode("utf-16-le")), 2)]:
        h = ((h ^ unit) * 0x01000193) & 0xFFFFFFFF
    return "%08x" % h


def file_for(text):
    return ASSETS / ("vo-%s.mp3" % fnv(VER + "|" + text))


def spoken(text):
    """What the model reads: the same words, with brackets turned into pauses."""
    t = re.sub(r"\s*\(([^)]*)\)", r", \1,", text.replace("!", ""))
    t = re.sub(r",(\s*,)+", ",", t)
    t = re.sub(r",\s*([.;:?])", r"\1", t)
    for a, b in SAY_AS.items():
        t = t.replace(a, b)
    return t


def lines():
    out = subprocess.run(["node", "-e", NODE, str(HERE / "theme" / "assets") + "/"], capture_output=True, text=True, encoding="utf-8")
    if out.returncode:
        sys.exit("Couldn't read the lines from the app:\n" + out.stderr)
    return json.loads(out.stdout)


def main():
    import numpy as np
    import soundfile as sf
    from kokoro import KPipeline

    every = "--all" in sys.argv
    want = lines()
    todo = [t for t in want if every or not file_for(t).exists()]
    print("%d lines, %d to record" % (len(want), len(todo)))
    if todo:
        pipe = KPipeline(lang_code="a", repo_id="hexgrad/Kokoro-82M")
        for n, text in enumerate(todo, 1):
            parts = [r.audio.numpy() for r in pipe(spoken(text), voice=VOICE, speed=SPEED, split_pattern=r"\n+")]
            a = np.concatenate(parts) if parts else np.zeros(RATE // 4, dtype="float32")
            loud = np.flatnonzero(np.abs(a) > 0.01)  # trim silence, keep a short tail, fade the edges, level the peaks
            if len(loud):
                a = a[max(0, loud[0] - RATE // 50): loud[-1] + RATE // 6]
            fade = min(len(a) // 4, RATE // 100)
            a[:fade] *= np.linspace(0, 1, fade)
            a[-fade:] *= np.linspace(1, 0, fade)
            a = a / max(1e-6, np.abs(a).max()) * 0.89
            sf.write(str(file_for(text)), a.astype("float32"), RATE, format="MP3", bitrate_mode="VARIABLE", compression_level=0.72)
            print("  %3d/%d  %4.1fs  %s" % (n, len(todo), len(a) / RATE, text[:70]))
    keep = {file_for(t).name for t in want}
    gone = [f for f in ASSETS.glob("vo-*.mp3") if f.name not in keep]
    for f in gone:
        f.unlink()
    total = sum(f.stat().st_size for f in ASSETS.glob("vo-*.mp3"))
    print("removed %d unused clips; %d clips, %.1f MB" % (len(gone), len(keep), total / 1e6))


if __name__ == "__main__":
    main()
