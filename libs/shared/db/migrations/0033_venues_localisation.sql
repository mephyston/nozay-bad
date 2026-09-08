-- Situer les gymnases du club : rue et coordonnées.
--
-- Les deux gymnases n'avaient que « 91620 Nozay ». Or c'est le lieu, plus que le nom,
-- qui distingue ce club de son homonyme de Loire-Atlantique dans les résultats de
-- recherche : le site public émet désormais chaque gymnase en `Place` avec adresse et
-- `GeoCoordinates`, et un point à moitié renseigné n'est pas émis du tout.
--
-- Adresses et coordonnées relevées le 08/09/2026 sur la carte interactive de la
-- commune (nozay91.fr), qui fait foi devant les annuaires : ceux-ci donnent trois rues
-- différentes pour le seul centre Pierre Dupuis. La Halle des Sports est le bâtiment
-- du complexe sportif de Villarceau.
--
-- Par `code` et non par `id` : c'est l'identifiant stable, le même sur chaque base.
-- Aucun écran d'administration n'édite les gymnases. À défaut, c'est ici qu'on écrit.
-- (Pas de point-virgule dans ces commentaires : `setupMockDb` découpe le fichier dessus.)
UPDATE `venues`
SET `street_address` = 'Rue Pasteur',
    `postal_code` = '91620',
    `city` = 'Nozay',
    `latitude` = '48.657720',
    `longitude` = '2.245280'
WHERE `code` = 'pierre-dupuis';

UPDATE `venues`
SET `street_address` = 'Route de Villejust',
    `postal_code` = '91620',
    `city` = 'Nozay',
    `latitude` = '48.663350',
    `longitude` = '2.237770'
WHERE `code` = 'halle-des-sports';
