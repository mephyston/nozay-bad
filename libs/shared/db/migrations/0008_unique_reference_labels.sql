-- 0008_unique_reference_labels.sql
-- Rend le seed des données de référence réellement idempotent.
--
-- Contexte : `wrangler d1 migrations apply` suit les migrations par NOM DE FICHIER.
-- Le commit 2fc9dfb ayant interverti 0001_seed_reference_data.sql et
-- 0002_add_active_to_categories.sql, le seed a été rejoué en staging le 29/07/2026.
-- `INSERT OR IGNORE` n'a rien filtré : `categories` et `product_categories`
-- n'avaient aucun index unique sur leur libellé, contrairement à `account_classes`,
-- `accounts` et `payment_methods` (qui, eux, sont sortis indemnes).
--
-- On rattache les éventuelles références aux homonymes les plus anciens, on
-- dédoublonne, puis on pose les index qui rendront tout rejeu inoffensif.

-- 1. Rattacher les références au plus ancien homonyme (no-op sans doublon).
UPDATE `ledger_entries`
SET `category_id` = (
  SELECT MIN(`keep`.`id`) FROM `categories` `keep`
  JOIN `categories` `dup` ON `dup`.`admin_label` = `keep`.`admin_label`
  WHERE `dup`.`id` = `ledger_entries`.`category_id`
)
WHERE `category_id` IS NOT NULL;

UPDATE `expenses`
SET `category_id` = (
  SELECT MIN(`keep`.`id`) FROM `categories` `keep`
  JOIN `categories` `dup` ON `dup`.`admin_label` = `keep`.`admin_label`
  WHERE `dup`.`id` = `expenses`.`category_id`
);

-- `season_category_idx` est unique sur (season_id, category_id, type) : si un budget
-- existe des deux côtés d'un doublon, le rattachement violerait l'index. On ne garde
-- que le plus ancien de chaque (saison, type, libellé) avant de rattacher.
DELETE FROM `season_category_budgets`
WHERE `id` NOT IN (
  SELECT MIN(`b`.`id`) FROM `season_category_budgets` `b`
  JOIN `categories` `c` ON `c`.`id` = `b`.`category_id`
  GROUP BY `b`.`season_id`, `b`.`type`, `c`.`admin_label`
);

UPDATE `season_category_budgets`
SET `category_id` = (
  SELECT MIN(`keep`.`id`) FROM `categories` `keep`
  JOIN `categories` `dup` ON `dup`.`admin_label` = `keep`.`admin_label`
  WHERE `dup`.`id` = `season_category_budgets`.`category_id`
);

UPDATE `products`
SET `product_category_id` = (
  SELECT MIN(`keep`.`id`) FROM `product_categories` `keep`
  JOIN `product_categories` `dup` ON `dup`.`label` = `keep`.`label`
  WHERE `dup`.`id` = `products`.`product_category_id`
);

UPDATE `product_categories`
SET `accounting_category_id` = (
  SELECT MIN(`keep`.`id`) FROM `categories` `keep`
  JOIN `categories` `dup` ON `dup`.`admin_label` = `keep`.`admin_label`
  WHERE `dup`.`id` = `product_categories`.`accounting_category_id`
);

-- 2. Supprimer les homonymes en trop (le plus ancien fait foi).
DELETE FROM `product_categories`
WHERE `id` NOT IN (SELECT MIN(`id`) FROM `product_categories` GROUP BY `label`);

DELETE FROM `categories`
WHERE `id` NOT IN (SELECT MIN(`id`) FROM `categories` GROUP BY `admin_label`);

-- 3. Empêcher toute réapparition de doublons.
CREATE UNIQUE INDEX IF NOT EXISTS `categories_admin_label_unique` ON `categories` (`admin_label`);
CREATE UNIQUE INDEX IF NOT EXISTS `product_categories_label_unique` ON `product_categories` (`label`);
