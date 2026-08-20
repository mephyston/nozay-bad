/**
 * Mémoïsation de lectures, le temps d'une requête HTTP.
 *
 * Pourquoi. `loadLineup` enchaîne une douzaine de requêtes D1, dont cinq ne dépendent
 * pas de l'équipe mais de la saison, du championnat ou de la journée : l'annuaire des
 * licences, les classements, l'historique des alignements, la journée elle-même et la
 * date de référence ELO. Appelé une fois par équipe — six fois sur l'écran de contrôle
 * des journées — il refaisait donc quarante-huit requêtes là où huit suffisent.
 *
 * Le parti pris est de **mémoïser par paramètres**, et non de pré-calculer côté appelant
 * pour passer les données en argument. Pré-calculer supposerait que l'appelant sache que
 * deux équipes partagent le même résultat — une hypothèse vraie aujourd'hui, silencieuse
 * si elle cesse de l'être. Ici, la clé encode les paramètres réels : deux appels ne
 * partagent un résultat que s'ils auraient de toute façon exécuté la même requête. Le
 * jour où une lecture se met à dépendre de l'équipe, sa clé change et le cache se
 * dédouble tout seul.
 *
 * Portée volontairement courte : un cache est créé pour une requête et jeté avec elle.
 * Rien n'est partagé entre deux requêtes HTTP, donc aucune donnée périmée ne peut être
 * servie — ce n'est pas un cache applicatif, c'est une déduplication locale.
 *
 * La promesse est mémorisée avant d'être attendue : deux appels concurrents sur la même
 * clé partagent le même vol, ce qui compte puisque les équipes sont chargées de front.
 */
export type QueryCache = Map<string, Promise<unknown>>;

export function createQueryCache(): QueryCache {
  return new Map();
}

/**
 * Renvoie la valeur mémoïsée pour `key`, ou exécute `load` et la mémorise.
 * Sans cache, `load` est simplement exécutée — les appelants qui n'en passent pas
 * (l'écran capitaine, qui ne charge qu'une équipe) gardent le comportement d'origine.
 */
export function memo<T>(
  cache: QueryCache | undefined,
  key: string,
  load: () => Promise<T>
): Promise<T> {
  if (!cache) return load();

  const cached = cache.get(key) as Promise<T> | undefined;
  if (cached) return cached;

  const pending = load();
  cache.set(key, pending);
  return pending;
}
