<script lang="ts">
  import { Users, Banknote, CreditCard, Activity, ArrowUpRight, ArrowDownRight, Package, Receipt, FolderKanban, Building, ChevronRight, Scale, Landmark, ExternalLink, Repeat, UserPlus, UserMinus } from '@lucide/svelte';
  import { DashboardSummaryCard, DashboardPoleCard, CollapsibleSection, Table } from '@nba/ui';
  import { can } from '@nba/iam-ui';

  let { data, permissions = [] }: { data: any; permissions?: string[] } = $props();

  const formatAmount = (cents: number) => {
    return (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
  };

  const canReadMembers = $derived(can(permissions, 'members:members:read'));
  const canReadAccounting = $derived(can(permissions, 'accounting:ledger:read'));
  const canReadChecks = $derived(can(permissions, 'accounting:checks:read'));
  const canReadBank = $derived(can(permissions, 'accounting:bank:read'));
  const canReadInvoices = $derived(can(permissions, 'accounting:invoices:read'));
  const canReadExpenses = $derived(can(permissions, 'expenses:reports:read'));
  const canReadShop = $derived(can(permissions, 'shop:orders:read'));

  /*
   * Les adhérents se lisent sur la saison affichée, et la liste filtre par statut : le
   * chiffre du tableau de bord doit être celui que la liste montrera au clic.
   */
  const membersHref = $derived((status?: string, cohort?: 'new' | 'renewed' | 'lapsed') => {
    const q = new URLSearchParams({ season: data.season });
    if (status) q.set('status', status);
    if (cohort) q.set('cohort', cohort);
    return `/admin/members?${q}`;
  });

  const diff = $derived(data.members.currentTotal - data.members.previousTotal);

  /*
   * Taux de renouvellement : la part de l'effectif n-1 revenue cette saison. Sans n-1, ou
   * avec un effectif nul, il n'y a rien à mesurer.
   */
  const renewalRate = $derived(
    data.members.previousTotal > 0 && data.members.lapsed !== null
      ? Math.round((data.members.renewed / data.members.previousTotal) * 100)
      : null
  );

  // Classes écrites en toutes lettres : Tailwind ne génère pas une classe composée à l'exécution.
  const TONS = { warning: 'text-warning', destructive: 'text-destructive' } as const;

  /*
   * La pyramide des âges : les catégories fédérales d'après l'année de naissance, F et H
   * séparés, avec un sous-total jeunes / adultes — ce que demandent le comité et la
   * fédération, et ce que le bureau recompte à la main à chaque AG.
   */
  type AgeRow = { code: string; label: string; birthYears: string; youth: boolean; f: number; m: number; total: number };
  const ages = $derived<AgeRow[]>(data.members.ageCategories ?? []);
  const sumOf = (rows: AgeRow[]) => rows.reduce((acc, r) => ({ f: acc.f + r.f, m: acc.m + r.m, total: acc.total + r.total }), { f: 0, m: 0, total: 0 });
  const youth = $derived(sumOf(ages.filter((r) => r.youth)));
  const adults = $derived(sumOf(ages.filter((r) => !r.youth)));
  const everyone = $derived(sumOf(ages));
  const womenShare = $derived(everyone.total > 0 ? Math.round((everyone.f / everyone.total) * 100) : null);
</script>

{#snippet ligne(row: AgeRow)}
  <Table.Row class={row.total === 0 ? 'text-muted-foreground' : ''}>
    <Table.Cell class="py-1.5 pl-4">{row.label}</Table.Cell>
    <Table.Cell class="py-1.5 hidden sm:table-cell text-xs text-muted-foreground">{row.birthYears}</Table.Cell>
    <Table.Cell class="py-1.5 text-right tabular-nums">{row.f}</Table.Cell>
    <Table.Cell class="py-1.5 text-right tabular-nums">{row.m}</Table.Cell>
    <Table.Cell class="py-1.5 text-right tabular-nums font-semibold pr-4">{row.total}</Table.Cell>
  </Table.Row>
{/snippet}

{#snippet sousTotal(label: string, t: { f: number; m: number; total: number })}
  <Table.Row class="bg-muted/30 hover:bg-muted/30 font-semibold">
    <Table.Cell colspan={2} class="py-2 pl-4">{label}</Table.Cell>
    <Table.Cell class="py-2 text-right tabular-nums">{t.f}</Table.Cell>
    <Table.Cell class="py-2 text-right tabular-nums">{t.m}</Table.Cell>
    <Table.Cell class="py-2 text-right tabular-nums pr-4">{t.total}</Table.Cell>
  </Table.Row>
{/snippet}

{#snippet compteur(label: string, count: number, href: string | undefined, tone: 'warning' | 'destructive' = 'warning', Icon: any = undefined)}
  <!--
    Une ligne du tableau de bord est un lien vers l'écran qui traite le sujet. Elle doit se
    lire comme tel : libellé en couleur de texte, chevron visible, soulignement au survol — le
    gris discret d'avant faisait passer ces lignes pour de simples étiquettes.
  -->
  {#if href}
    <a {href} class="flex justify-between items-center gap-2 hover:bg-muted/50 p-1 -mx-1 rounded transition-colors group/item">
      <span class="text-sm flex items-center gap-2 group-hover/item:underline underline-offset-4">
        {#if Icon}<Icon size={14} class="text-muted-foreground" />{/if}
        {label}
        <ChevronRight size={14} class="text-muted-foreground" />
      </span>
      <span class="font-bold text-lg {count > 0 ? TONS[tone] : 'text-success'}">{count}</span>
    </a>
  {:else}
    <div class="flex justify-between items-center gap-2 p-1 -mx-1">
      <span class="text-sm text-muted-foreground flex items-center gap-2">
        {#if Icon}<Icon size={14} />{/if}
        {label}
      </span>
      <span class="font-bold text-lg {count > 0 ? TONS[tone] : 'text-success'}">{count}</span>
    </div>
  {/if}
{/snippet}

{#snippet cohorte(label: string, count: number, href: string | undefined, Icon: any, tone: string)}
  {#if href}
    <a {href} class="flex justify-between items-center gap-2 hover:bg-muted/50 p-1 -mx-1 rounded transition-colors group/item">
      <span class="text-sm flex items-center gap-2 group-hover/item:underline underline-offset-4">
        <Icon size={14} class="text-muted-foreground" />
        {label}
        <ChevronRight size={14} class="text-muted-foreground" />
      </span>
      <span class="font-bold text-lg {tone}">{count}</span>
    </a>
  {:else}
    <div class="flex justify-between items-center gap-2 p-1 -mx-1">
      <span class="text-sm text-muted-foreground flex items-center gap-2"><Icon size={14} /> {label}</span>
      <span class="font-bold text-lg {tone}">{count}</span>
    </div>
  {/if}
{/snippet}

{#snippet ecran(label: string, href: string, Icon: any)}
  <a {href} class="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline underline-offset-4">
    <Icon size={14} /> {label} <ExternalLink size={12} class="opacity-70" />
  </a>
{/snippet}

<div class="space-y-8 pb-10">
  <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
    <!-- Adhérents : effectif, écart avec n-1, et les deux relances à faire -->
    <DashboardSummaryCard
      title="Adhérents (Saison {data.season})"
      icon={Users}
      iconClass="text-info bg-info/10"
      bgIconClass="text-foreground"
      containerClass="border-border/50 hover:border-primary/30 from-card/80 to-card"
    >
      {#if canReadMembers}
        <a href={membersHref()} class="text-2xl font-bold font-outfit hover:underline underline-offset-4">{data.members.currentTotal}</a>
      {:else}
        <div class="text-2xl font-bold font-outfit">{data.members.currentTotal}</div>
      {/if}
      <p class="text-xs text-muted-foreground mt-1 flex items-center gap-1">
        {#if data.members.previousTotal > 0}
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
      <div class="space-y-1 mt-4">
        {@render compteur('Sans règlement', data.members.unpaidCount, canReadMembers ? membersHref('en_attente') : undefined, 'destructive')}
        {@render compteur('Paiement partiel', data.members.partiallyPaid, canReadMembers ? membersHref('incomplet') : undefined, 'warning')}
      </div>
    </DashboardSummaryCard>

    <!-- Renouvellement : ce que l'effectif brut ne dit pas en septembre -->
    <DashboardSummaryCard
      title="Renouvellement"
      icon={Repeat}
      iconClass="text-primary bg-primary/10"
      bgIconClass="text-foreground"
      containerClass="border-border/50 hover:border-primary/30 from-card/80 to-card"
    >
      {#if renewalRate !== null}
        <div class="text-2xl font-bold font-outfit">{renewalRate}<span class="text-base font-semibold text-muted-foreground"> %</span></div>
        <p class="text-xs text-muted-foreground mt-1">de l'effectif n-1 revenu cette saison</p>
      {:else}
        <div class="text-2xl font-bold font-outfit text-muted-foreground">—</div>
        <p class="text-xs text-muted-foreground mt-1">Saison n-1 non disponible</p>
      {/if}
      <!-- Chaque ligne ouvre la liste filtrée sur sa cohorte : le chiffre et la liste se répondent. -->
      <div class="space-y-1 mt-4">
        {@render cohorte('Renouvelés', data.members.renewed, canReadMembers ? membersHref(undefined, 'renewed') : undefined, Repeat, '')}
        {@render cohorte('Nouveaux', data.members.newcomers, canReadMembers ? membersHref(undefined, 'new') : undefined, UserPlus, 'text-success')}
        {#if data.members.lapsed !== null}
          {@render cohorte('Non renouvelés', data.members.lapsed, canReadMembers ? membersHref(undefined, 'lapsed') : undefined, UserMinus, data.members.lapsed > 0 ? 'text-warning' : 'text-success')}
        {/if}
      </div>
    </DashboardSummaryCard>

    <!-- Banque & Compta -->
    <DashboardSummaryCard
      title="Trésorerie & Banque"
      icon={Banknote}
      iconClass="text-success bg-success/10"
      bgIconClass="text-foreground"
      containerClass="border-border/50 hover:border-primary/30 from-card/80 to-card"
    >
      <div class="space-y-1 mt-1">
        {@render compteur('Chèques à remettre', data.accounting.pendingChecks, canReadChecks ? '/admin/accounting/cheques/list' : undefined, 'warning', CreditCard)}
        {@render compteur('Remises à déposer', data.accounting.pendingDeposits, canReadChecks ? '/admin/accounting/cheques/deposits' : undefined, 'warning', FolderKanban)}
      </div>
      {#if canReadChecks || canReadBank}
        <div class="mt-4 pt-3 border-t border-border/40 flex flex-wrap gap-x-4 gap-y-2">
          {#if canReadChecks}{@render ecran('Remises de chèques', '/admin/accounting/cheques', Landmark)}{/if}
          {#if canReadBank}{@render ecran('Rapprochement bancaire', '/admin/accounting/reconciliation', Scale)}{/if}
        </div>
      {/if}
    </DashboardSummaryCard>

    <!-- Tâches Administratives -->
    <DashboardSummaryCard
      title="Tâches Administratives"
      icon={Receipt}
      iconClass="text-info bg-info/10"
      bgIconClass="text-foreground"
      containerClass="border-border/50 hover:border-primary/30 from-card/80 to-card"
    >
      <div class="space-y-1 mt-1">
        {@render compteur('Notes de frais en attente', data.expenses.pendingReports, canReadExpenses ? '/admin/expenses' : undefined)}
        {@render compteur('Factures à traiter', data.accounting.pendingInvoices, canReadInvoices ? '/admin/accounting/invoices' : undefined)}
        {@render compteur('Commandes boutique', data.shop.pendingOrders, canReadShop ? '/admin/shop/orders' : undefined)}
      </div>
    </DashboardSummaryCard>
  </div>

  {#if ages.length > 0 && everyone.total > 0}
    <!-- Repliée : c'est un tableau de référence, pas une tâche du jour. -->
    <div class="mt-10" data-testid="age-pyramid">
      <CollapsibleSection
        title="Effectif par catégorie d'âge"
        badge={everyone.total}
        description={`Catégories FFBaD d'après l'année de naissance, saison ${data.season}, tous statuts${womenShare !== null ? ` · ${womenShare} % de féminines` : ''}`}
      >
        <div class="overflow-x-auto -mx-4 -mb-4">
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.Head class="pl-4">Catégorie</Table.Head>
                <Table.Head class="hidden sm:table-cell">Nés en</Table.Head>
                <Table.Head class="text-right">F</Table.Head>
                <Table.Head class="text-right">H</Table.Head>
                <Table.Head class="text-right pr-4">Total</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {#each ages.filter((r) => r.youth) as row (row.code)}
                {@render ligne(row)}
              {/each}
              {@render sousTotal('Jeunes', youth)}
              {#each ages.filter((r) => !r.youth) as row (row.code)}
                {@render ligne(row)}
              {/each}
              {@render sousTotal('Adultes', adults)}
              {@render sousTotal('Total', everyone)}
            </Table.Body>
          </Table.Root>
        </div>
      </CollapsibleSection>
    </div>
  {/if}

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
        iconClass="text-primary bg-primary/10"
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
