# Règles de dépendances

## Sens autorisé

```
apps  →  domains  →  shared
```

Jamais l'inverse. Un domaine n'importe jamais une app.

## Entre domaines

Les contraintes vivent dans `eslint.config.js` (`@nx/enforce-module-boundaries`), par étiquette `scope:`. Un domaine absent d'une liste ne peut pas être importé, et l'oubli échoue au lint.

| Domaine | Peut dépendre de |
|---|---|
| `accounting` | `members` |
| `expenses` | `members`, `accounting`, `notifications` |
| `shop` | `members`, `accounting`, `notifications` |
| `teams` | `members`, `notifications` |
| `cms` | — feuille |
| `events` | — feuille |
| `schedules` | — feuille |
| `notifications` | — feuille |
| `iam` | — feuille |
| `members` | — feuille |
| `shared` | `shared` uniquement |

Chaque domaine peut naturellement dépendre de lui-même et de `scope:shared`.

Trois lectures de ce tableau :

**`notifications` est une feuille, et le reste.** Plusieurs domaines lui envoient des messages ; il ne rappelle personne. Une cible « tous les abonnés » se résout à l'intérieur du contexte notifications, jamais en interrogeant `members` — c'est ce qui évite le cycle.

**`iam` ne dépend de rien, et rien ne dépend de lui.** Un domaine qui aurait besoin de savoir *qui agit* serait en train de décider d'une autorisation, ce qui appartient à la seule table de routes de l'API (`apps/api/src/authz/route-permissions.ts`). Voir [le domaine IAM](../domain/iam/README.md).

**`teams` lit `members` pour peupler ses sélecteurs de joueurs**, et rien ne dépend de `teams` : pas de cycle possible.

## Dépendre d'un domaine, c'est appeler son `index.ts`

L'étiquette Nx autorise l'import ; elle ne dit pas *quoi* importer. La règle est qu'un domaine autorisé à dépendre d'un autre appelle son **API publique** (`libs/domains/<domaine>/index.ts`), jamais ses tables brutes. Une règle `no-restricted-imports` par domaine interdit explicitement `@nba/*/schema` en dehors du domaine propriétaire.

Le motif est concret : importer `membersTable` depuis `accounting` fige la forme de la table des adhérents dans un autre domaine, et la moindre migration devient un chantier transverse.

## Ce qui ne change pas

Ces contraintes sont vérifiées **à la compilation** (imports TypeScript), pas à l'exécution. Elles n'introduisent aucun appel réseau : tout reste dans un seul Worker par app, comme décrit dans [00-vision](./00-vision.md).
