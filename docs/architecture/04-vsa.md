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
sous-routeur Hono. Le fichier `api/src/index.ts` du domaine ne fait que les
monter (`app.route('/', createInvoiceRoute)`, etc.) — c'est un fichier de
composition pur, sans logique. Il n'existe plus de fichier `routes.ts`
central ni de dossier `api/src/routes/` regroupant plusieurs cas d'usage :
ce modèle intermédiaire (utile pendant la migration) est désormais remplacé
partout, y compris pour `accounting` qui l'utilisait comme étape
transitoire.
