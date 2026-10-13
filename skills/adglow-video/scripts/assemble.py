#!/usr/bin/env python3
"""
assemble.py — place each VO clip at its scene offset and mux with the rendered
frames into the final MP4. Works for both production modes (frames come from the
HTML reel renderer or from the Ken Burns pipeline).

Usage:
    python3 assemble.py <workdir> <framesDir> <out.mp4> [--fps 30] [--lead 0.45]

Expects <workdir>/plan.json ([{i, vo, D}]) and <workdir>/vo/voNN.wav.
Scene i starts at sum(D[:i]); VO i is placed at start_i + lead.
"""
import json, os, subprocess, argparse

ap = argparse.ArgumentParser()
ap.add_argument("workdir"); ap.add_argument("frames"); ap.add_argument("out")
ap.add_argument("--fps", type=int, default=30)
ap.add_argument("--lead", type=float, default=0.45)
a = ap.parse_args()

plan = json.load(open(f"{a.workdir}/plan.json"))
DUR = [p["D"] for p in plan]
starts, acc = [], 0.0
for d in DUR:
    starts.append(acc); acc += d
total = acc

# --- audio: delay each VO to its scene start, mix (no overlap so summing is clean) ---
ain = []
for p in plan:
    ain += ["-i", f"{a.workdir}/vo/vo{p['i']:02d}.wav"]
adl, labels = [], []
for k, st in enumerate(starts):
    ms = int(round((st + a.lead) * 1000))
    adl.append(f"[{k}:a]adelay={ms}:all=1[a{k}]"); labels.append(f"[a{k}]")
afc = (";".join(adl) + ";" + "".join(labels) +
       f"amix=inputs={len(starts)}:normalize=0:dropout_transition=0,"
       f"apad,atrim=0:{total:.3f},dynaudnorm=f=200:g=6[out]")
audio = f"{a.workdir}/audio_track.m4a"
subprocess.run(["ffmpeg","-y","-v","error",*ain,"-filter_complex",afc,
                "-map","[out]","-ac","2","-ar","48000",audio], check=True)

# --- mux frames + audio ---
subprocess.run(["ffmpeg","-y","-v","error","-framerate",str(a.fps),
                "-i", os.path.join(a.frames, "f%05d.png"), "-i", audio,
                "-c:v","libx264","-preset","medium","-crf","19","-pix_fmt","yuv420p",
                "-r",str(a.fps),"-c:a","aac","-b:a","192k","-movflags","+faststart",
                "-shortest", a.out], check=True)
d = subprocess.run(["ffprobe","-v","quiet","-show_entries","format=duration","-of","csv=p=0",a.out],
                   capture_output=True, text=True).stdout.strip()
print(f"OK {a.out}  {float(d):.1f}s  ({os.path.getsize(a.out)/1e6:.1f} MB)")
