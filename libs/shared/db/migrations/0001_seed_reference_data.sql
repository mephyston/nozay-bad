-- 0001_seed_reference_data.sql
-- Seed déterministe des données de référence (ADR-0004)
-- Aucune valeur d'identifiant numérique entière codée en dur.

-- 1. ACCOUNT CLASSES (Classes du Plan Comptable Associatif)
INSERT OR IGNORE INTO `account_classes` (`code`, `label`, `type`, `created_at`) VALUES
('70', '70 - Ventes de produits et prestations', 'recette', 1783962600),
('74', '74 - Subventions et aides publiques', 'recette', 1783962600),
('75', '75 - Autres produits de gestion courante', 'recette', 1783962600),
('60', '60 - Achats de matières et fournitures', 'depense', 1783962600),
('61', '61 - Services extérieurs', 'depense', 1783962600),
('62', '62 - Autres services extérieurs', 'depense', 1783962600),
('63', '63 - Impôts, taxes et versements assimilés', 'depense', 1783962600),
('64', '64 - Charges de personnel', 'depense', 1783962600),
('65', '65 - Autres charges de gestion courante', 'depense', 1783962600),
('512', '512 - Comptes de chèques postaux et bancaires', 'tresorerie', 1783962600),
('517', '517 - Autres placements et livrets', 'tresorerie', 1783962600),
('530', '530 - Caisse', 'tresorerie', 1783962600);

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

-- 4. CATEGORIES (Nomenclature analytique et budgétaire - 16 catégories sans colonne code)
INSERT OR IGNORE INTO `categories` (`admin_label`, `adherent_label`, `hide_in_expenses`, `receipt_account_class_id`, `expense_account_class_id`, `created_at`) VALUES
('Adhésions & Inscriptions', 'Adhésions & Inscriptions', 0, (SELECT `id` FROM `account_classes` WHERE `code` = '70'), NULL, 1783962600),
('Sponsoring', 'Partenariat & Sponsoring', 0, (SELECT `id` FROM `account_classes` WHERE `code` = '70'), NULL, 1783962600),
('Subventions (aides publiques)', 'Subventions', 0, (SELECT `id` FROM `account_classes` WHERE `code` = '74'), NULL, 1783962600),
('Actions Jeunes (stages jeunes...)', 'Activités Jeunes', 0, (SELECT `id` FROM `account_classes` WHERE `code` = '70'), (SELECT `id` FROM `account_classes` WHERE `code` = '62'), 1783962600),
('Tournois Senior', 'Tournois', 0, (SELECT `id` FROM `account_classes` WHERE `code` = '70'), (SELECT `id` FROM `account_classes` WHERE `code` = '62'), 1783962600),
('Evénements & Buvettes', 'Buvette & Convivialité', 0, (SELECT `id` FROM `account_classes` WHERE `code` = '70'), (SELECT `id` FROM `account_classes` WHERE `code` = '60'), 1783962600),
('Cordage (vente aux adhérents)', 'Cordages', 0, (SELECT `id` FROM `account_classes` WHERE `code` = '70'), (SELECT `id` FROM `account_classes` WHERE `code` = '60'), 1783962600),
('Volants (vente ou achat)', 'Volants', 0, (SELECT `id` FROM `account_classes` WHERE `code` = '70'), (SELECT `id` FROM `account_classes` WHERE `code` = '60'), 1783962600),
('Salaires et Charges', 'Salaires & Charges', 1, NULL, (SELECT `id` FROM `account_classes` WHERE `code` = '64'), 1783962600),
('Matériel (hors cordages)', 'Matériel (raquettes, poteaux...)', 0, (SELECT `id` FROM `account_classes` WHERE `code` = '70'), (SELECT `id` FROM `account_classes` WHERE `code` = '60'), 1783962600),
('Licences (versements fédération)', 'Licences FFBaD', 1, NULL, (SELECT `id` FROM `account_classes` WHERE `code` = '65'), 1783962600),
('Championnats (frais équipes)', 'Frais d''inscriptions tournois / championnats', 0, NULL, (SELECT `id` FROM `account_classes` WHERE `code` = '62'), 1783962600),
('Stages & Formations', 'Formations & Stages', 0, (SELECT `id` FROM `account_classes` WHERE `code` = '70'), (SELECT `id` FROM `account_classes` WHERE `code` = '62'), 1783962600),
('Frais de fonctionnement & administratif', 'Frais de fonctionnement, bureau...', 0, (SELECT `id` FROM `account_classes` WHERE `code` = '75'), (SELECT `id` FROM `account_classes` WHERE `code` = '61'), 1783962600),
('Virements Internes (Transit)', 'Virement Interne', 1, NULL, NULL, 1783962600),
('Intérêts Livret A', 'Intérêts Livret A', 1, (SELECT `id` FROM `account_classes` WHERE `code` = '75'), NULL, 1783962600);

-- 5. PRODUCT CATEGORIES (Familles de produits boutique rattachées aux catégories comptables)
INSERT OR IGNORE INTO `product_categories` (`label`, `accounting_category_id`, `created_at`) VALUES
('Volants', (SELECT `id` FROM `categories` WHERE `admin_label` = 'Volants (vente ou achat)'), 1783962600),
('Cordages', (SELECT `id` FROM `categories` WHERE `admin_label` = 'Cordage (vente aux adhérents)'), 1783962600),
('Textile & Accessoires', (SELECT `id` FROM `categories` WHERE `admin_label` = 'Matériel (hors cordages)'), 1783962600);
