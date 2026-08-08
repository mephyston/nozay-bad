# RF-IAM-002 : L'API est l'autorité en matière de droits

## 1. Description et Objectif Métier

Une seule couche décide de ce qu'un utilisateur a le droit de faire : l'API. Les applications qui l'appellent affirment *qui* agit, jamais *ce qu'il peut faire*. L'objectif est qu'il n'existe qu'un seul endroit à auditer, et qu'une interface mal gardée ne suffise pas à contourner un droit.

---

## 2. Domaine Fonctionnel

- **Domaine** : iam
- **Agrégat / Entité clé** : Acteur (`get-actor`), table d'autorisation (`ROUTE_PERMISSIONS`)
- **Statut** : Validé

---

## 3. Définition de la Règle Métier

**L'identité circule, les droits non.** L'application admin transmet `x-user-email` ; l'API résout elle-même l'adresse en rôles puis en permissions. L'ancien en-tête `x-user-permissions` transportait une *décision* d'autorisation : la logique de droits vivait alors dans deux bases de code, et un cache périmé, un bug de middleware ou un proxy qui oublie de nettoyer les en-têtes entrants suffisait à escalader. Un test d'architecture interdit sa réapparition.

**L'identité est affirmée par un pair de confiance.** L'API rejette toute requête sans `INTERNAL_API_KEY`, un secret que seuls les Workers admin et storefront détiennent ; le navigateur ne l'atteint jamais directement. Un en-tête posé par l'admin vaut donc exactement ce que vaut le Worker admin lui-même.

**Les proxies nettoient ce qu'ils relaient.** Les deux points d'entrée catch-all de l'admin recopient les en-têtes du navigateur. Ils suppriment donc explicitement `x-user-email`, `x-caller` et `x-user-permissions` avant de relayer, et le client d'API les repose à partir de la session vérifiée. Sans ce nettoyage, un client pourrait injecter sa propre identité.

**Tout appel sortant de l'admin porte une identité.** `createAdminApiClient(locals)` est le seul chemin autorisé depuis une page ; un test d'architecture interdit `createApiClient(` sous `apps/admin/src/pages/`. C'est ce câblage qui a refermé le trou des pages non gardées : elles écrivent *à travers* l'API, donc leurs écritures sont contrôlées sans qu'il ait fallu les modifier.

**Le storefront est un appelant distinct.** Il s'annonce `x-caller: storefront` et n'accède qu'aux routes marquées `service: true` — celles qui servent un adhérent connecté. À défaut d'identité déclarée, un appelant est réputé `storefront`, le moins privilégié : un site d'appel oublié se voit refuser les routes d'administration plutôt que de les obtenir sans contrôle.

**Le contrôle côté interface est du confort, pas de la sécurité.** Les gardes de page et d'action offrent un refus immédiat et en français, et évitent d'afficher des écrans inutilisables. Ils ne remplacent pas le contrôle de l'API : une page peut n'exiger qu'une lecture (`/admin/accounting` ouvre le grand livre à la présidence) là où l'écriture reste fermée côté API. La page décide de la visibilité, l'API décide du droit d'agir.

---

## 4. Table de décision

| Appelant | Règle de la route | Résultat |
|---|---|---|
| — | aucune règle | **403** (route non déclarée) |
| `storefront` | `service: true` | autorisé |
| `storefront` | sans `service` | **403** |
| `admin`, compte trouvé | `permission: null` | autorisé |
| `admin`, compte trouvé | permission requise | autorisé si le compte la détient, sinon **403** |
| `admin`, adresse inconnue | toute | **403** — le transport *est* authentifié, c'est le compte qui manque |
| `admin`, sans `x-user-email` | toute | **401** — défaut de câblage du proxy, échec bruyant |
| appelant absent ou inconnu | toute | **403** |

`/health` est la seule exemption : c'est une sonde de disponibilité, traitée avant tout contrôle.

---

## 5. Mise en service

La variable `RBAC_ENFORCE=log` n'applique aucun refus et journalise ceux qui auraient eu lieu. Elle sert uniquement à répéter une mise en service sur un environnement de recette, le temps de vérifier qu'aucun chemin légitime — en particulier côté storefront — n'a été oublié. La laisser en production revient à désactiver l'autorisation.
