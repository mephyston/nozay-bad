-- Calendrier des interclubs départementaux — saison 2026-2027 (CD91, V.01)
--
-- Source : `.data/IC/calendrier-IC-et-coupe-2026-2027.pdf`, relevé case par case.
--
-- Ce n'est pas une migration : c'est la donnée d'un club pour une saison, pas un
-- référentiel commun à tous les environnements. Le fichier est rejouable à volonté
-- (`ON CONFLICT DO UPDATE`) et s'applique là où on en a besoin :
--
--   npx wrangler d1 execute nba-db --local  --file ../../scripts/seed-ic-calendar-2026-2027.sql
--   npx wrangler d1 execute nba-db --remote --file ../../scripts/seed-ic-calendar-2026-2027.sql
--
-- (depuis `apps/api`, où vit la configuration wrangler.)
--
-- Une journée est une **semaine**, du lundi au dimanche : `week_start` est donc toujours
-- un lundi, et c'est cette date qui permet de comparer les journées d'un championnat à
-- l'autre — leurs numéros, eux, ne se correspondent pas.
--
-- Le mixte et le masculin partagent le même calendrier (J01 à J14, bandes vertes du
-- document) ; les vétérans ont le leur (IC V J01 à J05, bandes roses), sur 5 journées.
-- Trois journées vétérans tombent la même semaine qu'une journée mixte/masculin
-- (V J01 = J04, V J02 = J08, V J03 = J14) — ce qui est autorisé, le règlement vétérans
-- ne citant aucun autre championnat.
--
-- **Les jours de jeu diffèrent d'un championnat à l'autre**, ce qui est précisément la
-- raison pour laquelle une journée est une semaine et non un week-end :
--   * mixte et masculin se jouent **du lundi au vendredi en soirée** (art. 3.4.1), le
--     club recevant choisissant son jour — `match_date` reste donc nul ;
--   * les vétérans se jouent **le dimanche** (art. 3.3.1), date que le calendrier fixe :
--     elle est renseignée.
-- Deux équipes peuvent ainsi occuper la même semaine sans partager le moindre jour.

--> statement-breakpoint
INSERT INTO `championship_days`
  (`season_code`, `championship`, `number`, `week_start`, `week_end`, `match_date`, `kind`, `label`, `reference_elo_date`, `created_at`)
VALUES
  -- Championnat mixte : 14 journées, du 2 novembre 2026 au 14 mars 2027.
  ('26-27', 'icd_mixte', 1, '2026-11-02', '2026-11-08', NULL, 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('26-27', 'icd_mixte', 2, '2026-11-09', '2026-11-15', NULL, 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('26-27', 'icd_mixte', 3, '2026-11-16', '2026-11-22', NULL, 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('26-27', 'icd_mixte', 4, '2026-11-23', '2026-11-29', NULL, 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('26-27', 'icd_mixte', 5, '2026-11-30', '2026-12-06', NULL, 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('26-27', 'icd_mixte', 6, '2026-12-07', '2026-12-13', NULL, 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('26-27', 'icd_mixte', 7, '2026-12-14', '2026-12-20', NULL, 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  -- Vacances scolaires du 21 décembre au 3 janvier, puis une semaine de repos.
  ('26-27', 'icd_mixte', 8, '2027-01-11', '2027-01-17', NULL, 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('26-27', 'icd_mixte', 9, '2027-01-18', '2027-01-24', NULL, 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('26-27', 'icd_mixte', 10, '2027-01-25', '2027-01-31', NULL, 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('26-27', 'icd_mixte', 11, '2027-02-01', '2027-02-07', NULL, 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  -- Vacances scolaires du 8 au 21 février.
  ('26-27', 'icd_mixte', 12, '2027-02-22', '2027-02-28', NULL, 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('26-27', 'icd_mixte', 13, '2027-03-01', '2027-03-07', NULL, 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('26-27', 'icd_mixte', 14, '2027-03-08', '2027-03-14', NULL, 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),

  -- Championnat masculin : même calendrier que le mixte (bandes vertes partagées).
  ('26-27', 'icd_masculin', 1, '2026-11-02', '2026-11-08', NULL, 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('26-27', 'icd_masculin', 2, '2026-11-09', '2026-11-15', NULL, 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('26-27', 'icd_masculin', 3, '2026-11-16', '2026-11-22', NULL, 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('26-27', 'icd_masculin', 4, '2026-11-23', '2026-11-29', NULL, 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('26-27', 'icd_masculin', 5, '2026-11-30', '2026-12-06', NULL, 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('26-27', 'icd_masculin', 6, '2026-12-07', '2026-12-13', NULL, 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('26-27', 'icd_masculin', 7, '2026-12-14', '2026-12-20', NULL, 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('26-27', 'icd_masculin', 8, '2027-01-11', '2027-01-17', NULL, 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('26-27', 'icd_masculin', 9, '2027-01-18', '2027-01-24', NULL, 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('26-27', 'icd_masculin', 10, '2027-01-25', '2027-01-31', NULL, 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('26-27', 'icd_masculin', 11, '2027-02-01', '2027-02-07', NULL, 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('26-27', 'icd_masculin', 12, '2027-02-22', '2027-02-28', NULL, 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('26-27', 'icd_masculin', 13, '2027-03-01', '2027-03-07', NULL, 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('26-27', 'icd_masculin', 14, '2027-03-08', '2027-03-14', NULL, 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),

  -- Championnat vétérans : 5 journées (art. 3.2), réparties de novembre à juin.
  ('26-27', 'icd_veterans', 1, '2026-11-23', '2026-11-29', '2026-11-29', 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('26-27', 'icd_veterans', 2, '2027-01-11', '2027-01-17', '2027-01-17', 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('26-27', 'icd_veterans', 3, '2027-03-08', '2027-03-14', '2027-03-14', 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('26-27', 'icd_veterans', 4, '2027-04-26', '2027-05-02', '2027-05-02', 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('26-27', 'icd_veterans', 5, '2027-05-31', '2027-06-06', '2027-06-06', 'regular', NULL, NULL, CAST(strftime('%s','now') AS INTEGER)),

  -- Barrages et finales (bandes orange, « Barrages Aller et Retour » de la légende).
  --
  -- Journées **facultatives** : seules les équipes que leur classement y envoie les
  -- disputent. D'où `kind = 'playoff'` — une équipe sans rencontre y est normale, alors
  -- qu'une journée régulière sans composition est un oubli à signaler. Les règles de
  -- valeur et d'alignement s'y appliquent à l'identique.
  --
  -- Numérotées 15 et 16 pour rester après J14 dans l'ordre du calendrier ; c'est le
  -- libellé qui s'affiche, pas le numéro. Les vétérans n'en ont pas : leur championnat
  -- s'arrête aux cinq journées.
  ('26-27', 'icd_mixte',    15, '2027-03-29', '2027-04-04', NULL, 'playoff', 'Barrages aller',  NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('26-27', 'icd_mixte',    16, '2027-04-19', '2027-04-25', NULL, 'playoff', 'Barrages retour', NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('26-27', 'icd_masculin', 15, '2027-03-29', '2027-04-04', NULL, 'playoff', 'Barrages aller',  NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('26-27', 'icd_masculin', 16, '2027-04-19', '2027-04-25', NULL, 'playoff', 'Barrages retour', NULL, CAST(strftime('%s','now') AS INTEGER))
ON CONFLICT (`season_code`, `championship`, `number`) DO UPDATE SET
  `week_start` = excluded.`week_start`,
  `week_end`   = excluded.`week_end`,
  `match_date` = excluded.`match_date`,
  `kind`       = excluded.`kind`,
  `label`      = excluded.`label`;

--> statement-breakpoint
-- Date d'arrêt des classements communiquée par la CCA : **jeudi 8 octobre 2026**
-- (case rouge « date d'arrêt classements IC » du calendrier).
--
-- C'est la référence des trois championnats départementaux pour toute la saison
-- (art. 6.1.3). Elle n'aura d'effet qu'une fois l'export ELO de cette date importé :
-- tant qu'aucun classement ne porte le 08/10/2026, aucune valeur d'équipe n'est
-- calculable, et l'écran des classements le signale.
INSERT INTO `championship_settings`
  (`season_code`, `championship`, `reference_elo_date`, `updated_at`)
VALUES
  ('26-27', 'icd_mixte',    '2026-10-08', CAST(strftime('%s','now') AS INTEGER)),
  ('26-27', 'icd_masculin', '2026-10-08', CAST(strftime('%s','now') AS INTEGER)),
  ('26-27', 'icd_veterans', '2026-10-08', CAST(strftime('%s','now') AS INTEGER))
ON CONFLICT (`season_code`, `championship`) DO UPDATE SET
  `reference_elo_date` = excluded.`reference_elo_date`,
  `updated_at`         = excluded.`updated_at`;
