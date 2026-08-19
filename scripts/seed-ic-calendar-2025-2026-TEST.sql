-- Calendrier de TEST pour la saison 2025-2026.
--
-- Données fictives, destinées au seul essai de la fonctionnalité en local. L'espace
-- adhérent résout la saison par ses dates : à la mi-août 2026, c'est encore 25-26, et
-- l'on ne peut donc pas y tester le vrai calendrier 2026-2027.
--
-- Le calendrier réel est décalé de **364 jours** — 52 semaines pile, ce qui préserve le
-- jour de la semaine de chaque journée. Les vétérans gardent leur dimanche, le mixte et
-- le masculin leur semaine du lundi au vendredi.
--
-- Le régional n'a pas de calendrier fourni (il vient de la LIFB, pas du CD91) : ses six
-- journées sont inventées de toutes pièces, le dimanche, pour rendre l'équipe testable.
--
--   npx wrangler d1 execute nba-db --local --file ../../scripts/seed-ic-calendar-2025-2026-TEST.sql
--
-- À ne jamais jouer en production.

--> statement-breakpoint
INSERT INTO `championship_days`
  (`season_code`, `championship`, `number`, `week_start`, `week_end`, `match_date`, `kind`, `label`, `reference_elo_date`, `created_at`)
VALUES
  ('25-26', 'icd_mixte', 1, '2025-11-03', '2025-11-09', NULL, 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('25-26', 'icd_masculin', 1, '2025-11-03', '2025-11-09', NULL, 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('25-26', 'icd_mixte', 2, '2025-11-10', '2025-11-16', NULL, 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('25-26', 'icd_masculin', 2, '2025-11-10', '2025-11-16', NULL, 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('25-26', 'icd_mixte', 3, '2025-11-17', '2025-11-23', NULL, 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('25-26', 'icd_masculin', 3, '2025-11-17', '2025-11-23', NULL, 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('25-26', 'icd_mixte', 4, '2025-11-24', '2025-11-30', NULL, 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('25-26', 'icd_masculin', 4, '2025-11-24', '2025-11-30', NULL, 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('25-26', 'icd_mixte', 5, '2025-12-01', '2025-12-07', NULL, 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('25-26', 'icd_masculin', 5, '2025-12-01', '2025-12-07', NULL, 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('25-26', 'icd_mixte', 6, '2025-12-08', '2025-12-14', NULL, 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('25-26', 'icd_masculin', 6, '2025-12-08', '2025-12-14', NULL, 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('25-26', 'icd_mixte', 7, '2025-12-15', '2025-12-21', NULL, 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('25-26', 'icd_masculin', 7, '2025-12-15', '2025-12-21', NULL, 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('25-26', 'icd_mixte', 8, '2026-01-12', '2026-01-18', NULL, 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('25-26', 'icd_masculin', 8, '2026-01-12', '2026-01-18', NULL, 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('25-26', 'icd_mixte', 9, '2026-01-19', '2026-01-25', NULL, 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('25-26', 'icd_masculin', 9, '2026-01-19', '2026-01-25', NULL, 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('25-26', 'icd_mixte', 10, '2026-01-26', '2026-02-01', NULL, 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('25-26', 'icd_masculin', 10, '2026-01-26', '2026-02-01', NULL, 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('25-26', 'icd_mixte', 11, '2026-02-02', '2026-02-08', NULL, 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('25-26', 'icd_masculin', 11, '2026-02-02', '2026-02-08', NULL, 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('25-26', 'icd_mixte', 12, '2026-02-23', '2026-03-01', NULL, 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('25-26', 'icd_masculin', 12, '2026-02-23', '2026-03-01', NULL, 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('25-26', 'icd_mixte', 13, '2026-03-02', '2026-03-08', NULL, 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('25-26', 'icd_masculin', 13, '2026-03-02', '2026-03-08', NULL, 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('25-26', 'icd_mixte', 14, '2026-03-09', '2026-03-15', NULL, 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('25-26', 'icd_masculin', 14, '2026-03-09', '2026-03-15', NULL, 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('25-26', 'icd_mixte', 15, '2026-03-30', '2026-04-05', NULL, 'playoff', 'Barrages aller', NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('25-26', 'icd_masculin', 15, '2026-03-30', '2026-04-05', NULL, 'playoff', 'Barrages aller', NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('25-26', 'icd_mixte', 16, '2026-04-20', '2026-04-26', NULL, 'playoff', 'Barrages retour', NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('25-26', 'icd_masculin', 16, '2026-04-20', '2026-04-26', NULL, 'playoff', 'Barrages retour', NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('25-26', 'icd_veterans', 1, '2025-11-24', '2025-11-30', '2025-11-30', 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('25-26', 'icd_veterans', 2, '2026-01-12', '2026-01-18', '2026-01-18', 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('25-26', 'icd_veterans', 3, '2026-03-09', '2026-03-15', '2026-03-15', 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('25-26', 'icd_veterans', 4, '2026-04-27', '2026-05-03', '2026-05-03', 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('25-26', 'icd_veterans', 5, '2026-06-01', '2026-06-07', '2026-06-07', 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('25-26', 'icr_seniors', 1, '2025-11-10', '2025-11-16', '2025-11-16', 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('25-26', 'icr_seniors', 2, '2025-12-08', '2025-12-14', '2025-12-14', 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('25-26', 'icr_seniors', 3, '2026-01-19', '2026-01-25', '2026-01-25', 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('25-26', 'icr_seniors', 4, '2026-02-02', '2026-02-08', '2026-02-08', 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('25-26', 'icr_seniors', 5, '2026-03-02', '2026-03-08', '2026-03-08', 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('25-26', 'icr_seniors', 6, '2026-03-30', '2026-04-05', '2026-04-05', 'playoff', 'Phases finales', NULL, CAST(strftime('%s','now') AS INTEGER))
ON CONFLICT (`season_code`, `championship`, `number`) DO UPDATE SET
  `week_start` = excluded.`week_start`,
  `week_end`   = excluded.`week_end`,
  `match_date` = excluded.`match_date`,
  `kind`       = excluded.`kind`,
  `label`      = excluded.`label`;

--> statement-breakpoint
-- Date de référence : celle de l'export ELO réellement importé (13/08/2026), sans quoi
-- aucune valeur d'équipe ne serait calculable et l'écran n'afficherait que des tirets.
INSERT INTO `championship_settings` (`season_code`, `championship`, `reference_elo_date`, `updated_at`)
VALUES
  ('25-26', 'icd_mixte',    '2026-08-13', CAST(strftime('%s','now') AS INTEGER)),
  ('25-26', 'icd_masculin', '2026-08-13', CAST(strftime('%s','now') AS INTEGER)),
  ('25-26', 'icd_veterans', '2026-08-13', CAST(strftime('%s','now') AS INTEGER))
ON CONFLICT (`season_code`, `championship`) DO UPDATE SET
  `reference_elo_date` = excluded.`reference_elo_date`,
  `updated_at`         = excluded.`updated_at`;
