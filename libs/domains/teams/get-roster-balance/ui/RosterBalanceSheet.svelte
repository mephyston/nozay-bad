<script lang="ts">
  import { Alert, Badge, Button, ChoiceField, FormField, ResponsiveSheet, toast, uiAlert } from '@nba/ui';
  import { ArrowRight, Lock, LockOpen, Scale, TriangleAlert, X } from '@lucide/svelte';
  import { CHAMPIONSHIPS, CHAMPIONSHIP_RULES, type Championship } from '../../shared/championship';
  import { equilibrer, type BalanceResult } from '../../shared/roster-balance';
  import { VERDICTS } from '../../shared/value-range-verdict';
  import type { GetRosterBalanceOutput } from '../dto';
  import { classementsTexte, nomJoueur, repartitionAEcrire, vueEquilibrage } from './balance-view';

  /**
   * Équilibrer les effectifs d'un championnat, en début de saison.
   *
   * Le vivier — les joueurs déjà inscrits dans les équipes du championnat — est
   * réparti dans le navigateur (RF-TEA-010) : la feuille montre, équipe par équipe, la
   * plage de valeur avant et après, et qui arrive ou part. Rien n'est écrit tant que
   * le coach n'applique pas ; l'application remplace tous les effectifs d'un bloc.
   */
  let {
    open = $bindable(false),
    seasonCode,
    championship: initial,
    canWrite,
    onSaved,
    endpoint = '/admin/api/teams/equilibrage'
  }: {
    open: boolean;
    seasonCode: string;
    championship: Championship;
    canWrite: boolean;
    onSaved: () => void;
    endpoint?: string;
  } = $props();

  // Les vétérans n'ont pas de valeur d'équipe : rien à équilibrer.
  const choix = CHAMPIONSHIPS.filter((c) => CHAMPIONSHIP_RULES[c].valueFormula !== 'none');
  // svelte-ignore state_referenced_locally
  let championship = $state<Championship>(choix.includes(initial) ? initial : choix[0]);
  let pool = $state<GetRosterBalanceOutput | null>(null);
  let result = $state<BalanceResult | null>(null);
  let etat = $state<'repos' | 'calcul' | 'ecriture'>('repos');
  /** Joueur → l'équipe où le coach le fige. */
  let figes = $state<Map<string, number>>(new Map());
  /** Joueur → les équipes que le coach lui interdit. */
  let interdits = $state<Map<string, Set<number>>>(new Map());

  /*
    Les choix du coach sont mémorisés dans ce navigateur, par saison et par championnat :
    une commodité, pas une donnée. Un stockage refusé (navigation privée) n'empêche rien.
  */
  const cle = (c: Championship) => `equilibrage-choix:${seasonCode}:${c}`;
  function lireChoix(c: Championship, inscrits: Set<string>, equipesIds: Set<number>) {
    try {
      const brut = JSON.parse(localStorage.getItem(cle(c)) ?? '{}') as { figes?: [string, number][]; interdits?: [string, number[]][] };
      figes = new Map((brut.figes ?? []).filter(([l, t]) => inscrits.has(l) && equipesIds.has(t)));
      interdits = new Map(
        (brut.interdits ?? []).filter(([l]) => inscrits.has(l)).map(([l, ts]) => [l, new Set(ts.filter((t) => equipesIds.has(t)))])
      );
    } catch {
      figes = new Map();
      interdits = new Map();
    }
  }
  function ecrireChoix() {
    try {
      localStorage.setItem(cle(championship), JSON.stringify({ figes: [...figes], interdits: [...interdits].map(([l, ts]) => [l, [...ts]]) }));
    } catch {
      /* stockage indisponible : les choix valent pour la session */
    }
  }

  function recalculer() {
    if (pool && pool.teams.length > 1) result = equilibrer(championship, pool.teams, pool.players, { figes, interdits });
  }

  /** Figer ce joueur dans cette équipe, ou le libérer s'il l'y était déjà. */
  function figer(licence: string, teamId: number) {
    const suivant = new Map(figes);
    if (suivant.get(licence) === teamId) suivant.delete(licence);
    else suivant.set(licence, teamId);
    // On ne fige pas un joueur là où on vient de l'interdire.
    const exclus = new Set(interdits.get(licence) ?? []);
    exclus.delete(teamId);
    interdits = new Map(interdits).set(licence, exclus);
    figes = suivant;
    ecrireChoix();
    recalculer();
  }

  /** Interdire cette équipe à ce joueur, ou la lui rendre. */
  function interdire(licence: string, teamId: number) {
    const exclus = new Set(interdits.get(licence) ?? []);
    if (exclus.has(teamId)) exclus.delete(teamId);
    else exclus.add(teamId);
    interdits = new Map(interdits).set(licence, exclus);
    if (figes.get(licence) === teamId) figes = new Map([...figes].filter(([l]) => l !== licence));
    ecrireChoix();
    recalculer();
  }

  const equipes = $derived(pool && result ? vueEquilibrage(pool, result, interdits) : []);
  const nomDe = (licence: string) => {
    const p = pool?.players.find((x) => x.licence === licence);
    return p ? nomJoueur(p) : `Licence ${licence}`;
  };

  async function charger(c: Championship) {
    etat = 'calcul';
    pool = null;
    result = null;
    try {
      const query = new URLSearchParams({ season: seasonCode, championship: c });
      const response = await fetch(`${endpoint}?${query}`);
      const payload = (await response.json()) as { data?: { pool: GetRosterBalanceOutput | null }; error?: string };
      if (!response.ok) throw new Error(payload.error || 'Le vivier est illisible.');
      pool = payload.data?.pool ?? null;
      lireChoix(c, new Set(pool?.players.map((p) => p.licence) ?? []), new Set(pool?.teams.map((t) => t.id) ?? []));
      // Laisser l'écran afficher « Calcul… » avant les quelques dizaines de millisecondes de calcul.
      await new Promise((r) => setTimeout(r, 0));
      recalculer();
    } catch (error) {
      uiAlert(error instanceof Error ? error.message : 'Le vivier est illisible.');
    } finally {
      etat = 'repos';
    }
  }

  $effect(() => {
    if (open) void charger(championship);
  });

  async function appliquer() {
    if (!pool || !result) return;
    etat = 'ecriture';
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save-championship-rosters', seasonCode, championship, rosters: repartitionAEcrire(pool, result) })
      });
      const payload = (await response.json()) as { data?: { outOfCategory: string[]; rejected: string[] }; error?: string };
      if (!response.ok) throw new Error(payload.error || "L'enregistrement a échoué.");
      const ecartes = (payload.data?.outOfCategory.length ?? 0) + (payload.data?.rejected.length ?? 0);
      if (ecartes > 0) toast.warning(`${ecartes} joueur(s) écarté(s) : catégorie non admise ou adhésion introuvable.`);
      open = false;
      onSaved();
    } catch (error) {
      uiAlert(error instanceof Error ? error.message : "L'enregistrement a échoué.");
    } finally {
      etat = 'repos';
    }
  }
</script>

<!--
  Deux vrais boutons, annoncés. Le cadenas fige le joueur dans l'équipe de la carte où
  on le voit ; la croix lui interdit cette équipe. Chacun relance le calcul.
-->
{#snippet commandes(licence: string, nom: string, teamId: number)}
  {@const fige = figes.get(licence) === teamId}
  <button
    type="button"
    class="inline-flex size-6 shrink-0 items-center justify-center rounded-md hover:bg-accent {fige ? 'text-foreground' : 'text-muted-foreground/60'}"
    aria-pressed={fige}
    aria-label={fige ? `Libérer ${nom}` : `Figer ${nom} dans cette équipe`}
    title={fige ? 'Figé dans cette équipe : cliquer pour le libérer' : 'Figer dans cette équipe'}
    disabled={etat !== 'repos'}
    onclick={() => figer(licence, teamId)}
  >
    {#if fige}<Lock class="size-3.5" />{:else}<LockOpen class="size-3.5" />{/if}
  </button>
  <button
    type="button"
    class="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground/60 hover:bg-accent hover:text-destructive"
    aria-label={`Interdire cette équipe à ${nom}`}
    title="Interdire cette équipe à ce joueur"
    disabled={etat !== 'repos'}
    onclick={() => interdire(licence, teamId)}
  >
    <X class="size-3.5" />
  </button>
{/snippet}

<ResponsiveSheet bind:open title="Équilibrer les effectifs" icon={Scale} description="Une répartition proposée pour la saison : les plus forts en tête, autant de garçons et de filles dans chaque équipe, le moins de chevauchement possible entre équipes voisines." size="lg">
  <div class="space-y-4">
    <FormField id="equilibrage-championnat" label="Championnat">
      <ChoiceField
        id="equilibrage-championnat"
        label="Championnat"
        value={championship}
        onChange={(v) => { championship = v as Championship; }}
        options={choix.map((c) => ({ value: c, label: CHAMPIONSHIP_RULES[c].label }))}
      />
    </FormField>

    {#if etat === 'calcul'}
      <p class="text-sm text-muted-foreground">Calcul de la répartition…</p>
    {:else if pool && pool.teams.length < 2}
      <p class="text-sm text-muted-foreground">Une seule équipe dans ce championnat : rien à répartir.</p>
    {:else if pool && result}
      <p class="text-xs text-muted-foreground">
        Classements au {pool.referenceEloDate ?? '—'} · {result.moves.length === 0
          ? 'les effectifs actuels sont déjà la meilleure répartition trouvée'
          : `${result.moves.length} joueur(s) changent d'équipe`}{figes.size > 0 ? ` · ${figes.size} figé(s)` : ''}. Le cadenas fige un joueur dans l'équipe de la carte, la croix la lui interdit.
      </p>
      {#if pool.unknown.length > 0}
        <Alert.Root variant="warning">
          <TriangleAlert class="w-4 h-4" />
          <Alert.Description>
            Sans adhésion cette saison, retirés de leur équipe si vous appliquez : licences {pool.unknown.map((u) => u.licence).join(', ')}.
          </Alert.Description>
        </Alert.Root>
      {/if}
      {#if !result.quotasRespected}
        <Alert.Root variant="warning">
          <TriangleAlert class="w-4 h-4" />
          <Alert.Description>
            Les plafonds de division empêchent d'avoir autant de garçons, ou de filles, dans chaque équipe à un près : la répartition proposée s'en approche au mieux.
          </Alert.Description>
        </Alert.Root>
      {/if}
      {#if result.unplaced.length > 0}
        <Alert.Root variant="warning">
          <TriangleAlert class="w-4 h-4" />
          <Alert.Description>
            Admis dans aucune équipe du championnat, laissés où ils sont : {result.unplaced.map(nomDe).join(', ')}.
          </Alert.Description>
        </Alert.Root>
      {/if}

      {#each equipes as e (e.id)}
        <section class="space-y-2 rounded-lg border p-3">
          <div class="flex flex-wrap items-baseline justify-between gap-2">
            <span class="text-sm font-semibold">{e.name} <span class="font-normal text-muted-foreground">· {e.divisionLabel}</span></span>
            <span class="text-xs text-muted-foreground">{e.hommes} H · {e.femmes} F</span>
          </div>
          <div class="flex flex-wrap items-center gap-2 text-xs tabular-nums">
            <span class="text-muted-foreground">{e.avant}</span>
            <ArrowRight class="size-3 text-muted-foreground" />
            <span class="font-medium">{e.apres}</span>
            {#if e.verdictApres}
              <Badge variant={VERDICTS[e.verdictApres].variante} size="xs">{VERDICTS[e.verdictApres].texte}</Badge>
            {/if}
          </div>
          <ul class="space-y-0.5 text-sm">
            {#each e.arrivent as a (a.joueur.licence)}
              <li class="flex items-center gap-1 text-success">
                {@render commandes(a.joueur.licence, nomJoueur(a.joueur), e.id)}
                + {nomJoueur(a.joueur)} <span class="text-xs text-muted-foreground">{classementsTexte(a.joueur)}{a.depuis ? ` · depuis ${a.depuis}` : ''}</span>
              </li>
            {/each}
            {#each e.partent as d (d.joueur.licence)}
              <li class="flex items-center gap-1 text-destructive">
                {@render commandes(d.joueur.licence, nomJoueur(d.joueur), e.id)}
                − {nomJoueur(d.joueur)} <span class="text-xs text-muted-foreground">vers {d.vers}</span>
              </li>
            {/each}
            {#each e.restent as p (p.licence)}
              <li class="flex items-center gap-1 text-muted-foreground">
                {@render commandes(p.licence, nomJoueur(p), e.id)}
                {nomJoueur(p)} <span class="text-xs">{classementsTexte(p)}</span>
              </li>
            {/each}
            {#each e.exclus as x (x.licence)}
              <li class="flex items-center gap-1 text-muted-foreground/50">
                <button
                  type="button"
                  class="inline-flex size-6 shrink-0 items-center justify-center rounded-md hover:bg-accent"
                  aria-label={`Autoriser de nouveau ${nomJoueur(x)} dans cette équipe`}
                  title="Interdit dans cette équipe : cliquer pour l'autoriser de nouveau"
                  disabled={etat !== 'repos'}
                  onclick={() => interdire(x.licence, e.id)}
                >
                  <X class="size-3.5" />
                </button>
                <span class="line-through">{nomJoueur(x)}</span> <span class="text-xs">interdit ici</span>
              </li>
            {/each}
          </ul>
        </section>
      {/each}
    {/if}
  </div>

  {#snippet footer()}
    <div class="flex justify-end gap-2">
      <Button variant="outline" onclick={() => (open = false)}>Fermer</Button>
      {#if canWrite}
        <Button onclick={appliquer} disabled={!result || result.moves.length === 0 || etat !== 'repos'}>
          {etat === 'ecriture' ? 'Enregistrement…' : 'Appliquer la répartition'}
        </Button>
      {/if}
    </div>
  {/snippet}
</ResponsiveSheet>
