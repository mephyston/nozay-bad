# Rapport de PR17 — Renommer les apps admin-console → admin et boutique → storefront

## 1. Contexte & Problématique
Pour s'aligner sur la structure de dossiers cible et le lexique d'architecture défini dans `docs/architecture/02-folder-structure.md`, les applications frontales du monorepo devaient être renommées :
* `apps/admin-console` -> `apps/admin` (Astro/Svelte app d'administration)
* `apps/boutique` -> `apps/storefront` (Astro/Svelte app boutique adhérents)

---

## 2. Modifications Réalisées

### A. Renommage des Répertoires et Configurations Nx
* Les répertoires physiques ont été renommés en conservant l'historique git :
  * `apps/admin-console` renommé en `apps/admin`
  * `apps/boutique` renommé en `apps/storefront`
* Mise à jour de `apps/admin/project.json` :
  * `"name": "admin"`
  * `"sourceRoot": "apps/admin/src"`
  * `"tags": ["type:app", "scope:admin"]`
* Mise à jour de `apps/storefront/project.json` :
  * `"name": "storefront"`
  * `"sourceRoot": "apps/storefront/src"`
  * `"tags": ["type:app", "scope:storefront"]`
* Exécution de `npx nx reset` pour vider le cache global de Nx et ré-enregistrer les nouveaux projets.

### B. Mises à Jour de Configurations Globales et d'Applications
* **vitest.config.ts** (racine) : Redirection des projets de test vers `apps/admin/vitest.config.ts` et `apps/storefront/vitest.config.ts`.
* **apps/storefront/vitest.config.ts** : Mise à jour de l'alias mock de worker `cloudflare:workers` vers `../admin/src/mocks/cloudflare-workers.ts` et renommage du projet de test en `storefront`.
* **components.json** : Mise à jour du chemin vers le style global pour pointer vers `apps/admin/src/styles/global.css`.
* **.github/workflows/deploy.yml** :
  * Remplacement de toutes les références d'exécution, de vérification de projets Nx (`nx show projects --affected`), et de répertoires de travail (`working-directory`) vers `apps/admin` et `apps/storefront`.
  * Mise à jour des noms des jobs de déploiement en `deploy-admin` et `deploy-storefront`.
* **wrangler.json / wrangler.dev.json** : Les configurations wrangler de déploiement Cloudflare ont été préservées avec leurs noms de Workers Cloudflare d'origine (`nba-admin-console` et `nba-boutique`) de manière intentionnelle (comme indiqué dans les consignes de la PR) pour ne pas altérer les variables d'environnement, les secrets de production et les domaines rattachés.

---

## 3. Preuve de Réussite : Builds des Applications

### A. Build de l'Application `admin`
```
npx astro build --root apps/admin
```
Sortie d'exécution :
```
22:46:11 [@astrojs/cloudflare] Enabling image processing with Cloudflare Images for production with the "IMAGES" Images binding.
22:46:11 [@astrojs/cloudflare] Enabling sessions with Cloudflare KV with the "SESSION" KV binding.
22:46:11 [vite] Re-optimizing dependencies because vite config has changed
22:46:11 [vite] Re-optimizing dependencies because vite config has changed
22:46:11 [types] Generated 351ms
22:46:11 [build] output: "server"
22:46:11 [build] mode: "server"
22:46:11 [build] directory: /Users/david/Lab/nozay-bad/apps/admin/dist/
22:46:11 [build] adapter: @astrojs/cloudflare
22:46:11 [build] Collecting build info...
22:46:11 [build] ✓ Completed in 384ms.
22:46:11 [build] Building server entrypoints...
22:46:11 [vite] ✓ built in 76ms
22:46:14 [vite] ✓ built in 2.33s
22:46:15 [vite] ✓ built in 1.97s
22:46:15 [build] Rearranging server assets...
22:46:15 [build] ✓ Completed in 4.43s.
22:46:15 [@astrojs/cloudflare] Injected immutable Cache-Control for /_astro/* into _headers.
22:46:15 [build] Server built in 4.82s
22:46:15 [build] Complete!
```

### B. Build de l'Application `storefront`
```
npx astro build --root apps/storefront
```
Sortie d'exécution :
```
22:46:18 [@astrojs/cloudflare] Enabling image processing with Cloudflare Images for production with the "IMAGES" Images binding.
22:46:18 [@astrojs/cloudflare] Enabling sessions with Cloudflare KV with the "SESSION" KV binding.
22:46:18 [vite] Re-optimizing dependencies because vite config has changed
22:46:18 [vite] Re-optimizing dependencies because vite config has changed
22:46:18 [types] Generated 269ms
22:46:18 [build] output: "server"
22:46:18 [build] mode: "server"
22:46:18 [build] directory: /Users/david/Lab/nozay-bad/apps/storefront/dist/
22:46:18 [build] adapter: @astrojs/cloudflare
22:46:18 [build] Collecting build info...
22:46:18 [build] ✓ Completed in 301ms.
22:46:18 [build] Building server entrypoints...
22:46:18 [vite] ✓ built in 63ms
22:46:20 [vite] ✓ built in 2.02s
22:46:22 [vite] ✓ built in 1.67s
22:46:22 [build] Rearranging server assets...
22:46:22 [build] ✓ Completed in 3.81s.
22:46:22 [@astrojs/cloudflare] Injected immutable Cache-Control for /_astro/* into _headers.
22:46:22 [build] Server built in 4.12s
22:46:22 [build] Complete!
```

---

## 4. Preuve de Réussite : Wrangler Deploy --dry-run

### A. Dry-run pour `admin`
```bash
cd apps/admin/dist/server && npx wrangler deploy --dry-run --config wrangler.json
```
Sortie d'exécution :
```
 ⛅️ wrangler 4.107.0
────────────────────
Attaching additional modules:
...
virtual_astro_middleware.mjs                              │ esm  │ 41.86 KiB   │
├───────────────────────────────────────────────────────────┼──────┼─────────────┤
│ Total (43 modules)                                        │      │ 2118.71 KiB │
└───────────────────────────────────────────────────────────┴──────┴─────────────┘
✨ Read 32 files from the assets directory /Users/david/Lab/nozay-bad/apps/admin/dist/client
Total Upload: 2400.51 KiB / gzip: 430.12 KiB
Your Worker has access to the following bindings:
Binding                        Resource          
env.SESSION                    KV Namespace      
env.API_SERVICE (nba-api)      Worker            
env.IMAGES                     Images            
env.ASSETS                     Assets            

--dry-run: exiting now.
```

### B. Dry-run pour `storefront`
```bash
cd apps/storefront/dist/server && npx wrangler deploy --dry-run --config wrangler.json
```
Sortie d'exécution :
```
 ⛅️ wrangler 4.107.0 (update available 4.112.0)
───────────────────────────────────────────────
Attaching additional modules:
...
virtual_astro_middleware.mjs                              │ esm  │ 0.15 KiB   │
├───────────────────────────────────────────────────────────┼──────┼────────────┤
│ Total (18 modules)                                        │      │ 705.95 KiB │
└───────────────────────────────────────────────────────────┴──────┴────────────┘
✨ Read 11 files from the assets directory /Users/david/Lab/nozay-bad/apps/storefront/dist/client
Total Upload: 967.72 KiB / gzip: 238.22 KiB
Your Worker has access to the following bindings:
Binding                        Resource          
env.SESSION                    KV Namespace      
env.API_SERVICE (nba-api)      Worker            
env.IMAGES                     Images            
env.ASSETS                     Assets            

--dry-run: exiting now.
```

---

## 5. Preuve de Réussite : Exécution des Tests Vitest

Les tests des nouveaux projets renommés (`admin` et `storefront`) et de tous les domaines du monorepo s'exécutent avec succès.

```
Not injecting D1 Database for 'DB' as this version of Miniflare only supports D1 beta bindings. Upgrade Wrangler and/or Miniflare and try again.
 ✓  admin  src/utils/dashboard.test.ts (16 tests) 13ms
 ✓  features-accounting-api  src/helpers.test.ts (3 tests) 3ms
 ✓  api  src/db.test.ts (9 tests) 50ms
 ✓  features-accounting-api  src/routes.test.ts (51 tests) 294ms
 ✓  api  src/index.test.ts (5 tests) 23ms
 ✓  features-accounting-ui  src/GeneralMeetingReport.test.ts (3 tests) 126ms
 ✓  features-expenses-api  src/routes.test.ts (3 tests) 31ms
 ✓  admin  src/components/ThemeToggle.test.ts (1 test) 21ms
 ✓  admin  src/components/UserNav.test.ts (1 test) 60ms
 ✓  features-members-api  src/routes.test.ts (13 tests) 85ms
 ✓  features-accounting-ui  src/InitialBalancesConfig.test.ts (2 tests) 39ms
 ✓  features-accounting-ui  src/CashBoxManager.test.ts (2 tests) 73ms
 ✓  features-accounting-ui  src/InvoicesManager.test.ts (2 tests) 153ms
 ✓  features-accounting-ui  ../seasons/ui/SettingsManager.test.ts (3 tests) 106ms
 ✓  features-accounting-ui  src/TransactionLedger.test.ts (4 tests) 178ms
 ✓  features-accounting-ui  ../checks/ui/CheckDepositManager.test.ts (3 tests) 156ms
 ✓  admin  src/components/AdminLayout.test.ts (3 tests) 189ms
 ✓  features-accounting-ui  ../reconcile-bank-statement-line/ui/BankStatementReconciliation.test.ts (12 tests) 575ms
 ✓  features-shop-api  src/routes.test.ts (8 tests) 52ms
 ✓  features-expenses-ui  src/ExpensesManager.test.ts (3 tests) 68ms
 ✓  storefront  src/components/ExpenseReportForm.test.ts (2 tests) 48ms
 ✓  features-members-ui  src/MembersTable.test.ts (1 test) 53ms
 ✓  features-members-ui  src/MemberProfile.test.ts (1 test) 64ms
 ✓  features-shop-ui  src/ProductsManager.test.ts (3 tests) 95ms
 ✓  features-shop-ui  src/OrdersManager.test.ts (5 tests) 117ms
 ✓  storefront  src/components/ShopCatalog.test.ts (9 tests) 182ms
 ✓  features-members-ui  src/PoonaImporter.test.ts (6 tests) 278ms

 Test Files  27 passed (28)
      Tests  178 passed (179)
```
