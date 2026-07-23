# Structure de dossiers cible

```
libs/
  domains/
    accounting/                    # domaine au-dessus du seuil de 10 tranches (ADR-0003)
      shared/                      # partagé entre toutes les tranches du domaine
        invoice.ts
        bank-transaction.ts
        season.ts
      invoices/                    # capacité métier
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
        delete-invoice/
        list-invoices/
      seasons/                     # capacité métier
      config/                      # capacité métier
      bank/                        # capacité métier
      transactions/                # capacité métier
      checks/                      # capacité métier

    expenses/
      shared/
      create-expense/
      approve-expense/
      list-expenses/
      ...

    members/
      shared/
        member.ts
        season.ts                  # si members est bien propriétaire de "season"
      register-member/
      apply-payment/                # remplace l'accès direct fait depuis accounting
      import-members/                # PoonaImporter
      list-members/
      ...

    shop/
      shared/
      create-order/
      approve-order/
      list-products/
      ...

  infrastructure/
    database/                       # client Drizzle, migrations, helper de transaction

  shared/                           # strictement technique
    errors.ts                       # AppError générique
    bindings.ts                     # type Bindings (DB, AI)

  ui/                                # design system générique uniquement
    button/
    modal/
    table/
    ...

apps/
  api/
    src/index.ts                    # compose app.route(...) par domaine, comme aujourd'hui
  admin/
    src/pages/                      # importe uniquement des composants ui de domaine
  storefront/
    src/pages/
```

## Différence avec la structure actuelle

Structure actuelle (`libs/features/<domaine>/{api,data-access,ui}`) :
découpage par **couche technique** à l'intérieur de chaque domaine.

Structure cible (`libs/domains/<domaine>/<cas-usage>/`) : découpage par
**cas d'usage**, avec un `shared/` par domaine pour l'agrégat et les
interfaces de repository.

Le renommage `features` → `domains` est optionnel et cosmétique — l'essentiel
est le découpage interne. Si vous préférez limiter le bruit dans les diffs,
gardez `libs/features/` comme nom de dossier racine et appliquez uniquement le
découpage interne décrit ci-dessus.
