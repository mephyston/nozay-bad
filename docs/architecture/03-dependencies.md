# Règles de dépendances

## Sens autorisé

```
apps  →  domains  →  infrastructure / shared
```

Jamais l'inverse. Un domaine n'importe jamais une app.

## Entre domaines

```
accounting  →  members (API publique uniquement, via index.ts)
shop        →  members, accounting (API publique uniquement)
expenses    →  (aucune dépendance cross-domaine identifiée actuellement)
```

Ceci reflète les `depConstraints` déjà présents dans `eslint.config.js`
(`scope:accounting → scope:members`, `scope:shop → scope:members,
scope:accounting`). Ces contraintes Nx sont correctes et à conserver — le
problème actuel n'est pas le graphe de dépendance entre libs, mais le fait
qu'un domaine autorisé à dépendre d'un autre importe ses **tables brutes**
plutôt que ses **fonctions publiques**. Exemple à corriger :
`libs/features/accounting/api/src/helpers.ts` importe
`membersTable` depuis `@metacult/features-members-data-access` au lieu
d'appeler une fonction exportée par `libs/domains/members/index.ts`.

## À ajouter aux `depConstraints`

- `scope:shared → onlyDependOnLibsWithTags: ['scope:shared']` (déjà présent,
  à conserver strictement — c'est cette contrainte que la copie locale de
  `seasonsTable` dans `shared/db` a été écrite pour contourner ; la vraie
  correction est de déplacer la logique dans le bon domaine, pas de dupliquer
  le schéma).
- Interdiction d'import entre sous-dossiers d'un même domaine
  (`accounting/create-invoice` ne doit pas importer
  `accounting/reconcile-bank-statement-line`), à faire respecter par une règle
  ESLint locale (`no-restricted-imports` avec pattern par dossier) en
  complément des tags Nx, qui ne descendent pas à ce niveau de granularité.

## Ce qui ne change pas

Ces contraintes de dépendance sont vérifiées **à la compilation** (imports
TypeScript), pas au runtime. Elles n'introduisent aucun appel réseau : tout
reste dans un seul Worker par app, comme décrit dans `00-vision.md`.
