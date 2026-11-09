import { describe, expect, it } from 'vitest';
import { buvetteClosedResponse } from './closed-page';

const page = { title: 'La buvette est fermée', message: "Elle n'est pas ouverte.", hint: 'Votre solde est conservé.', clubName: 'Club <test>' };

describe('page de la buvette éteinte', () => {
  it('une page lisible, en 503 et non en 404', async () => {
    const res = buvetteClosedResponse(page, new Request('https://buvette.example.org/compte'));
    expect(res.status).toBe(503);
    expect(res.headers.get('Content-Type')).toContain('text/html');
    const html = await res.text();
    expect(html).toContain('La buvette est fermée');
    expect(html).toContain('Votre solde est conservé.');
    expect(html).toContain('Club &lt;test&gt;');
    expect(html).not.toContain('Club <test>');
  });

  it("un appel d'API reçoit le même message en JSON, que la caisse affiche", async () => {
    const res = buvetteClosedResponse(page, new Request('https://caisse.example.org/api/sessions/current'));
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ success: false, error: "La buvette est fermée. Elle n'est pas ouverte." });
  });
});
