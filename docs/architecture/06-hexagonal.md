# Hexagonal léger (ports & adapters)

```
handler.ts  →  InvoiceRepository (interface, "port")  →  DrizzleInvoiceRepository (adapter)  →  D1
```

Jamais de dépendance inverse : le repository ne connaît pas le handler, et
l'agrégat ne connaît ni Drizzle ni Hono.

## Ce qui doit changer concrètement

Aujourd'hui, `libs/features/accounting/data-access/src/index.ts` fait :

```ts
export * from './schema';
```

— ce qui exporte les tables Drizzle brutes. N'importe quel domaine autorisé
(par les tags Nx) à dépendre d'`accounting` peut alors faire n'importe quelle
requête sur n'importe quelle colonne.

Cible : le schéma Drizzle devient un détail d'implémentation **interne** au
domaine (non exporté), et seul un repository est exposé :

```ts
// libs/domains/accounting/create-invoice/repository.ts (ou shared/ si partagé entre slices)
export interface InvoiceRepository {
  getLastInvoiceNumber(seasonId: string, prefix: string): Promise<number>;
  create(tx: DbTx, invoice: NewInvoice): Promise<Invoice>;
}

export class DrizzleInvoiceRepository implements InvoiceRepository {
  constructor(private db: DbClient) {}
  // seule classe du domaine à importer drizzle-orm et invoicesTable
}
```

Ceci s'applique aussi au repository interne utilisé par `members` pour
exposer `applyPaymentToMember` — `accounting` n'a plus besoin de connaître
`membersTable`, uniquement l'interface exposée par `members`.

## Bénéfice secondaire

Cette interface permet d'injecter un repository en mémoire dans
`handler.test.ts` (cf. `04-vsa.md`) sans monter Drizzle/D1 dans les tests
unitaires — à réserver aux tests d'intégration du repository lui-même.
