# Anatomie d'une tranche verticale (Vertical Slice)

Chaque cas d'usage est un dossier contenant exactement :

```
create-invoice/
  route.ts          # wrapper HTTP Hono : parse + validate + appelle handler + formate la réponse
  validator.ts       # schéma de validation de la requête (TypeBox, cf. standard Hono déjà en place)
  handler.ts          # orchestration : appelle repository + agrégat, aucune connaissance de Hono/Drizzle
  repository.ts        # seul fichier autorisé à importer drizzle-orm et les tables
  dto.ts                 # formes de requête/réponse exposées par l'API
  handler.test.ts         # test du handler, indépendant du framework HTTP
```

Le gabarit d'une tranche est identique qu'il s'agisse d'une commande ou d'une
requête. Ce qui change, c'est où elle vit une fois le domaine devenu gros
(cf. `01-principles.md`, règle 12) : `commands/create-invoice/` pour ce qui
écrit, `queries/list-invoices/` pour ce qui lit seul. Une tranche `queries/`
n'a jamais de `db.transaction` dans son `handler.ts` — si vous en trouvez
une, c'est le signe qu'elle a été mal classée ou qu'elle fait plus qu'une
lecture.

## Exemple concret basé sur le code existant

Aujourd'hui, `POST /invoices` dans
`libs/features/accounting/api/src/routes/invoices.ts` fait, dans le même
fichier et le même handler Hono :

1. lecture du body (`c.req.json()`)
2. vérification métier (`isSeasonClosed`)
3. calcul métier (génération du numéro de facture)
4. deux écritures SQL (facture puis lignes), sans transaction
5. formatage de la réponse JSON

Cible : `libs/domains/accounting/create-invoice/` :

- `route.ts` : `app.post('/', validator, (c) => handler(c.env.DB, c.req.valid('json')))`
- `validator.ts` : schéma de la requête (`seasonId`, `clientName`, `items[]`...)
- `handler.ts` : appelle `invoiceRepository.getLastInvoiceNumber(seasonId)`,
  `Invoice.generateNumber(...)` (règle métier, cf. `05-ddd.md`), puis
  `invoiceRepository.create(tx, invoice)` **dans une transaction**
- `repository.ts` : seul endroit avec `drizzle`, `invoicesTable`, `invoiceItemsTable`
- `dto.ts` : forme de la requête/réponse
- `handler.test.ts` : teste `handler()` avec un repository en mémoire/mock, sans monter Hono

## Règle de composition

Décision actée : le `route.ts` de chaque cas d'usage exporte son propre
sous-routeur Hono. Un unique fichier de composition les monte
(`app.route('/', createInvoiceRoute)`, etc.) — c'est un fichier de câblage
pur, sans logique. Il n'existe plus de fichier `routes.ts` central ni de
dossier `api/src/routes/` regroupant plusieurs cas d'usage.

**Emplacement du fichier de composition : à la racine du domaine**
(`libs/domains/accounting/index.ts`), pas dans un sous-dossier `api/`.
`api/` est un vestige de l'architecture en couches — il n'y a pas de raison
de le garder pour un seul fichier de câblage une fois que le routing, la
validation et la persistance vivent dans les tranches. `shared/` n'est pas
non plus le bon endroit pour ce fichier : `shared/` est réservé au modèle
métier partagé entre tranches (agrégats, interfaces de repository, erreurs),
jamais au code d'assemblage/routing.

**Sort du schéma Drizzle** (aujourd'hui dans `data-access/src/schema.ts`) :
il déménage dans `shared/schema.ts` du domaine — visible par les
repositories de toutes les tranches du domaine, mais jamais exporté en
dehors du domaine (contrairement à l'ancien `data-access/index.ts` qui
faisait `export * from './schema'`).

**Sort de `ui/` à la racine du domaine** : il disparaît une fois chaque
composant redistribué dans le `ui/` de sa tranche (`commands/<cas-usage>/ui/`
ou `queries/<cas-usage>/ui/`). Un domaine cible n'a donc plus que
`shared/`, `commands/`, `queries/` (ou directement des tranches à plat si le
domaine est sous le seuil de la règle 12) — aucun dossier `api/`,
`data-access/` ni `ui/` à sa racine.
