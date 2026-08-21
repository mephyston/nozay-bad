import { describe, it, expect } from 'vitest';
import { announcementsByEvent } from './announcements';

describe('announcementsByEvent', () => {
  const href = (p: { slug: string }) => `/actualites#${p.slug}`;

  it('rapproche un rendez-vous de l’actualité qui l’annonce', () => {
    const index = announcementsByEvent(
      [{ slug: 'raclette', title: 'Soirée raclette', eventId: 7 }],
      href
    );
    expect(index.get(7)).toEqual({ href: '/actualites#raclette', title: 'Soirée raclette' });
  });

  it("retient la plus récente quand deux actualités annoncent le même rendez-vous", () => {
    // Les listes arrivent de la plus récente à la plus ancienne : le rappel publié
    // hier doit l'emporter sur l'annonce du mois dernier.
    const index = announcementsByEvent(
      [
        { slug: 'rappel-raclette', title: 'Rappel : raclette', eventId: 7 },
        { slug: 'raclette', title: 'Soirée raclette', eventId: 7 }
      ],
      href
    );
    expect(index.get(7)?.href).toBe('/actualites#rappel-raclette');
  });

  it("ignore une actualité qui n'annonce rien", () => {
    const index = announcementsByEvent(
      [
        { slug: 'divers', title: 'Divers', eventId: null },
        { slug: 'autre', title: 'Autre' }
      ],
      href
    );
    expect(index.size).toBe(0);
  });

  it("ignore un rattachement qui n'est pas un identifiant", () => {
    const index = announcementsByEvent(
      [{ slug: 'bancal', title: 'Bancal', eventId: 0 }],
      href
    );
    expect(index.size).toBe(0);
  });
});
