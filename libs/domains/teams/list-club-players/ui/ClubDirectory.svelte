<script lang="ts">
  import { MemberAvatar } from '@nba/ui';

  /**
   * L'annuaire du club, cherchable.
   *
   * Le filtre est **local** : les deux cents adhérents de la saison sont déjà dans la
   * page, et les faire redemander au serveur à chaque frappe ajouterait un aller-retour
   * pour un travail que le navigateur fait sans y penser. Contrairement au choix de
   * volet — qui, lui, vit dans l'adresse parce qu'il se partage — une recherche en
   * cours n'a pas vocation à être un lien.
   *
   * L'adresse du portrait est calculée par la page et reçue toute faite : elle diffère
   * d'une application à l'autre, et l'îlot n'a pas à connaître les deux.
   */

  interface Player {
    licence: string;
    firstName: string;
    lastName: string;
    photoSrc: string | null;
    category: string | null;
    clubFunction: string | null;
    singles: string | null;
    doubles: string | null;
    mixed: string | null;
    eloAverage: number | null;
    hasRanking: boolean;
  }

  let { players = [], initialQuery = '' } = $props<{
    players?: Player[];
    /**
     * Recherche à rouvrir, reçue de la page.
     *
     * Reçue en propriété plutôt que lue dans `window` : la liste est rendue par le
     * serveur, et lire l'adresse depuis l'îlot ne donnerait le bon état qu'après
     * hydratation — le temps d'un clignotement où la liste s'affiche entière.
     */
    initialQuery?: string;
  }>();

  // svelte-ignore state_referenced_locally
  let query = $state(initialQuery);

  /**
   * La fiche d'un adhérent doit pouvoir ramener **ici**, recherche comprise.
   *
   * Sans le terme, revenir d'un résultat rouvrait l'annuaire entier : il faudrait
   * retaper ce qu'on venait de taper. `de=joueurs` dit d'où l'on vient, `q` dit ce
   * qu'on cherchait — la fiche n'a qu'à les rendre au lien de retour.
   */
  function href(licence: string): string {
    const params = new URLSearchParams({ de: 'joueurs' });
    const term = query.trim();
    if (term) params.set('q', term);
    return `/adherents/${licence}?${params}`;
  }

  /**
   * Recherche par **termes**, chacun devant se retrouver quelque part — même règle que
   * la recherche d'adhérents de l'administration. « Dupont vétéran » et « pré Martin »
   * trouvent donc ce qu'on attend, sans que l'ordre des mots compte.
   */
  const filtered = $derived.by(() => {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return players;
    return players.filter((player: Player) => {
      const haystack = [
        player.lastName,
        player.firstName,
        player.category ?? '',
        player.clubFunction ?? ''
      ]
        .join(' ')
        .toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  });
</script>

<div class="space-y-3">
  <label class="block">
    <span class="sr-only">Rechercher un adhérent</span>
    <input
      type="search"
      bind:value={query}
      placeholder="Rechercher un nom, une catégorie, une fonction…"
      class="min-h-[44px] w-full rounded-lg border border-border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ring"
    />
  </label>

  {#if filtered.length === 0}
    <p class="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
      {players.length === 0 ? 'Aucun adhérent pour le moment.' : 'Aucun adhérent ne correspond.'}
    </p>
  {:else}
    <ul class="divide-y rounded-lg border">
      {#each filtered as player (player.licence)}
        <li>
          <!--
            La fiche d'un adhérent s'ouvre déjà depuis l'effectif d'une équipe.
            L'annuaire y mène pour tout le club — c'est ce qu'il est.
          -->
          <a
            href={href(player.licence)}
            class="flex items-center justify-between gap-3 p-3 text-foreground no-underline hover:bg-muted/40"
          >
            <span class="flex min-w-0 items-center gap-3">
              <MemberAvatar
                src={player.photoSrc}
                name={`${player.firstName} ${player.lastName}`}
              />
              <span class="min-w-0">
                <span class="block truncate text-sm font-medium">
                  {player.lastName} {player.firstName}
                </span>
                <span class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  {#if player.category}<span>{player.category}</span>{/if}
                  {#if player.clubFunction}
                    <span class="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 font-medium text-primary">
                      {player.clubFunction}
                    </span>
                  {/if}
                </span>
              </span>
            </span>

            <span class="shrink-0 text-right">
              <span class="block text-xs tabular-nums text-muted-foreground">
                {player.hasRanking
                  ? `${player.singles ?? '—'} / ${player.doubles ?? '—'} / ${player.mixed ?? '—'}`
                  : 'sans classement'}
              </span>
              {#if player.eloAverage !== null}
                <!-- La valeur qui ordonne la liste : la montrer évite d'avoir à deviner
                     pourquoi untel passe devant. -->
                <span class="block text-[11px] tabular-nums text-muted-foreground/70">
                  {player.eloAverage} pts
                </span>
              {/if}
            </span>
          </a>
        </li>
      {/each}
    </ul>
  {/if}
</div>
