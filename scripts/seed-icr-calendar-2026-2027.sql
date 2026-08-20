-- Calendrier ICR Séniors 2026-2027 (Ligue Île-de-France de Badminton).
--
-- Ce n'est **pas une migration** : c'est le calendrier d'une compétition pour une saison,
-- pas une donnée de référence partagée par tous les environnements. À jouer à la main,
-- comme les calendriers interclubs départementaux (cf. scripts/seed-ic-calendar-*.sql).
--
-- Structure, d'après le règlement : cinq journées de saison régulière (phase aller et
-- phase retour), deux « journées de report » pour les rencontres non jouées, et une
-- sixième journée dite phases finales. Deux rencontres par journée dans tous les cas.
--
-- La numérotation suit l'ordre chronologique : c'est elle qui sert de clé de recherche
-- (`/equipes/<id>/journee/<n>`) et de tri. Le nom du comité vit dans `label`, affiché en
-- lieu et place de « Journée n » — « Journée 4 » est donc la n° 5.
--
-- `match_date` reste nul : une journée régionale se dispute **samedi et dimanche**, et
-- une colonne unique ne peut porter les deux. La date se fixe rencontre par rencontre.
--
-- `kind` : les journées de report restent `regular` — elles servent à replacer une
-- rencontre qui n'a pas pu se tenir, pas à qualifier. Seules les phases finales sont
-- `playoff`, n'étant disputées que par les équipes que leur classement y envoie.
--
-- Idempotent : rejouable sans créer de doublon.
--
-- Usage, depuis apps/api :
--   npx wrangler d1 execute nba-db-staging --remote --env staging --file ../../scripts/seed-icr-calendar-2026-2027.sql
--   npx wrangler d1 execute nba-db --remote --file ../../scripts/seed-icr-calendar-2026-2027.sql
--   npx wrangler d1 execute nba-db --local --file ../../scripts/seed-icr-calendar-2026-2027.sql

DELETE FROM championship_days
WHERE season_code = '26-27' AND championship = 'icr_seniors';

INSERT INTO championship_days
  (season_code, championship, number, week_start, week_end, reference_elo_date, created_at, kind, label, match_date)
VALUES
  ('26-27', 'icr_seniors', 1, '2026-09-28', '2026-10-04', NULL, 0, 'regular', 'Journée 1',         NULL),
  ('26-27', 'icr_seniors', 2, '2026-11-02', '2026-11-08', NULL, 0, 'regular', 'Journée 2',         NULL),
  ('26-27', 'icr_seniors', 3, '2026-11-23', '2026-11-29', NULL, 0, 'regular', 'Journée 3',         NULL),
  ('26-27', 'icr_seniors', 4, '2026-12-14', '2026-12-20', NULL, 0, 'regular', 'Journée de report 1', NULL),
  ('26-27', 'icr_seniors', 5, '2027-01-25', '2027-01-31', NULL, 0, 'regular', 'Journée 4',         NULL),
  ('26-27', 'icr_seniors', 6, '2027-02-01', '2027-02-07', NULL, 0, 'regular', 'Journée de report 2', NULL),
  ('26-27', 'icr_seniors', 7, '2027-02-22', '2027-02-28', NULL, 0, 'regular', 'Journée 5',         NULL),
  ('26-27', 'icr_seniors', 8, '2027-04-12', '2027-04-18', NULL, 0, 'playoff', 'Phases finales',    NULL);
