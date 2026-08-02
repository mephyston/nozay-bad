<script lang="ts">
  import { Users, Banknote, CreditCard, ShoppingCart, Activity, AlertCircle, ArrowUpRight, ArrowDownRight, Package, Receipt, FolderKanban, Building } from '@lucide/svelte';
  
  export let data: any;
  
  const formatAmount = (cents: number) => {
    return (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
  };
</script>

<div class="space-y-8 pb-10">
  <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
    <!-- Adhérents -->
    <div class="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-b from-card/80 to-card p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/30 group">
      <div class="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity duration-300">
        <Users size={120} />
      </div>
      <div class="flex items-center justify-between space-y-0 pb-4">
        <h3 class="font-semibold text-sm tracking-tight">Adhérents (Saison {data.season})</h3>
        <div class="p-2 bg-info/10 text-info rounded-lg"><Users size={18} /></div>
      </div>
      <div class="text-3xl font-bold tracking-tight">{data.members.currentTotal}</div>
      <p class="text-xs text-muted-foreground mt-1 flex items-center gap-1">
        {#if data.members.previousTotal > 0}
          {@const diff = data.members.currentTotal - data.members.previousTotal}
          {#if diff > 0}
            <span class="text-success flex items-center"><ArrowUpRight size={14}/> +{diff}</span>
          {:else if diff < 0}
            <span class="text-destructive flex items-center"><ArrowDownRight size={14}/> {diff}</span>
          {:else}
            <span class="text-muted-foreground">=</span>
          {/if}
          <span>vs saison n-1 ({data.members.previousTotal})</span>
        {:else}
          <span>Saison n-1 non disponible</span>
        {/if}
      </p>
      {#if data.members.partiallyPaid > 0}
        <div class="mt-4 flex items-center gap-2 text-xs font-medium text-warning bg-warning/10 px-2 py-1.5 rounded-md">
          <AlertCircle size={14} />
          {data.members.partiallyPaid} adhésion(s) partiellement payée(s)
        </div>
      {/if}
    </div>

    <!-- 4ème Carte : Cotisations Impayées -->
    <div class="relative overflow-hidden rounded-2xl border border-destructive/20 bg-gradient-to-b from-destructive/5 to-card p-6 shadow-sm transition-all hover:shadow-md hover:border-destructive/40 group">
      <div class="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity duration-300 text-destructive">
        <AlertCircle size={120} />
      </div>
      <div class="flex items-center justify-between space-y-0 pb-4">
        <h3 class="font-semibold text-sm tracking-tight">Cotisations Incomplètes</h3>
        <div class="p-2 bg-destructive/10 text-destructive rounded-lg"><Users size={18} /></div>
      </div>
      <div class="text-3xl font-bold tracking-tight text-destructive">{data.members.unpaidCount}</div>
      <p class="text-xs text-muted-foreground mt-1">
        Adhérent(s) n'ayant pas réglé la totalité
      </p>
    </div>

    <!-- Banque & Compta -->
    <div class="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-b from-card/80 to-card p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/30 group">
      <div class="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity duration-300">
        <Banknote size={120} />
      </div>
      <div class="flex items-center justify-between space-y-0 pb-4">
        <h3 class="font-semibold text-sm tracking-tight">Trésorerie & Banque</h3>
        <div class="p-2 bg-success/10 text-success rounded-lg"><Banknote size={18} /></div>
      </div>
      <div class="space-y-3 mt-1">
        <div class="flex justify-between items-center group/item cursor-default">
          <span class="text-sm text-muted-foreground flex items-center gap-2"><CreditCard size={14} class="text-success/70"/> Chèques à remettre</span>
          <span class="font-bold text-lg {data.accounting.pendingChecks > 0 ? 'text-warning' : 'text-success'}">{data.accounting.pendingChecks}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-sm text-muted-foreground flex items-center gap-2"><FolderKanban size={14} class="text-success/70"/> Remises à déposer</span>
          <span class="font-bold text-lg {data.accounting.pendingDeposits > 0 ? 'text-warning' : 'text-success'}">{data.accounting.pendingDeposits}</span>
        </div>
      </div>
    </div>

    <!-- Tâches Administratives -->
    <div class="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-b from-card/80 to-card p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/30 group">
      <div class="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity duration-300">
        <Receipt size={120} />
      </div>
      <div class="flex items-center justify-between space-y-0 pb-4">
        <h3 class="font-semibold text-sm tracking-tight">Tâches Administratives</h3>
        <div class="p-2 bg-info/10 text-info rounded-lg"><Activity size={18} /></div>
      </div>
      <div class="space-y-3 mt-1">
        <div class="flex justify-between items-center">
          <span class="text-sm text-muted-foreground">Notes de frais en attente</span>
          <span class="font-bold text-lg {data.expenses.pendingReports > 0 ? 'text-warning' : 'text-success'}">{data.expenses.pendingReports}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-sm text-muted-foreground">Factures à traiter</span>
          <span class="font-bold text-lg {data.accounting.pendingInvoices > 0 ? 'text-warning' : 'text-success'}">{data.accounting.pendingInvoices}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-sm text-muted-foreground">Commandes boutique</span>
          <span class="font-bold text-lg {data.shop.pendingOrders > 0 ? 'text-warning' : 'text-success'}">{data.shop.pendingOrders}</span>
        </div>
      </div>
    </div>
  </div>

  <div class="mt-10">
    <h2 class="text-xl font-bold tracking-tight mb-4 flex items-center gap-2"><Activity class="text-primary"/> Bilan des Pôles d'Activité</h2>
    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <!-- Pôle Compétition -->
      <div class="rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md">
        <div class="flex items-center gap-3 mb-4">
          <div class="p-2.5 bg-destructive/10 text-destructive rounded-xl"><Activity size={20} /></div>
          <h3 class="font-semibold">Pôle Compétition</h3>
        </div>
        <div class="space-y-4">
          <div class="flex justify-between text-sm">
            <span class="text-muted-foreground">Recettes (inscriptions, buvette)</span>
            <span class="font-medium text-success">+{formatAmount(data.poles.events.recettes)}</span>
          </div>
          <div class="flex justify-between text-sm border-b border-border/50 pb-3">
            <span class="text-muted-foreground">Dépenses (lots, frais)</span>
            <span class="font-medium text-destructive">-{formatAmount(data.poles.events.depenses)}</span>
          </div>
          <div class="flex justify-between items-center pt-1 mb-2">
            <span class="font-semibold text-sm">Solde du Pôle</span>
            <span class="font-bold text-lg {data.poles.events.solde >= 0 ? 'text-success' : 'text-destructive'}">
              {data.poles.events.solde >= 0 ? '+' : ''}{formatAmount(data.poles.events.solde)}
            </span>
          </div>
          
          {#if data.poles.events.details && data.poles.events.details.length > 0}
            <div class="mt-4 pt-4 border-t border-border/30">
              <h4 class="text-xs font-semibold uppercase text-muted-foreground mb-3">Détail par catégorie</h4>
              <div class="space-y-3">
                {#each data.poles.events.details as detail}
                  <div class="text-xs">
                    <div class="flex justify-between font-medium mb-1">
                      <span class="truncate pr-2">{detail.label}</span>
                      <span class="{detail.solde >= 0 ? 'text-success' : 'text-destructive'} whitespace-nowrap">
                        {detail.solde >= 0 ? '+' : ''}{formatAmount(detail.solde)}
                      </span>
                    </div>
                    <div class="flex gap-3 text-muted-foreground/70">
                      <span>R: +{formatAmount(detail.recettes)}</span>
                      <span>D: -{formatAmount(detail.depenses)}</span>
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      </div>

      <!-- Pôle Jeunes -->
      <div class="rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md">
        <div class="flex items-center gap-3 mb-4">
          <div class="p-2.5 bg-warning/10 text-warning rounded-xl"><Users size={20} /></div>
          <h3 class="font-semibold">Pôle Jeunes</h3>
        </div>
        <div class="space-y-4">
          <div class="flex justify-between text-sm">
            <span class="text-muted-foreground">Recettes générées</span>
            <span class="font-medium text-success">+{formatAmount(data.poles.youth.recettes)}</span>
          </div>
          <div class="flex justify-between text-sm border-b border-border/50 pb-3">
            <span class="text-muted-foreground">Coûts d'encadrement/actions</span>
            <span class="font-medium text-destructive">-{formatAmount(data.poles.youth.depenses)}</span>
          </div>
          <div class="flex justify-between items-center pt-1 mb-2">
            <span class="font-semibold text-sm">Solde du Pôle</span>
            <span class="font-bold text-lg {data.poles.youth.solde >= 0 ? 'text-success' : 'text-destructive'}">
              {data.poles.youth.solde >= 0 ? '+' : ''}{formatAmount(data.poles.youth.solde)}
            </span>
          </div>
          
          {#if data.poles.youth.details && data.poles.youth.details.length > 0}
            <div class="mt-4 pt-4 border-t border-border/30">
              <h4 class="text-xs font-semibold uppercase text-muted-foreground mb-3">Détail par catégorie</h4>
              <div class="space-y-3">
                {#each data.poles.youth.details as detail}
                  <div class="text-xs">
                    <div class="flex justify-between font-medium mb-1">
                      <span class="truncate pr-2">{detail.label}</span>
                      <span class="{detail.solde >= 0 ? 'text-success' : 'text-destructive'} whitespace-nowrap">
                        {detail.solde >= 0 ? '+' : ''}{formatAmount(detail.solde)}
                      </span>
                    </div>
                    <div class="flex gap-3 text-muted-foreground/70">
                      <span>R: +{formatAmount(detail.recettes)}</span>
                      <span>D: -{formatAmount(detail.depenses)}</span>
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      </div>

      <!-- Pôle Matériel -->
      <div class="rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md">
        <div class="flex items-center gap-3 mb-4">
          <!-- ds-allow-palette: 4e teinte catégorielle des pôles (aucun token sémantique distinct disponible) -->
          <div class="p-2.5 bg-indigo-500/10 text-indigo-500 rounded-xl"><Package size={20} /></div>
          <h3 class="font-semibold">Pôle Matériel</h3>
        </div>
        <div class="space-y-4">
          <div class="flex justify-between text-sm">
            <span class="text-muted-foreground">Ventes (Boutique, etc.)</span>
            <span class="font-medium text-success">+{formatAmount(data.poles.material.recettes)}</span>
          </div>
          <div class="flex justify-between text-sm border-b border-border/50 pb-3">
            <span class="text-muted-foreground">Achats fournisseurs</span>
            <span class="font-medium text-destructive">-{formatAmount(data.poles.material.depenses)}</span>
          </div>
          <div class="flex justify-between items-center pt-1 mb-2">
            <span class="font-semibold text-sm">Solde du Pôle</span>
            <span class="font-bold text-lg {data.poles.material.solde >= 0 ? 'text-success' : 'text-destructive'}">
              {data.poles.material.solde >= 0 ? '+' : ''}{formatAmount(data.poles.material.solde)}
            </span>
          </div>
          
          {#if data.poles.material.details && data.poles.material.details.length > 0}
            <div class="mt-4 pt-4 border-t border-border/30">
              <h4 class="text-xs font-semibold uppercase text-muted-foreground mb-3">Détail par catégorie</h4>
              <div class="space-y-3">
                {#each data.poles.material.details as detail}
                  <div class="text-xs">
                    <div class="flex justify-between font-medium mb-1">
                      <span class="truncate pr-2">{detail.label}</span>
                      <span class="{detail.solde >= 0 ? 'text-success' : 'text-destructive'} whitespace-nowrap">
                        {detail.solde >= 0 ? '+' : ''}{formatAmount(detail.solde)}
                      </span>
                    </div>
                    <div class="flex gap-3 text-muted-foreground/70">
                      <span>R: +{formatAmount(detail.recettes)}</span>
                      <span>D: -{formatAmount(detail.depenses)}</span>
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      </div>
      
      <!-- Pôle Fonctionnement -->
      <div class="rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md">
        <div class="flex items-center gap-3 mb-4">
          <div class="p-2.5 bg-info/10 text-info rounded-xl"><Building size={20} /></div>
          <h3 class="font-semibold">Pôle Fonctionnement</h3>
        </div>
        <div class="space-y-4">
          <div class="flex justify-between text-sm">
            <span class="text-muted-foreground">Recettes (adhésions, subventions)</span>
            <span class="font-medium text-success">+{formatAmount(data.poles.operations.recettes)}</span>
          </div>
          <div class="flex justify-between text-sm border-b border-border/50 pb-3">
            <span class="text-muted-foreground">Dépenses (salaires, licences)</span>
            <span class="font-medium text-destructive">-{formatAmount(data.poles.operations.depenses)}</span>
          </div>
          <div class="flex justify-between items-center pt-1 mb-2">
            <span class="font-semibold text-sm">Solde du Pôle</span>
            <span class="font-bold text-lg {data.poles.operations.solde >= 0 ? 'text-success' : 'text-destructive'}">
              {data.poles.operations.solde >= 0 ? '+' : ''}{formatAmount(data.poles.operations.solde)}
            </span>
          </div>
          
          {#if data.poles.operations.details && data.poles.operations.details.length > 0}
            <div class="mt-4 pt-4 border-t border-border/30">
              <h4 class="text-xs font-semibold uppercase text-muted-foreground mb-3">Détail par catégorie</h4>
              <div class="space-y-3">
                {#each data.poles.operations.details as detail}
                  <div class="text-xs">
                    <div class="flex justify-between font-medium mb-1">
                      <span class="truncate pr-2">{detail.label}</span>
                      <span class="{detail.solde >= 0 ? 'text-success' : 'text-destructive'} whitespace-nowrap">
                        {detail.solde >= 0 ? '+' : ''}{formatAmount(detail.solde)}
                      </span>
                    </div>
                    <div class="flex gap-3 text-muted-foreground/70">
                      <span>R: +{formatAmount(detail.recettes)}</span>
                      <span>D: -{formatAmount(detail.depenses)}</span>
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
</div>
