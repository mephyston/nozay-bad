import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

vi.mock('./authz/actor', () => ({
  resolveActor: vi.fn()
}));

import { aiRouter } from './ai';
import { AI_TOOLS, TOOL_PERMISSIONS } from './ai-tools';
import { resolveActor } from './authz/actor';

/**
 * La table ROUTE_PERMISSIONS n'exige que `ai:assistant:use` sur /ai/chat : ce sont
 * ces tests qui garantissent que les outils, eux, restent bornés aux droits de
 * lecture de l'acteur. Sans eux, accorder l'assistant à un rôle sans accès aux
 * finances ouvrirait un canal d'exfiltration par simple question.
 */

function makeApp(ai: { run: ReturnType<typeof vi.fn> }) {
  const app = new Hono<{ Bindings: { DB: any; AI: any } }>();
  app.route('/ai', aiRouter);
  return {
    request: (body: unknown, email = 'compte@nozaybad.fr') =>
      app.request(
        new Request('http://localhost/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-email': email },
          body: JSON.stringify(body)
        }),
        undefined,
        { DB: {} as any, AI: ai }
      )
  };
}

function actorWith(permissions: string[]) {
  return {
    id: 1,
    email: 'compte@nozaybad.fr',
    name: 'Compte',
    roles: ['president'],
    permissions: new Set(permissions)
  } as any;
}

beforeEach(() => {
  vi.mocked(resolveActor).mockReset();
});

describe('POST /ai/chat — outils bornés aux permissions', () => {
  it('chaque outil déclare sa permission (table exhaustive)', () => {
    for (const tool of AI_TOOLS) {
      expect(
        TOOL_PERMISSIONS[tool.function.name],
        `outil ${tool.function.name} sans permission déclarée dans TOOL_PERMISSIONS`
      ).toBeDefined();
    }
  });

  it("n'offre au modèle que les outils couverts par les droits de l'acteur", async () => {
    vi.mocked(resolveActor).mockResolvedValue(actorWith(['ai:assistant:use', 'members:members:read']));
    const run = vi.fn().mockResolvedValue({ response: 'Bonjour.' });

    const res = await makeApp({ run }).request({ prompt: 'Combien de membres ?' });

    expect(res.status).toBe(200);
    const offered = run.mock.calls[0][1].tools.map((t: any) => t.function.name);
    expect(offered).toContain('list_members');
    expect(offered).toContain('get_member_stats');
    expect(offered).not.toContain('get_season_reports');
  });

  it("n'offre aucun outil quand l'acteur n'a aucune lecture", async () => {
    vi.mocked(resolveActor).mockResolvedValue(actorWith(['ai:assistant:use']));
    const run = vi.fn().mockResolvedValue({ response: 'Bonjour.' });

    await makeApp({ run }).request({ prompt: 'Le bilan ?' });

    expect(run.mock.calls[0][1].tools).toEqual([]);
  });

  it("refuse d'exécuter un outil réclamé sans la permission correspondante", async () => {
    vi.mocked(resolveActor).mockResolvedValue(actorWith(['ai:assistant:use']));
    // Le modèle réclame un outil qu'on ne lui a pas offert : la garde d'exécution
    // doit répondre par un refus, sans toucher à la base (DB est un objet vide).
    const run = vi
      .fn()
      .mockResolvedValueOnce({ response: '', tool_calls: [{ name: 'list_members', arguments: '{}' }] })
      .mockResolvedValueOnce({ response: 'Je ne peux pas répondre.' });

    const res = await makeApp({ run }).request({ prompt: 'Liste des membres ?' });

    expect(res.status).toBe(200);
    const toolMessage = run.mock.calls[1][1].messages.find((m: any) => m.role === 'tool');
    expect(toolMessage.content).toContain('non autorisé');
  });

  it("refuse aussi un outil inconnu de la table des permissions", async () => {
    vi.mocked(resolveActor).mockResolvedValue(actorWith(['ai:assistant:use', 'members:members:read']));
    const run = vi
      .fn()
      .mockResolvedValueOnce({ response: '', tool_calls: [{ name: 'drop_database', arguments: '{}' }] })
      .mockResolvedValueOnce({ response: 'Je ne peux pas répondre.' });

    await makeApp({ run }).request({ prompt: 'Fais le ménage.' });

    const toolMessage = run.mock.calls[1][1].messages.find((m: any) => m.role === 'tool');
    expect(toolMessage.content).toContain('non autorisé');
  });
});
