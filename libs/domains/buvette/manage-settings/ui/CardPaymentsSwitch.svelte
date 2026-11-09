<script lang="ts">
  import { Button, submitForm } from '@nba/ui';
  import { setCardPayments } from './card-payments-actions';

  /**
   * L'interrupteur d'urgence de la CB. Devant une anomalie (paiements en double, SumUp qui
   * débloque), le bureau coupe tout envoi vers SumUp sans fermer la caisse : les bénévoles
   * continuent en espèces et par carte buvette.
   */
  // `null` : l'état n'a pas pu être lu. On ne le présente jamais comme actif.
  let { enabled = null, canSwitch = false }: { enabled?: boolean | null; canSwitch?: boolean } = $props();

  let confirming = $state(false);
  let busy = $state(false);

  async function apply(next: boolean) {
    busy = true;
    // L'encadré réaffiché montre le nouvel état : pas de message en plus.
    await submitForm({ submit: () => setCardPayments(next) });
    confirming = false;
    busy = false;
  }
</script>

{#if enabled === null}
  <p role="alert" class="bg-destructive/10 text-destructive mb-6 max-w-lg rounded-lg p-4 text-sm">L'état du paiement CB n'a pas pu être lu : rechargez la page.</p>
{:else if enabled}
  <section class="mb-6 flex max-w-lg flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
    <div>
      <h2 class="font-semibold">Paiement CB : actif</h2>
      <p class="text-muted-foreground text-sm">En cas d'anomalie, suspendez-le : la caisse continue en espèces et par carte buvette.</p>
    </div>
    {#if canSwitch && !confirming}
      <Button variant="outline" disabled={busy} onclick={() => (confirming = true)}>Suspendre la CB</Button>
    {/if}
    {#if confirming}
      <div class="w-full space-y-2">
        <p class="text-sm">Plus aucun paiement ni remboursement ne partira vers SumUp, sur toutes les caisses, jusqu'à ce que vous la rétablissiez. Les soldes de carte se rendront en espèces.</p>
        <div class="flex gap-2">
          <Button variant="destructive" disabled={busy} onclick={() => apply(false)}>Confirmer la suspension</Button>
          <Button variant="ghost" disabled={busy} onclick={() => (confirming = false)}>Annuler</Button>
        </div>
      </div>
    {/if}
  </section>
{:else}
  <section role="alert" class="bg-destructive/10 text-destructive mb-6 flex max-w-lg flex-wrap items-center justify-between gap-3 rounded-lg p-4">
    <div>
      <h2 class="font-semibold">Paiement CB suspendu</h2>
      <p class="text-sm">La caisse n'encaisse plus qu'en espèces et par carte buvette, et ne rembourse plus sur la CB. Les paiements déjà lancés restent vérifiés.</p>
    </div>
    {#if canSwitch}
      <Button disabled={busy} onclick={() => apply(true)}>Rétablir la CB</Button>
    {/if}
  </section>
{/if}
