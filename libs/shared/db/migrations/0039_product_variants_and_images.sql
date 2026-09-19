-- Un produit peut se décliner, et porter une image.
--
-- Le catalogue comptait quinze lignes « Maillot … », une par taille : quinze produits
-- sans lien, à illustrer quinze fois, et qu'un adhérent devait retrouver dans une
-- liste déroulante. Une **déclinaison** est un produit rattaché à un parent
-- (`parent_id`) et distingué par un libellé (`variant_label`, « L », « 12 ans ») ; elle
-- garde son prix, son stock et son état — c'est elle que la commande référence, comme
-- avant. Le parent porte le nom, la catégorie, la description et l'image : la vitrine
-- l'affiche en une carte et propose ses déclinaisons au choix.
--
-- `image_key` est une clé de la médiathèque (`media/<empreinte>/<fichier>`), servie par
-- le site public sous `/media/…` avec un cache immuable.
--
-- Migration strictement additive : l'ancien code ignore ces colonnes, et un produit sans
-- parent est un produit comme avant.
ALTER TABLE `products` ADD `parent_id` integer REFERENCES `products`(`id`);
--> statement-breakpoint
ALTER TABLE `products` ADD `variant_label` text;
--> statement-breakpoint
ALTER TABLE `products` ADD `description` text;
--> statement-breakpoint
ALTER TABLE `products` ADD `image_key` text;
--> statement-breakpoint
CREATE INDEX `products_parent_id_idx` ON `products` (`parent_id`);
