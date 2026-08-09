#!/usr/bin/env python3
"""
Variante sombre d'un logo, par échange du clair et du sombre.

Outil ponctuel de préparation d'actif : il n'entre ni dans la CI ni dans le build,
et n'est rejoué qu'au changement du logo. Il demande Pillow (`pip install pillow`).

Le logo du club est un PNG : on ne peut pas le recolorer en CSS. Un `filter: invert()`
retournerait aussi le rouge de l'écusson, qui est la couleur de la marque. On produit
donc un second fichier, servi en thème sombre.

Deux règles, qui comptent toutes les deux :

  - seuls les pixels **quasi neutres** basculent (saturation < 0,20) : le rouge reste
    identique ;
  - le clair et le sombre sont **échangés**, non repeints. « BADMINTON » est écrit en
    sombre et doit devenir clair, tandis que les facettes claires des cristaux doivent
    devenir sombres pour que le relief subsiste sur fond foncé.

Exception : le lettrage **posé sur l'écusson** (« NOZAY », le « N ») est déjà clair et
doit le rester — l'inverser le rendrait sombre sur rouge, ce qui change la marque. On
le reconnaît à ce qu'il est cerné de rouge.

Usage : python3 scripts/make-dark-logo.py <source.png> <destination.png>
"""
import sys
from PIL import Image

# Rayon **proportionnel** à l'image, et non fixe : la reconnaissance du lettrage de
# l'écusson doit porter plus loin que l'épaisseur d'un trait. Un rayon de 6 px, calibré
# sur un logo de 270 px, laissait le « N » d'un logo de 1024 px passer au noir — ses
# pixels intérieurs étaient trop éloignés du rouge pour être vus comme cernés.
RADIUS_RATIO = 0.025
SATURATION_MAX = 0.20
ALPHA_MIN = 16


def saturation(r, g, b):
    mx, mn = max(r, g, b), min(r, g, b)
    return 0 if mx == 0 else (mx - mn) / mx


def main(source, destination):
    im = Image.open(source).convert("RGBA")
    w, h = im.size
    px = im.load()
    radius = max(4, round(min(w, h) * RADIUS_RATIO))

    # Masque du rouge, calculé une fois : il sert à reconnaître le lettrage de l'écusson.
    colored = [[False] * h for _ in range(w)]
    for x in range(w):
        for y in range(h):
            r, g, b, a = px[x, y]
            colored[x][y] = a >= ALPHA_MIN and saturation(r, g, b) >= SATURATION_MAX

    def near_red(x, y):
        for dx in range(-radius, radius + 1):
            nx = x + dx
            if not (0 <= nx < w):
                continue
            for dy in range(-radius, radius + 1):
                ny = y + dy
                if 0 <= ny < h and colored[nx][ny]:
                    return True
        return False

    swapped = kept = 0
    for x in range(w):
        for y in range(h):
            r, g, b, a = px[x, y]
            if a < ALPHA_MIN or saturation(r, g, b) >= SATURATION_MAX:
                continue
            if (r + g + b) / 3 >= 128 and near_red(x, y):
                kept += 1
                continue
            px[x, y] = (255 - r, 255 - g, 255 - b, a)
            swapped += 1

    im.save(destination)
    print(
        f"{destination} — {swapped} pixels inversés, {kept} conservés "
        f"(lettrage de l'écusson, rayon {radius} px)"
    )


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(__doc__.strip().splitlines()[-1])
        sys.exit(1)
    main(sys.argv[1], sys.argv[2])
