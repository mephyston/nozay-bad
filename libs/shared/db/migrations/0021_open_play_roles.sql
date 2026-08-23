-- Droits du jeu libre, accordés aux rôles existants.
--
-- Séparée de `0020`, qui a créé les tables sans accorder quoi que ce soit : c'est ce
-- décalage qui a tenu lieu de drapeau côté administration pendant le développement. Tant
-- qu'aucun rôle ne portait ces droits, l'entrée de menu n'apparaissait qu'au
-- super-administrateur — dont le catalogue est calculé, et qui reste absent d'ici.
--
-- Les droits décalquent exactement ceux des créneaux (`schedules:slots:*`) : qui tient la
-- grille hebdomadaire tient les séances qui en découlent, et inventer une politique
-- nouvelle ici aurait fallu la justifier sans raison. Lecture aux cinq rôles, écriture à
-- la présidence, à l'entraînement et à la communication.
--
-- `schedules:registrations:read` suit en revanche le modèle d'`events:registrations:read`
-- et va aux trois mêmes rôles : une séance est une information de club, la liste de ses
-- inscrits et de leurs invités est une donnée personnelle — et un invité non licencié n'a
-- jamais rien signé au club.
--
-- Bloc généré depuis ROLE_PERMISSIONS (libs/domains/iam/shared/roles.ts) :
-- `libs/migrations.test.ts` rejoue les migrations et compare rôle par rôle, le fichier ne
-- peut donc pas en diverger.
INSERT OR IGNORE INTO `role_permissions` (`role`, `permission`, `created_at`) VALUES
  ('president',     'schedules:open-play:read',     CAST(strftime('%s','now') AS INTEGER)),
  ('president',     'schedules:open-play:write',    CAST(strftime('%s','now') AS INTEGER)),
  ('president',     'schedules:registrations:read', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier',     'schedules:open-play:read',     CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire',    'schedules:open-play:read',     CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire',    'schedules:registrations:read', CAST(strftime('%s','now') AS INTEGER)),
  ('coach',         'schedules:open-play:read',     CAST(strftime('%s','now') AS INTEGER)),
  ('coach',         'schedules:open-play:write',    CAST(strftime('%s','now') AS INTEGER)),
  ('communication', 'schedules:open-play:read',     CAST(strftime('%s','now') AS INTEGER)),
  ('communication', 'schedules:open-play:write',    CAST(strftime('%s','now') AS INTEGER)),
  ('communication', 'schedules:registrations:read', CAST(strftime('%s','now') AS INTEGER));
