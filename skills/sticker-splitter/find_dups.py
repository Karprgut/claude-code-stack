#!/usr/bin/env python3
"""Detecta stickers duplicados/casi-iguales en Elementos/ por CONTENIDO visual (RGB sobre blanco)."""
import os, glob, sys
from PIL import Image
import numpy as np

ELEMS = "Elementos"
N = 24                      # resolucion del fingerprint (NxN RGB)
MAD_TOL = float(sys.argv[1]) if len(sys.argv) > 1 else 0.045   # dif media por canal (0-1); menor = mas estricto
AR_TOL = 0.18              # tolerancia de relacion de aspecto

def fingerprint(path):
    im = Image.open(path).convert("RGBA")
    a = np.array(im)
    ys, xs = np.where(a[:, :, 3] > 30)
    if len(xs) == 0:
        return None, None
    crop = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    ar = crop.shape[0] / crop.shape[1]
    small = np.asarray(Image.fromarray(crop).resize((N, N), Image.BILINEAR), float) / 255.0
    # RGB PREMULTIPLICADO por alfa + canal alfa -> captura color, estructura Y silueta
    al = small[:, :, 3:4]
    feat = np.concatenate([small[:, :, :3] * al, al], axis=2)
    return feat.flatten(), ar

def main():
    fs = sorted(glob.glob(os.path.join(ELEMS, "*.png")))
    feats, ars, files = [], [], []
    for f in fs:
        v, ar = fingerprint(f)
        if v is not None:
            feats.append(v); ars.append(ar); files.append(f)
    F = np.array(feats); ars = np.array(ars); n = len(files)
    # distancia media-abs por par (vectorizada por bloques)
    parent = list(range(n))
    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]; x = parent[x]
        return x
    for i in range(n):
        mad = np.abs(F - F[i]).mean(axis=1)            # dif media a todos
        arok = np.abs(ars - ars[i]) <= AR_TOL
        for j in np.where((mad <= MAD_TOL) & arok)[0]:
            if j > i:
                parent[find(j)] = find(i)
    groups = {}
    for i in range(n):
        groups.setdefault(find(i), []).append(files[i])
    dups = sorted((sorted(g) for g in groups.values() if len(g) > 1), key=lambda g: -len(g))
    extra = sum(len(g) - 1 for g in dups)
    print(f"Elementos: {n} | MAD_TOL={MAD_TOL} | grupos duplicados: {len(dups)} | piezas sobrantes: {extra}\n")
    for i, g in enumerate(dups, 1):
        print(f"[{i:02d}] x{len(g)}: {', '.join(os.path.basename(x) for x in g)}")
    # guardar lista para posible borrado (deja el 1ro de cada grupo, marca el resto)
    with open("_dups_to_remove.txt", "w") as fh:
        for g in dups:
            for extra_f in g[1:]:
                fh.write(extra_f + "\n")
    print(f"\nLista de sobrantes (1 representante por grupo conservado) -> _dups_to_remove.txt")

if __name__ == "__main__":
    main()
