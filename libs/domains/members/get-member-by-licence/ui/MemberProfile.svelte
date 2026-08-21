<script module>
  export * from './member-profile-types';
</script>

<script lang="ts">
  import { ArrowLeft, FileText } from '@lucide/svelte';
  import { Button, Badge, Tabs, Card } from '@nba/ui';
  import type { Member, GLTransaction } from './member-profile-types';
  import type { ClubFunction } from '../../shared/club-functions';
  import MemberPhotoField from '../../upload-member-photo/ui/MemberPhotoField.svelte';
  import MemberProfileInfoTab from './MemberProfileInfoTab.svelte';
  import MemberProfileCotisationTab from './MemberProfileCotisationTab.svelte';
  import MemberProfileTransactionsTab from './MemberProfileTransactionsTab.svelte';

  let {
    member,
    transactions = [],
    seasonId = '25-26',
    clubFunctions = []
  }: {
    member: Member;
    transactions: GLTransaction[];
    seasonId?: string;
    clubFunctions?: ClubFunction[];
  } = $props();

  let activeTab = $state<'profil' | 'cotisation' | 'transactions'>('profil');

  // Pont de l'administration, et non l'adresse du site public : les portraits ne sont
  // servis par aucune route publique, et la CSP de l'admin n'accepte les images que
  // depuis sa propre origine.
  const photoEndpoint = $derived(`/admin/api/member-photo?licence=${encodeURIComponent(member.licence)}`);
  const initials = $derived(
    `${member.firstName?.[0] ?? ''}${member.lastName?.[0] ?? ''}`.toUpperCase() || '??'
  );

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
  <Card.Root class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
  <Card.Content class="p-6 w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
    <div class="min-w-0 w-full sm:w-auto">
      <!--
        Pas de garde de permission ici : comme l'autorisation de notes de frais de
        l'onglet « Profil & Contacts », c'est le pont `/admin/api/**` qui refuse, et
        l'API derrière lui qui fait autorité.
      -->
      <MemberPhotoField
        baseSrc={photoEndpoint}
        endpoint={photoEndpoint}
        version={member.photoUpdatedAt ?? null}
        {initials}
        canEdit
        size={64}
      >
        {#snippet identity()}
          <h2 class="text-xl sm:text-2xl font-bold text-foreground break-words">
            {member.lastName} {member.firstName}
          </h2>
          <p class="text-sm text-muted-foreground mt-1 font-medium">Licence : {member.licence}</p>
        {/snippet}
      </MemberPhotoField>
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
        <Badge variant="success" size="lg" shape="pill" class="shrink-0">
          Cotisation réglée
        </Badge>
      {:else}
        <Badge variant="warning" size="lg" shape="pill" class="shrink-0">
          Règlement en attente
        </Badge>
      {/if}
    </div>
  </Card.Content>
  </Card.Root>

  <Tabs.Root value={activeTab} onValueChange={handleTabChange} class="w-full">
    <Tabs.List class="flex w-full justify-start sm:justify-center overflow-x-auto no-scrollbar mb-6">
      <Tabs.Trigger value="profil">Profil & Contacts</Tabs.Trigger>
      <Tabs.Trigger value="cotisation">Cotisation Poona</Tabs.Trigger>
      <Tabs.Trigger value="transactions">Historique Financier</Tabs.Trigger>
    </Tabs.List>

    <Tabs.Content value="profil">
      <MemberProfileInfoTab {member} season={seasonId} {clubFunctions} />
    </Tabs.Content>

    <Tabs.Content value="cotisation">
      <MemberProfileCotisationTab {member} />
    </Tabs.Content>

    <Tabs.Content value="transactions">
      <MemberProfileTransactionsTab {transactions} />
    </Tabs.Content>
  </Tabs.Root>
</div>
