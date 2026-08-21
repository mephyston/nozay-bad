# Hexagonal léger (ports & adapters)

> **Note de lecture.** Ce document a été écrit pendant la migration de juillet 2026. Les chemins `libs/features/**` et les alias `@metacult/*` qu'il cite en **contre-exemples** décrivent le code d'alors ; ils n'existent plus. La structure livrée est décrite dans [02-folder-structure](./02-folder-structure.md), les dépendances effectives dans [03-dependencies](./03-dependencies.md). Le raisonnement, lui, reste la référence.

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

## Choix de conception : Non-utilisation des interfaces de repositories inutilisées (PR30)

Il a été décidé d'éliminer les interfaces de repository globales ou de tranches (`*RepositoryInterface`) qui n'étaient pas réellement exploitées pour l'injection de dépendances (les handlers dépendant directement de la classe concrète, et Vitest mockant la classe via prototype spys). Conserver du code mort complexifiait inutilement le typage et l'architecture en donnant une fausse impression de conformité. Les interfaces de repository inutilisées dans `accounting`, `expenses`, `members`, et `shop` ont donc été purement et simplement supprimées.

## Schémas de base de données internes au domaine

Le schéma Drizzle interne (tables du domaine) peut être conservé centralisé dans `data-access/src/schema.ts` s'il est partagé par plusieurs repositories du domaine (par exemple dans le cas de `accounting` ou `members`). Cela évite la redéfinition des tables tout en le gardant privé et non exporté à l'extérieur du domaine.
