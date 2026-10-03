---
name: help-article
description: Écrire ou mettre à jour un article du centre d'aide de l'admin (apps/admin/src/content/help), y compris créer une nouvelle catégorie. À utiliser quand une fonctionnalité de l'admin change de comportement visible.
argument-hint: "<sujet>"
---

# Article du centre d'aide

Les articles vivent dans `apps/admin/src/content/help/*.md`, frontmatter `title`, `description`, `category`, `order`. Unique consommateur : la rubrique Aide de l'admin.

1. Lire deux articles existants de la même catégorie et en reprendre le ton : français, adressé au bénévole du bureau, par tâches (« Pour enregistrer un chèque… »), libellés de boutons tels qu'affichés à l'écran.
2. Vérifier chaque libellé et chaque chemin de menu dans le code de l'écran, pas de mémoire.
3. **Nouvelle catégorie** : trois endroits, sinon le build casse ou la rubrique n'apparaît pas :
   - l'enum de `apps/admin/src/content.config.ts` ;
   - `categoryNames` **et** `categoryOrder` dans `apps/admin/src/pages/admin/help/index.astro`.
4. Contrôle rapide du frontmatter, sans build complet : `(cd apps/admin && npx astro sync)`.

Rien à régénérer ensuite.
