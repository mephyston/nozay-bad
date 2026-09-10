-- Les créneaux récurrents qui portent des séances individuelles.
--
-- La génération des soirées d'indiv déroulait tous les créneaux `adultes_competition` de
-- la grille. Or l'entraînement compétiteurs en compte quatre — le mardi soir en deux
-- temps, le mercredi à la Halle des Sports, le jeudi tard — et les indiv ne se tiennent
-- que sur deux d'entre eux : le mardi de 19 h 30 à 20 h 30 et le mercredi de 19 h 30 à
-- 21 h. Le public d'un créneau ne dit donc pas s'il ouvre des indiv ; il faut le dire.
--
-- `indiv` est ce marqueur, posé par le bureau depuis l'écran des horaires. Il ne change
-- rien à l'affichage public du créneau : il ne parle qu'à la programmation des soirées.
--
-- Migration strictement additive : l'ancien code ignore la colonne, et son défaut à faux
-- ne marque rien. Le mardi 19 h 30 des compétiteurs, seul créneau d'indiv déjà connu de
-- la grille, est marqué d'office pour que la programmation continue d'en tenir compte ;
-- le mercredi n'existe pas encore dans la grille et se crée depuis l'écran des horaires.

ALTER TABLE `schedule_slots` ADD `indiv` integer DEFAULT false NOT NULL;
--> statement-breakpoint
UPDATE `schedule_slots`
SET `indiv` = 1
WHERE `audience` = 'adultes_competition' AND `weekday` = 2 AND `start_time` = '19:30';
