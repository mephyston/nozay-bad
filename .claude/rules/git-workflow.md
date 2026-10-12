# Branches, commits et livraison

Toujours chargée. Référence : `CONTRIBUTING.md` §8.

## Tronc unique

- `main` est la seule branche durable. Push sur `main` → staging automatique (`deploy.yml`). Production → workflow manuel **Promote to production** ; retour arrière → **Rollback production**. On promeut un **commit**, jamais un binaire (les builds Astro inlinent l'environnement).
- Les petits changements se commitent sur `main`. Une fonctionnalité inachevée part sur `main` **éteinte** derrière un drapeau `*_ENABLED` (`vars` du `wrangler.json`).
- **Chantier d'ampleur sur une branche dédiée** `feat/<sujet>` : migration destructive, renommage de table, refonte de modèle ou plus d'une trentaine de fichiers. Une version qui porte une migration destructive n'est pas rollbackable ; la branche laisse le temps de relire et de rejouer la migration sur un clone. Le proposer de soi-même.

## Commits

- Messages en français, Conventional Commits avec portée : `feat(shop): …`, `fix(members): …`, `chore(deps): …`. Le sujet décrit l'effet pour l'utilisateur, pas le code. semantic-release en tire version et notes.
- Plusieurs personnes et sessions travaillent en parallèle sur le même dépôt : une branche peut être fusionnée, supprimée ou changée sous vos pieds. **Garder la branche dans la commande même du commit**, avec un vrai garde et non un simple affichage :
  `[ "$(git branch --show-current)" = main ] && git add <fichiers> && git commit …`
- Ne jamais `git add -A` dans un arbre partagé : nommer les fichiers.
- Nommer ses fichiers ne suffit pas : `git commit` emporte **tout l'index**, y compris un `git mv` ou un `git rm` qu'une autre session y a posé. Relire `git diff --cached --stat` avant chaque commit. Ne jamais `reset --hard`, `stash` nu ou `push --force` dans un arbre où quelqu'un d'autre travaille.
- Un travail isolé se fait dans un worktree (`.claude/worktrees/`, cf. `.worktreeinclude`), pas en changeant la branche de l'arbre principal.

## Hooks git (`.githooks/`, activés par `npm install`)

- `pre-commit` : gitleaks sur l'index.
- `pre-push` : garde-fous `scripts/check-*`, typecheck, `astro check`, tests d'architecture, ESLint `--max-warnings 0`, gitleaks, puis `vitest --changed`. C'est la CI en local : un échec ici se corrige, il ne se contourne pas (`--no-verify` réservé au hotfix assumé).
