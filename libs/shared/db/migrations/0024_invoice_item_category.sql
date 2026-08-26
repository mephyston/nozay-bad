-- La catégorie comptable d'une ligne de facture.
--
-- `invoice_items` ne portait aucune imputation : ni la facture ni ses lignes ne disaient à quel
-- produit elles se rapportaient. Au rapprochement, l'écran devait donc en inventer une, et il
-- l'inventait en dur — `category: '1'` dans `reconciliation-api.ts`, soit « Adhésions &
-- Inscriptions ». Toute recette de facturation, location de salle à une commune, prestation à un
-- CE, sponsoring, atterrissait au compte de résultat sous ce même intitulé.
--
-- La colonne est **nullable**, et volontairement : les factures déjà émises ne portent pas cette
-- information, et leur en attribuer une d'office reviendrait à les étiqueter à tort — exactement
-- ce que le `'1'` en dur faisait. Une ligne sans catégorie oblige simplement la comptable à la
-- choisir au moment de l'encaissement, comme aujourd'hui, mais en la voyant.
--
-- Migration strictement additive : la version qui la porte reste rollbackable, l'ancien code
-- ignorant simplement cette colonne.

ALTER TABLE `invoice_items` ADD `category_id` integer REFERENCES `categories`(`id`);
