<script lang="ts">
  import { Users, Banknote, CreditCard, ShoppingCart, Activity, AlertCircle, ArrowUpRight, ArrowDownRight, Package, Receipt, FolderKanban, Building, ChevronRight } from '@lucide/svelte';
  import { DashboardSummaryCard, DashboardPoleCard } from '@nba/ui';
  import { hasPermission } from '@nba/iam-ui';
  
  export let data: any;
  export let permissions: string[] = [];
  
  const formatAmount = (cents: number) => {
    return (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
  };
  
  $: canReadMembers = hasPermission(permissions, '*') || hasPermission(permissions, 'members:*') || hasPermission(permissions, 'members:read') || hasPermission(permissions, 'members:update');
  $: canReadAccounting = hasPermission(permissions, '*') || hasPermission(permissions, 'accounting:*') || hasPermission(permissions, 'accounting:read') || hasPermission(permissions, 'accounting:update');
  $: canReadExpenses = hasPermission(permissions, '*') || hasPermission(permissions, 'expenses:*') || hasPermission(permissions, 'expenses:read') || hasPermission(permissions, 'expenses:update');
  $: canReadShop = hasPermission(permissions, '*') || hasPermission(permissions, 'shop:*') || hasPermission(permissions, 'orders:*') || hasPermission(permissions, 'shop:read') || hasPermission(permissions, 'shop:update');
</script>

<div class="space-y-8 pb-10">
  <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
    <!-- Adhérents -->
    <DashboardSummaryCard 
      title="Adhérents (Saison {data.season})"
      icon={Users}
      href={canReadMembers ? '/admin/members' : undefined}
      iconClass="text-info bg-info/10"
      bgIconClass="text-foreground"
      containerClass="border-border/50 hover:border-primary/30 from-card/80 to-card"
    >
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
    </DashboardSummaryCard>

    <!-- 4ème Carte : Cotisations Impayées -->
    <DashboardSummaryCard 
      title="Cotisations Incomplètes"
      icon={Users}
      href={canReadMembers ? '/admin/members' : undefined}
      iconClass="text-destructive bg-destructive/10"
      bgIconClass="text-destructive"
      containerClass="border-destructive/20 hover:border-destructive/40 from-destructive/5 to-card"
    >
      <div class="text-3xl font-bold tracking-tight text-destructive">{data.members.unpaidCount}</div>
      <p class="text-xs text-muted-foreground mt-1">
        Adhérent(s) n'ayant pas réglé la totalité
      </p>
    </DashboardSummaryCard>

    <!-- Banque & Compta -->
    <DashboardSummaryCard 
      title="Trésorerie & Banque"
      icon={Banknote}
      href={canReadAccounting ? '/admin/accounting/ledger' : undefined}
      iconClass="text-success bg-success/10"
      bgIconClass="text-foreground"
      containerClass="border-border/50 hover:border-primary/30 from-card/80 to-card"
    >
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
    </DashboardSummaryCard>

    <!-- Tâches Administratives -->
    <DashboardSummaryCard 
      title="Tâches Administratives"
      icon={Receipt}
      iconClass="text-info bg-info/10"
      bgIconClass="text-foreground"
      containerClass="border-border/50 hover:border-primary/30 from-card/80 to-card"
    >
      <div class="space-y-3 mt-1">
        {#if canReadExpenses}
          <a href="/admin/expenses" class="flex justify-between items-center hover:bg-muted/50 p-1 -mx-1 rounded transition-colors">
            <span class="text-sm text-muted-foreground flex items-center gap-1">Notes de frais en attente <ChevronRight size={14} class="opacity-50"/></span>
            <span class="font-bold text-lg {data.expenses.pendingReports > 0 ? 'text-warning' : 'text-success'}">{data.expenses.pendingReports}</span>
          </a>
        {:else}
          <div class="flex justify-between items-center p-1 -mx-1">
            <span class="text-sm text-muted-foreground">Notes de frais en attente</span>
            <span class="font-bold text-lg {data.expenses.pendingReports > 0 ? 'text-warning' : 'text-success'}">{data.expenses.pendingReports}</span>
          </div>
        {/if}

        {#if canReadAccounting}
          <a href="/admin/accounting/invoices" class="flex justify-between items-center hover:bg-muted/50 p-1 -mx-1 rounded transition-colors">
            <span class="text-sm text-muted-foreground flex items-center gap-1">Factures à traiter <ChevronRight size={14} class="opacity-50"/></span>
            <span class="font-bold text-lg {data.accounting.pendingInvoices > 0 ? 'text-warning' : 'text-success'}">{data.accounting.pendingInvoices}</span>
          </a>
        {:else}
          <div class="flex justify-between items-center p-1 -mx-1">
            <span class="text-sm text-muted-foreground">Factures à traiter</span>
            <span class="font-bold text-lg {data.accounting.pendingInvoices > 0 ? 'text-warning' : 'text-success'}">{data.accounting.pendingInvoices}</span>
          </div>
        {/if}

        {#if canReadShop}
          <a href="/admin/shop/orders" class="flex justify-between items-center hover:bg-muted/50 p-1 -mx-1 rounded transition-colors">
            <span class="text-sm text-muted-foreground flex items-center gap-1">Commandes boutique <ChevronRight size={14} class="opacity-50"/></span>
            <span class="font-bold text-lg {data.shop.pendingOrders > 0 ? 'text-warning' : 'text-success'}">{data.shop.pendingOrders}</span>
          </a>
        {:else}
          <div class="flex justify-between items-center p-1 -mx-1">
            <span class="text-sm text-muted-foreground">Commandes boutique</span>
            <span class="font-bold text-lg {data.shop.pendingOrders > 0 ? 'text-warning' : 'text-success'}">{data.shop.pendingOrders}</span>
          </div>
        {/if}
      </div>
    </DashboardSummaryCard>
  </div>

  <div class="mt-10">
    <h2 class="text-xl font-bold tracking-tight mb-4 flex items-center gap-2"><Activity class="text-primary"/> Bilan des Pôles d'Activité</h2>
    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <!-- Pôle Compétition -->
      <DashboardPoleCard 
        title="Pôle Compétition" 
        icon={Activity} 
        href={canReadAccounting ? '/admin/accounting/ledger' : undefined}
        iconClass="text-destructive bg-destructive/10"
      >
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
      </DashboardPoleCard>

      <!-- Pôle Jeunes -->
      <DashboardPoleCard 
        title="Pôle Jeunes" 
        icon={Users} 
        href={canReadAccounting ? '/admin/accounting/ledger' : undefined}
        iconClass="text-warning bg-warning/10"
      >
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
      </DashboardPoleCard>

      <!-- Pôle Matériel -->
      <DashboardPoleCard 
        title="Pôle Matériel" 
        icon={Package} 
        href={canReadAccounting ? '/admin/accounting/ledger' : undefined}
        iconClass="text-indigo-500 bg-indigo-500/10"
      >
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
      </DashboardPoleCard>
      
      <!-- Pôle Fonctionnement -->
      <DashboardPoleCard 
        title="Pôle Fonctionnement" 
        icon={Building} 
        href={canReadAccounting ? '/admin/accounting/ledger' : undefined}
        iconClass="text-info bg-info/10"
      >
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
      </DashboardPoleCard>
    </div>
  </div>
</div>
