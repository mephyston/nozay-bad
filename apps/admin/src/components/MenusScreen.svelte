<script lang="ts">
  import { Skeleton, Button, Card } from '@nba/ui';
  import { MenusManager } from '@nba/cms-ui';

  /**
   * L'écran des menus, monté dans le navigateur.
   *
   * La page ne rend plus le gestionnaire côté serveur — mesuré : 18 ms de plancher avec,
   * contre 8 sans, sur un budget de 10 ms par invocation. Elle envoie l'habillage, et cet
   * îlot va chercher ses données par `/admin/api/cms/menus`.
   *
   * Trois précautions font toute la différence entre « ça charge » et « ça saute » :
   *
   * — Le squelette **réserve la place** du contenu final, barre d'onglets et lignes
   *   comprises. Sans ça, on remplacerait une attente par une secousse au moment où le
   *   contenu arrive, ce qui se ressent bien plus mal.
   * — Il n'apparaît qu'**après 150 ms**. En deçà, les données sont souvent déjà là, et le
   *   squelette ne ferait que clignoter.
   * — Rien n'est mémorisé entre deux visites : **c'est un écran d'édition**. Un cache y
   *   servirait un menu périmé juste après l'avoir modifié. La mémorisation est réservée
   *   aux écrans qu'on consulte, pas à ceux qu'on écrit.
   */
  let etat = $state<'chargement' | 'pret' | 'erreur'>('chargement');
  let squeletteVisible = $state(false);
  let donnees = $state<{
    header: unknown[];
    footer: unknown[];
    legal: unknown[];
    pages: unknown[];
    canWrite: boolean;
  } | null>(null);

  async function charger() {
    etat = 'chargement';
    const delai = setTimeout(() => (squeletteVisible = true), 150);
    try {
      const res = await fetch('/admin/api/cms/menus');
      if (!res.ok) throw new Error(String(res.status));
      donnees = (await res.json()).data;
      etat = 'pret';
    } catch {
      etat = 'erreur';
    } finally {
      clearTimeout(delai);
      squeletteVisible = false;
    }
  }

  $effect(() => {
    charger();
  });
</script>

{#if etat === 'pret' && donnees}
  <MenusManager
    header={donnees.header}
    footer={donnees.footer}
    legal={donnees.legal}
    pages={donnees.pages}
    canWrite={donnees.canWrite}
  />
{:else if etat === 'erreur'}
  <Card.Root>
    <Card.Content class="flex flex-col items-start gap-3 p-6">
      <p class="text-sm text-destructive">Impossible de charger les menus.</p>
      <Button variant="outline" onclick={charger}>Réessayer</Button>
    </Card.Content>
  </Card.Root>
{:else}
  <!--
    Aux dimensions du contenu : la barre d'onglets et son bouton, puis la carte et ses
    lignes. `aria-busy` fait annoncer l'attente au lecteur d'écran, qui lirait sinon une
    page vide sans rien en dire.
  -->
  <div aria-busy="true" aria-live="polite" class:invisible={!squeletteVisible}>
    <span class="sr-only">Chargement des menus…</span>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex gap-1">
        <Skeleton class="h-9 w-24" />
        <Skeleton class="h-9 w-28" />
        <Skeleton class="h-9 w-20" />
      </div>
      <Skeleton class="h-9 w-40" />
    </div>
    <Card.Root class="mt-4">
      <Card.Content class="space-y-3 p-6">
        {#each [70, 55, 80, 45, 65] as largeur}
          <div class="flex items-center gap-3">
            <Skeleton class="h-9 w-9 shrink-0" />
            <Skeleton class="h-4" style={`width: ${largeur}%`} />
          </div>
        {/each}
      </Card.Content>
    </Card.Root>
  </div>
{/if}
