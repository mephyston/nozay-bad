-- Calendrier ICR Séniors 2026-2027 (Ligue Île-de-France de Badminton).
--
-- Ce n'est **pas une migration** : c'est le calendrier d'une compétition pour une saison,
-- pas une donnée de référence partagée par tous les environnements. À jouer à la main,
-- comme les calendriers interclubs départementaux (cf. scripts/seed-ic-calendar-*.sql).
--
-- Structure, d'après le règlement : cinq journées de saison régulière — phase aller et
-- phase retour — puis une sixième dite phases finales. Deux rencontres par journée dans
-- les deux cas.
--
-- **Les journées de report ne figurent pas ici, volontairement.** Le règlement en prévoit
-- deux, mais ce sont des créneaux de repli : la journée qui fait foi reste celle qui a été
-- reportée, puisque c'est elle qui porte les règles de valeur et de composition. Le
-- capitaine déplace donc la date de sa rencontre — `save-fixture-date` accepte une date
-- hors semaine théorique moyennant confirmation explicite. Les inscrire en base aurait
-- dupliqué ce mécanisme et fait apparaître, pour toutes les équipes, deux journées sans
-- rencontre à composer.
--
-- `match_date` reste nul : une journée régionale se dispute **samedi et dimanche**, et une
-- colonne unique ne peut porter les deux. La date se fixe rencontre par rencontre.
--
-- Seules les phases finales sont `playoff` : elles ne sont disputées que par les équipes
-- que leur classement y envoie, si bien qu'une équipe sans rencontre y est normale — là où
-- une journée régulière sans composition est un oubli à signaler.
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
  -- Le libellé reste nul sur la saison régulière : l'écran affiche « Journée n », qui est
  -- déjà le nom employé par la ligue.
  ('26-27', 'icr_seniors', 1, '2026-09-28', '2026-10-04', NULL, 0, 'regular', NULL,             NULL),
  ('26-27', 'icr_seniors', 2, '2026-11-02', '2026-11-08', NULL, 0, 'regular', NULL,             NULL),
  ('26-27', 'icr_seniors', 3, '2026-11-23', '2026-11-29', NULL, 0, 'regular', NULL,             NULL),
  ('26-27', 'icr_seniors', 4, '2027-01-25', '2027-01-31', NULL, 0, 'regular', NULL,             NULL),
  ('26-27', 'icr_seniors', 5, '2027-02-22', '2027-02-28', NULL, 0, 'regular', NULL,             NULL),
  ('26-27', 'icr_seniors', 6, '2027-04-12', '2027-04-18', NULL, 0, 'playoff', 'Phases finales', NULL);
