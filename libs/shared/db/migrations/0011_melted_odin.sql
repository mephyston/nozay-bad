CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`admin_label` text NOT NULL,
	`adherent_label` text NOT NULL,
	`hide_in_expenses` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL
);

INSERT INTO `categories` (`id`, `admin_label`, `adherent_label`, `hide_in_expenses`, `created_at`) VALUES
('adhesions_inscriptions', 'Adhésions & Inscriptions', 'Adhésions & Inscriptions', 0, 1783962600),
('sponsoring', 'Sponsoring', 'Partenariat & Sponsoring', 0, 1783962600),
('subventions', 'Subventions (aides publiques)', 'Subventions', 0, 1783962600),
('actions_jeunes', 'Actions Jeunes (stages jeunes...)', 'Activités Jeunes', 0, 1783962600),
('tournois_senior', 'Tournois Senior', 'Tournois', 0, 1783962600),
('evenements_buvettes', 'Evénements & Buvettes', 'Buvette & Convivialité', 0, 1783962600),
('cordage_vente', 'Cordage (vente aux adhérents)', 'Cordages', 0, 1783962600),
('volants', 'Volants (vente ou achat)', 'Volants', 0, 1783962600),
('salaires_charges', 'Salaires et Charges', 'Salaires & Charges', 1, 1783962600),
('materiel_club', 'Matériel (hors cordages)', 'Matériel (raquettes, poteaux...)', 0, 1783962600),
('licences_federation', 'Licences (versements fédération)', 'Licences FFBaD', 1, 1783962600),
('championnats', 'Championnats (frais équipes)', 'Frais d''inscriptions tournois / championnats', 0, 1783962600),
('stages_formations', 'Stages & Formations', 'Formations & Stages', 0, 1783962600),
('fonctionnement_administratif', 'Frais de fonctionnement & administratif', 'Frais de fonctionnement, bureau...', 0, 1783962600);
