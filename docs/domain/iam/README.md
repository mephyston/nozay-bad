# Domaine Métier : IAM (identités, rôles et droits)

Le domaine **IAM** répond à deux questions, et à elles seules : *qui agit* et *ce que cette personne a le droit de faire*. Il porte les comptes d'administration du club, les rôles qui leur sont attribués, et le catalogue des permissions que chaque rôle accorde.

Il ne dépend d'aucun autre domaine, et **aucun domaine métier ne dépend de lui** : un domaine qui aurait besoin de savoir qui agit serait en train de décider d'une autorisation, ce qui appartient à la seule table de routes de l'API (`apps/api/src/authz/route-permissions.ts`).

Le storefront et le site public sont hors de ce périmètre. Un adhérent s'y authentifie par code à usage unique et n'a pas de compte d'administration ; ses droits relèvent de règles métier (`expenseAuthorized`, propriété du profil), pas de rôles.

---

## Dictionnaire de Données & Glossaire Métier

| Terme Métier | Définition & Contexte | Type / Exemple |
|---|---|---|
| **Compte d'administration** | Une personne autorisée à ouvrir la console d'administration. Identifiée par son adresse e-mail, celle que Cloudflare Access authentifie. | `Entity` (`admin_users`) |
| **Permission** | Le droit d'accomplir une opération précise, nommée `<domaine>:<ressource>:<action>`. Accordée ou non : il n'existe pas de joker. | `string` (`accounting:ledger:write`) |
| **Rôle** | Un métier de l'association, auquel est attaché un ensemble de permissions. Un compte peut en cumuler plusieurs. | `Enum` (`super_admin`, `president`, `tresorier`, `secretaire`, `coach`, `communication`, `membre`) |
| **Acteur** | Une identité résolue en droits effectifs : le compte, ses rôles, et l'union de leurs permissions. | `Actor` (`get-actor`) |
| **Définition d'origine** | Les droits qu'un rôle porte dans le code. L'écran signale les rôles qui s'en écartent, pour que la dérive reste visible. | `ROLE_PERMISSIONS` |
| **Prérequis d'une permission** | Les lectures de référentiel sans lesquelles l'écran ouvert par un droit resterait vide — un sélecteur de saison, un libellé de catégorie. Accordées avec le droit qui les suppose. | `PERMISSION_PREREQUISITES` |
| **Libellé de permission** | « Supprimer une écriture » plutôt que `accounting:ledger:delete` : ce qu'un bénévole doit pouvoir juger au moment d'attribuer un rôle. Un test vérifie qu'aucune permission n'en manque. | `PERMISSION_LABELS` |
| **Rôle par défaut** | `membre`, affiché « Accès minimal » : tableau de bord et centre d'aide, aucun droit métier. Attribué à tout compte créé sans rôle explicite. | `DEFAULT_ROLE` |
| **Usurpation** | Emprunt temporaire de l'identité d'un autre compte, pour reproduire ce qu'il voit. Réservée au droit `iam:sessions:impersonate`. | Cookie `impersonate_email` (HttpOnly) |
| **Appelant** | Le Worker qui s'adresse à l'API : `admin` (agit pour un compte d'administration), `storefront` (agit pour un adhérent) ou `website` (sert le site public, sans identité). | En-tête `x-caller` |
| **Route de service** | Route que le storefront peut appeler sans compte d'administration, parce qu'elle sert un adhérent connecté. | `service: true` |

---

## Règles Fonctionnelles du Domaine

- [RF-IAM-001 : Aucun droit par défaut](./rules/RF-IAM-001-aucun-droit-par-defaut.md)
- [RF-IAM-002 : L'API est l'autorité en matière de droits](./rules/RF-IAM-002-api-autoritaire.md)
- [RF-IAM-003 : Rôles métier et séparation des tâches](./rules/RF-IAM-003-roles-metier.md)
- [RF-IAM-004 : Modification des droits d'un rôle](./rules/RF-IAM-004-modification-des-roles.md)

---

## Où vit quoi

| Sujet | Emplacement |
|---|---|
| Catalogue des permissions | `libs/domains/iam/shared/permissions.ts` |
| Libellés lisibles des permissions | `libs/domains/iam/shared/catalog.ts` |
| Référentiels qu'une permission suppose | `libs/domains/iam/shared/prerequisites.ts` |
| Rôles et leur définition d'origine | `libs/domains/iam/shared/roles.ts` |
| Résolution des droits édités en base | `libs/domains/iam/shared/role-permissions.ts` |
| Droits appliqués par rôle (modifiables) | Table `role_permissions` (`0000_baseline.sql`) |
| Journal des modifications de droits | Table `role_permission_log` |
| Liaison compte ↔ rôle | Table `admin_user_roles` (`0000_baseline.sql`) |
| Résolution identité → droits | `libs/domains/iam/get-actor/` |
| Table d'autorisation des routes de l'API | `apps/api/src/authz/route-permissions.ts` |
| Autorisation des pages d'administration | `apps/admin/src/lib/page-permissions.ts` |
| Garde des actions d'écriture | `apps/admin/src/lib/guard.ts` |

Ajouter une permission à `ROLE_PERMISSIONS` **ne l'accorde pas aux bases existantes** : la table `role_permissions` fait autorité à l'exécution. Toute évolution des droits d'un rôle se livre donc en deux morceaux — la définition d'origine dans `roles.ts`, et une migration `INSERT OR IGNORE INTO role_permissions` pour les environnements déjà déployés.

Le mapping rôle → permissions est **modifiable depuis l'application**, par le seul `super_admin`. Le code (`roles.ts`) en garde la **définition d'origine** : elle sert de valeurs de départ aux migrations, de repli quand l'API est injoignable en développement, et de référence à laquelle l'écran compare les rôles pour signaler ceux qui s'en écartent.

`super_admin` fait exception : il vaut toujours la totalité du catalogue, **calculée en code**. Figé en base, il n'obtiendrait pas les permissions ajoutées par les fonctionnalités futures — on livrerait un écran que le super administrateur ne peut pas ouvrir — et lui retirer par mégarde son droit d'édition fermerait la gestion des rôles sans recours.

---

## Contraintes techniques structurantes

### Aucun joker

`can()` est un `Set.has()`. Le modèle précédent acceptait `accounting:*` mais pas l'inverse : `accounting:invoices` n'ouvrait pas `accounting:*`. Cette asymétrie imposait des chaînes `A || B || C` de trois à six termes à chaque point de contrôle, et chacune était un endroit où une permission pouvait être oubliée. Les rôles étant définis en code, développer un groupe coûte un spread : les jokers n'ont plus de raison d'être.

### L'identité circule, pas les droits

L'application admin transmet à l'API l'adresse de l'utilisateur (`x-user-email`), jamais ses permissions. Un en-tête qui porte une *décision* d'autorisation fait vivre la logique de droits dans deux bases de code, et suffit à escalader dès qu'un proxy oublie de nettoyer les en-têtes entrants. L'API résout elle-même l'adresse en rôles puis en droits.

Cette identité est digne de foi parce que la couche de transport l'est : l'API rejette toute requête sans `INTERNAL_API_KEY`, un secret que seuls les Workers admin et storefront détiennent — le navigateur ne l'atteint jamais directement. Les deux appelants partageant la même clé, `x-caller` prévient une erreur de câblage, pas un pair compromis ; des clés par appelant seraient le durcissement suivant.

### Fermé par défaut, vérifié par des tests

Une route absente de `ROUTE_PERMISSIONS` est refusée ; une page absente de `PAGE_PERMISSIONS` l'est aussi. Deux tests de couverture vérifient dans les deux sens que ces tables et la réalité coïncident : ni un oubli, ni une règle orpheline ne peuvent passer la revue. C'est ce qui rend le modèle tenable dans la durée, plutôt que juste correct le jour de sa mise en place.

### Le cache de résolution est borné par son TTL

L'API met en cache la résolution identité → droits pendant 30 secondes, à l'échelle de l'isolate. L'invalidation explicite au moment d'une modification ne vaut que pour l'isolate courant : **la garantie de propagation, c'est le TTL**. Ne rien construire qui suppose une invalidation globale.
