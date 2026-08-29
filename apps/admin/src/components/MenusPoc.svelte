<script lang="ts">
  import { MenusManager } from '@nba/cms-ui';

  /**
   * Preuve de concept : l'écran des menus, monté entièrement dans le navigateur.
   *
   * Il ne reçoit aucune props — c'est tout l'objet de l'essai. Là où la page rendait le
   * gestionnaire côté serveur puis sérialisait ses données dans le HTML, l'îlot va les
   * chercher lui-même. Le worker n'a plus qu'une coquille à produire.
   *
   * Le prix se voit ici : un écran vide le temps du chargement du script, puis un second
   * temps pour les données. Sur une administration de bureau c'est acceptable ; c'est
   * l'arbitrage que cette page sert à juger.
   */
  let etat: 'chargement' | 'pret' | 'erreur' = $state('chargement');
  let donnees: {
    header: unknown[];
    footer: unknown[];
    legal: unknown[];
    pages: unknown[];
    canWrite: boolean;
  } | null = $state(null);

  $effect(() => {
    fetch('/admin/api/cms/menus')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((json) => {
        donnees = json.data;
        etat = 'pret';
      })
      .catch(() => {
        etat = 'erreur';
      });
  });
</script>

{#if etat === 'chargement'}
  <p class="text-sm text-muted-foreground">Chargement des menus…</p>
{:else if etat === 'erreur'}
  <p class="text-sm text-destructive">Impossible de charger les menus.</p>
{:else if donnees}
  <MenusManager
    header={donnees.header}
    footer={donnees.footer}
    legal={donnees.legal}
    pages={donnees.pages}
    canWrite={donnees.canWrite}
  />
{/if}
