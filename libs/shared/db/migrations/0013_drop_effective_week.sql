-- La semaine réelle d'une rencontre disparaît : une seule semaine fait règle.
--
-- La colonne `effective_week_start` distinguait la semaine où la rencontre se joue
-- vraiment de celle de sa journée, et servait à évaluer « un joueur ne tient qu'une
-- équipe du club ». C'était une lecture erronée du règlement, qui dit « pour une même
-- **journée** de championnat » (art. 6.3.7) — pas « la même semaine de jeu ».
--
-- La semaine **théorique**, celle du calendrier du comité, est donc figée et porte seule
-- les règles transverses : valeur d'équipe, mouvements de joueurs, unicité d'équipe.
-- La date réelle de la rencontre (`played_at`) reste, mais relève de la seule logistique :
-- elle dit quand se présenter, elle ne change rien à ce que le règlement autorise.
--
-- Garder la colonne aurait invité quelqu'un à y adosser une règle : un gymnase
-- indisponible aurait alors modifié les compositions permises.

ALTER TABLE `team_fixtures` DROP COLUMN `effective_week_start`;
