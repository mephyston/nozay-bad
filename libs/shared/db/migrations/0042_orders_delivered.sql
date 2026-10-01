-- La remise d'une commande boutique.
--
-- Une commande payée sortait de la liste « en cours » pour l'historique, alors que
-- l'article restait souvent à remettre : maillots attendus du fournisseur, volants
-- donnés à l'entraînement suivant. Le bureau n'avait aucun moyen de savoir ce qui
-- restait à distribuer. Nouvel état `delivered`, après `paid`, et sa date.
--
-- `status` est un texte sans contrainte CHECK : la nouvelle valeur n'exige pas de
-- reconstruire la table.
ALTER TABLE `orders` ADD `delivered_at` text;
--> statement-breakpoint
-- Reprise : rien en base ne dit quelles commandes payées ont été remises. Celles des
-- saisons passées l'ont été, à l'évidence — on les solde, datées de leur règlement.
-- Celles de la saison active restent `paid`, donc « à livrer » : le bureau sait ce
-- qu'il a déjà distribué et les soldera à l'écran.
UPDATE `orders`
SET `status` = 'delivered', `delivered_at` = `paid_at`
WHERE `status` = 'paid'
  AND `season_id` NOT IN (SELECT `id` FROM `seasons` WHERE `active` = 1);
