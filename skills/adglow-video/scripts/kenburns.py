#!/usr/bin/env python3
"""
kenburns.py — MODE A (quick): turn flat slide images into a video with a subtle
Ken Burns zoom + crossfades + voiceover. No per-letter reveals (that's MODE B).

Pipeline:  PPTX --(soffice)--> PDF --(pdftoppm)--> hi-res PNG per slide
           this script: per-slide zoompan segment -> xfade chain -> mux VO

Usage:
    python3 kenburns.py <slidesDir> <workdir> <out.mp4> [--fps 30] [--xfade 0.7] [--lead 0.45]

<slidesDir>  PNGs sorted (one per slide, ideally 2x res e.g. 3840x2160 to avoid
             text shimmer during zoom).
<workdir>    must contain plan.json + vo/voNN.wav (from vo_say.py / vo_elevenlabs.py).

Render hi-res frames first:
    soffice --headless --convert-to pdf --outdir W "deck.pptx"
    pdftoppm -r 192 -png "W/deck.pdf" W/frames_hi/h
"""
import json, os, glob, subprocess, argparse

ap = argparse.ArgumentParser()
ap.add_argument("slides"); ap.add_argument("workdir"); ap.add_argument("out")
ap.add_argument("--fps", type=int, default=30)
ap.add_argument("--xfade", type=float, default=0.7)
ap.add_argument("--lead", type=float, default=0.45)
a = ap.parse_args()
FPS, T = a.fps, a.xfade

plan = json.load(open(f"{a.workdir}/plan.json")); DUR = [p["D"] for p in plan]
frames = sorted(glob.glob(f"{a.slides}/*.png"))
assert len(frames) == len(plan), f"{len(frames)} imgs vs {len(plan)} scenes"
segdir = f"{a.workdir}/seg"; os.makedirs(segdir, exist_ok=True)

# 1) per-slide Ken Burns segments (alternate zoom in/out; supersample for crisp text)
for p, f in zip(plan, frames):
    i, D = p["i"], p["D"]; DF = int(round(D * FPS)); slope = 0.06 / DF
    z = f"max(1.06-{slope:.6f}*on,1.0)" if i % 2 == 0 else f"min(1.0+{slope:.6f}*on,1.06)"
    vf = (f"scale=3840:2160:force_original_aspect_ratio=increase,crop=3840:2160,"
          f"zoompan=z='{z}':d={DF}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
          f"s=1920x1080:fps={FPS},format=yuv420p,setsar=1")
    subprocess.run(["ffmpeg","-y","-v","error","-i",f,"-vf",vf,"-c:v","libx264",
                    "-preset","medium","-crf","18","-r",str(FPS),f"{segdir}/seg{i:02d}.mp4"], check=True)

# 2) xfade chain (video only)
segs = [f"{segdir}/seg{p['i']:02d}.mp4" for p in plan]
inp = []; [inp.extend(["-i", s]) for s in segs]
fc = []; L = DUR[0]; offsets = []; prev = "[0:v]"
for k in range(1, len(DUR)):
    off = round(L - T, 3); offsets.append(off); out = f"[vx{k}]"
    fc.append(f"{prev}[{k}:v]xfade=transition=fade:duration={T}:offset={off}{out}")
    prev = out; L = round(L + DUR[k] - T, 3)
total = L
subprocess.run(["ffmpeg","-y","-v","error",*inp,"-filter_complex",";".join(fc),
                "-map",prev,"-c:v","libx264","-preset","medium","-crf","18",
                "-pix_fmt","yuv420p","-r",str(FPS),f"{a.workdir}/video_kb.mp4"], check=True)

# 3) audio: slide i visible from offsets[i-1]; place VO there + lead
slide_start = [0.0] + offsets
ain = []; [ain.extend(["-i", f"{a.workdir}/vo/vo{p['i']:02d}.wav"]) for p in plan]
adl, labels = [], []
for k, st in enumerate(slide_start):
    ms = int(round((st + a.lead) * 1000)); adl.append(f"[{k}:a]adelay={ms}:all=1[a{k}]"); labels.append(f"[a{k}]")
afc = (";".join(adl) + ";" + "".join(labels) +
       f"amix=inputs={len(slide_start)}:normalize=0:dropout_transition=0,apad,atrim=0:{total:.3f},dynaudnorm=f=200:g=6[out]")
subprocess.run(["ffmpeg","-y","-v","error",*ain,"-filter_complex",afc,"-map","[out]",
                "-ac","2","-ar","48000",f"{a.workdir}/audio_kb.m4a"], check=True)

# 4) mux
subprocess.run(["ffmpeg","-y","-v","error","-i",f"{a.workdir}/video_kb.mp4","-i",f"{a.workdir}/audio_kb.m4a",
                "-c:v","copy","-c:a","aac","-b:a","192k","-movflags","+faststart","-shortest",a.out], check=True)
print(f"OK {a.out}  {total:.1f}s  ({os.path.getsize(a.out)/1e6:.1f} MB)")
