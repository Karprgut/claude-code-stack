#!/usr/bin/env python3
"""
vo_elevenlabs.py — generate a natural Spanish voiceover via ElevenLabs and emit
the same timing plan as vo_say.py (drop-in replacement, no code deps: urllib).

Setup:
    export ELEVENLABS_API_KEY=sk_...
    # pick a voice id (GET https://api.elevenlabs.io/v1/voices) — multilingual voices
    # handle Spanish well. Default below is "Rachel" (swap for a Spanish-native one).

Usage:
    python3 vo_elevenlabs.py <lines.json> <outdir> [--voice-id XXXX] [--model eleven_multilingual_v2] [--pad 1.15] [--min 4.2]

Writes vo/voNN.wav (48k stereo) + plan.json ([{i, vo, D}]).

OpenAI alternative (if preferred): POST https://api.openai.com/v1/audio/speech
    model "gpt-4o-mini-tts", voice "onyx"/"alloy", input=text, response_format "wav".
"""
import json, os, sys, argparse, subprocess, urllib.request

ap = argparse.ArgumentParser()
ap.add_argument("lines"); ap.add_argument("outdir")
ap.add_argument("--voice-id", default=os.environ.get("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM"))
ap.add_argument("--model", default="eleven_multilingual_v2")
ap.add_argument("--pad", type=float, default=1.15)
ap.add_argument("--min", type=float, default=4.2)
a = ap.parse_args()

KEY = os.environ.get("ELEVENLABS_API_KEY")
if not KEY:
    sys.exit("ELEVENLABS_API_KEY no está seteada. export ELEVENLABS_API_KEY=sk_...")

lines = json.load(open(a.lines))
vodir = os.path.join(a.outdir, "vo"); os.makedirs(vodir, exist_ok=True)
plan = []
for i, t in enumerate(lines, 1):
    mp3 = f"{vodir}/vo{i:02d}.mp3"; wav = f"{vodir}/vo{i:02d}.wav"
    body = json.dumps({
        "text": t, "model_id": a.model,
        "voice_settings": {"stability": 0.45, "similarity_boost": 0.8, "style": 0.1},
    }).encode()
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{a.voice_id}",
        data=body, method="POST",
        headers={"xi-api-key": KEY, "Content-Type": "application/json", "Accept": "audio/mpeg"})
    with urllib.request.urlopen(req) as r, open(mp3, "wb") as f:
        f.write(r.read())
    subprocess.run(["ffmpeg", "-y", "-v", "quiet", "-i", mp3, "-ar", "48000", "-ac", "2", wav], check=True)
    dur = float(subprocess.run(["ffprobe","-v","quiet","-show_entries","format=duration","-of","csv=p=0",wav],
                capture_output=True, text=True).stdout.strip())
    D = round(max(dur + a.pad, a.min), 2)
    plan.append({"i": i, "vo": round(dur, 2), "D": D})
    print(f"scene {i:02d}  vo={dur:4.2f}s  scene={D:4.2f}s")
json.dump(plan, open(f"{a.outdir}/plan.json", "w"))
print(f"TOTAL = {sum(p['D'] for p in plan):.1f}s  ->  {a.outdir}/plan.json")
