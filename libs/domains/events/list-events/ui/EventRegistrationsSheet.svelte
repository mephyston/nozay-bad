<script lang="ts">
  import { Copy, Users } from '@lucide/svelte';
  import {
    Button,
    EmptyState,
    ErrorAlert,
    ListView,
    ListRow,
    ResponsiveSheet
  } from '@nba/ui';

  export type InscritLike = {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    guests: number;
  };

  /**
   * Les inscrits d'un événement.
   *
   * Le panneau contenait une table de trois colonnes — la seule des deux écrans qui
   * n'avait même pas de plan B sur téléphone. Une table dans une feuille censée servir
   * au doigt : elle débordait, et c'est le nom des adhérents qui sortait de l'écran.
   */
  let {
    open = $bindable(false),
    titre = '',
    inscrits = [],
    chargement = false,
    erreur = '',
    onCopier
  }: {
    open?: boolean;
    titre?: string;
    inscrits?: InscritLike[];
    chargement?: boolean;
    erreur?: string;
    onCopier?: () => void;
  } = $props();

  const totaux = $derived({
    membres: inscrits.length,
    personnes: inscrits.reduce((t, r) => t + r.guests, 0) + inscrits.length
  });
</script>

<ResponsiveSheet bind:open title="Inscrits" description={titre} size="lg">
  <div class="space-y-4">
    {#if erreur}
      <ErrorAlert message={erreur} />
    {:else if chargement}
      <p class="text-sm text-muted-foreground">Chargement…</p>
    {:else if inscrits.length === 0}
      <EmptyState
        icon={Users}
        title="Personne pour l'instant"
        description="Les inscriptions prises depuis l'espace adhérent apparaîtront ici."
      />
    {:else}
      <!--
        Les deux totaux en bande, au-dessus de la liste : le nombre de personnes est ce
        qu'on vient chercher — pour le traiteur, pour les tables — et il ne se déduit
        pas du nombre d'inscrits.
      -->
      <div class="flex flex-wrap gap-2">
        <div class="flex-1 min-w-[7rem] rounded-xl border border-border bg-card px-3 py-2">
          <div class="text-xl font-bold text-foreground">{totaux.membres}</div>
          <div class="text-xs text-muted-foreground">inscrit(s)</div>
        </div>
        <div class="flex-1 min-w-[7rem] rounded-xl border border-border bg-card px-3 py-2">
          <div class="text-xl font-bold text-foreground">{totaux.personnes}</div>
          <div class="text-xs text-muted-foreground">personne(s) attendue(s)</div>
        </div>
      </div>

      <ListView items={inscrits}>
        {#snippet listRow(inscrit)}
          <ListRow
            item={inscrit}
            title={`${inscrit.lastName.toUpperCase()} ${inscrit.firstName}`}
            subtitle={inscrit.email}
            value={inscrit.guests > 0 ? `+${inscrit.guests}` : undefined}
            valueCaption={inscrit.guests > 0 ? 'accompagnant(s)' : undefined}
            chevron="none"
          />
        {/snippet}
      </ListView>

      {#if onCopier}
        <Button variant="outline" class="w-full gap-1.5" onclick={onCopier}>
          <Copy class="size-4" />
          Copier la liste
        </Button>
      {/if}
    {/if}
  </div>
</ResponsiveSheet>
