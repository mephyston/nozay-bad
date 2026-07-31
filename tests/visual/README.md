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
- Les références vivent dans `stories.spec.ts-snapshots/`, suffixées par
  plateforme (`-darwin` ici). Le rendu des polices différant d'un OS à l'autre,
  la CI tourne sur un runner **macOS** pour matcher ces références.

## Commandes (local, macOS)

```bash
npm run build-storybook     # prérequis : régénère index.json + assets
npm run test:visual         # compare aux références (échoue sur dérive)
npm run test:visual:update  # régénère les références après un changement assumé
```

## Dans le pipeline

Le job `visual` de `.github/workflows/deploy.yml` s'exécute sur `macos-latest` à
chaque PR et push (main/staging) : il build Storybook et lance `test:visual`.
Les trois jobs de déploiement en dépendent — **un déploiement est bloqué si une
dérive visuelle est détectée**. En cas d'échec, l'artefact
`playwright-visual-report` (rapport HTML + PNG générés) est téléchargeable.

### Flux d'un changement visuel intentionnel

1. Modifier le composant.
2. `npm run test:visual:update` en local → régénère les PNG `-darwin`.
3. Committer le changement **et** les PNG mis à jour dans la même PR.
   La CI compare aux nouvelles références → vert.

## Ajouter un composant au harnais

Crée un `NomDuComposant.stories.svelte` à côté du composant (voir les stories
existantes), rebuild Storybook, puis `test:visual:update` — la nouvelle story
est screenshotée automatiquement.
