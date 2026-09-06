import { describe, it, expect } from 'vitest';
import { readApiError } from './api-error';

const reponse = (body: string | null) => new Response(body, { status: 400 });

describe('readApiError', () => {
  it("extrait le message de l'enveloppe { success, error } que le relais transmet", async () => {
    const message = "La date de l'écriture sort des bornes de l'exercice sélectionné.";
    await expect(readApiError(reponse(JSON.stringify({ success: false, error: message })), 'Repli')).resolves.toBe(message);
  });

  it('rend un corps en texte simple tel quel', async () => {
    await expect(readApiError(reponse('Accès refusé'), 'Repli')).resolves.toBe('Accès refusé');
  });

  it('retombe sur le repli pour un corps vide, une enveloppe sans message, ou un corps illisible', async () => {
    await expect(readApiError(reponse(''), 'Repli')).resolves.toBe('Repli');
    await expect(readApiError(reponse(null), 'Repli')).resolves.toBe('Repli');
    await expect(readApiError(reponse(JSON.stringify({ success: false })), 'Repli')).resolves.toBe('Repli');
    await expect(readApiError({ text: () => Promise.reject(new Error('flux fermé')) } as any, 'Repli')).resolves.toBe('Repli');
  });

  it("accepte `message` à défaut d'`error`", async () => {
    await expect(readApiError(reponse(JSON.stringify({ message: 'Introuvable' })), 'Repli')).resolves.toBe('Introuvable');
  });
});
