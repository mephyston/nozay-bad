<script lang="ts">
  import { SwitchField } from '@nba/ui';
  import { onMount } from 'svelte';

  /**
   * Réglages des catégories de notifications.
   *
   * Les cases sont enregistrées à chaque changement plutôt que derrière un bouton
   * « Enregistrer » : c'est un écran de préférences, pas un formulaire, et un
   * réglage qu'on croit posé sans l'avoir validé est le pire des deux mondes.
   */

  interface Preference {
    id: string;
    label: string;
    description: string;
    enabled: boolean;
  }

  let preferences = $state<Preference[]>([]);
  let loading = $state(true);
  let error = $state('');
  let savingId = $state<string | null>(null);

  onMount(async () => {
    try {
      const res = await fetch('/api/push/preferences');
      const json = (await res.json()) as any;
      if (!res.ok || !json.ok) throw new Error(json.error || 'Réglages indisponibles.');
      preferences = json.preferences;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Réglages indisponibles.';
    } finally {
      loading = false;
    }
  });

  async function toggle(id: string) {
    const previous = preferences;
    // Bascule optimiste : l'interrupteur doit réagir au doigt sans attendre le réseau.
    preferences = preferences.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p));
    savingId = id;
    error = '';

    try {
      const res = await fetch('/api/push/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          disabled: preferences.filter((p) => !p.enabled).map((p) => p.id)
        })
      });
      const json = (await res.json()) as any;
      if (!res.ok || !json.ok) throw new Error(json.error || "Le réglage n'a pas pu être enregistré.");
      preferences = json.preferences;
    } catch (e) {
      // Retour à l'état précédent : laisser la case cochée laisserait croire que
      // le réglage est pris en compte alors qu'il ne l'est pas.
      preferences = previous;
      error = e instanceof Error ? e.message : "Le réglage n'a pas pu être enregistré.";
    } finally {
      savingId = null;
    }
  }
</script>

{#if loading}
  <p class="text-sm text-muted-foreground">Chargement des réglages…</p>
{:else if error && preferences.length === 0}
  <p class="text-sm text-destructive">{error}</p>
{:else}
  {#if error}
    <p class="text-sm text-destructive mb-3">{error}</p>
  {/if}

  <!--
    Des interrupteurs, et non des cases à cocher : ce sont des **réglages** — « est-ce
    actif ? » —, et l'interrupteur met leur état au même endroit sur toutes les lignes,
    là où une case le posait après des libellés de longueurs différentes. Le cadre
    commun dit qu'ils vont ensemble ; `sansCadre` retire celui de chaque rangée.
  -->
  <div class="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
    {#each preferences as preference (preference.id)}
      <SwitchField
        sansCadre
        id={`preference-${preference.id}`}
        label={preference.label}
        hint={preference.description}
        checked={preference.enabled}
        disabled={savingId === preference.id}
        onChange={() => toggle(preference.id)}
      />
    {/each}
  </div>

  <p class="text-xs text-muted-foreground mt-3">
    Ces réglages s'appliquent à tous vos appareils. Les notifications restent envoyées à l'adresse du
    compte, pas à un téléphone en particulier.
  </p>
{/if}
