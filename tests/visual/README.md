# Régression visuelle du design system

Capture chaque story de `@nba/ui` (thèmes clair **et** sombre) et la compare à
une image de référence commitée. Toute dérive visuelle non intentionnelle fait
échouer le test.

## Fonctionnement

- Le test (`stories.spec.ts`) lit `storybook-static/index.json`, ouvre chaque
  story dans son iframe isolée, force le thème via `.dark`, et screenshote
  `#storybook-root`.
- Le serveur statique (`scripts/serve-storybook.mjs`, sans dépendance) sert le
  build Storybook ; Playwright le démarre automatiquement (`webServer`).
- Les références vivent dans `stories.spec.ts-snapshots/` et sont **suffixées
  par plateforme** (`-darwin`, `-linux`). Chaque plateforme a ses propres PNG
  car le rendu des polices diffère entre macOS et Linux.

## Commandes

```bash
npm run build-storybook     # prérequis : régénère index.json + assets
npm run test:visual         # compare aux références (échoue sur dérive)
npm run test:visual:update  # régénère les références de LA plateforme courante
```

## Références Linux (CI)

La CI (`.github/workflows/visual.yml`) tourne dans le conteneur Playwright
officiel : elle a besoin des références `-linux`. Sur un poste macOS,
`test:visual:update` ne produit que les `-darwin`. Pour (re)générer les Linux :

```bash
./scripts/update-visual-linux.sh   # nécessite Docker
```

Alternative sans Docker : lancer le workflow, télécharger l'artefact
`playwright-visual-report` du premier run (qui échoue faute de baselines),
récupérer les `*-linux.png` générés et les committer.

## Ajouter un composant au harnais

Crée un `NomDuComposant.stories.svelte` à côté du composant (voir les stories
existantes), rebuild Storybook, puis `test:visual:update` — la nouvelle story
est screenshotée automatiquement.
