#!/usr/bin/env python3
"""
sticker_split.py — recorta stickers individuales de hojas/planchas PNG.

Detecta el fondo automaticamente por hoja:
  - transparente real  -> mascara por canal alfa
  - solido / checkerboard horneado -> distancia a varios tonos del marco
Une las piezas de un mismo sticker (texto + icono) con una dilatacion ("bridge"),
descarta motas y lineas finas (open), recorta cada isla con margen y conserva alfa.

Salida:
  <out>/Posters/     copia de las hojas procesadas
  <out>/Elementos/   stickers sueltos, PLANO, nombrados <idHoja>_NN.png
  <out>/_review/     (opcional --review) mosaicos numerados sobre magenta para QA
  <out>/_con_fondo/  (con --transparent-only) hojas no-transparentes movidas aparte

Uso tipico:
  python sticker_split.py "*.png" --out Stickers --review
  python sticker_split.py "*.png" --out Stickers --transparent-only --review
Reproceso de UNA hoja con parametros a la medida (afina sin tocar las demas):
  python sticker_split.py "*.png" --out Stickers --only kLdkH0o16B --bridge 1 --open 4 --review

Tension clave del bridge:
  - bridge BAJO (0-2): separa clusters de mini-elementos pegados; parte texto muy espaciado
  - bridge ALTO (6-10): junta texto de varias palabras; arriesga fusionar stickers vecinos
  open: subelo (3-5) en hojas con rejillas wireframe / trazos de circuito que conectan todo.
  thr:  subelo (70-90) cuando el fondo solido tiene textura/cuadricula de bajo contraste.
"""
import sys, os, glob, shutil, math, hashlib, argparse
try:
    from PIL import Image, ImageDraw
    import numpy as np
    from scipy import ndimage
except ImportError:
    sys.exit("Faltan dependencias. Crea un venv:\n"
             "  python3 -m venv .venv && .venv/bin/pip install pillow numpy scipy\n"
             "y corre el script con .venv/bin/python")


def build_mask(a, color_thr=50):
    """(fg_bool, modo). Usa alfa si hay transparencia; si no, distancia al fondo (multi-tono)."""
    if (a[:, :, 3] < 10).mean() > 0.05:
        return a[:, :, 3] > 40, "alfa"
    rgb = a[:, :, :3].astype(np.int16)
    b = 8
    frame = np.concatenate([rgb[:b].reshape(-1, 3), rgb[-b:].reshape(-1, 3),
                            rgb[:, :b].reshape(-1, 3), rgb[:, -b:].reshape(-1, 3)])
    q = (frame // 24).astype(np.int32)
    keys = q[:, 0] * 10000 + q[:, 1] * 100 + q[:, 2]
    uniq, cnt = np.unique(keys, return_counts=True)
    centroids = [frame[keys == uniq[i]].mean(axis=0)
                 for i in np.argsort(cnt)[::-1] if cnt[i] / len(frame) >= 0.03]
    centroids = np.array(centroids if centroids else [np.median(frame, axis=0)])
    flat = rgb.reshape(-1, 3)
    dmin = np.full(flat.shape[0], 1e9)
    for c in centroids:
        dmin = np.minimum(dmin, np.sqrt(((flat - c) ** 2).sum(axis=1)))
    fg = (dmin > color_thr).reshape(rgb.shape[:2])
    return ndimage.binary_closing(fg, np.ones((5, 5), bool)), "color"


def split_sheet(path, outdir, bridge=3, open_k=2, color_thr=50, min_frac=0.0006, pad=12):
    a = np.array(Image.open(path).convert("RGBA"))
    H, W = a.shape[:2]
    fg, modo = build_mask(a, color_thr)
    fg = ndimage.binary_opening(fg, np.ones((open_k, open_k), bool))
    grown = ndimage.binary_dilation(fg, np.ones((2 * bridge + 1,) * 2, bool)) if bridge else fg
    lbl, _ = ndimage.label(grown)
    min_area = int(min_frac * H * W)
    os.makedirs(outdir, exist_ok=True)
    saved = 0
    for i, sl in enumerate(ndimage.find_objects(lbl), 1):
        if sl is None:
            continue
        ys, xs = sl
        if ((lbl[sl] == i) & fg[sl]).sum() < min_area:
            continue
        y0, y1 = max(ys.start - pad, 0), min(ys.stop + pad, H)
        x0, x1 = max(xs.start - pad, 0), min(xs.stop + pad, W)
        crop = a[y0:y1, x0:x1].copy()
        local = np.zeros((y1 - y0, x1 - x0), bool)
        local[(ys.start - y0):(ys.stop - y0), (xs.start - x0):(xs.stop - x0)] = (lbl[sl] == i)
        crop[~local, 3] = 0          # borra vecinos / fondo dentro del recorte
        saved += 1
        Image.fromarray(crop).save(os.path.join(outdir, f"piece_{saved:02d}.png"))
    return saved, modo


def short_id(path):
    base = os.path.splitext(os.path.basename(path))[0]
    tail = "".join(c for c in base.split("_")[-1] if c.isalnum())[:10]
    # archivos tipo "stickers (1)" -> stickers1
    if not base.split("_")[-1].strip("()0123456789 "):
        tail = base.replace(" ", "").replace("(", "").replace(")", "")
    return tail or base[:10]


def mosaic(elems_dir, sid, dest, cols=8, cell=180):
    fs = sorted(f for f in os.listdir(elems_dir) if f.rsplit("_", 1)[0] == sid)
    if not fs:
        return
    rows = math.ceil(len(fs) / cols)
    sheet = Image.new("RGBA", (cols * cell, rows * cell), (255, 0, 170, 255))
    dr = ImageDraw.Draw(sheet)
    for i, f in enumerate(fs):
        im = Image.open(os.path.join(elems_dir, f)).convert("RGBA")
        im.thumbnail((cell - 22, cell - 22))
        x, y = (i % cols) * cell, (i // cols) * cell
        sheet.alpha_composite(im, (x + (cell - im.width) // 2, y + (cell - im.height) // 2))
        n = f.rsplit("_", 1)[1].split(".")[0]
        dr.rectangle([x + 2, y + 2, x + 30, y + 18], fill=(0, 0, 0, 255))
        dr.text((x + 5, y + 5), n, fill=(255, 255, 0, 255))
    sheet.convert("RGB").save(dest)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("inputs", nargs="+", help="archivos o globs de hojas")
    ap.add_argument("--out", default="Stickers")
    ap.add_argument("--bridge", type=int, default=3)
    ap.add_argument("--open", dest="open_k", type=int, default=2)
    ap.add_argument("--thr", type=int, default=50)
    ap.add_argument("--min-frac", type=float, default=0.0006)
    ap.add_argument("--pad", type=int, default=12)
    ap.add_argument("--review", action="store_true", help="genera mosaicos de QA sobre magenta")
    ap.add_argument("--transparent-only", action="store_true", help="mueve hojas no-transparentes a _con_fondo/")
    ap.add_argument("--only", default=None, help="reprocesa solo la hoja con este idHoja (afinado fino)")
    args = ap.parse_args()

    posters = os.path.join(args.out, "Posters")
    elems = os.path.join(args.out, "Elementos")
    review = os.path.join(args.out, "_review")
    confondo = os.path.join(args.out, "_con_fondo")
    for d in (posters, elems):
        os.makedirs(d, exist_ok=True)
    if args.review:
        os.makedirs(review, exist_ok=True)

    files = []
    for pat in args.inputs:
        files += glob.glob(pat) if any(c in pat for c in "*?[") else [pat]
    files = sorted(f for f in files if os.path.isfile(f)
                   and f.lower().endswith((".png", ".jpg", ".jpeg", ".webp")))

    if args.only:
        files = [f for f in files if short_id(f) == args.only]
        if not files:
            sys.exit(f"--only {args.only}: no hay hoja con ese id en los inputs")

    seen, total = {}, 0
    for f in files:
        a = np.array(Image.open(f).convert("RGBA"))
        h = hashlib.md5(a.tobytes()).hexdigest()
        if h in seen:
            print(f"  dup (omitido): {os.path.basename(f)}"); continue
        seen[h] = f
        sid = short_id(f)
        if args.transparent_only and (a[:, :, 3] < 10).mean() <= 0.05:
            os.makedirs(confondo, exist_ok=True)
            shutil.copy(f, os.path.join(confondo, os.path.basename(f)))
            print(f"  con-fondo (a _con_fondo/): {os.path.basename(f)}"); continue
        # limpia elementos previos de esta hoja (reproceso idempotente)
        for old in glob.glob(os.path.join(elems, f"{sid}_*.png")):
            os.remove(old)
        shutil.copy(f, os.path.join(posters, os.path.basename(f)))
        tmp = os.path.join(args.out, f"_tmp_{sid}")
        n, modo = split_sheet(f, tmp, args.bridge, args.open_k, args.thr, args.min_frac, args.pad)
        for j, g in enumerate(sorted(os.listdir(tmp)), 1):
            shutil.move(os.path.join(tmp, g), os.path.join(elems, f"{sid}_{j:02d}.png"))
        shutil.rmtree(tmp)
        if args.review:
            mosaic(elems, sid, os.path.join(review, f"r_{sid}.png"))
        total += n
        print(f"  {sid:14s} modo={modo:5s} bridge={args.bridge} open={args.open_k} -> {n}")
    print(f"\nTOTAL piezas nuevas: {total} | Elementos/: {len(glob.glob(os.path.join(elems, '*.png')))}")
    print(f"Posters:   {posters}\nElementos: {elems}")


if __name__ == "__main__":
    main()
