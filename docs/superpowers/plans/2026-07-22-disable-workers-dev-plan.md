# Désactivation de workers.dev sur apps/api

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Désactiver la publication publique de `nba-api` sur `workers.dev` pour s'assurer que l'API n'est accessible que via les Service Bindings en production et staging.

**Architecture:** Ajouter `"workers_dev": false` à la configuration globale (production) ainsi qu'au bloc staging de `apps/api/wrangler.json`.

**Tech Stack:** Cloudflare Workers, Wrangler Configuration (JSON)

## Global Constraints

- Les modifications doivent être appliquées proprement dans le fichier JSON.
- Les tests unitaires globaux doivent continuer à passer.

---

### Task 1: Désactiver workers_dev dans wrangler.json

**Files:**
- Modify: `apps/api/wrangler.json`

**Interfaces:**
- Consumes: None
- Produces: None

- [ ] **Step 1: Modifier `apps/api/wrangler.json`**

Ajouter `"workers_dev": false` à la racine du fichier JSON ainsi que dans la section `"env"."staging"`.

Voici le contenu final attendu de `apps/api/wrangler.json` :
```json
{
  "name": "nba-api",
  "main": "src/index.ts",
  "compatibility_date": "2024-03-01",
  "workers_dev": false,
  "observability": {
    "enabled": true,
    "logs": {
      "enabled": true,
      "head_sampling_rate": 1,
      "persist": true,
      "invocation_logs": true
    },
    "traces": {
      "enabled": true,
      "persist": true,
      "head_sampling_rate": 1
    }
  },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "nba-db",
      "database_id": "c1731262-3718-40c4-86b4-137c3830115d",
      "migrations_dir": "../../libs/shared/db/migrations"
    }
  ],
  "ai": {
    "binding": "AI"
  },
  "env": {
    "staging": {
      "name": "nba-api-staging",
      "workers_dev": false,
      "d1_databases": [
        {
          "binding": "DB",
          "database_name": "nba-db-staging",
          "database_id": "42c30a26-8b8b-4c43-a58c-f16ee80df5a7",
          "migrations_dir": "../../libs/shared/db/migrations"
        }
      ]
    }
  }
}
```

- [ ] **Step 2: Vérifier la validité syntaxique du JSON**

Exécuter la commande de validation de format :
Run: `node -e "JSON.parse(require('fs').readFileSync('apps/api/wrangler.json', 'utf8'))"`
Expected: Pas d'erreur (la commande retourne avec succès).

- [ ] **Step 3: Lancer les tests unitaires de l'API pour s'assurer que rien n'est cassé**

Run: `npx vitest run apps/api`
Expected: Tous les tests passent.

- [ ] **Step 4: Commit les changements**

Run:
```bash
git add apps/api/wrangler.json docs/superpowers/plans/2026-07-22-disable-workers-dev-plan.md
git commit -m "chore(api): disable workers.dev routes in wrangler config"
```
