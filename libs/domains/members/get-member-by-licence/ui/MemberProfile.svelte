<script module>
</script>

<script lang="ts">
  import { ArrowLeft, ChevronLeft, FileText } from '@lucide/svelte';
  import { Button, Badge, Tabs, Card, openDocument } from '@nba/ui';
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
    clubFunctions = [],
    canWrite = false
  }: {
    member: Member;
    transactions: GLTransaction[];
    seasonId?: string;
    clubFunctions?: ClubFunction[];
    canWrite?: boolean;
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
  <!--
    Deux formes du même retour. Au doigt, le bouton rond en verre d'iOS, posé où le
    pouce le cherche et assez grand pour être visé ; à la souris, la phrase, qui dit
    où l'on retourne et n'a pas besoin d'être une cible de 44 points.
  -->
  <a
    href={`/admin/members?season=${seasonId}`}
    aria-label="Retour à la liste des adhérents"
    class="glass-surface flex size-11 items-center justify-center rounded-full text-foreground no-underline md:hidden"
  >
    <ChevronLeft class="size-6" />
  </a>

  <a
    href={`/admin/members?season=${seasonId}`}
    class="hidden items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground md:inline-flex"
  >
    <ArrowLeft class="w-4 h-4" />
    Retour à la liste des adhérents
  </a>

  <!-- Profile Header Card -->
  <Card.Root class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
  <Card.Content class="p-6 w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
    <div class="min-w-0 w-full sm:w-auto">
      <!--
        La fiche s'ouvre sur `members:members:read` : un compte qui n'a pas l'écriture
        (entraîneur, trésorerie) ne doit pas se voir proposer un envoi de portrait qui
        finira en 403. Le pont `/admin/api/**` refuse toujours, et l'API derrière lui
        fait toujours autorité — masquer la commande est du confort, pas la garde.
      -->
      <MemberPhotoField
        baseSrc={photoEndpoint}
        endpoint={photoEndpoint}
        version={member.photoUpdatedAt ?? null}
        {initials}
        canEdit={canWrite}
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
        <!-- Nouvel onglet dans un navigateur, même fenêtre en application installée :
             une fenêtre neuve y est sans retour possible (cf. openDocument). -->
        <Button
          href={`/admin/accounting/attestations/${member.id}`}
          size="sm"
          class="no-underline shrink-0"
          onclick={(e: MouseEvent) => {
            e.preventDefault();
            openDocument(`/admin/accounting/attestations/${member.id}`);
          }}
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
    <!--
      Au doigt, le segmented control d'iOS : des segments de largeur égale, celui qui
      est actif surélevé, et des libellés courts pour qu'ils tiennent sur 390 px sans
      défiler. À la souris, la rangée d'onglets d'origine, qui a la place de nommer.
    -->
    <Tabs.List variant="glass" class="mb-6 w-full md:hidden">
      <Tabs.Trigger variant="glass" value="profil">Profil</Tabs.Trigger>
      <Tabs.Trigger variant="glass" value="cotisation">Cotisation</Tabs.Trigger>
      <Tabs.Trigger variant="glass" value="transactions">Finances</Tabs.Trigger>
    </Tabs.List>

    <Tabs.List class="mb-6 hidden w-full justify-start md:flex md:justify-center">
      <Tabs.Trigger value="profil">Profil & Contacts</Tabs.Trigger>
      <Tabs.Trigger value="cotisation">Cotisation Poona</Tabs.Trigger>
      <Tabs.Trigger value="transactions">Historique Financier</Tabs.Trigger>
    </Tabs.List>

    <Tabs.Content value="profil">
      <MemberProfileInfoTab {member} season={seasonId} {clubFunctions} {canWrite} />
    </Tabs.Content>

    <Tabs.Content value="cotisation">
      <MemberProfileCotisationTab {member} />
    </Tabs.Content>

    <Tabs.Content value="transactions">
      <MemberProfileTransactionsTab {transactions} />
    </Tabs.Content>
  </Tabs.Root>
</div>
