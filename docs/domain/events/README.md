# Domaine Métier : Agenda (Events)

Le domaine **Agenda** porte les rendez-vous **datés et ponctuels** du club — compétitions, interclubs, tournois, stages, animations, assemblées — et, depuis août 2026, les **inscriptions** que certains d'entre eux acceptent.

Il remplace l'agenda Google intégré de l'ancien site, dont le contenu était entièrement invisible pour les moteurs de recherche : une compétition annoncée n'existait que pour qui ouvrait la page. Chaque événement publié est désormais du texte indexable, accompagné de ses données structurées.

Il ne faut pas le confondre avec deux voisins :

- les **Créneaux** (`schedules`) portent les horaires **hebdomadaires** d'entraînement, qui reviennent chaque semaine de la saison ;
- le **CMS** publie les pages et les actualités du site. Une actualité peut *désigner* un événement, jamais l'inverse — c'est le CMS qui référence l'agenda, et il le fait par un simple identifiant sans clé étrangère, pour que les deux domaines restent séparables.

Aucune dépendance à `members`, alors même que les inscriptions nomment des adhérents : l'identité de l'inscrit est **recopiée** au moment où il s'inscrit, et le domaine n'interroge jamais le fichier des adhérents. C'est ce qui le maintient en contexte feuille.

---

## Dictionnaire de Données & Glossaire Métier

| Terme Métier | Définition & Contexte | Type / Exemple |
|---|---|---|
| **Événement** | Rendez-vous daté du club, à une adresse fixe. | `Aggregate` (`club_events`) |
| **Brouillon** | Saisi, invisible du site. Statut par défaut à la création. | `status = 'draft'` |
| **En ligne** | Affiché dans l'agenda du site, s'il est à venir. | `status = 'published'` |
| **Annulé** | Retiré de l'agenda public, conservé en administration avec sa trace. | `status = 'cancelled'` |
| **Adresse** | Slug dérivé du titre et **suffixé par la date** : deux stages portent le même nom d'une année sur l'autre. Figée après création. | `stage-jeunes-2026-10-20` |
| **Date locale** | Date-heure sans fuseau, en texte. Tout se passe à l'heure de Paris, et le format à largeur fixe rend la comparaison lexicographique équivalente à la comparaison chronologique. | `2026-11-14T09:00` |
| **Lieu** | Texte libre, et non une référence à un gymnase du club : la moitié des rendez-vous se déroulent en déplacement. | `venue_label` |
| **État des inscriptions** | Sans objet, ouvertes, ou closes. Trois valeurs, parce que « fermé » et « sans objet » ne disent pas la même chose au lecteur. | `registration` |
| **Inscription** | Engagement d'un adhérent à venir, avec le nombre de personnes qu'il amène. | `Entity` (`club_event_registrations`) |
| **Accompagnants** | Personnes qu'un inscrit amène. Le total des présents vaut `1 + guests`. | `guests` (défaut `0`) |
| **Couverts** | Total à prévoir : les inscrits **et** leurs accompagnants. C'est le seul chiffre sur lequel le bureau engage une commande. | `totals.people` |

---

## Règles Fonctionnelles du Domaine

- [RF-EVT-001 : Ouverture des inscriptions à un événement](./rules/RF-EVT-001-ouverture-des-inscriptions.md)
- [RF-EVT-002 : Inscription et désinscription d'un adhérent](./rules/RF-EVT-002-inscription-d-un-adherent.md)

---

## Frontières

| Ce que le domaine fait | Ce qu'il ne fait pas |
|---|---|
| Tenir le calendrier des rendez-vous du club | Tenir les horaires hebdomadaires (`schedules`) |
| Décider si un événement accepte des inscriptions | Authentifier l'inscrit (`iam`, storefront) |
| Enregistrer qui vient et avec combien de personnes | Interroger le fichier des adhérents (`members`) |
| Compter les présents pour tout le monde | Nommer les inscrits à quiconque n'en a pas le droit |
| Assainir la description à l'écriture | Faire confiance à l'éditeur du navigateur |

**Une asymétrie structurante** : les compteurs sont ouverts aux appelants de service — le site public et l'espace adhérent —, la **liste nominative ne l'est pas**. Savoir qu'il y a douze inscrits n'apprend rien sur personne ; savoir lesquels, si. C'est toute la différence entre `events:events:read` et `events:registrations:read`.

**Pas de jauge, délibérément** : aucun de ces rendez-vous ne se joue à la place près. Une capacité maximale imposerait une course à l'inscription, une liste d'attente et un repêchage pour un problème que le club n'a pas. Quand l'affluence dépasse ce qui était prévu, le bureau ferme les inscriptions.
