<script lang="ts">
  import { Alert, Badge, Button, ChoiceField, FormField, ResponsiveSheet, toast, uiAlert } from '@nba/ui';
  import { ArrowRight, Lock, LockOpen, Scale, TriangleAlert } from '@lucide/svelte';
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
  /** Les joueurs que le coach ne veut pas voir bouger : ils restent dans leur équipe. */
  let figes = $state<Set<string>>(new Set());

  /*
    Les joueurs figés sont mémorisés dans ce navigateur, par saison et par championnat :
    une commodité, pas une donnée. Un stockage refusé (navigation privée) n'empêche rien.
  */
  const cleFiges = (c: Championship) => `equilibrage-figes:${seasonCode}:${c}`;
  function lireFiges(c: Championship): Set<string> {
    try {
      return new Set(JSON.parse(localStorage.getItem(cleFiges(c)) ?? '[]') as string[]);
    } catch {
      return new Set();
    }
  }
  function ecrireFiges(c: Championship, valeur: Set<string>) {
    try {
      localStorage.setItem(cleFiges(c), JSON.stringify([...valeur]));
    } catch {
      /* stockage indisponible : le choix vaut pour la session */
    }
  }

  function recalculer() {
    if (pool && pool.teams.length > 1) result = equilibrer(championship, pool.teams, pool.players, figes);
  }

  function basculer(licence: string) {
    const suivant = new Set(figes);
    if (suivant.has(licence)) suivant.delete(licence);
    else suivant.add(licence);
    figes = suivant;
    ecrireFiges(championship, suivant);
    recalculer();
  }

  const equipes = $derived(pool && result ? vueEquilibrage(pool, result) : []);
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
      const inscrits = new Set(pool?.players.map((p) => p.licence) ?? []);
      figes = new Set([...lireFiges(c)].filter((l) => inscrits.has(l)));
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
  Un vrai bouton, annoncé : figer un joueur relance le calcul autour de lui. Un joueur
  qui part, une fois figé, reste dans son équipe actuelle.
-->
{#snippet cadenas(licence: string, nom: string)}
  <button
    type="button"
    class="inline-flex size-6 shrink-0 items-center justify-center rounded-md hover:bg-accent {figes.has(licence) ? 'text-foreground' : 'text-muted-foreground/60'}"
    aria-pressed={figes.has(licence)}
    aria-label={figes.has(licence) ? `Libérer ${nom}` : `Figer ${nom} dans son équipe`}
    title={figes.has(licence) ? 'Figé dans son équipe : cliquer pour le libérer' : "Figer dans son équipe actuelle"}
    disabled={etat !== 'repos'}
    onclick={() => basculer(licence)}
  >
    {#if figes.has(licence)}<Lock class="size-3.5" />{:else}<LockOpen class="size-3.5" />{/if}
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
          : `${result.moves.length} joueur(s) changent d'équipe`}{figes.size > 0 ? ` · ${figes.size} figé(s)` : ''}. Le cadenas fige un joueur dans son équipe actuelle.
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
                {@render cadenas(a.joueur.licence, nomJoueur(a.joueur))}
                + {nomJoueur(a.joueur)} <span class="text-xs text-muted-foreground">{classementsTexte(a.joueur)}{a.depuis ? ` · depuis ${a.depuis}` : ''}</span>
              </li>
            {/each}
            {#each e.partent as d (d.joueur.licence)}
              <li class="flex items-center gap-1 text-destructive">
                {@render cadenas(d.joueur.licence, nomJoueur(d.joueur))}
                − {nomJoueur(d.joueur)} <span class="text-xs text-muted-foreground">vers {d.vers}</span>
              </li>
            {/each}
            {#each e.restent as p (p.licence)}
              <li class="flex items-center gap-1 text-muted-foreground">
                {@render cadenas(p.licence, nomJoueur(p))}
                {nomJoueur(p)} <span class="text-xs">{classementsTexte(p)}</span>
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
