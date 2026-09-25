<script lang="ts">
  import { ChevronRight } from '@lucide/svelte';
  import { MemberAvatar } from '@nba/ui';
  import { RANKING_SERIES_COLORS, bestRanking, rankingSeries } from '../../shared/ranking';
  import RankingChip from '../../shared/components/RankingChip.svelte';

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
  /**
   * Le podium du club : les trois meilleures moyennes de classement.
   *
   * Calculé sur la liste **entière**, jamais sur le résultat d'une recherche — sinon
   * chercher « Martin » sacrerait le meilleur des Martin champion du club. Un adhérent
   * sans classement n'y figure pas : on ne gagne pas une médaille faute d'adversaires.
   *
   * La liste arrive déjà ordonnée par la page ; on ne suppose pas qu'elle l'est, et on
   * compare les moyennes pour désigner les trois premières.
   */
  const podium = $derived.by(() => {
    const classes = players
      .filter((p: Player) => p.hasRanking && p.eloAverage !== null)
      .sort((a: Player, b: Player) => (b.eloAverage ?? 0) - (a.eloAverage ?? 0));
    const rangs = new Map<string, 1 | 2 | 3>();
    classes.slice(0, 3).forEach((p: Player, i: number) => rangs.set(p.licence, (i + 1) as 1 | 2 | 3));
    return rangs;
  });

  const MEDAILLES: Record<1 | 2 | 3, { classe: string; titre: string }> = {
    1: { classe: 'medaille-or', titre: 'Meilleure moyenne du club' },
    2: { classe: 'medaille-argent', titre: 'Deuxième moyenne du club' },
    3: { classe: 'medaille-bronze', titre: 'Troisième moyenne du club' }
  };

  /**
   * L'anneau d'un joueur hors podium : la couleur de la série de son **meilleur**
   * classement, sur les trois disciplines. Un non-compétiteur, ou un `NC`, n'en a pas.
   * Le podium garde sa médaille : un rang dans le club dit plus qu'une série.
   */
  function anneauDe(player: Player): { couleur: string; titre: string } | null {
    if (!player.hasRanking) return null;
    const meilleur = bestRanking([player.singles, player.doubles, player.mixed]);
    const serie = rankingSeries(meilleur);
    if (!serie) return null;
    const { fond, nom } = RANKING_SERIES_COLORS[serie];
    return { couleur: fond, titre: `Meilleur classement : ${meilleur} (série ${nom})` };
  }

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
              {#if podium.get(player.licence)}
                {@const medaille = MEDAILLES[podium.get(player.licence)!]}
                <!--
                  Le podium : un anneau autour du portrait et un volant de la couleur de
                  la médaille. Le titre dit ce que la couleur signifie — une médaille
                  qui ne se lit qu'à la teinte ne se lit pas du tout.
                -->
                <span class="relative shrink-0 {medaille.classe}" title={medaille.titre}>
                  <MemberAvatar
                    src={player.photoSrc}
                    name={`${player.firstName} ${player.lastName}`}
                    class="ring-2 ring-[var(--medaille)] ring-offset-2 ring-offset-card"
                  />
                  <span class="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-card">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="var(--medaille)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" aria-hidden="true">
                      <path d="M5.5 5a9 9 0 0 1 13 0" />
                      <path d="M9.3 16.3 5.5 5" />
                      <path d="M14.7 16.3 18.5 5" />
                      <path d="M12 16.8V4.2" />
                      <circle cx="12" cy="19" r="3" />
                    </svg>
                  </span>
                  <span class="sr-only">{medaille.titre}</span>
                </span>
              {:else if anneauDe(player)}
                {@const anneau = anneauDe(player)!}
                <!-- Même anneau que le podium, dans la couleur de la meilleure série. -->
                <span class="shrink-0" style="--serie: {anneau.couleur}" title={anneau.titre}>
                  <MemberAvatar
                    src={player.photoSrc}
                    name={`${player.firstName} ${player.lastName}`}
                    class="ring-2 ring-[var(--serie)] ring-offset-2 ring-offset-card"
                  />
                  <span class="sr-only">{anneau.titre}</span>
                </span>
              {:else}
                <MemberAvatar
                  src={player.photoSrc}
                  name={`${player.firstName} ${player.lastName}`}
                />
              {/if}
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

            <span class="flex shrink-0 items-center gap-2">
            <span class="text-right">
              {#if player.hasRanking}
                <!-- Simple, double, mixte : chacun dans la couleur de sa série. -->
                <span class="flex items-center justify-end gap-1 text-xs" aria-label="Classements simple, double et mixte">
                  <RankingChip ranking={player.singles} />
                  <RankingChip ranking={player.doubles} />
                  <RankingChip ranking={player.mixed} />
                </span>
              {:else}
                <span class="block text-xs text-muted-foreground">sans classement</span>
              {/if}
              {#if player.eloAverage !== null}
                <!-- La valeur qui ordonne la liste : la montrer évite d'avoir à deviner
                     pourquoi untel passe devant. -->
                <span class="block text-[11px] tabular-nums text-muted-foreground/70">
                  {player.eloAverage} pts
                </span>
              {/if}
            </span>
              <!--
                Le chevron dit que la ligne mène à la fiche. Sans lui, un classement
                aligné à droite se lit comme une donnée de plus, et rien n'invite à
                toucher.
              -->
              <ChevronRight class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </span>
          </a>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  /*
    Or, argent, bronze : des couleurs littérales, et c'est voulu. Ce ne sont pas des
    teintes de l'interface — elles ne changent pas avec le thème, pas plus que les
    anneaux olympiques. Les tons du design system disent un **état** ; une médaille dit
    un rang, et aucun jeton ne porte « troisième ».
  */
  .medaille-or {
    --medaille: #d4a017;
  }
  .medaille-argent {
    --medaille: #9aa3ab;
  }
  .medaille-bronze {
    --medaille: #b06a2c;
  }
</style>
