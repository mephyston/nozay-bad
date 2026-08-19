-- Données de référence et droits par rôle, pour une base neuve.
--
-- `drizzle-kit generate` ne produit que du DDL, jamais de données : tout ce dont une
-- base vide a besoin pour être exploitable vit donc ici.
--
--  1. Référentiels métier (plan comptable, catégories, moyens de paiement). Les codes
--     attendus sont vérifiés par `scripts/check-schema-integrity.js`, qui pointe ce
--     fichier par son nom.
--  2. Droits par rôle, générés depuis ROLE_PERMISSIONS
--     (libs/domains/iam/shared/roles.ts). `libs/migrations.test.ts` rejoue ce fichier
--     et compare au code : le bloc ne peut pas diverger sans faire échouer la CI.
--
-- `super_admin` est absent : il vaut la totalité du catalogue, calculée en code.
--
-- `INSERT OR IGNORE` partout, pour que le fichier reste rejouable sur une base qui
-- porte déjà ces lignes — c'est ce qui rend une réinjection de sauvegarde possible.

INSERT OR IGNORE INTO `account_classes` (`code`, `label`, `type`, `created_at`) VALUES
('70', 'Ventes de produits et prestations', 'recette', 1783962600),
('74', 'Subventions et aides publiques', 'recette', 1783962600),
('75', 'Autres produits de gestion courante', 'recette', 1783962600),
('60', 'Achats de matières et fournitures', 'depense', 1783962600),
('61', 'Services extérieurs', 'depense', 1783962600),
('62', 'Autres services extérieurs', 'depense', 1783962600),
('63', 'Impôts, taxes et versements assimilés', 'depense', 1783962600),
('64', 'Charges de personnel', 'depense', 1783962600),
('65', 'Autres charges de gestion courante', 'depense', 1783962600),
('512', 'Comptes de chèques postaux et bancaires', 'tresorerie', 1783962600),
('517', 'Autres placements et livrets', 'tresorerie', 1783962600),
('530', 'Caisse', 'tresorerie', 1783962600);

-- 2. ACCOUNTS (Comptes de trésorerie de l'association)
INSERT OR IGNORE INTO `accounts` (`code`, `label`, `account_class_id`, `created_at`) VALUES
('current', 'Compte Courant', (SELECT `id` FROM `account_classes` WHERE `code` = '512'), 1783962600),
('savings', 'Livret A / Épargne', (SELECT `id` FROM `account_classes` WHERE `code` = '517'), 1783962600),
('cash', 'Caisse Buvette', (SELECT `id` FROM `account_classes` WHERE `code` = '530'), 1783962600);

-- 3. PAYMENT METHODS (Modes de règlement)
INSERT OR IGNORE INTO `payment_methods` (`code`, `label`, `default_account_id`, `default_entry_status`, `created_at`) VALUES
('virement', 'Virement bancaire', (SELECT `id` FROM `accounts` WHERE `code` = 'current'), 'cleared', 1783962600),
('cheque', 'Chèque', (SELECT `id` FROM `accounts` WHERE `code` = 'current'), 'in_vault', 1783962600),
('especes', 'Espèces', (SELECT `id` FROM `accounts` WHERE `code` = 'cash'), 'cleared', 1783962600),
('cb', 'Carte bancaire / Stripe', (SELECT `id` FROM `accounts` WHERE `code` = 'current'), 'cleared', 1783962600),
('labaz', 'Chèque LABAZ', (SELECT `id` FROM `accounts` WHERE `code` = 'current'), 'in_vault', 1783962600),
('ancv', 'Chèque-Vacances ANCV', (SELECT `id` FROM `accounts` WHERE `code` = 'current'), 'in_vault', 1783962600),
('pass_sport', 'Pass''Sport', (SELECT `id` FROM `accounts` WHERE `code` = 'current'), 'in_vault', 1783962600),
('ticket_loisir', 'Ticket Loisir', (SELECT `id` FROM `accounts` WHERE `code` = 'current'), 'in_vault', 1783962600),
('up_loisir', 'Coupon Sport / Up''Loisir', (SELECT `id` FROM `accounts` WHERE `code` = 'current'), 'in_vault', 1783962600);

-- 4. CATEGORIES (Nomenclature analytique et budgétaire)
INSERT OR IGNORE INTO `categories` (`admin_label`, `adherent_label`, `hide_in_expenses`, `receipt_account_class_id`, `expense_account_class_id`, `active`, `created_at`) VALUES
('Adhésions & Inscriptions', 'Adhésions & Inscriptions', 0, (SELECT `id` FROM `account_classes` WHERE `code` = '70'), NULL, 1, 1783962600),
('Sponsoring', 'Sponsoring', 0, (SELECT `id` FROM `account_classes` WHERE `code` = '70'), NULL, 1, 1783962600),
('Subventions', 'Subventions', 0, (SELECT `id` FROM `account_classes` WHERE `code` = '74'), NULL, 1, 1783962600),
('Actions Jeunes', 'Actions Jeunes', 0, (SELECT `id` FROM `account_classes` WHERE `code` = '70'), (SELECT `id` FROM `account_classes` WHERE `code` = '62'), 1, 1783962600),
('Tournois Hivers', 'Tournois Hivers', 0, (SELECT `id` FROM `account_classes` WHERE `code` = '70'), (SELECT `id` FROM `account_classes` WHERE `code` = '62'), 1, 1783962600),
('Buvettes', 'Buvettes', 0, (SELECT `id` FROM `account_classes` WHERE `code` = '70'), (SELECT `id` FROM `account_classes` WHERE `code` = '60'), 1, 1783962600),
('Cordages', 'Cordages', 0, (SELECT `id` FROM `account_classes` WHERE `code` = '70'), (SELECT `id` FROM `account_classes` WHERE `code` = '60'), 1, 1783962600),
('Volants', 'Volants', 0, (SELECT `id` FROM `account_classes` WHERE `code` = '70'), (SELECT `id` FROM `account_classes` WHERE `code` = '60'), 1, 1783962600),
('Salaires et Charges', 'Salaires & Charges', 1, NULL, (SELECT `id` FROM `account_classes` WHERE `code` = '64'), 1, 1783962600),
('Autre matériel', 'Autre matériel', 0, (SELECT `id` FROM `account_classes` WHERE `code` = '70'), (SELECT `id` FROM `account_classes` WHERE `code` = '60'), 1, 1783962600),
('Licences FFBaD', 'Licences FFBaD', 1, NULL, (SELECT `id` FROM `account_classes` WHERE `code` = '65'), 1, 1783962600),
('Championnats', 'Championnats', 0, NULL, (SELECT `id` FROM `account_classes` WHERE `code` = '62'), 1, 1783962600),
('Stages jeunes', 'Stages jeunes', 0, (SELECT `id` FROM `account_classes` WHERE `code` = '70'), (SELECT `id` FROM `account_classes` WHERE `code` = '62'), 1, 1783962600),
('Frais de fonctionnement', 'Frais de fonctionnement', 0, (SELECT `id` FROM `account_classes` WHERE `code` = '75'), (SELECT `id` FROM `account_classes` WHERE `code` = '61'), 1, 1783962600),
('Virements Internes', 'Virement Interne', 1, NULL, NULL, 1, 1783962600),
('Intérêts Livret A', 'Intérêts Livret A', 1, (SELECT `id` FROM `account_classes` WHERE `code` = '75'), NULL, 1, 1783962600),
('Tournée Eté', 'Tournois Eté', 0, (SELECT `id` FROM `account_classes` WHERE `code` = '70'), (SELECT `id` FROM `account_classes` WHERE `code` = '62'), 1, 1785067816),
('Textiles & Accesoires', 'Maillots & Grips', 0, (SELECT `id` FROM `account_classes` WHERE `code` = '70'), (SELECT `id` FROM `account_classes` WHERE `code` = '60'), 1, 1785068391);

-- 5. PRODUCT CATEGORIES (Familles de produits boutique rattachées aux catégories comptables)
INSERT OR IGNORE INTO `product_categories` (`label`, `accounting_category_id`, `active`, `created_at`) VALUES
('Volants', (SELECT `id` FROM `categories` WHERE `admin_label` = 'Volants'), 1, 1783962600),
('Cordages', (SELECT `id` FROM `categories` WHERE `admin_label` = 'Cordages'), 1, 1783962600),
('Textile & Accessoires', (SELECT `id` FROM `categories` WHERE `admin_label` = 'Autre matériel'), 1, 1783962600),
('Poteaux & Filets', (SELECT `id` FROM `categories` WHERE `admin_label` = 'Autre matériel'), 1, 1785068321);

--> statement-breakpoint

-- Droits par rôle, générés depuis ROLE_PERMISSIONS.
INSERT OR IGNORE INTO `role_permissions` (`role`, `permission`, `created_at`) VALUES
  ('president', 'accounting:bank:read', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'accounting:budget:read', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'accounting:budget:write', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'accounting:checks:read', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'accounting:config:read', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'accounting:invoices:read', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'accounting:ledger:read', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'accounting:reports:export', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'accounting:reports:read', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'accounting:seasons:close', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'accounting:seasons:read', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'accounting:seasons:write', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'ai:assistant:use', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'announcements:posts:delete', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'announcements:posts:read', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'announcements:posts:write', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'cms:media:delete', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'cms:media:read', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'cms:media:write', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'cms:nav:read', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'cms:nav:write', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'cms:pages:delete', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'cms:pages:read', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'cms:pages:write', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'cms:posts:delete', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'cms:posts:read', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'cms:posts:write', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'dashboard:overview:read', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'expenses:reports:approve', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'expenses:reports:read', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'help:docs:read', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'iam:roles:read', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'iam:users:delete', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'iam:users:read', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'iam:users:write', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'members:attestations:read', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'members:members:read', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'notifications:messages:read', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'notifications:messages:send', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'settings:hub:read', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'shop:orders:approve', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'shop:orders:read', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'shop:products:read', CAST(strftime('%s','now') AS INTEGER));
--> statement-breakpoint
INSERT OR IGNORE INTO `role_permissions` (`role`, `permission`, `created_at`) VALUES
  ('tresorier', 'accounting:bank:import', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'accounting:bank:read', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'accounting:bank:reconcile', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'accounting:budget:read', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'accounting:budget:write', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'accounting:checks:delete', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'accounting:checks:read', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'accounting:checks:write', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'accounting:config:read', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'accounting:config:write', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'accounting:invoices:delete', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'accounting:invoices:read', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'accounting:invoices:write', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'accounting:ledger:delete', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'accounting:ledger:read', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'accounting:ledger:write', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'accounting:reports:export', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'accounting:reports:read', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'accounting:seasons:close', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'accounting:seasons:read', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'accounting:seasons:write', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'ai:assistant:use', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'announcements:posts:read', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'cms:pages:read', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'cms:posts:read', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'dashboard:overview:read', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'expenses:reports:approve', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'expenses:reports:read', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'expenses:reports:write', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'help:docs:read', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'members:attestations:read', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'members:attestations:write', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'members:members:read', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'notifications:messages:read', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'settings:hub:read', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'shop:orders:approve', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'shop:orders:read', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'shop:products:read', CAST(strftime('%s','now') AS INTEGER));
--> statement-breakpoint
INSERT OR IGNORE INTO `role_permissions` (`role`, `permission`, `created_at`) VALUES
  ('secretaire', 'accounting:config:read', CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire', 'accounting:reports:read', CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire', 'accounting:seasons:read', CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire', 'announcements:posts:delete', CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire', 'announcements:posts:read', CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire', 'announcements:posts:write', CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire', 'cms:media:read', CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire', 'cms:media:write', CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire', 'cms:nav:read', CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire', 'cms:pages:read', CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire', 'cms:pages:write', CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire', 'cms:posts:read', CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire', 'cms:posts:write', CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire', 'dashboard:overview:read', CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire', 'expenses:reports:read', CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire', 'help:docs:read', CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire', 'members:attestations:read', CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire', 'members:attestations:write', CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire', 'members:members:import', CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire', 'members:members:read', CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire', 'members:members:write', CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire', 'notifications:messages:read', CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire', 'notifications:messages:send', CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire', 'settings:hub:read', CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire', 'shop:categories:write', CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire', 'shop:orders:read', CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire', 'shop:products:read', CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire', 'shop:products:write', CAST(strftime('%s','now') AS INTEGER));
--> statement-breakpoint
INSERT OR IGNORE INTO `role_permissions` (`role`, `permission`, `created_at`) VALUES
  ('coach', 'accounting:config:read', CAST(strftime('%s','now') AS INTEGER)),
  ('coach', 'accounting:seasons:read', CAST(strftime('%s','now') AS INTEGER)),
  ('coach', 'announcements:posts:read', CAST(strftime('%s','now') AS INTEGER)),
  ('coach', 'cms:pages:read', CAST(strftime('%s','now') AS INTEGER)),
  ('coach', 'cms:posts:read', CAST(strftime('%s','now') AS INTEGER)),
  ('coach', 'dashboard:overview:read', CAST(strftime('%s','now') AS INTEGER)),
  ('coach', 'help:docs:read', CAST(strftime('%s','now') AS INTEGER)),
  ('coach', 'members:members:read', CAST(strftime('%s','now') AS INTEGER)),
  ('coach', 'settings:hub:read', CAST(strftime('%s','now') AS INTEGER)),
  ('coach', 'shop:categories:write', CAST(strftime('%s','now') AS INTEGER)),
  ('coach', 'shop:orders:read', CAST(strftime('%s','now') AS INTEGER)),
  ('coach', 'shop:orders:write', CAST(strftime('%s','now') AS INTEGER)),
  ('coach', 'shop:products:read', CAST(strftime('%s','now') AS INTEGER)),
  ('coach', 'shop:products:write', CAST(strftime('%s','now') AS INTEGER));
--> statement-breakpoint
INSERT OR IGNORE INTO `role_permissions` (`role`, `permission`, `created_at`) VALUES
  ('communication', 'announcements:posts:delete', CAST(strftime('%s','now') AS INTEGER)),
  ('communication', 'announcements:posts:read', CAST(strftime('%s','now') AS INTEGER)),
  ('communication', 'announcements:posts:write', CAST(strftime('%s','now') AS INTEGER)),
  ('communication', 'cms:media:delete', CAST(strftime('%s','now') AS INTEGER)),
  ('communication', 'cms:media:read', CAST(strftime('%s','now') AS INTEGER)),
  ('communication', 'cms:media:write', CAST(strftime('%s','now') AS INTEGER)),
  ('communication', 'cms:nav:read', CAST(strftime('%s','now') AS INTEGER)),
  ('communication', 'cms:nav:write', CAST(strftime('%s','now') AS INTEGER)),
  ('communication', 'cms:pages:delete', CAST(strftime('%s','now') AS INTEGER)),
  ('communication', 'cms:pages:read', CAST(strftime('%s','now') AS INTEGER)),
  ('communication', 'cms:pages:write', CAST(strftime('%s','now') AS INTEGER)),
  ('communication', 'cms:posts:delete', CAST(strftime('%s','now') AS INTEGER)),
  ('communication', 'cms:posts:read', CAST(strftime('%s','now') AS INTEGER)),
  ('communication', 'cms:posts:write', CAST(strftime('%s','now') AS INTEGER)),
  ('communication', 'dashboard:overview:read', CAST(strftime('%s','now') AS INTEGER)),
  ('communication', 'help:docs:read', CAST(strftime('%s','now') AS INTEGER)),
  ('communication', 'notifications:messages:read', CAST(strftime('%s','now') AS INTEGER)),
  ('communication', 'notifications:messages:send', CAST(strftime('%s','now') AS INTEGER));
--> statement-breakpoint
INSERT OR IGNORE INTO `role_permissions` (`role`, `permission`, `created_at`) VALUES
  ('membre', 'dashboard:overview:read', CAST(strftime('%s','now') AS INTEGER)),
  ('membre', 'help:docs:read', CAST(strftime('%s','now') AS INTEGER));
--> statement-breakpoint

-- Version du contenu publié : ligne unique, socle du cache du site public.
-- `bumpContentVersion` sait recréer cette ligne si elle manque, mais la semer ici
-- évite qu'une base neuve démarre sans elle.
INSERT OR IGNORE INTO `cms_content_version` (`id`, `version`, `updated_at`)
  VALUES (1, 1, CAST(strftime('%s','now') AS INTEGER));
