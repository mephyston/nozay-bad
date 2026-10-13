-- Un produit visible du bureau seul.
--
-- `active` retirait un article de partout : de la boutique des adhérents, mais aussi du
-- formulaire où le bureau commande pour quelqu'un. Un maillot réservé aux joueurs
-- d'interclubs, une taille gardée pour une commande groupée, ne pouvaient plus être ni
-- cachés aux adhérents ni commandés par le bureau. `storefront` fait pour les produits
-- ce qu'il fait déjà pour les moyens de paiement : éteint, le produit reste commandable
-- depuis l'administration et disparaît de la seule boutique.
ALTER TABLE `products` ADD `storefront` integer DEFAULT true NOT NULL;
