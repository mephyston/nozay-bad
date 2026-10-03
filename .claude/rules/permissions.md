---
paths:
  - "apps/api/src/authz/**"
  - "libs/domains/iam/**"
  - "apps/admin/src/lib/page-permissions*"
---

# Permissions (RBAC)

Une nouvelle permission touche **six** endroits, chacun gardé par un test :

1. `libs/domains/iam/shared/permissions.ts` — le catalogue ;
2. `libs/domains/iam/shared/catalog.ts` — le libellé (sinon « libellé manquant ») ;
3. `libs/domains/iam/shared/roles.ts` — l'attribution, plus la liste « ce qu'on lui refuse » de `roles.test.ts` et l'instantané de la matrice (`npx vitest run … -u`) ;
4. `apps/api/src/authz/route-permissions.ts` — la route qui l'exige (`coverage.test.ts` est bidirectionnel) ;
5. `apps/admin/src/lib/page-permissions.ts` si une page de l'admin en dépend (test bidirectionnel lui aussi) ;
6. une migration `INSERT OR IGNORE INTO role_permissions` (modèle : 0017, 0032), dont le bloc se **génère depuis le code** (`ROLE_PERMISSIONS`) plutôt qu'à la main : `libs/migrations.test.ts` rejoue la migration et compare. Puis `/new-migration` pour l'enregistrer et l'appliquer en local.

Diagnostic : en local, un écran vide n'est pas forcément un refus. Interroger l'API (`/iam/me`, puis la ressource) : `200` + `data: []` = base vide, `403` = droits.
