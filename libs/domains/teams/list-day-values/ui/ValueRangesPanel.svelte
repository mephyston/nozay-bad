<script lang="ts">
  import { Badge } from '@nba/ui';
  import { CircleCheck, TriangleAlert, OctagonAlert } from '@lucide/svelte';
  import { valeurFr } from './day-values-row-model';
  import { VERDICTS, axeDesPlages, plageFr, surAxe, type EquipeAvecPlage } from './range-model';

  /**
   * Ce que chaque équipe **peut** valoir ce jour-là, d'après son effectif.
   *
   * La valeur saisie ne dit que la compo du moment. Le coach a besoin de savoir, avant
   * qu'elle existe, jusqu'où chaque équipe peut monter ou descendre, et si deux équipes
   * voisines risquent de se croiser : une barre par équipe, sur un même axe, et la
   * valeur saisie posée dessus.
   */
  let { equipes = [] }: { equipes?: EquipeAvecPlage[] } = $props();

  const axe = $derived(axeDesPlages(equipes));
  const ICONES = { safe: CircleCheck, overlap: TriangleAlert, conflict: OctagonAlert } as const;
</script>

{#if axe}
  <section class="space-y-3 rounded-lg border p-4">
    <div class="space-y-1">
      <h2 class="text-sm font-semibold">Plages de valeur</h2>
      <p class="text-xs text-muted-foreground">
        De la compo la plus faible à la plus forte que l'effectif permet sur cette journée,
        aux règles du championnat. Le point marque la valeur de la compo saisie.
      </p>
    </div>

    <ul class="space-y-3">
      {#each equipes as equipe (equipe.teamId)}
        {@const verdict = equipe.rangeVerdict ? VERDICTS[equipe.rangeVerdict] : null}
        {@const Icone = equipe.rangeVerdict ? ICONES[equipe.rangeVerdict] : null}
        <li class="space-y-1.5">
          <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <span class="text-sm font-medium">{equipe.name}</span>
            <span class="flex items-center gap-2">
              <span class="text-xs tabular-nums text-muted-foreground">
                {equipe.range ? plageFr(equipe.range) : 'Effectif insuffisant'}
                {#if equipe.value !== null}· saisie {valeurFr(equipe.value)}{/if}
              </span>
              {#if verdict && Icone}
                <Badge
                  variant={verdict.variante}
                  size="xs"
                  title={verdict.aide(equipe.upperTeamName ?? "l'équipe du dessus")}
                >
                  <Icone class="size-3" />
                  {verdict.texte}
                </Badge>
              {/if}
            </span>
          </div>
          <!--
            L'axe est commun à toutes les équipes : c'est le chevauchement de deux barres
            voisines qui se lit. Le titre donne les chiffres au survol.
          -->
          <div
            class="relative h-3 rounded-full bg-muted"
            role="img"
            aria-label={equipe.range
              ? `${equipe.name} : de ${valeurFr(equipe.range.min)} à ${valeurFr(equipe.range.max)}`
              : `${equipe.name} : effectif insuffisant pour remplir la rencontre`}
            title={equipe.range ? `${plageFr(equipe.range)}${equipe.value !== null ? ` · saisie ${valeurFr(equipe.value)}` : ''}` : undefined}
          >
            {#if equipe.range}
              <div
                class="absolute inset-y-0 rounded-full bg-primary/40"
                style:left="{surAxe(equipe.range.min, axe)}%"
                style:width="max(0.5rem, {surAxe(equipe.range.max, axe) - surAxe(equipe.range.min, axe)}%)"
              ></div>
            {/if}
            {#if equipe.value !== null}
              <div
                class="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground ring-2 ring-background"
                style:left="{surAxe(equipe.value, axe)}%"
              ></div>
            {/if}
          </div>
        </li>
      {/each}
    </ul>

    <!--
      La graduation de l'axe commun : sans légende, ses deux bornes se lisaient comme
      deux valeurs de plus, sans rapport avec les équipes.
    -->
    <div class="flex items-baseline justify-between gap-2 border-t pt-1.5 text-[11px] text-muted-foreground">
      <span class="tabular-nums">← {valeurFr(axe.min)}</span>
      <span class="text-center">Échelle de valeur d'équipe, commune à toutes les barres</span>
      <span class="tabular-nums">{valeurFr(axe.max)} →</span>
    </div>
  </section>
{/if}
