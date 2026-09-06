import { describe, it, expect, beforeEach } from 'vitest';
import { seasonsTable } from '@nba/accounting/schema';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { insertMemberFixtures } from '../shared/test-fixtures';
import { exportMembersEmails, membersEmailsCsv } from './handler';

describe('export des adresses mail des adhérents', () => {
  let db: Db;
  let seasonId: number;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
    const season = await db
      .insert(seasonsTable)
      .values({
        code: '26-27', name: 'Saison 26-27', startDate: '2026-09-01', endDate: '2027-08-31',
        active: true, closedAt: null, createdAt: new Date()
      })
      .returning()
      .get();
    seasonId = season.id;
    await insertMemberFixtures(db, [
      { licence: '00000001', seasonId, lastName: 'ZOLA', firstName: 'Émile', gender: 'M', email: 'zola@ex.fr', status: 'valide' },
      { licence: '00000002', seasonId, lastName: 'MARTIN', firstName: 'Anne', gender: 'F', email: '  Anne@Ex.fr ', status: 'en_attente', parent1Email: 'parent@ex.fr' },
      { licence: '00000003', seasonId, lastName: 'SANS MAIL', firstName: 'Léo', gender: 'M', email: null, status: 'valide', parent1Email: 'parent@ex.fr' }
    ]);
  });

  const texte = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

  it("commence par l'indicateur d'ordre des octets, puis l'entête", async () => {
    const { data } = await exportMembersEmails(db, { season: '26-27' });
    expect([...data.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(texte(data.slice(3)).split('\n')[0]).toBe('Nom;Prénom;Licence;Statut;Email');
  });

  it("omet qui n'a pas d'adresse propre, parents ou non, et rend par nom", async () => {
    const { data } = await exportMembersEmails(db, { season: '26-27' });
    const lignes = texte(data.slice(3)).trim().split('\n').slice(1);
    expect(lignes).toEqual([
      '"MARTIN";"Anne";"00000002";"En attente de paiement";"Anne@Ex.fr"',
      '"ZOLA";"Émile";"00000001";"Validé";"zola@ex.fr"'
    ]);
  });

  it('suit les filtres de la liste et les porte dans le nom du fichier', async () => {
    const { data, filename } = await exportMembersEmails(db, { season: '26-27', status: 'en_attente' });
    expect(filename).toBe('adherents-emails-26-27-en_attente.csv');
    expect(texte(data.slice(3))).not.toContain('ZOLA');
    expect(texte(data.slice(3))).toContain('MARTIN');
  });

  it('double les guillemets', () => {
    const csv = membersEmailsCsv([{ lastName: 'O"NEIL', firstName: 'Pat', licence: '1', status: 'valide', email: 'p@ex.fr' }]);
    expect(csv).toContain('"O""NEIL"');
  });
});
