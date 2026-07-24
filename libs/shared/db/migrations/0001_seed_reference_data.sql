-- 0001_seed_reference_data.sql
-- Seed déterministe des données de référence (ADR-0004)
-- Aucune valeur d'identifiant numérique entière codée en dur.

-- 1. ACCOUNT CLASSES (Classes du Plan Comptable Associatif)
INSERT INTO `account_classes` (`code`, `label`, `type`, `created_at`) VALUES
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
INSERT INTO `accounts` (`code`, `label`, `account_class_id`, `created_at`) VALUES
('current', 'Compte Courant LCL', (SELECT `id` FROM `account_classes` WHERE `code` = '512'), 1783962600),
('savings', 'Livret A / Épargne', (SELECT `id` FROM `account_classes` WHERE `code` = '517'), 1783962600),
('cash', 'Caisse Buvette', (SELECT `id` FROM `account_classes` WHERE `code` = '530'), 1783962600);

-- 3. PAYMENT METHODS (Modes de règlement)
INSERT INTO `payment_methods` (`code`, `label`, `created_at`) VALUES
('virement', 'Virement bancaire', 1783962600),
('cheque', 'Chèque', 1783962600),
('especes', 'Espèces', 1783962600),
('cb', 'Carte bancaire / Stripe', 1783962600),
('labaz', 'Chèque LABAZ', 1783962600),
('ancv', 'Chèque-Vacances ANCV', 1783962600),
('pass_sport', 'Pass''Sport', 1783962600),
('up_loisir', 'Coupon Sport / Up''Loisir', 1783962600);

-- 4. CATEGORIES (Nomenclature analytique et budgétaire - 15 catégories)
INSERT INTO `categories` (`code`, `admin_label`, `adherent_label`, `hide_in_expenses`, `receipt_account_class_id`, `expense_account_class_id`, `created_at`) VALUES
('adhesions_inscriptions', 'Adhésions & Inscriptions', 'Adhésions & Inscriptions', 0, (SELECT `id` FROM `account_classes` WHERE `code` = '70'), NULL, 1783962600),
('sponsoring', 'Sponsoring', 'Partenariat & Sponsoring', 0, (SELECT `id` FROM `account_classes` WHERE `code` = '70'), NULL, 1783962600),
('subventions', 'Subventions (aides publiques)', 'Subventions', 0, (SELECT `id` FROM `account_classes` WHERE `code` = '74'), NULL, 1783962600),
('actions_jeunes', 'Actions Jeunes (stages jeunes...)', 'Activités Jeunes', 0, (SELECT `id` FROM `account_classes` WHERE `code` = '70'), (SELECT `id` FROM `account_classes` WHERE `code` = '62'), 1783962600),
('tournois_senior', 'Tournois Senior', 'Tournois', 0, (SELECT `id` FROM `account_classes` WHERE `code` = '70'), (SELECT `id` FROM `account_classes` WHERE `code` = '62'), 1783962600),
('evenements_buvettes', 'Evénements & Buvettes', 'Buvette & Convivialité', 0, (SELECT `id` FROM `account_classes` WHERE `code` = '70'), (SELECT `id` FROM `account_classes` WHERE `code` = '60'), 1783962600),
('cordage_vente', 'Cordage (vente aux adhérents)', 'Cordages', 0, (SELECT `id` FROM `account_classes` WHERE `code` = '70'), (SELECT `id` FROM `account_classes` WHERE `code` = '60'), 1783962600),
('volants', 'Volants (vente ou achat)', 'Volants', 0, (SELECT `id` FROM `account_classes` WHERE `code` = '70'), (SELECT `id` FROM `account_classes` WHERE `code` = '60'), 1783962600),
('salaires_charges', 'Salaires et Charges', 'Salaires & Charges', 1, NULL, (SELECT `id` FROM `account_classes` WHERE `code` = '64'), 1783962600),
('materiel_club', 'Matériel (hors cordages)', 'Matériel (raquettes, poteaux...)', 0, NULL, (SELECT `id` FROM `account_classes` WHERE `code` = '60'), 1783962600),
('licences_federation', 'Licences (versements fédération)', 'Licences FFBaD', 1, NULL, (SELECT `id` FROM `account_classes` WHERE `code` = '65'), 1783962600),
('championnats', 'Championnats (frais équipes)', 'Frais d''inscriptions tournois / championnats', 0, NULL, (SELECT `id` FROM `account_classes` WHERE `code` = '62'), 1783962600),
('stages_formations', 'Stages & Formations', 'Formations & Stages', 0, (SELECT `id` FROM `account_classes` WHERE `code` = '70'), (SELECT `id` FROM `account_classes` WHERE `code` = '62'), 1783962600),
('fonctionnement_administratif', 'Frais de fonctionnement & administratif', 'Frais de fonctionnement, bureau...', 0, (SELECT `id` FROM `account_classes` WHERE `code` = '75'), (SELECT `id` FROM `account_classes` WHERE `code` = '61'), 1783962600),
('virements_internes', 'Virements Internes (Transit)', 'Virement Interne', 1, NULL, NULL, 1783962600);
