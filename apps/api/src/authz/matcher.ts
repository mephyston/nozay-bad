import type { HttpMethod, RouteRule } from './types';
import { ROUTE_PERMISSIONS } from './route-permissions';

interface CompiledRule {
  rule: RouteRule;
  segments: string[];
  literalCount: number;
  firstParamIndex: number;
}

function compile(rule: RouteRule): CompiledRule {
  const segments = rule.path.split('/').filter(Boolean);
  const firstParamIndex = segments.findIndex((s) => s.startsWith(':'));
  return {
    rule,
    segments,
    literalCount: segments.filter((s) => !s.startsWith(':')).length,
    firstParamIndex: firstParamIndex === -1 ? segments.length : firstParamIndex
  };
}

/**
 * Index méthode → règles, triées par spécificité décroissante.
 *
 * Le tri est fait ici, une fois, et non laissé à l'ordre du fichier source : sinon
 * déplacer une ligne dans `route-permissions.ts` changerait silencieusement la
 * permission appliquée à une route. Plus de littéraux d'abord, puis la partie
 * littérale la plus longue — `/members/attestation/config` l'emporte donc sur
 * `/members/:id/cse-data`, et `/accounting/seasons/:id/reports/pdf` sur
 * `/accounting/seasons/:id/reports`.
 */
function buildIndex(rules: RouteRule[]): Map<HttpMethod, CompiledRule[]> {
  const seen = new Set<string>();
  for (const rule of rules) {
    const key = `${rule.method} ${rule.path}`;
    if (seen.has(key)) {
      // Deux règles pour la même route : l'une des deux serait ignorée sans que
      // personne ne le voie. On échoue au chargement du module, donc à l'import.
      throw new Error(`[authz] règle en double dans ROUTE_PERMISSIONS : ${key}`);
    }
    seen.add(key);
  }

  const index = new Map<HttpMethod, CompiledRule[]>();
  for (const rule of rules) {
    const compiled = compile(rule);
    const list = index.get(rule.method);
    if (list) list.push(compiled);
    else index.set(rule.method, [compiled]);
  }

  for (const list of index.values()) {
    list.sort(
      (a, b) =>
        b.segments.length - a.segments.length ||
        b.literalCount - a.literalCount ||
        b.firstParamIndex - a.firstParamIndex
    );
  }

  return index;
}

const INDEX = buildIndex(ROUTE_PERMISSIONS);

function matches(compiled: CompiledRule, segments: string[]): boolean {
  if (compiled.segments.length !== segments.length) return false;
  return compiled.segments.every((s, i) => s.startsWith(':') || s === segments[i]);
}

/**
 * Règle applicable à une requête, ou `undefined` si la route n'est pas déclarée.
 *
 * `undefined` doit toujours se traduire par un refus : c'est ce qui rend le modèle
 * fermé par défaut, y compris pour une route ajoutée sans y penser.
 */
export function matchRule(method: string, path: string): RouteRule | undefined {
  // HEAD emprunte le traitement de GET, comme dans Hono.
  const normalized = method.toUpperCase() === 'HEAD' ? 'GET' : method.toUpperCase();
  const candidates = INDEX.get(normalized as HttpMethod);
  if (!candidates) return undefined;

  const segments = path.split('/').filter(Boolean);
  return candidates.find((c) => matches(c, segments))?.rule;
}
