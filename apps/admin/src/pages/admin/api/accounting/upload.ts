import type { APIRoute } from 'astro';
import type { Permission } from '@nba/iam-ui';
import { can } from '../../../../lib/guard';
import { createAdminApiClient } from '../../../../lib/api';

/**
 * Les dépôts de fichiers de la comptabilité : relevé bancaire, image de chèque.
 *
 * Symétrique de `download.ts`. Même raison technique — le relais ordinaire reconstruit
 * l'enveloppe JSON qu'il reçoit, et un `multipart/form-data` n'y survivrait pas — et même
 * conséquence : les pages qui portaient ces dépôts pourront être figées.
 *
 * ## Ce que ce déplacement corrige
 *
 * Les deux dépôts vivaient dans le `POST` de leur page, **avant** l'appel à
 * `guardAction` : ils s'exécutaient donc sans qu'aucune permission ne soit vérifiée. Tout
 * compte capable d'atteindre l'administration pouvait importer un relevé bancaire ou
 * faire analyser une image. Le catalogue déclarait pourtant `accounting:bank:import`
 * — « Importer un relevé bancaire » — qui n'était appliquée nulle part.
 *
 * Ici chaque dépôt nomme son droit, et le refus précède la lecture du corps.
 */

interface Depot {
  permission: Permission;
  chemin: string;
}

export const DEPOTS: Record<string, Depot> = {
  /** Relevé bancaire, dont l'API rend le compte rendu de lecture. */
  'bank-statement': {
    permission: 'accounting:bank:import',
    chemin: '/accounting/bank-transactions/import'
  },
  /*
    Lecture d'une image de chèque par l'IA. Le catalogue range cette aide sous
    `ai:assistant:use` — « analyse, suggestions, lecture de chèque » — et non sous
    l'écriture comptable : elle ne crée rien, elle propose une saisie.
  */
  'check-analyze': {
    permission: 'ai:assistant:use',
    chemin: '/accounting/checks/analyze'
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const depot = DEPOTS[new URL(request.url).searchParams.get('doc') ?? ''];
  if (!depot) return new Response('Dépôt inconnu', { status: 404 });
  if (!can(locals, depot.permission)) return new Response('Accès refusé', { status: 403 });

  const type = request.headers.get('content-type') ?? '';
  if (!type.includes('multipart/form-data')) {
    return new Response('Un fichier est attendu.', { status: 400 });
  }

  const api = createAdminApiClient(locals);
  const res = await api.fetch(`http://localhost${depot.chemin}`, {
    method: 'POST',
    body: await request.formData()
  });

  /*
    Le compte rendu de l'API est relayé tel quel, et non remplacé par un `{ success: true }`
    muet : c'est lui qui porte le nombre de lignes lues, insérées et déjà connues, ou les
    montants qu'une image a livrés. L'écran n'a rien à dire sans lui.
  */
  const corps = await res.text();
  return new Response(corps, {
    status: res.status,
    headers: { 'Content-Type': res.headers.get('Content-Type') ?? 'application/json' }
  });
};
