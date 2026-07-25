<script lang="ts">
  import { ArrowLeft, User, FileText } from '@lucide/svelte';
  import { Button, Badge, Tabs } from '@nba/ui';
  import type { Member, GLTransaction } from './member-profile-types';
  import MemberProfileInfoTab from './MemberProfileInfoTab.svelte';
  import MemberProfileCotisationTab from './MemberProfileCotisationTab.svelte';
  import MemberProfileTransactionsTab from './MemberProfileTransactionsTab.svelte';

  export * from './member-profile-types';

  let { member, transactions = [], seasonId = '25-26' }: { member: Member; transactions: GLTransaction[]; seasonId?: string } = $props();

  let activeTab = $state<'profil' | 'cotisation' | 'transactions'>('profil');
</script>

<div class="space-y-6 max-w-3xl mx-auto">
  <a
    href={`/admin/members?season=${seasonId}`}
    class="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
  >
    <ArrowLeft class="w-4 h-4" />
    Retour à la liste des adhérents
  </a>

  <!-- Profile Header Card -->
  <div class="bg-card border border-border rounded-xl p-6 shadow-sm flex items-center justify-between">
    <div class="flex items-center gap-4">
      <div class="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <User class="w-8 h-8" />
      </div>
      <div>
        <h2 class="text-2xl font-bold text-foreground">{member.lastName} {member.firstName}</h2>
        <p class="text-sm text-muted-foreground mt-1 font-medium">Licence : {member.licence}</p>
      </div>
    </div>
    <div class="flex items-center gap-3">
      {#if member.paid}
        <Button
          href={`/admin/accounting/attestations/${member.id}`}
          target="_blank"
          size="sm"
          class="no-underline"
        >
          <FileText class="w-3.5 h-3.5" />
          Attestation CSE
        </Button>
        <Badge variant="outline" class="bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold px-3 py-1.5 h-auto rounded-full">
          Cotisation réglée
        </Badge>
      {:else}
        <Badge variant="outline" class="bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold px-3 py-1.5 h-auto rounded-full">
          Règlement en attente
        </Badge>
      {/if}
    </div>
  </div>

  <div class="grid w-full grid-cols-3 p-1 bg-muted rounded-xl mb-6 border border-border/50 shadow-xs">
    <button
      type="button"
      data-state={activeTab === 'profil' ? 'active' : 'inactive'}
      onclick={() => activeTab = 'profil'}
      class="py-2 px-3 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer border-0 {activeTab === 'profil' ? 'bg-background text-foreground shadow-xs font-bold' : 'text-muted-foreground hover:text-foreground bg-transparent'}"
    >
      Profil & Contacts
    </button>
    <button
      type="button"
      data-state={activeTab === 'cotisation' ? 'active' : 'inactive'}
      onclick={() => activeTab = 'cotisation'}
      class="py-2 px-3 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer border-0 {activeTab === 'cotisation' ? 'bg-background text-foreground shadow-xs font-bold' : 'text-muted-foreground hover:text-foreground bg-transparent'}"
    >
      Cotisation Poona
    </button>
    <button
      type="button"
      data-state={activeTab === 'transactions' ? 'active' : 'inactive'}
      onclick={() => activeTab = 'transactions'}
      class="py-2 px-3 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer border-0 {activeTab === 'transactions' ? 'bg-background text-foreground shadow-xs font-bold' : 'text-muted-foreground hover:text-foreground bg-transparent'}"
    >
      Historique Financier
    </button>
  </div>

  <div class={activeTab === 'profil' ? '' : 'hidden'}>
    <MemberProfileInfoTab {member} />
  </div>

  <div class={activeTab === 'cotisation' ? '' : 'hidden'}>
    <MemberProfileCotisationTab {member} />
  </div>

  <div class={activeTab === 'transactions' ? '' : 'hidden'}>
    <MemberProfileTransactionsTab {transactions} />
  </div>
</div>
