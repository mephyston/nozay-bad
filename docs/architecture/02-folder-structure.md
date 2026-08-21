# Structure de dossiers

Le découpage est par **cas d'usage**, pas par couche technique : une tranche verticale porte sa route, sa validation, son handler, son repository, son DTO, ses tests et son interface, côte à côte.

```
libs/
  domains/                         # un dossier par bounded context
    accounting/                    # au-dessus du seuil de 10 tranches : regroupé
      shared/                      #   partagé entre toutes les tranches du domaine
      invoices/                    #   capacité métier
        create-invoice/
          route.ts
          validator.ts
          handler.ts
          repository.ts
          dto.ts
          handler.test.ts
          ui/
            InvoiceForm.svelte
        update-invoice/
        list-invoices/
      seasons/  config/  bank/  ledger/  checks/  ai/
      index.ts                     #   API publique du domaine

    cms/                           # pages, actualités, médias, menus, redirections
      pages/  posts/  media/  navigation/  redirects/  categories/
      publishing/  revisions/  shared/  index.ts

    teams/                         # sous le seuil : les tranches sont à plat
      get-lineup/  save-lineup/  get-team/  import-rankings/ …
      shared/  index.ts

    events/  expenses/  iam/  members/  notifications/  schedules/  shop/

  shared/                          # strictement technique, aucun métier
    api-client/                    # client typé vers le Worker API
    db/                            # client Drizzle, migrations, helper de transaction
    html/                          # assainissement du texte riche
    pdf/  preview/  push/  runtime-env/  security-headers/
    ui/                            # design system générique : bouton, table, modale…

apps/
  api/                             # Worker Hono : compose app.route(...) par domaine
  admin/                           # console d'administration (Astro + Svelte)
  storefront/                      # espace adhérent (Astro + Svelte)
  website/                         # site public, rendu depuis le CMS
```

## Deux formes selon la taille du domaine

**Tranches à plat** tant que le domaine reste sous une dizaine de cas d'usage : `teams/get-lineup/`, `teams/save-lineup/`. C'est la forme par défaut.

**Regroupement par capacité** au-delà : `accounting/invoices/create-invoice/`. Le seuil et son motif sont dans [ADR-0003](./ADR-0003-organisation-des-domaines.md) — un domaine à trente tranches à plat cesse de se lire.

## Ce qui ne vit pas dans un domaine

`libs/shared/` est **strictement technique** : rien de ce qui s'y trouve ne connaît le badminton. C'est ce qui rend sa contrainte de dépendance tenable — il ne dépend que de lui-même.

`libs/shared/ui/` n'accueille que les composants réellement génériques. Un composant lié à un cas d'usage vit dans `<domaine>/<cas-usage>/ui/` : voir [07-ui](./07-ui.md).
