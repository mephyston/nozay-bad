#!/usr/bin/env node
// PreToolUse(Bash) : arrête ou soumet à confirmation les commandes qui touchent la
// production ou l'historique partagé. Le dépôt n'a ni protection de branche (GitHub Free)
// ni environnement de production isolé du poste : ce hook est le dernier filet entre une
// commande mal ciblée et la base des adhérents.
//
// « ask » rend la main à l'utilisateur avec le motif ; « deny » refuse sans appel.
// Une commande composée (`a && b`) est jugée sur l'ensemble de sa chaîne.
import { readFileSync } from 'node:fs';

const input = JSON.parse(readFileSync(0, 'utf8'));
const cmd = String(input?.tool_input?.command ?? '');

/** @type {Array<[RegExp, 'ask' | 'deny', string]>} */
const RULES = [
  // ── Production Cloudflare ────────────────────────────────────────────────
  [/\bwrangler\b[^;&|]*\bdeploy\b/, 'ask',
    'Déploiement direct : staging et production passent par la CI (deploy.yml, promote.yml).'],
  [/\bwrangler\b[^;&|]*\bd1\b[^;&|]*\b(execute|migrations\s+apply)\b(?=[^;&|]*--remote)(?![^;&|]*--env[= ]staging)/, 'ask',
    'Écriture sur la base D1 de PRODUCTION (--remote sans --env staging).'],
  [/\bwrangler\b[^;&|]*\bd1\b[^;&|]*\btime-travel\s+restore\b/, 'ask',
    'Time Travel restaure TOUTE la base : les écritures des adhérents depuis cet instant sont perdues.'],
  [/\bwrangler\b[^;&|]*\b(secret\s+(put|delete|bulk)|rollback|triggers\s+deploy|versions\s+deploy)\b/, 'ask',
    'Modification de configuration ou de version d\'un Worker déployé.'],
  [/\bwrangler\b[^;&|]*\br2\b[^;&|]*\bobject\s+(put|delete)\b(?![^;&|]*--local)/, 'ask',
    'Écriture sur un bucket R2 distant.'],
  [/\bgh\s+workflow\s+run\s+(promote|rollback)(\.yml)?\b/, 'ask',
    'Lancement d\'un workflow de production.'],

  // ── Historique git partagé ───────────────────────────────────────────────
  [/\bgit\s+push\b[^;&|]*(\s--force\b|\s-f\b|\s--force-with-lease\b)/, 'deny',
    'Push forcé interdit : main n\'a pas de protection de branche et d\'autres sessions travaillent dessus.'],
  [/\bgit\s+reset\s+--hard\b/, 'ask',
    'reset --hard détruit le travail non commité, peut-être celui d\'une autre session dans cet arbre.'],
  [/\bgit\s+stash(\s+(pop|drop|clear))?\s*($|[;&|])/, 'ask',
    'La pile de stash est partagée entre worktrees et sessions : utiliser `git stash push -u -m <tag>` et `apply <sha>`.'],
  [/\bgit\s+(clean\s+-[a-z]*f|checkout\s+--\s+\.|restore\s+\.)/, 'ask',
    'Suppression de modifications non commitées dans tout l\'arbre.'],
  [/\bgit\s+add\s+(-A\b|--all\b|\.(\s|$))/, 'ask',
    'Ajout global dans un arbre partagé : nommer les fichiers.'],
  [/\bgit\s+(commit|push)\b[^;&|]*--no-verify\b/, 'ask',
    'Contournement des hooks git (gitleaks, garde-fous, tests).'],
  [/\bgit\s+branch\s+-D\b/, 'ask',
    'Suppression forcée d\'une branche, peut-être non fusionnée.'],
];

for (const [pattern, decision, reason] of RULES) {
  if (pattern.test(cmd)) {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: decision,
        permissionDecisionReason: `[garde nozay-bad] ${reason}`,
      },
    }));
    process.exit(0);
  }
}
process.exit(0);
