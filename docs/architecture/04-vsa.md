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

Le `index.ts` du domaine agrège les routes de chaque slice, exactement comme
le fait déjà `libs/features/accounting/api/src/routes.ts` aujourd'hui pour
composer `seasonsRouter`, `transactionsRouter`, `bankRouter`, etc. — ce
fichier de composition existe déjà pour `accounting`, il faut généraliser ce
modèle à `expenses`, `members` et `shop`, qui sont aujourd'hui un seul fichier
`routes.ts` monolithique (258, 485 et 313 lignes respectivement).
