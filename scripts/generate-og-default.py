#!/usr/bin/env python3
"""
Vignette de partage par défaut du site public.

Outil ponctuel de préparation d'actif : hors CI, hors build, rejoué au changement du
logo ou de la charte. Il demande Pillow (`pip install pillow`).

C'est l'image qu'affichent Facebook et WhatsApp lorsqu'un lien est partagé sans
couverture propre — `BaseLayout.astro` la pose en repli d'`og:image`. Elle était
**référencée sans exister** : tout partage d'une page sans couverture pointait vers un
404, et les deux réseaux affichaient alors un lien nu.

1200 × 630 px : la taille attendue par les deux, et le seul format qu'ils ne recadrent
pas. En JPEG, faute de quoi le fond transparent du logo virerait au noir chez ceux qui
n'aplatissent pas.

Rien d'autre que le logo sur fond blanc : il porte déjà le nom du club, tramé dans son
lettrage d'origine, et une vignette de partage se regarde à 300 px de large sur un
téléphone — tout texte ajouté y serait illisible. Le bandeau rouge en pied donne le
seul repère de marque qui survive à cette réduction.

Ce fichier est un **dépannage**, à remplacer par le visuel du secrétariat.

Usage : python3 scripts/generate-og-default.py
"""
import pathlib
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'apps/website/assets/logo-large.png'
TARGET = ROOT / 'apps/website/public/og-default.jpg'

WIDTH, HEIGHT = 1200, 630
BRAND_RED = (229, 51, 69)
WHITE = (255, 255, 255)

# Le master fait 270 px. Agrandi à 360 il reste net — l'écusson n'est fait que d'aplats
# et de traits, que LANCZOS restitue sans halo à ce facteur. Au-delà, les arêtes des
# cristaux commencent à baver.
LOGO_SIZE = 360

# Hauteur du bandeau de pied. Assez pour tenir à 300 px de large — la taille réelle
# d'une vignette dans un fil de discussion — sans disputer la place au logo.
BAR_HEIGHT = 28


# Le master porte un fond « transparent » à alpha 2 sur du noir, et non à alpha 0. Sur
# blanc, ces deux points de noir dessinent un carré gris tout autour de l'écusson —
# invisible dans le navigateur, qui compose en 8 bits par canal, mais bien présent une
# fois aplati en JPEG. En dessous de ce seuil, l'alpha est ramené à zéro.
ALPHA_FLOOR = 8


def main() -> None:
    logo = Image.open(SOURCE).convert('RGBA')
    alpha = logo.getchannel('A').point(lambda v: 0 if v < ALPHA_FLOOR else v)
    logo.putalpha(alpha)
    logo = logo.resize((LOGO_SIZE, LOGO_SIZE), Image.LANCZOS)

    canvas = Image.new('RGB', (WIDTH, HEIGHT), WHITE)

    # Centré horizontalement, et remonté de la moitié du bandeau : centrer sur la
    # hauteur totale le ferait paraître bas, le bandeau tirant l'œil vers le pied.
    x = (WIDTH - LOGO_SIZE) // 2
    y = (HEIGHT - BAR_HEIGHT - LOGO_SIZE) // 2
    # Le logo sert de son propre masque : c'est son canal alpha qui découpe la
    # transparence, sans quoi le fond du PNG s'écraserait en noir sur le blanc.
    canvas.paste(logo, (x, y), logo)

    canvas.paste(Image.new('RGB', (WIDTH, BAR_HEIGHT), BRAND_RED), (0, HEIGHT - BAR_HEIGHT))

    canvas.save(TARGET, 'JPEG', quality=88, optimize=True, progressive=True)
    print(f'{TARGET.relative_to(ROOT)} — {WIDTH}×{HEIGHT}, {TARGET.stat().st_size // 1024} Kio')


if __name__ == '__main__':
    main()
