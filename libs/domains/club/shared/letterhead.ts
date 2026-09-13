import { type DbOrTx } from '@nba/db';
import { brandColor, imageFromBytes, type EmbeddedImage, type LetterheadSpec } from '@nba/pdf';
import { getClubSettings } from './repository';
import type { ClubSettings } from './settings';
import type { ClubAssetStore } from './assets';

/**
 * Le papier à lettre du club, tel que les générateurs de PDF l'attendent.
 *
 * Lit les images déposées dans R2 (clés de `club_settings`) et compose les mentions
 * légales d'après les colonnes du club. Une image absente ou illisible ne fait pas
 * échouer le document : il s'imprime sans elle. Une clé présente en base mais
 * introuvable dans R2 — bucket d'un autre environnement, objet supprimé à la main —
 * est le cas le plus courant, et un PDF qui refuserait de sortir pour un logo
 * manquant bloquerait une facture.
 */
export async function clubLetterhead(db: DbOrTx, store: ClubAssetStore): Promise<LetterheadSpec> {
  const settings = await getClubSettings(db);
  const image = async (key: string | null): Promise<EmbeddedImage | null> => {
    if (!key) return null;
    try {
      return imageFromBytes(await store.get(key));
    } catch {
      return null;
    }
  };
  const [header, footer, logo, stamp, partners] = await Promise.all([
    image(settings.letterheadHeaderKey),
    image(settings.letterheadFooterKey),
    image(settings.logoKey),
    image(settings.stampKey),
    Promise.all(settings.partnerLogoKeys.map(image))
  ]);
  return {
    clubName: settings.name,
    tagline: settings.tagline,
    legalLines: legalLines(settings),
    brand: brandColor(settings.brandColor),
    header,
    footer,
    logo,
    stamp,
    partners: partners.filter((p): p is EmbeddedImage => p !== null)
  };
}

/**
 * Les deux lignes du bas de page : qui, où ; puis les identifiants.
 *
 * Chaque morceau ne s'écrit que s'il est renseigné — un club sans agrément n'affiche
 * pas « Agrément  ».
 */
export function legalLines(settings: ClubSettings): string[] {
  const join = (parts: (string | null)[]) => parts.filter((p): p is string => !!p && p.trim() !== '').join(' — ');
  const seat = settings.legalSeat || settings.addressLines.split('\n').filter(Boolean).join(', ');
  const first = join([settings.name, seat, settings.rna ? `Association n° ${settings.rna}` : null]);
  const second = join([
    settings.siret ? `Siret ${settings.siret}` : null,
    settings.ddjsApproval ? `Agrément ${settings.ddjsApproval}` : null,
    settings.ffbadAffiliation ? `Affiliation FFBaD ${settings.ffbadAffiliation}` : null
  ]);
  return [first, second].filter((l) => l !== '');
}

/** Les coordonnées bancaires, dans la forme que les documents impriment. */
export interface BankDetails {
  holder: string;
  bank: string;
  iban: string;
  bic: string;
}

export function bankDetails(settings: ClubSettings): BankDetails {
  return { holder: settings.bankHolder, bank: settings.bankName, iban: settings.iban, bic: settings.bic };
}
