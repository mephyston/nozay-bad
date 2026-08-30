<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Skeleton, Button, Card } from '@nba/ui';

  /**
   * La mécanique de chargement d'un écran monté dans le navigateur.
   *
   * Six écrans de la rubrique « site web » suivent le même cycle — demander ses données
   * au relais, patienter, afficher, ou proposer de réessayer. Écrite six fois, cette
   * mécanique aurait divergé six fois : c'est le délai avant squelette qui aurait fini
   * par varier d'un écran à l'autre, ou la gestion d'erreur qui aurait manqué à l'un
   * d'eux.
   *
   * Le squelette **réserve la place** du contenu à venir : sans lui, la page sauterait à
   * l'arrivée des données, ce qui se ressent plus mal qu'une attente. Il n'apparaît
   * qu'après 150 ms, en deçà desquelles les données sont souvent déjà là — il ne ferait
   * que clignoter.
   */
  const { ecran, variante = 'liste', pret }: {
    /** Nom de l'écran auprès du relais `/admin/api/cms/[screen]`. */
    ecran: string;
    /** Forme du squelette, à l'image du contenu attendu. */
    variante?: 'liste' | 'formulaire' | 'grille';
    /** Rendu une fois les données là. */
    pret: Snippet<[Record<string, any>]>;
  } = $props();

  let etat = $state<'chargement' | 'pret' | 'erreur'>('chargement');
  let squelette = $state(false);
  let donnees = $state<Record<string, any> | null>(null);

  async function charger() {
    etat = 'chargement';
    const delai = setTimeout(() => (squelette = true), 150);
    try {
      const res = await fetch(`/admin/api/cms/${ecran}`);
      if (!res.ok) throw new Error(String(res.status));
      donnees = (await res.json()).data;
      etat = 'pret';
    } catch {
      etat = 'erreur';
    } finally {
      clearTimeout(delai);
      squelette = false;
    }
  }

  $effect(() => {
    charger();
  });
</script>

{#if etat === 'pret' && donnees}
  {@render pret(donnees)}
{:else if etat === 'erreur'}
  <Card.Root>
    <Card.Content class="flex flex-col items-start gap-3 p-6">
      <p class="text-sm text-destructive">Impossible de charger cet écran.</p>
      <Button variant="outline" onclick={charger}>Réessayer</Button>
    </Card.Content>
  </Card.Root>
{:else}
  <div aria-busy="true" aria-live="polite" class:invisible={!squelette}>
    <span class="sr-only">Chargement…</span>

    {#if variante === 'formulaire'}
      <Card.Root>
        <Card.Content class="space-y-5 p-6">
          {#each [30, 45, 35, 50] as largeur}
            <div class="space-y-2">
              <Skeleton class="h-3" style={`width: ${largeur}%`} />
              <Skeleton class="h-9 w-full" />
            </div>
          {/each}
          <Skeleton class="h-9 w-36" />
        </Card.Content>
      </Card.Root>
    {:else if variante === 'grille'}
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {#each Array(8) as _}
          <Skeleton class="aspect-square w-full" />
        {/each}
      </div>
    {:else}
      <div class="flex flex-wrap items-center justify-between gap-3">
        <Skeleton class="h-9 w-64" />
        <Skeleton class="h-9 w-40" />
      </div>
      <Card.Root class="mt-4">
        <Card.Content class="space-y-3 p-6">
          {#each [70, 55, 80, 45, 65, 60] as largeur}
            <div class="flex items-center gap-3">
              <Skeleton class="h-9 w-9 shrink-0" />
              <Skeleton class="h-4" style={`width: ${largeur}%`} />
            </div>
          {/each}
        </Card.Content>
      </Card.Root>
    {/if}
  </div>
{/if}
