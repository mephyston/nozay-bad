<script module>
  export * from './member-profile-types';
</script>

<script lang="ts">
  import { ArrowLeft, User, FileText } from '@lucide/svelte';
  import { Button, Badge, Tabs } from '@nba/ui';
  import type { Member, GLTransaction } from './member-profile-types';
  import MemberProfileInfoTab from './MemberProfileInfoTab.svelte';
  import MemberProfileCotisationTab from './MemberProfileCotisationTab.svelte';
  import MemberProfileTransactionsTab from './MemberProfileTransactionsTab.svelte';

  let { member, transactions = [], seasonId = '25-26' }: { member: Member; transactions: GLTransaction[]; seasonId?: string } = $props();

  let activeTab = $state<'profil' | 'cotisation' | 'transactions'>('profil');

  function handleTabChange(newTab: string) {
    activeTab = newTab as 'profil' | 'cotisation' | 'transactions';
  }
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
  <div class="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
    <div class="flex items-center gap-4 w-full sm:w-auto">
      <div class="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <User class="w-8 h-8" />
      </div>
      <div class="min-w-0 flex-1">
        <h2 class="text-2xl font-bold text-foreground break-words">{member.lastName} {member.firstName}</h2>
        <p class="text-sm text-muted-foreground mt-1 font-medium">Licence : {member.licence}</p>
      </div>
    </div>
    <div class="flex flex-wrap items-center justify-center sm:justify-end gap-3 w-full sm:w-auto">
      {#if member.paid}
        <Button
          href={`/admin/accounting/attestations/${member.id}`}
          target="_blank"
          size="sm"
          class="no-underline shrink-0"
        >
          <FileText class="w-3.5 h-3.5" />
          Attestation CSE
        </Button>
        <Badge variant="outline" class="bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold px-3 py-1.5 h-auto rounded-full shrink-0">
          Cotisation réglée
        </Badge>
      {:else}
        <Badge variant="outline" class="bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold px-3 py-1.5 h-auto rounded-full shrink-0">
          Règlement en attente
        </Badge>
      {/if}
    </div>
  </div>

  <Tabs.Root value={activeTab} onValueChange={handleTabChange} class="w-full">
    <Tabs.List class="flex w-full justify-start sm:justify-center overflow-x-auto no-scrollbar mb-6">
      <Tabs.Trigger value="profil">Profil & Contacts</Tabs.Trigger>
      <Tabs.Trigger value="cotisation">Cotisation Poona</Tabs.Trigger>
      <Tabs.Trigger value="transactions">Historique Financier</Tabs.Trigger>
    </Tabs.List>

    <Tabs.Content value="profil">
      <MemberProfileInfoTab {member} />
    </Tabs.Content>

    <Tabs.Content value="cotisation">
      <MemberProfileCotisationTab {member} />
    </Tabs.Content>

    <Tabs.Content value="transactions">
      <MemberProfileTransactionsTab {transactions} />
    </Tabs.Content>
  </Tabs.Root>
</div>
