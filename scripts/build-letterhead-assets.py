#!/usr/bin/env python3
"""
Encode le papier à lettre du club en base64, pour `libs/shared/pdf/src/assets.ts`.

Outil ponctuel de préparation d'actif : il n'entre ni dans la CI ni dans le build,
et n'est rejoué qu'au changement du modèle de courrier. Il demande Pillow
(`pip install pillow`).

Les sources vivent dans `.data/modèles/courrier/` (hors dépôt) ; seul le résultat
encodé est versionné, car le worker API n'a pas de système de fichiers : tout ce
qu'un PDF dessine doit être empaqueté avec le code.

Deux choix d'encodage, qui comptent tous les deux :

  - la bande d'en-tête part en **JPEG**. pdf-lib recopie les octets JPEG tels quels
    dans le PDF (DCTDecode), alors qu'un PNG est décodé puis restocké en RGB brut :
    la même image pèse ~130 Ko en JPEG contre ~2 Mo dans chaque PDF produit. Son
    dégradé se prête au JPEG ; le logo reste net à 194 ppp ;
  - le bas de page et les logos partenaires restent en **PNG**, à leur définition
    d'origine : ce sont des aplats et du texte, que le JPEG cernerait d'un halo.

Toutes les images sont aplaties sur blanc : elles ne se posent jamais que sur le
papier, et supprimer la couche alpha évite un masque SMask dans chaque PDF.
"""

from __future__ import annotations

import base64
import io
from pathlib import Path

from PIL import Image

SRC = Path(__file__).resolve().parent.parent / '.data' / 'modèles' / 'courrier'
OUT = Path(__file__).resolve().parent.parent / 'libs' / 'shared' / 'pdf' / 'src' / 'assets.ts'

# Largeur de rendu de la bande d'en-tête : la pleine largeur A4 (595 pt).
# 1600 px ≈ 194 ppp à l'impression, sans traîner les 216 ppp de la source.
HEADER_WIDTH = 1600


def flatten(path: Path, width: int | None = None) -> Image.Image:
    im = Image.open(path).convert('RGBA')
    if width and width != im.width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    paper = Image.new('RGB', im.size, (255, 255, 255))
    paper.paste(im, mask=im.split()[-1])
    return paper


def as_jpeg(im: Image.Image, quality: int) -> bytes:
    buf = io.BytesIO()
    im.save(buf, format='JPEG', quality=quality, optimize=True)
    return buf.getvalue()


def as_png(im: Image.Image, colors: int) -> bytes:
    buf = io.BytesIO()
    im.quantize(colors=colors, method=Image.MEDIANCUT, dither=Image.FLOYDSTEINBERG).save(
        buf, format='PNG', optimize=True
    )
    return buf.getvalue()


def keep_existing(src: str, name: str, doc: str) -> str:
    """Récupère un actif déjà encodé (tampon, signature) sans le régénérer."""
    start = src.index(f'export const {name} = img(')
    end = src.index(');', start)
    return f'/** {doc} */\n' + src[start:end + 2]


def main() -> None:
    previous = OUT.read_text(encoding='utf-8')
    preserved = [
        keep_existing(previous, 'stamp', "Tampon du club (modèle Word d'origine)."),
        keep_existing(previous, 'defaultSignature', "Signature de repli, quand aucune n'est configurée."),
    ]

    generated = [
        ('letterheadHeader', "Bande d'en-tête pleine largeur (dégradé + écusson du club).",
         as_jpeg(flatten(SRC / 'papier a lettre entetelogo.png', HEADER_WIDTH), 86), 'jpg'),
        ('letterheadFooter', "Bas de page « Merci pour leur soutien » + www.nozaybad.fr.",
         as_png(flatten(SRC / 'papier a lettre bas depage logo.png'), 128), 'png'),
        ('logoVilleNozay', 'Logo partenaire : ville de Nozay.',
         as_png(flatten(SRC / 'papier a lettre logo nozaylogo.png'), 128), 'png'),
        ('logoLardeSports', 'Logo partenaire : Lardé Sports.',
         as_png(flatten(SRC / 'papier a lettre logo lardelogo.png'), 128), 'png'),
    ]

    blocks = []
    for name, doc, data, kind in generated:
        b64 = base64.b64encode(data).decode('ascii')
        blocks.append(f"/** {doc} */\nexport const {name} = img(\n  '{b64}',\n  '{kind}'\n);")
        print(f'{name}: {len(data) // 1024} Ko → {len(b64) // 1024} Ko base64')

    header = """// AUTO-GÉNÉRÉ — actifs embarqués (base64) pour la génération des PDF du club.
// Source : `.data/modèles/courrier/` (papier à lettre) et le modèle Word d'origine
// (tampon, signature). Empaquetés dans le worker API, qui n'a pas de système de fichiers.
// Ne pas éditer à la main ; régénérer via `scripts/build-letterhead-assets.py`.

export type EmbeddedImage = { base64: string; kind: 'jpg' | 'png' };

const img = (base64: string, kind: 'jpg' | 'png'): EmbeddedImage => ({ base64, kind });
"""
    OUT.write_text(header + '\n' + '\n\n'.join(blocks + preserved) + '\n', encoding='utf-8')
    print(f'écrit : {OUT} ({OUT.stat().st_size // 1024} Ko)')


if __name__ == '__main__':
    main()
