#!/bin/sh
# SessionStart : rend un worktree utilisable sans `npm ci` (plusieurs minutes, ~1 Go).
#
# - node_modules : lien vers celui de l'arbre principal. Les hooks git (pre-push) et
#   toutes les commandes npx en ont besoin. Un worktree qui modifie package.json doit
#   remplacer le lien par un vrai `npm ci`.
# - Les fichiers locaux gitignorés (.dev.vars, .env) sont recopiés par Claude Code
#   d'après .worktreeinclude ; ce script ne fait que les compléter pour un worktree
#   créé à la main (`git worktree add`).
# - La D1 locale n'est PAS partagée : un worktree a sa propre base, vide au départ
#   (voir le skill /local-dev).
#
# Silencieux quand il n'y a rien à faire ; ce qu'il écrit entre dans le contexte.
set -eu

dir="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$dir" 2>/dev/null || exit 0

common=$(git rev-parse --git-common-dir 2>/dev/null) || exit 0
gitdir=$(git rev-parse --git-dir 2>/dev/null) || exit 0
[ "$(cd "$common" && pwd)" = "$(cd "$gitdir" && pwd)" ] && exit 0   # arbre principal

main=$(cd "$common/.." && pwd)
done_msgs=""

if [ ! -e node_modules ] && [ -d "$main/node_modules" ]; then
  ln -s "$main/node_modules" node_modules
  done_msgs="$done_msgs node_modules→arbre principal;"
fi

for f in apps/api/.dev.vars apps/admin/.dev.vars apps/storefront/.dev.vars apps/website/.dev.vars apps/storefront/.env; do
  if [ ! -e "$f" ] && [ -f "$main/$f" ]; then
    cp "$main/$f" "$f"
    done_msgs="$done_msgs $f;"
  fi
done

if [ "$(git config core.hooksPath 2>/dev/null || true)" != ".githooks" ]; then
  git config core.hooksPath .githooks
fi

[ -n "$done_msgs" ] && echo "[worktree] préparé :$done_msgs D1 locale vide dans ce worktree (skill /local-dev)."
exit 0
