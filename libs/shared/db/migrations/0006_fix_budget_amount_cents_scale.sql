-- Corrige l'échelle du prévisionnel de saison.
-- Historique : le pipeline de sauvegarde de GeneralMeetingReport appliquait un
-- ×100 en trop (editableBudget déjà en centimes, puis handleSaveBudget ×100),
-- si bien que season_category_budgets.amount_cents était stocké à 100× la valeur
-- réelle. Le chargement (÷100) et l'affichage (÷100) masquaient ce décalage à
-- l'écran, mais la donnée en base restait fausse.
-- Toutes les lignes proviennent de ce chemin (saisie manuelle, ou report d'une
-- saison à l'autre via close-season qui recopie ces mêmes montants), et sont
-- des multiples de 100 → division exacte par 100 pour revenir aux vrais centimes.
UPDATE `season_category_budgets` SET `amount_cents` = `amount_cents` / 100;
