-- Rattrapage des adresses WordPress perdues au recomposition des pages.
--
-- La reprise (`scripts/wp-import`) avait fait son travail : 165 des 201 adresses de
-- l'ancien sitemap étaient couvertes, en 301 ou en 410. Mais elle visait les slugs de
-- WordPress — `/adultes-2/`, `/jeunes-2/`, `/inscription/` — et ces pages ont ensuite
-- été **recomposées** dans l'administration sous des adresses lisibles plutôt que
-- renommées. Un renommage aurait écrit la redirection tout seul
-- (`update-page/handler.ts`) ; une recomposition, non.
--
-- Deux dégâts, mesurés sur la préproduction contre l'ancien sitemap :
--
--   1. 13 adresses du **menu actuel** répondent 404. Ce sont exactement celles que
--      Google propose aujourd'hui en liens de site sous le résultat du club.
--   2. 49 des 57 redirections déjà en base visent ces mêmes pages disparues, et
--      livrent donc un 301 vers un 404 — pire qu'un 404 franc, qui au moins ne fait
--      pas suivre une piste morte.
--
-- Les cibles ci-dessous ne sont pas devinées : les titres des anciennes pages
-- (« U9 – Minibad », « Groupe collège – à partir de 11 ans »…) sont ceux dont les
-- nouveaux slugs dérivent mot pour mot. Les quatre cas sans correspondance mécanique
-- — `/jeunes-2/`, `/notre-club/`, `/ecoles-francaises-de-badminton/`, `/connexion/` —
-- ont été tranchés par le bureau.

-- --- 1. Repointage, avant tout ajout ----------------------------------------
--
-- D'abord les redirections existantes, pour la raison qu'énonce déjà
-- `buildRetargetRedirects` : jamais de chaîne. Sans cela, les 45 pages d'équipes de
-- 2017-2019 iraient en deux sauts, `/les-equipes/…` → `/adultes-2/` →
-- `/adultes-competition/`. Google suit, mais dilue à chaque saut, et une chaîne
-- casse dès qu'un maillon bouge.
--
-- L'ordre vis-à-vis du bloc suivant est en réalité indifférent — aucune des lignes
-- insérées plus bas n'a pour cible un chemin repointé ici — mais l'écrire dans cet
-- ordre le rend vrai par lecture plutôt que par vérification.
UPDATE `cms_redirects` SET `to_path` = '/adultes-competition/' WHERE `to_path` = '/adultes-2/';--> statement-breakpoint
UPDATE `cms_redirects` SET `to_path` = '/u9-minibad/' WHERE `to_path` = '/jeunes-2/';--> statement-breakpoint
UPDATE `cms_redirects` SET `to_path` = '/inscriptions/' WHERE `to_path` = '/inscription/';--> statement-breakpoint

-- --- 2. Les adresses du menu, désormais sans page ---------------------------
--
-- `ON CONFLICT` plutôt que `INSERT OR IGNORE` : la migration doit pouvoir se rejouer
-- sur une base où une redirection aurait été posée à la main entre-temps, et c'est
-- alors la cible d'ici qui fait foi. `INSERT OR IGNORE` y laisserait silencieusement
-- l'ancienne valeur.
--
-- Ces lignes sont inertes si un contenu occupe l'adresse : la résolution consulte
-- pages puis articles avant les redirections (`resolve-route/handler.ts`). Reposer
-- une page à l'ancien slug la remettrait donc en service sans rien retirer ici.
INSERT INTO `cms_redirects` (`from_path`, `to_path`, `status_code`, `hit_count`, `note`, `created_at`) VALUES
  ('/inscription/', '/inscriptions/', 301, 0, 'Reprise WordPress : page recomposée', CAST(strftime('%s','now') AS INTEGER)),
  ('/adultes-2/', '/adultes-competition/', 301, 0, 'Reprise WordPress : page recomposée', CAST(strftime('%s','now') AS INTEGER)),
  ('/adultes-loisirs/', '/adultes-loisir/', 301, 0, 'Reprise WordPress : page recomposée', CAST(strftime('%s','now') AS INTEGER)),
  ('/jeunes-3/', '/groupe-college-a-partir-de-11-ans/', 301, 0, 'Reprise WordPress : page recomposée', CAST(strftime('%s','now') AS INTEGER)),
  ('/elite-jeunes/', '/elite-jeunes-a-partir-de-11-ans/', 301, 0, 'Reprise WordPress : page recomposée', CAST(strftime('%s','now') AS INTEGER)),
  ('/minibad/', '/u9-minibad/', 301, 0, 'Reprise WordPress : page recomposée', CAST(strftime('%s','now') AS INTEGER)),
  ('/poussins/', '/u11-ecole-poussins/', 301, 0, 'Reprise WordPress : page recomposée', CAST(strftime('%s','now') AS INTEGER)),
  ('/jeulibre/', '/jeu-libre-week-end-et-vacances-inscriptions/', 301, 0, 'Reprise WordPress : page recomposée', CAST(strftime('%s','now') AS INTEGER)),
  ('/la-direction-technique/', '/notre-entraineur/', 301, 0, 'Reprise WordPress : page recomposée', CAST(strftime('%s','now') AS INTEGER)),
  -- Sommaires sans successeur direct : le nouveau menu est plat, les quatre pages
  -- jeunes y figurent une à une. Arbitrage du bureau, pas déduction d'un titre.
  ('/jeunes-2/', '/u9-minibad/', 301, 0, 'Reprise WordPress : sommaire jeunes sans équivalent', CAST(strftime('%s','now') AS INTEGER)),
  ('/notre-club/', '/presentation/', 301, 0, 'Reprise WordPress : sommaire sans équivalent', CAST(strftime('%s','now') AS INTEGER)),
  -- Espace adhérent : route du storefront, pas une page du CMS.
  ('/connexion/', '/login/', 301, 0, 'Reprise WordPress : espace adhérent', CAST(strftime('%s','now') AS INTEGER)),
  -- Le label EFB n'a aucun successeur : 410 plutôt qu'un 301 de complaisance, qui
  -- vaudrait à Google un soft-404 et garderait l'adresse à l'index plus longtemps.
  ('/ecoles-francaises-de-badminton/', NULL, 410, 0, 'Reprise WordPress : sans successeur', CAST(strftime('%s','now') AS INTEGER))
ON CONFLICT (`from_path`) DO UPDATE SET `to_path` = excluded.`to_path`, `status_code` = excluded.`status_code`, `note` = excluded.`note`;--> statement-breakpoint

-- --- 3. Les archives de catégories ------------------------------------------
--
-- Absentes de la reprise, et pour une raison de fabrication : l'export WXR ne liste
-- que des pages et des articles, jamais les adresses de taxonomie que WordPress
-- fabriquait à la volée. Elles étaient pourtant dans son sitemap, donc à l'index.
--
-- Toutes vers `/actualites/` : le nouveau site filtre par rubrique en chaîne de
-- requête, que `robots.txt` interdit à l'exploration. Viser `/actualites/?rubrique=…`
-- enverrait donc les robots sur une adresse qu'ils ont ordre de ne pas suivre.
INSERT INTO `cms_redirects` (`from_path`, `to_path`, `status_code`, `hit_count`, `note`, `created_at`) VALUES
  ('/category/uncategorized/', '/actualites/', 301, 0, 'Reprise WordPress : archive de catégorie', CAST(strftime('%s','now') AS INTEGER)),
  ('/category/tournois/', '/actualites/', 301, 0, 'Reprise WordPress : archive de catégorie', CAST(strftime('%s','now') AS INTEGER)),
  ('/category/interclubs/', '/actualites/', 301, 0, 'Reprise WordPress : archive de catégorie', CAST(strftime('%s','now') AS INTEGER)),
  ('/category/resultats/', '/actualites/', 301, 0, 'Reprise WordPress : archive de catégorie', CAST(strftime('%s','now') AS INTEGER)),
  ('/category/information-generale/', '/actualites/', 301, 0, 'Reprise WordPress : archive de catégorie', CAST(strftime('%s','now') AS INTEGER)),
  ('/category/jeunes/', '/actualites/', 301, 0, 'Reprise WordPress : archive de catégorie', CAST(strftime('%s','now') AS INTEGER)),
  ('/category/divers/', '/actualites/', 301, 0, 'Reprise WordPress : archive de catégorie', CAST(strftime('%s','now') AS INTEGER)),
  ('/category/adultes/', '/actualites/', 301, 0, 'Reprise WordPress : archive de catégorie', CAST(strftime('%s','now') AS INTEGER)),
  ('/category/animation/', '/actualites/', 301, 0, 'Reprise WordPress : archive de catégorie', CAST(strftime('%s','now') AS INTEGER))
ON CONFLICT (`from_path`) DO UPDATE SET `to_path` = excluded.`to_path`, `status_code` = excluded.`status_code`, `note` = excluded.`note`;
