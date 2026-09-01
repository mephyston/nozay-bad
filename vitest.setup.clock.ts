import { vi, afterEach } from 'vitest';

/**
 * Horloge figée pour toute la suite.
 *
 * Les fixtures de test seedent partout la saison `25-26` (2025-09-01 → 2026-08-31) comme
 * l'exercice **ouvert**, et le code de production lit l'horloge murale pour décider de la
 * phase comptable : `validateAccrualAndFiscalPhase` bascule en « période d'inventaire » dès
 * que `new Date() > season.endDate`, et n'y laisse plus passer qu'une charge à payer ou un
 * produit à recevoir.
 *
 * Le 1er septembre 2026 à 0 h, sans qu'une ligne ait bougé, la suite est donc passée de
 * verte à rouge : 46 fichiers de test seedent cette saison, et tous ceux qui écrivent une
 * écriture se sont mis à recevoir un 400. La CI a échoué sur un commit de performance du
 * site public, qui n'a rien à voir avec la comptabilité.
 *
 * On fige donc l'horloge au 30 août 2026 — le dernier jour où la CI est passée au vert
 * (run 33328713387). Rien d'autre ne change de comportement : la suite voit exactement le
 * « maintenant » sous lequel elle a été écrite et validée, et elle le verra encore l'an
 * prochain.
 *
 * Seul `Date` est simulé, pas les minuteries : `vi.setSystemTime()` sans
 * `vi.useFakeTimers()` laisse `setTimeout` et consorts s'exécuter pour de vrai, et aucun
 * test en attente d'une promesse ne se retrouve suspendu.
 *
 * Un test qui a besoin d'une autre date la pose lui-même (`vi.setSystemTime(...)`) : le
 * `afterEach` ci-dessous le ramène à cette date-ci, il n'a rien à restaurer.
 */
export const FROZEN_NOW = new Date('2026-08-30T12:00:00Z');

vi.setSystemTime(FROZEN_NOW);

afterEach(() => {
  vi.setSystemTime(FROZEN_NOW);
});
