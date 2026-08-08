# Domaine Métier : IAM (identités, rôles et droits)

Le domaine **IAM** répond à deux questions, et à elles seules : *qui agit* et *ce que cette personne a le droit de faire*. Il porte les comptes d'administration du club, les rôles qui leur sont attribués, et le catalogue des permissions que chaque rôle accorde.

Il ne dépend d'aucun autre domaine, et **aucun domaine métier ne dépend de lui** : un domaine qui aurait besoin de savoir qui agit serait en train de décider d'une autorisation, ce qui appartient à la seule table de routes de l'API (`apps/api/src/authz/route-permissions.ts`).

Le storefront est hors de ce périmètre. Un adhérent s'y authentifie par code à usage unique et n'a pas de compte d'administration ; ses droits relèvent de règles métier (`expenseAuthorized`, propriété du profil), pas de rôles.

---

## Dictionnaire de Données & Glossaire Métier

| Terme Métier | Définition & Contexte | Type / Exemple |
|---|---|---|
| **Compte d'administration** | Une personne autorisée à ouvrir la console d'administration. Identifiée par son adresse e-mail, celle que Cloudflare Access authentifie. | `Entity` (`admin_users`) |
| **Permission** | Le droit d'accomplir une opération précise, nommée `<domaine>:<ressource>:<action>`. Accordée ou non : il n'existe pas de joker. | `string` (`accounting:ledger:write`) |
| **Rôle** | Un métier de l'association, auquel est attaché un ensemble de permissions. Un compte peut en cumuler plusieurs. | `Enum` (`super_admin`, `president`, `tresorier`, `secretaire`, `coach`, `membre`) |
| **Acteur** | Une identité résolue en droits effectifs : le compte, ses rôles, et l'union de leurs permissions. | `Actor` (`get-actor`) |
| **Rôle par défaut** | `membre` : tableau de bord et centre d'aide, aucun droit métier. Attribué à tout compte créé sans rôle explicite. | `DEFAULT_ROLE` |
| **Usurpation** | Emprunt temporaire de l'identité d'un autre compte, pour reproduire ce qu'il voit. Réservée au droit `iam:sessions:impersonate`. | Cookie `impersonate_email` (HttpOnly) |
| **Appelant** | Le Worker qui s'adresse à l'API : `admin` (agit pour un compte d'administration) ou `storefront` (agit pour un adhérent). | En-tête `x-caller` |
| **Route de service** | Route que le storefront peut appeler sans compte d'administration, parce qu'elle sert un adhérent connecté. | `service: true` |

---

## Règles Fonctionnelles du Domaine

- [RF-IAM-001 : Aucun droit par défaut](./rules/RF-IAM-001-aucun-droit-par-defaut.md)
- [RF-IAM-002 : L'API est l'autorité en matière de droits](./rules/RF-IAM-002-api-autoritaire.md)
- [RF-IAM-003 : Rôles métier et séparation des tâches](./rules/RF-IAM-003-roles-metier.md)

---

## Où vit quoi

| Sujet | Emplacement |
|---|---|
| Catalogue des permissions | `libs/domains/iam/shared/permissions.ts` |
| Rôles et leur mapping vers les permissions | `libs/domains/iam/shared/roles.ts` |
| Liaison compte ↔ rôle | Table `admin_user_roles` (migration `0012`) |
| Résolution identité → droits | `libs/domains/iam/get-actor/` |
| Table d'autorisation des routes de l'API | `apps/api/src/authz/route-permissions.ts` |
| Autorisation des pages d'administration | `apps/admin/src/lib/page-permissions.ts` |
| Garde des actions d'écriture | `apps/admin/src/lib/guard.ts` |

Le mapping rôle → permissions vit **en TypeScript, pas en base**. Il est ainsi versionné, typé, et toute modification passe par une revue de code ; un instantané de la matrice complète (`roles.test.ts`) transforme chaque attribution en diff explicite. La base ne stocke que la liaison compte ↔ rôle.

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
