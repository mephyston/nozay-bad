# Régression visuelle du design system

Capture chaque story de `@nba/ui` (thèmes clair **et** sombre) et la compare à
une image de référence. Toute dérive visuelle non intentionnelle fait échouer le
test et **bloque le déploiement**.

## Source de vérité : la CI Linux

Playwright compare les captures au pixel près, or le rendu des polices diffère
entre macOS et Linux. Le dépôt étant privé sur plan gratuit (runners macOS
facturés ×10), tout tourne sur **Linux** :

- Les références commitées sont les `*-linux.png` de
  `stories.spec.ts-snapshots/`, **générées par la CI** (pas sur ton Mac).
- Le job `visual` de `.github/workflows/deploy.yml` (ubuntu, ×1) rejoue
  `test:visual` à chaque PR et push ; les trois jobs de déploiement en
  dépendent.

## Changer un visuel : régénérer les références

Quand tu modifies volontairement un composant (donc son apparence), déclenche le
workflow **« Update Visual Baselines »** :

1. GitHub → onglet **Actions** → *Update Visual Baselines* → **Run workflow**,
   sur ta branche.
2. Il rebuild Storybook, régénère les `*-linux.png` et les **commite
   automatiquement** sur la branche (`[skip ci]`).
3. `git pull` en local pour récupérer les références à jour.

> ⚠️ Amorçage : les références n'existent pas tant que ce workflow n'a pas tourné
> au moins une fois. Lance-le sur la branche **avant** de compter sur le gate.

## Localement (macOS, optionnel)

Pour prévisualiser sans attendre la CI :

```bash
npm run build-storybook
npm run test:visual         # crée/compare des références -darwin locales
npm run test:visual:update  # les régénère
```

Ces `*-darwin.png` sont **gitignorés** (rendu Mac ≠ Linux) : ils servent au
smoke local, jamais de référence CI.

## Ajouter un composant au harnais

Crée un `NomDuComposant.stories.svelte` à côté du composant (voir les stories
existantes). Rebuild Storybook, puis déclenche *Update Visual Baselines* pour
capturer la nouvelle story dans les références Linux.
