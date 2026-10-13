#!/usr/bin/env python3
"""
vo_say.py — generate a Spanish voiceover with the macOS `say` engine and emit a
timing plan (scene duration = VO length + padding).

Usage:
    python3 vo_say.py <lines.json> <outdir> [--voice "Eddy (Español (México))"] [--rate 186] [--pad 1.15] [--min 4.2]

<lines.json> is a JSON array of strings, one narration line per scene (same order
as the scenes). Writes vo/voNN.wav (48k stereo) + plan.json ([{i, vo, D}]).

Good es-MX voices: Eddy, Flo, Reed, Rocko, Sandy, Shelley (modern) · Paulina (classic).
List installed voices:  say -v '?' | grep es_
Audition before committing: copy a few voNN to ~/Downloads and let the user listen —
the VO length drives scene timing, so lock the voice BEFORE rendering frames.
"""
import subprocess, json, os, sys, argparse

ap = argparse.ArgumentParser()
ap.add_argument("lines"); ap.add_argument("outdir")
ap.add_argument("--voice", default="Eddy (Español (México))")
ap.add_argument("--rate", default="186")
ap.add_argument("--pad", type=float, default=1.15)
ap.add_argument("--min", type=float, default=4.2)
a = ap.parse_args()

lines = json.load(open(a.lines))
vodir = os.path.join(a.outdir, "vo"); os.makedirs(vodir, exist_ok=True)
plan = []
for i, t in enumerate(lines, 1):
    aiff = f"{vodir}/vo{i:02d}.aiff"; wav = f"{vodir}/vo{i:02d}.wav"
    subprocess.run(["say", "-v", a.voice, "-r", str(a.rate), "-o", aiff, t], check=True)
    subprocess.run(["ffmpeg", "-y", "-v", "quiet", "-i", aiff, "-ar", "48000", "-ac", "2", wav], check=True)
    dur = float(subprocess.run(["ffprobe","-v","quiet","-show_entries","format=duration","-of","csv=p=0",wav],
                capture_output=True, text=True).stdout.strip())
    D = round(max(dur + a.pad, a.min), 2)
    plan.append({"i": i, "vo": round(dur, 2), "D": D})
    print(f"scene {i:02d}  vo={dur:4.2f}s  scene={D:4.2f}s")
json.dump(plan, open(f"{a.outdir}/plan.json", "w"))
print(f"TOTAL = {sum(p['D'] for p in plan):.1f}s  ->  {a.outdir}/plan.json")
