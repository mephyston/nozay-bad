# Domaine Métier : Interclubs (équipes, classements, compositions)

Le domaine **Interclubs** répond à une question que personne au club ne peut trancher à la main le samedi matin : *les équipes engagées ce week-end respectent-elles la hiérarchie de valeur que leur règlement impose ?*

Le club engage huit équipes réparties sur quatre championnats — un régional mixte, trois départementaux mixtes, trois départementaux masculins, un départemental vétérans — et le règlement sanctionne **les deux équipes concernées** par rencontre perdue par pénalité dès qu'une équipe présente une valeur inférieure à celle de l'équipe qui la suit dans la hiérarchie du club. Vérifier cela suppose de croiser les compositions de toutes les équipes d'un même championnat pour une même journée.

Le domaine ne saisit **aucun résultat** : Badnet reste l'outil officiel de la fédération. Il s'arrête à la composition prévisionnelle et à son contrôle.

Il dépend du seul domaine `members`, pour peupler les sélecteurs de joueurs. Aucun domaine ne dépend de lui.

---

## Dictionnaire de Données & Glossaire Métier

| Terme Métier | Définition & Contexte | Type / Exemple |
|---|---|---|
| **Championnat** | L'une des quatre compétitions d'interclubs. Chacune a son règlement, son format de rencontre, son barème et sa formule de valeur d'équipe — elles n'ont presque rien en commun. | `Enum` (`icr_seniors`, `icd_mixte`, `icd_masculin`, `icd_veterans`) |
| **Division** | Le niveau où évolue une équipe dans son championnat. Elle décide du format de rencontre et des classements admis. | `string` (`D1`, `PN`, `R3`) |
| **Numéro d'équipe** | Le rang de l'équipe dans son club, pour un championnat donné. **C'est lui qui porte la hiérarchie** que le règlement contrôle. Le nom affiché en dérive et n'est pas stocké. | `integer` → `NBA91-3` |
| **Journée** | Les rencontres disputées **du lundi au dimanche d'une même semaine**. **Chaque championnat numérote les siennes pour lui seul** : la J1 du régional et celle du mixte sont deux dates sans rapport. | `Entity` (`championship_days`, `Jxx`) |
| **Semaine** | Le lundi de la semaine d'une journée. **C'est l'unité qui relie les championnats** : toutes les règles croisées se formulent en semaines, jamais en numéros de journée. Normalisée au lundi pour servir de clé de jointure. | `string` ISO (`2026-10-12`) |
| **Groupe d'exclusion hebdomadaire** | Les championnats entre lesquels un joueur ne tient qu'une seule équipe du club sur une semaine : `{ICD mixte, ICD masculin, ICR}` d'une part, `{ICD vétérans}` d'autre part. | `WEEKLY_EXCLUSION_GROUPS` |
| **Rencontre** | La confrontation d'une équipe et d'un adversaire sur une journée. Le régional en fait disputer **deux par journée**, d'où le `slot`. | `Entity` (`team_fixtures`) |
| **Composition** | Les lignes de la rencontre effectivement pourvues. Une ligne vide n'est pas enregistrée : leur nombre donne le diviseur « nombre de matchs joués ». | `Entity` (`lineup_slots`) |
| **Valeur d'équipe** | L'estimation chiffrée d'une équipe pour une rencontre. Deux formules incompatibles selon le championnat (voir plus bas). | `number` (7,71) |
| **Classement** | Le classement fédéral d'un joueur dans une discipline, de `NC` à `N1`. `NULL` ≠ `NC` : voir ci-dessous. | `Enum` (`NC`…`N1`) |
| **CPPH** | La cote du joueur. Départage les cinq paliers `N1` du barème régional et ordonne les joueurs entre eux en ICR. | `integer` (1257) |
| **Date ELO** | La date de publication d'un classement. C'est **la clé de l'historisation** et la référence qu'imposent les règlements. | `string` ISO (`2026-08-13`) |
| **Date de référence** | La date ELO qui fait foi pour un championnat. Fixe pour la saison en départemental, glissante en régional. | Voir `ranking-resolution.ts` |
| **Capitaine / vice-capitaine** | Les deux personnes qui engagent l'équipe. Le vice-capitaine est une **notion interne au club**, absente des règlements. Ce n'est pas un rôle IAM. | `Enum` (`captain`, `vice_captain`) |
| **Titularisation** | Trois rencontres avec une équipe et le joueur ne peut plus être aligné dans une équipe inférieure du même championnat. | Règle, art. 6.3.2 / 4.6 |
| **Équipe au repos** | Équipe exemptée de rencontre sur une journée (poule impaire). Le règlement y attache ses propres restrictions de montée et de descente. | `status = 'bye'` |
| **Muté** | Joueur arrivé d'un autre club dans la saison. Plafonné à deux par rencontre, sauf en vétérans. | `Enum` (`none`, `normal`, `dossier`) |

---

## Les quatre championnats, en un tableau

| | **ICR Séniors** (LIFB) | **ICD Mixte** (CD91) | **ICD Masculin** (CD91) | **ICD Vétérans** (CD91) |
|---|---|---|---|---|
| Format | 8 matchs : 2 SH, 2 SD, DH, DD, 2 MX | D1 : 8 · D2+ : 7 (3 SH, SD, DH, DD, MX) | 6 matchs : 4 SH, 2 DH | 9 matchs : 2 SH, SD, 2 DH, DD, 3 MX |
| Barème | FFBaD (93 → 1), non linéaire | CD91 (0 → 12) | CD91 | CD91 |
| Valeur d'équipe | Moyenne des 3 meilleurs + 3 meilleures de la feuille, ÷ 6 | Σ des lignes ÷ nombre de matchs | Σ des lignes ÷ 6 | **aucune** |
| Hiérarchie | par semaine | même championnat | même championnat, **hors D4 « Promotion »** | — |
| Classements | Date glissante, jeudi avant chaque journée | Date fixe pour la saison | idem | idem |

---

## Règles Fonctionnelles du Domaine

- [RF-TEA-001 : La date de classement qui fait foi](./rules/RF-TEA-001-date-de-classement-de-reference.md)
- [RF-TEA-002 : L'import des compétiteurs complète celui des adhérents](./rules/RF-TEA-002-import-competiteurs-complete-adherents.md)
- [RF-TEA-003 : Valeur d'équipe et hiérarchie du club](./rules/RF-TEA-003-valeur-d-equipe-et-hierarchie.md)
- [RF-TEA-004 : La semaine relie les championnats, pas le numéro de journée](./rules/RF-TEA-004-la-semaine-relie-les-championnats.md)
- [RF-TEA-005 : Le rappel des classements du jeudi](./rules/RF-TEA-005-rappel-classements-du-jeudi.md)
- [RF-TEA-006 : Le rappel de composition avant la journée](./rules/RF-TEA-006-rappel-de-composition.md)
- [RF-TEA-007 : Le dépassement de valeur se notifie tout seul, des deux côtés](./rules/RF-TEA-007-depassement-de-valeur-notifie.md)

---

## Où vit quoi

| Sujet | Emplacement |
|---|---|
| Les quatre règlements, en code | `libs/domains/teams/shared/championship.ts` |
| Barèmes CD91 et FFBaD, paliers N1 | `libs/domains/teams/shared/scales.ts` |
| Formules de valeur d'équipe | `libs/domains/teams/shared/team-value.ts` |
| Date de référence et historisation | `libs/domains/teams/shared/ranking-resolution.ts` |
| Lecture de l'export ELO Poona | `libs/domains/teams/shared/ranking-csv.ts` |
| Vocabulaire fédéral (classements, catégories, mutations) | `libs/domains/teams/shared/ranking.ts` |
| Tables | `libs/domains/teams/shared/schema.ts`, migrations `0010_teams.sql`, `0012_teams_calendar_details.sql`, `0014_championship_rules_link.sql` |
| Calendriers de comité livrés en seed | `scripts/seed-ic-calendar-*.sql`, `scripts/seed-icr-calendar-*.sql` |
| Écran des équipes (engagement, staff, effectif, rencontres) | `apps/admin/src/pages/admin/teams/index.astro` |
| Écran de contrôle des journées | `apps/admin/src/pages/admin/teams/journees.astro` |
| Écran des classements et son import | `apps/admin/src/pages/admin/teams/classements.astro`, `classements/import.astro` |
| Écran des règlements | `apps/admin/src/pages/admin/teams/reglements.astro` |
| Espace adhérent : équipe et composition | `apps/storefront/src/pages/equipes/[id]/index.astro`, `equipes/[id]/journee/[n].astro` |

---

## Contraintes techniques structurantes

### Les règlements vivent en code, pas en base

Format de rencontre, barème, formule de valeur, seuils d'éligibilité : tout cela est dans `championship.ts`. Ce ne sont pas des données du club — elles changent quand un comité vote un règlement, une fois par saison, et le code qui les applique change au même moment. En base, elles seraient modifiables sans test et finiraient par diverger du calcul qu'elles pilotent.

Le corollaire : l'exemple de calcul de l'annexe 1 du règlement mixte est une **fixture de test** (`54 / 7 = 7,71`). Si elle passe, la formule départementale est juste.

### `NULL` n'est pas `NC`

Dans l'export Poona, une cellule de classement vide désigne un **licencié non compétiteur** — un tiers du fichier. `NC` désigne un compétiteur sans résultat, qui vaut 0 point mais peut être aligné. Les confondre ferait entrer en équipe quelqu'un qui n'y a pas sa place, et compterait un import réussi comme un échec (73 lignes sur 213 « en erreur »).

### Un joueur est désigné par sa licence, jamais par `members.id`

`members` porte une ligne par licence **et par saison** : l'identifiant d'un adhérent change à chaque renouvellement, alors qu'une équipe doit survivre à l'été. La licence est la seule clé naturelle stable — et la session de l'espace adhérent la porte déjà, ce qui permet d'y résoudre un capitaine sans requête supplémentaire.

Elle est normalisée sur huit caractères, zéros de tête compris (`normalizeLicence`). L'export ELO les écrit, d'autres exports les perdent dès qu'un tableur est passé par là, et une divergence ferait échouer toutes les jointures **en silence** — sous la forme trompeuse d'un « ce joueur n'a pas de classement ».

### Les classements sont historisés, jamais écrasés

Une ligne par joueur et par date de publication. Les règlements ne lisent pas le classement courant mais celui d'une date arrêtée ; sans historique on ne pourrait ni recalculer une journée passée, ni justifier une valeur d'équipe contestée. Le classement en vigueur à une date est celui de plus grande date ELO antérieure — formulation qui absorbe naturellement les exports partiels de début de saison.

### La capitainerie n'est pas un rôle IAM

Le droit de composer découle de la désignation dans l'équipe, comme `expenseAuthorized` pour les notes de frais. L'espace adhérent masque le bouton, mais c'est le handler qui tient la règle : masquer n'est pas interdire.
