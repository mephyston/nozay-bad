# Nettoyage du dépôt Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Supprimer les fichiers inutiles ("junk files") et artefacts locaux qui traînent dans le dépôt.

**Architecture:** Les fichiers concernés sont soit versionnés par erreur (comme `scratch.ts`), soit ignorés par Git mais polluant l'espace de travail local (`db.sqlite`, `scratch/`, `.superpowers/sdd/`, snapshots de tests locaux macOS).

**Tech Stack:** Git, shell commands

## Global Constraints

- Ne pas supprimer les dossiers de build normaux (`node_modules/`, `dist/`, `.astro/`, etc.) qui seront régénérés de toute façon.
- Le nettoyage de `scratch.ts` nécessite l'utilisation de `git rm` car le fichier est actuellement versionné.
- Les autres fichiers peuvent être supprimés avec `rm`.

---

### Task 1: Nettoyer les scripts de test versionnés

**Files:**
- Modify: `scratch.ts`

**Interfaces:**
- Consumes: N/A
- Produces: N/A

- [ ] **Step 1: Supprimer `scratch.ts` de git**

```bash
git rm scratch.ts
```

- [ ] **Step 2: Commit la suppression**

```bash
git commit -m "chore: suppression du script temporaire scratch.ts"
```

### Task 2: Nettoyer les bases de données locales SQLite

Ces fichiers sont ignorés par Git mais peuvent contenir des données de tests obsolètes.

**Files:**
- Modify: `db.sqlite`
- Modify: `apps/api/db.sqlite`

**Interfaces:**
- Consumes: N/A
- Produces: N/A

- [ ] **Step 1: Supprimer les bases de données locales**

```bash
rm -f db.sqlite apps/api/db.sqlite
```

### Task 3: Nettoyer les dossiers temporaires

Le dossier `scratch/` est ignoré et utilisé pour des tests temporaires. Les diffs et rapports dans `.superpowers/sdd/` sont des artefacts locaux.

**Files:**
- Modify: `scratch/`
- Modify: `.superpowers/sdd/`

**Interfaces:**
- Consumes: N/A
- Produces: N/A

- [ ] **Step 1: Supprimer les répertoires temporaires et historiques**

```bash
rm -rf scratch/
rm -f .superpowers/sdd/*.diff .superpowers/sdd/*-report.md .superpowers/sdd/*-brief.md
```

### Task 4: Nettoyer les snapshots de test visuels locaux

Selon le fichier `.gitignore`, les snapshots se terminant par `-darwin.png` sont locaux (la CI Linux fait foi).

**Files:**
- Modify: `tests/visual/**/*-darwin.png`

**Interfaces:**
- Consumes: N/A
- Produces: N/A

- [ ] **Step 1: Supprimer les images générées localement**

```bash
find tests/visual -name '*-darwin.png' -type f -delete
```
