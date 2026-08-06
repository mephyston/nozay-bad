import { Type } from '@sinclair/typebox';

/**
 * Contrat d'émission d'une notification.
 *
 * Le schéma vit dans le domaine, mais la route qui l'utilise vit dans `apps/api` :
 * le ciblage « cotisation non soldée » se résout côté adhérents, et le contexte
 * notifications doit rester sans dépendance (cf. RF-NOT-002).
 *
 * Les longueurs sont bornées pour que la charge utile chiffrée tienne dans les
 * 4 Ko garantis par les services de push (cf. MAX_PAYLOAD_BYTES).
 */
export const sendNotificationSchema = Type.Object({
  title: Type.String({ minLength: 1, maxLength: 80 }),
  body: Type.String({ minLength: 1, maxLength: 300 }),
  // Chemin relatif uniquement : une notification ne doit pas ouvrir un site tiers.
  url: Type.Optional(Type.String({ maxLength: 300, pattern: '^/' })),
  target: Type.Union([Type.Literal('all'), Type.Literal('unpaid')])
});
