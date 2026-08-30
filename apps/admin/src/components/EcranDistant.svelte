<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Skeleton, Button, Card } from '@nba/ui';

  /**
   * La mécanique de chargement d'un écran monté dans le navigateur.
   *
   * Monté en `client:load` et non `client:only`, pour une raison qui a coûté une panne :
   * le routeur d'Astro **ne sait pas naviguer vers une page dont le contenu est
   * `client:only`**. Le clic dans la barre latérale n'aboutissait pas, l'URL ne bougeait
   * pas, et rien n'était journalisé côté serveur — la page se chargeait pourtant très
   * bien quand on l'ouvrait directement.
   *
   * `client:load` ne coûte presque rien ici : au rendu serveur, les données ne sont pas
   * encore là, donc c'est le **squelette** qui est produit — une vingtaine de balises —
   * et jamais le composant métier. Tout le gain de la coquille est conservé.
   *
   * Six écrans de la rubrique « site web » suivent le même cycle — demander ses données
   * au relais, patienter, afficher, ou proposer de réessayer. Écrite six fois, cette
   * mécanique aurait divergé six fois : c'est le délai avant squelette qui aurait fini
   * par varier d'un écran à l'autre, ou la gestion d'erreur qui aurait manqué à l'un
   * d'eux.
   *
   * Le squelette **réserve la place** du contenu à venir : sans lui, la page sauterait à
   * l'arrivée des données, ce qui se ressent plus mal qu'une attente.
   *
   * Il s'affiche **tout de suite**, et pour une durée minimale. La première version
   * attendait 150 ms avant de le montrer, pour ne pas le faire clignoter sur un
   * chargement rapide — mais les relais répondent en 2 à 4 ms, si bien qu'il ne
   * s'affichait jamais : la protection contre le clignotement revenait à supprimer le
   * retour visuel. La durée minimale règle le même problème dans l'autre sens — une fois
   * apparu, il reste assez longtemps pour être vu.
   *
   * Le prix est assumé : un écran ne peut plus s'afficher plus vite que ce minimum.
   */
  const { domaine = 'cms', ecran, variante = 'liste', parametres, onDonnees, pret }: {
    /**
     * Domaine dont relève l'écran, et donc relais auquel s'adresser.
     *
     * Les relais suivent les domaines, pas les rubriques du menu : « Site web » réunit
     * dans la barre latérale des écrans du CMS, des séances et de l'agenda, qui n'ont ni
     * les mêmes permissions ni le même modèle.
     */
    domaine?: 'cms' | 'schedules' | 'events';
    /** Nom de l'écran auprès du relais `/admin/api/<domaine>/[screen]`. */
    ecran: string;
    /** Forme du squelette, à l'image du contenu attendu. */
    variante?: 'liste' | 'formulaire' | 'grille';
    /**
     * Paramètres à transmettre au relais.
     *
     * Omis, ce sont ceux de l'URL courante — lue **dans le navigateur**, au moment de la
     * requête. C'est ce qui permet à une page figée de porter des filtres : construite une
     * fois, elle n'a pas de chaîne de requête à passer, et seul le client sait laquelle
     * l'utilisateur regarde.
     *
     * Une page rendue par le serveur peut encore les passer explicitement ; c'est
     * équivalent, et ça évite un aller-retour dans le code pour comprendre d'où ils
     * viennent.
     */
    parametres?: Record<string, string | number>;
    /**
     * Appelé à l'arrivée des données, pour ce qui vit hors du gabarit — le titre du
     * document, par exemple, qui dépend ici de ce qu'on édite.
     */
    onDonnees?: (donnees: Record<string, any>) => void;
    /** Rendu une fois les données là. */
    pret: Snippet<[Record<string, any>]>;
  } = $props();

  let etat = $state<'chargement' | 'pret' | 'erreur'>('chargement');
  /*
    Vrai dès le départ : le squelette est rendu **par le serveur**, donc visible avant même
    que l'îlot ne s'hydrate. Initialisé à faux, il y avait un battement pendant lequel la
    page ne montrait rien — précisément ce qu'il est censé éviter.
  */
  let squelette = $state(true);
  let donnees = $state<Record<string, any> | null>(null);

  /** Durée minimale d'affichage du squelette, une fois montré. */
  const MINIMUM_MS = 300;

  async function charger() {
    etat = 'chargement';
    squelette = true;
    const debut = Date.now();

    let suite: 'pret' | 'erreur' = 'pret';
    try {
      const recherche = parametres
        ? `?${new URLSearchParams(Object.entries(parametres).map(([c, v]) => [c, String(v)]))}`
        : window.location.search;
      const res = await fetch(`/admin/api/${domaine}/${ecran}${recherche}`);
      if (!res.ok) throw new Error(String(res.status));
      donnees = (await res.json()).data;
    } catch {
      suite = 'erreur';
    }

    // Le basculement attend la fin du minimum : sans cela le contenu s'afficherait
    // par-dessus un squelette encore visible.
    const reste = MINIMUM_MS - (Date.now() - debut);
    if (reste > 0) await new Promise((r) => setTimeout(r, reste));

    squelette = false;
    etat = suite;
    if (suite === 'pret' && donnees) onDonnees?.(donnees);
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
