@AGENTS.md

# Claude Code dans ce dépôt

Tout ce qui configure Claude Code est versionné ici ; seuls `.claude/settings.local.json` et `CLAUDE.local.md` restent personnels.

| Emplacement | Contenu |
|---|---|
| `.claude/rules/` | Règles par sujet. `architecture.md` et `git-workflow.md` sont toujours chargées, les autres selon les fichiers touchés. |
| `.claude/skills/` | `/new-migration`, `/new-slice`, `/local-dev`, `/help-article` ; `/promote`, `/rollback`, `/copy-prod-data` uniquement à la demande de l'utilisateur. |
| `.claude/agents/` | `architecture-reviewer` (relit un diff avant commit), `release-auditor` (évalue une plage avant promotion). |
| `.claude/hooks/` | `guard-bash.mjs` (production et historique partagé), `guard-migrations.mjs` (migrations publiées), `worktree-setup.sh` (prépare un worktree). |
| `.claude/settings.json` | Permissions partagées et branchement des hooks. |
| `.claude/worktrees/` | Worktrees de travail isolé (gitignoré) ; `.worktreeinclude` liste les fichiers locaux recopiés. |

## Manière de travailler

- Un changement qui touche plusieurs fichiers ou peut gêner le travail en cours de l'utilisateur se fait dans un worktree (`.claude/worktrees/<sujet>`), pas en changeant la branche de l'arbre principal.
- Avant de commiter une tranche, une migration, une permission ou un composant partagé : agent `architecture-reviewer` sur le diff.
- Une règle découverte en chemin (piège, garde-fou, convention) qui vaut pour tout le dépôt va dans le bon fichier de `.claude/rules/`, dans le même commit — pas dans une mémoire personnelle. Garder chaque règle courte et vérifiable ; le récit de l'incident reste dans le message de commit.
