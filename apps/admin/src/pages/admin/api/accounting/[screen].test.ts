import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Le relais du domaine « comptabilité ».
 *
 * Deux choses s'y jouent qui ne se voient pas : la **résolution de la saison**, propre à
 * cette rubrique et différente de celle des interclubs, et la **pagination**, que l'API
 * rend à côté de `data` — une lecture ordinaire la laisserait tomber, et le grand livre
 * afficherait « page 1 sur 1 » sur trois cents écritures.
 */

let appels: { url: string; init?: RequestInit }[] = [];
let saisons: any[] = [];

vi.mock('../../../../lib/api', () => ({
  createAdminApiClient: () => ({
    fetch: (url: string, init?: RequestInit) => {
      appels.push({ url, init });
      const chemin = url.replace('http://localhost', '');
      if (chemin === '/accounting/seasons') {
        return Promise.resolve(
          new Response(JSON.stringify({ success: true, data: saisons }), { status: 200 })
        );
      }
      if (chemin.startsWith('/accounting/transactions?')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: [{ id: 1 }],
              pagination: { total: 42, page: 2, limit: 20, totalPages: 3 }
            }),
            { status: 200 }
          )
        );
      }
      if (chemin.endsWith('/reports')) {
        return Promise.resolve(
          new Response(JSON.stringify({ success: true, data: { bilanTrésorerie: [{ accountId: 'cash' }] } }), { status: 200 })
        );
      }
      if (chemin.endsWith('/balances')) {
        return Promise.resolve(
          new Response(JSON.stringify({ success: true, data: [{ accountId: 'cash', initialBalanceCents: 1234 }] }), { status: 200 })
        );
      }
      if (chemin.startsWith('/accounting/bank-transactions')) {
        /*
          Deux populations distinctes, comme en vrai : les lignes encore à rapprocher, quelle
          que soit leur date, et celles de l'exercice consulté quel que soit leur état. La
          ligne 1 appartient aux deux — c'est le recouvrement que le relais doit dédoublonner.
        */
        const enAttente = chemin.includes('status=pending');
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: enAttente
                ? [
                    { id: 1, status: 'pending', amount: 1500, date: '2026-02-10' },
                    { id: 4, status: 'pending', amount: 300, date: '2024-11-02' }
                  ]
                : [
                    { id: 1, status: 'pending', amount: 1500, date: '2026-02-10' },
                    { id: 2, status: 'pending', amount: -800, date: '2026-01-05' },
                    { id: 3, status: 'reconciled', amount: 900, date: '2026-03-01' }
                  ]
            }),
            { status: 200 }
          )
        );
      }
      // La saison suivante rend un adhérent commun et un nouveau : c'est le second qui
      // doit apparaître, marqué.
      if (chemin.startsWith('/members?season=25-26')) {
        return Promise.resolve(
          new Response(JSON.stringify({ success: true, data: [{ id: 10 }, { id: 11 }] }), { status: 200 })
        );
      }
      if (chemin.startsWith('/members?season=')) {
        return Promise.resolve(
          new Response(JSON.stringify({ success: true, data: [{ id: 10 }] }), { status: 200 })
        );
      }
      return Promise.resolve(new Response(JSON.stringify({ success: true, data: [] }), { status: 200 }));
    }
  })
}));

const { GET, POST, ECRANS } = await import('./[screen]');

const TOUS_LES_DROITS = [
  'accounting:ledger:read', 'accounting:ledger:write', 'accounting:ledger:delete',
  'accounting:invoices:read', 'accounting:invoices:write', 'accounting:invoices:delete',
  'accounting:checks:read', 'accounting:checks:write', 'accounting:checks:delete'
];
const locals = (permissions: string[]) => ({ user: { email: 'x@nozaybad.fr', permissions } });

const lire = (screen: string, recherche = '', permissions = TOUS_LES_DROITS) =>
  GET({
    params: { screen },
    locals: locals(permissions),
    request: new Request(`https://admin.nozaybad.fr/admin/api/accounting/${screen}${recherche}`)
  } as never);

const ecrire = (screen: string, body: unknown, permissions = TOUS_LES_DROITS) =>
  POST({
    params: { screen },
    locals: locals(permissions),
    request: new Request('https://admin.nozaybad.fr/admin/api/accounting/x', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
  } as never);

const donnees = async (res: Response) => ((await res.json()) as any).data;

beforeEach(() => {
  appels = [];
  saisons = [
    { code: '24-25', startDate: '2024-09-01', endDate: '2025-08-31', active: 0, name: 'Saison 24-25', closedAt: null },
    { code: '25-26', startDate: '2025-09-01', endDate: '2026-08-31', active: 1, name: 'Saison 25-26', closedAt: null }
  ];
});

describe('comptabilité — les gardes', () => {
  it('garde chaque écran et chaque écriture par une permission', () => {
    for (const [nom, ecran] of Object.entries(ECRANS)) {
      expect(ecran.permission, `écran ${nom}`).toBeTruthy();
      for (const [action, ecriture] of Object.entries(ecran.ecritures ?? {})) {
        expect(ecriture.permission, `${nom}/${action}`).toBeTruthy();
      }
    }
  });

  it("n'accorde pas la suppression à qui sait seulement écrire", async () => {
    for (const [ecran, action] of [['ledger', 'delete'], ['invoices', 'delete']] as const) {
      appels = [];
      const droit = ecran === 'ledger' ? 'accounting:ledger:delete' : 'accounting:invoices:delete';
      const res = await ecrire(ecran, { action, id: 3 }, TOUS_LES_DROITS.filter((p) => p !== droit));
      expect(res.status, ecran).toBe(403);
      expect(appels, ecran).toHaveLength(0);
    }
  });

  it('valide les identifiants avant de les mettre dans un chemin', async () => {
    for (const id of ['abc', 0, -2]) {
      appels = [];
      expect((await ecrire('ledger', { action: 'delete', id })).status, String(id)).toBe(400);
      expect(appels).toHaveLength(0);
    }
  });
});

describe('comptabilité — la saison', () => {
  it("prend l'active quand l'URL n'en fixe aucune", async () => {
    const d = await donnees(await lire('ledger'));
    expect(d.seasonId).toBe('25-26');
    // Le nom sert au sous-titre, sans son préfixe.
    expect(d.seasonName).toBe('25-26');
  });

  it("prend celle de l'URL quand elle est donnée", async () => {
    const d = await donnees(await lire('invoices', '?season=24-25'));
    expect(d.seasonId).toBe('24-25');
    expect(appels.some((a) => a.url.includes('season=24-25'))).toBe(true);
  });

  it('retombe sur la dernière quand aucune n’est active', async () => {
    saisons = saisons.map((s) => ({ ...s, active: 0 }));
    const d = await donnees(await lire('ledger'));
    // Triées par date de début : la dernière est la plus récente.
    expect(d.seasonId).toBe('25-26');
  });

  it('signale une saison clôturée', async () => {
    saisons[1].closed = true;
    const d = await donnees(await lire('cash-box'));
    expect(d.isClosed).toBe(true);
  });
});

describe('comptabilité — le grand livre', () => {
  it("rend la pagination, que l'API pose à côté des données", async () => {
    const d = await donnees(await lire('ledger'));
    expect(d.pagination).toEqual({ total: 42, page: 2, limit: 20, totalPages: 3 });
  });

  it('transmet les filtres, dont le sens de l’écriture', async () => {
    /*
      Le compte de résultat sépare charges et produits : un lien de catégorie qui
      ramènerait les deux mélangés fait ouvrir trois cents cotisations pour y trouver sept
      remboursements.
    */
    await lire('ledger', '?category=adhesions&type=expense&month=2026-01&unreconciledCheques=true');
    const appel = appels.find((a) => a.url.includes('/accounting/transactions?'))!.url;
    expect(appel).toContain('category=adhesions');
    expect(appel).toContain('type=expense');
    expect(appel).toContain('month=2026-01');
    expect(appel).toContain('unreconciledCheques=true');
  });

  it('n’envoie pas les filtres vides', async () => {
    await lire('ledger', '?category=&search=');
    const appel = appels.find((a) => a.url.includes('/accounting/transactions?'))!.url;
    expect(appel).not.toContain('category=');
    expect(appel).not.toContain('search=');
  });
});

describe('comptabilité — la caisse', () => {
  it('trouve le solde initial quel que soit l’identifiant du compte', async () => {
    // La caisse porte deux identifiants selon l'âge de la donnée : l'un textuel, l'autre
    // numérique. Les deux se rencontrent encore en base.
    const d = await donnees(await lire('cash-box'));
    expect(d.initialBalance).toBe(1234);
  });
});

describe('comptabilité — les chèques', () => {
  it("ne propose au rapprochement que les lignes en attente et au crédit", async () => {
    // Une remise de chèques ne s'adosse pas à un débit.
    const d = await donnees(await lire('cheques'));
    expect(d.pendingBankTransactions.map((x: any) => x.id)).toEqual([1]);
  });

  it('sert les deux pages depuis le même écran', () => {
    // « Gestion des chèques » et « Remise de bordereaux » ne diffèrent que par leur
    // onglet : deux écrans de relais auraient fini par diverger.
    expect(Object.keys(ECRANS)).toContain('cheques');
    expect(Object.keys(ECRANS)).not.toContain('deposits');
  });

  it("n'accorde pas la suppression d'un bordereau à qui sait seulement écrire", async () => {
    const res = await ecrire('cheques', { action: 'delete-deposit', id: 4 },
      ['accounting:checks:read', 'accounting:checks:write']);
    expect(res.status).toBe(403);
    expect(appels).toHaveLength(0);
  });

  it("relaie la modification d'un chèque en PUT sur son identifiant", async () => {
    const res = await ecrire('cheques', {
      action: 'update-check', id: 7, number: '1234567', amount: 1500, emitter: 'Durand', date: '2026-09-01'
    });
    expect(res.status).toBe(200);
    const appel = appels.find((a) => a.url.endsWith('/accounting/checks/7'));
    expect(appel?.init?.method).toBe('PUT');
    expect(JSON.parse(String(appel?.init?.body)).number).toBe('1234567');
  });

  it("n'accorde pas la modification d'un chèque à qui sait seulement lire", async () => {
    const res = await ecrire('cheques', { action: 'update-check', id: 7 }, ['accounting:checks:read']);
    expect(res.status).toBe(403);
    expect(appels).toHaveLength(0);
  });
});

describe('comptabilité — le rapprochement', () => {
  const DROITS = [
    'accounting:bank:read', 'accounting:bank:reconcile',
    'accounting:ledger:write', 'accounting:ledger:delete', 'accounting:invoices:read'
  ];

  it('lit les lignes à rapprocher sans borne, et l’archive sur les exercices ouverts', async () => {
    /*
      Une ligne de relevé n'appartient à aucune saison, c'est un mouvement daté : borner la
      file à l'exercice consulté faisait disparaître, au 1er septembre, tout ce qui restait
      à rapprocher de l'année écoulée.

      L'archive se borne, mais à la CLÔTURE et non à l'exercice consulté. Bornée à ce
      dernier, une ligne d'août rapprochée depuis l'exercice suivant quittait l'écran à la
      seconde où on la rapprochait : elle passait de la file non bornée à une archive qui ne
      la contenait pas.
    */
    await lire('reconciliation', '?season=24-25', DROITS);
    const bancaires = appels
      .filter((a) => a.url.includes('/accounting/bank-transactions'))
      .map((a) => a.url);

    expect(bancaires).toHaveLength(2);
    expect(bancaires.some((u) => u.includes('status=pending') && !u.includes('startDate='))).toBe(true);

    // Les deux exercices sont ouverts : l'archive les couvre tous les deux.
    const archive = bancaires.find((u) => u.includes('startDate='))!;
    expect(archive).toContain('startDate=2024-09-01');
    expect(archive).toContain('endDate=2026-08-31');
    expect(archive).not.toContain('status=');
  });

  /*
    Le formulaire déduit l'exercice de rattachement de la DATE de la ligne : une ligne d'août
    rapprochée depuis 26-27 vise 25-26. On ne chargeait que l'annuaire du consulté et du
    suivant — jamais du précédent — et la liste des adhérents s'affichait vide, sans rien dire,
    exactement quand on en avait besoin.
  */
  it('charge l’annuaire de chaque exercice ouvert, chacun étiqueté de son code', async () => {
    const d = await donnees(await lire('reconciliation', '?season=25-26', DROITS));

    const annuaires = appels.filter((a) => a.url.includes('/members?season='));
    const codes = annuaires.map((a) => decodeURIComponent(a.url.match(/season=([^&]+)/)![1])).sort();
    expect(codes).toEqual(['24-25', '25-26']);

    // Et chaque adhésion porte son exercice : un marqueur implicite ne se voit pas quand il
    // manque, c'est précisément ce qui rendait la liste vide en silence.
    expect(d.members.every((m: any) => typeof m.seasonCode === 'string' && m.seasonCode)).toBe(true);
  });

  it('n’interroge pas l’annuaire d’un exercice clôturé, où l’on ne peut rien écrire', async () => {
    saisons[0].closedAt = 1756684800000;
    try {
      await lire('reconciliation', '?season=25-26', DROITS);
      const codes = appels
        .filter((a) => a.url.includes('/members?season='))
        .map((a) => decodeURIComponent(a.url.match(/season=([^&]+)/)![1]));
      expect(codes).toEqual(['25-26']);
    } finally {
      saisons[0].closedAt = null;
    }
  });

  it('sort un exercice de l’archive dès qu’il est clôturé', async () => {
    /*
      La borne est auto-limitante, et c'est ce qui la rend tenable : clôturer un exercice
      le fait sortir de l'archive, donc le coût de lecture ne grandit pas sans fin — ce
      qu'on reprochait à la demande nue d'origine (1 188 lignes par ouverture).
    */
    saisons[0].closedAt = 1756684800000;
    try {
      await lire('reconciliation', '?season=25-26', DROITS);
      const archive = appels
        .filter((a) => a.url.includes('/accounting/bank-transactions'))
        .map((a) => a.url)
        .find((u) => u.includes('startDate='))!;

      expect(archive).toContain('startDate=2025-09-01');
      expect(archive).toContain('endDate=2026-08-31');
    } finally {
      saisons[0].closedAt = null;
    }
  });

  it('garde dans l’archive l’exercice consulté, même clôturé', async () => {
    saisons[0].closedAt = 1756684800000;
    try {
      await lire('reconciliation', '?season=24-25', DROITS);
      const archive = appels
        .filter((a) => a.url.includes('/accounting/bank-transactions'))
        .map((a) => a.url)
        .find((u) => u.includes('startDate='))!;

      // Consulter un exercice clôturé doit continuer de montrer ses lignes.
      expect(archive).toContain('startDate=2024-09-01');
    } finally {
      saisons[0].closedAt = null;
    }
  });

  it('fond les deux demandes en une liste sans doublon, la plus récente d’abord', async () => {
    /*
      L'écran dérive tout d'un seul tableau — compteurs, progression, filtre par compte —
      donc une ligne présente dans les deux demandes y compterait deux fois.
    */
    const d = await donnees(await lire('reconciliation', '?season=24-25', DROITS));
    expect(d.bankStatementLines.map((l: any) => l.id)).toEqual([3, 1, 2, 4]);
  });

  /*
    La file montre les lignes de relevé de tous les exercices ; les écritures qu'on leur oppose
    doivent suivre. Bornées à l'exercice consulté, une ligne d'août proposée au pointage depuis
    26-27 n'avait en face aucune écriture d'août — constaté en production sur une commande de
    cordage rattachée à 25-26, introuvable, sans que l'écran dise pourquoi.
  */
  it('propose les écritures de chaque exercice ouvert, pas seulement du consulté', async () => {
    await lire('reconciliation', '?season=26-27', DROITS);

    const codes = appels
      .filter((a) => a.url.includes('/accounting/transactions?season='))
      .map((a) => decodeURIComponent(a.url.match(/season=([^&]+)/)![1]))
      .sort();

    expect(codes).toEqual(['24-25', '25-26', '26-27']);
  });

  it('n’interroge pas les écritures d’un exercice clôturé, qu’on ne peut pas pointer', async () => {
    saisons[0].closedAt = 1756684800000;
    try {
      await lire('reconciliation', '?season=25-26', DROITS);
      const codes = appels
        .filter((a) => a.url.includes('/accounting/transactions?season='))
        .map((a) => decodeURIComponent(a.url.match(/season=([^&]+)/)![1]));
      expect(codes).toEqual(['25-26']);
    } finally {
      saisons[0].closedAt = null;
    }
  });

  it('refuse le solde progressif, que cet écran n’affiche pas', async () => {
    // C'est une sous-requête corrélée, réévaluée pour chacune des 2000 écritures.
    await lire('reconciliation', '', DROITS);
    expect(appels.some((a) => a.url.includes('runningBalance=0'))).toBe(true);
  });

  it('rassemble les annuaires des exercices ouverts, chacun étiqueté', async () => {
    /*
      Un encaissement de septembre concerne souvent l'adhésion de l'année qui commence, et une
      ligne d'août rapprochée depuis l'exercice suivant vise celle de l'année écoulée. Les deux
      annuaires doivent donc être là — et chacun porter SON code.

      La convention précédente laissait l'exercice consulté sans marqueur, son absence valant
      « saison consultée ». Elle se retournait dès que l'exercice visé n'était pas celui qu'on
      consultait : le filtre cherchait un code que personne ne portait.
    */
    const d = await donnees(await lire('reconciliation', '?season=24-25', DROITS));
    expect(d.members.map((m: any) => m.id)).toEqual([10, 11]);
    expect(d.members[0].seasonCode).toBe('24-25');
    expect(d.members[1].seasonCode).toBe('25-26');
  });

  it('nomme la cause quand aucune ligne bancaire n’est sélectionnée', async () => {
    /*
      Le gabarit d'URL acceptait `undefined` et produisait
      `/bank-transactions/undefined/reconcile`, que l'API rejetait en 400 — un message qui
      ne disait ni quelle ligne, ni pourquoi.
    */
    const res = await ecrire('reconciliation', { action: 'reconcile', match: {} }, DROITS);
    expect(res.status).toBe(400);
    expect(((await res.json()) as any).error).toContain('Aucune ligne bancaire');
    expect(appels).toHaveLength(0);
  });

  it('exige le droit de supprimer une écriture, et non celui de rapprocher', async () => {
    // Rapprocher et supprimer une écriture comptable ne sont pas le même geste.
    const res = await ecrire('reconciliation', { action: 'delete-transaction', txId: 5 },
      DROITS.filter((p) => p !== 'accounting:ledger:delete'));
    expect(res.status).toBe(403);
    expect(appels).toHaveLength(0);
  });

  it('accepte un rapprochement complet', async () => {
    const res = await ecrire('reconciliation', { action: 'reconcile', btId: 7, match: { btId: 7 } }, DROITS);
    expect(res.status).toBe(200);
    expect(appels[0].url).toBe('http://localhost/accounting/bank-transactions/7/reconcile');
  });
});
