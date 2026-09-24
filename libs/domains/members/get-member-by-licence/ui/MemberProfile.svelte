<script module>
</script>

<script lang="ts">
  import { ArrowLeft, ChevronLeft, FileText, Receipt } from '@lucide/svelte';
  import { Button, Tabs, Card, openDocument, uiConfirm, uiAlert, dockDePage } from '@nba/ui';
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

  /**
   * D'où l'on vient, et non « la liste » par défaut.
   *
   * On arrive sur une fiche depuis la liste des adhérents, mais aussi depuis les
   * dirigeants — et le retour y ramenait tout le monde à la liste. Le référent dit
   * la provenance ; à défaut (ouverture directe, favori, rechargement), la liste
   * reste le repli, qui est le bon endroit dans le doute.
   */
  const RETOURS: { motif: RegExp; href: string; libelle: string }[] = [
    { motif: /\/admin\/members\/dirigeants/, href: '/admin/members/dirigeants', libelle: 'Retour aux dirigeants' }
  ];

  const retour = $derived.by(() => {
    const parDefaut = {
      href: `/admin/members?season=${seasonId}`,
      libelle: 'Retour à la liste des adhérents'
    };
    if (typeof document === 'undefined') return parDefaut;
    const referent = document.referrer;
    // Un référent d'un autre site ne dit rien de notre navigation.
    if (!referent || !referent.startsWith(window.location.origin)) return parDefaut;
    const connu = RETOURS.find((r) => r.motif.test(referent));
    if (!connu) return parDefaut;
    return { href: `${connu.href}?season=${encodeURIComponent(seasonId)}`, libelle: connu.libelle };
  });

  /*
    L'autorisation de note de frais est tenue **ici**, et non plus dans l'onglet Profil.

    C'est une action de la fiche entière : elle a sa place dans le menu contextuel de la
    barre du bas, qui ne dépend pas de l'onglet ouvert. L'onglet garde la rangée qui
    l'affiche et son bouton de bureau, mais il les reçoit — deux détenteurs du même
    booléen se seraient contredits dès la première bascule depuis la barre.
  */
  let authorized = $state(Boolean(member.expenseAuthorized));
  let toggling = $state(false);

  async function toggleExpense() {
    if (toggling) return;
    const name = `${member.firstName} ${member.lastName}`;
    const ok = await uiConfirm(
      !authorized
        ? `Autoriser ${name} à soumettre des notes de frais ?`
        : `Retirer à ${name} l'autorisation de soumettre des notes de frais ?`
    );
    if (!ok) return;
    toggling = true;
    try {
      const res = await fetch('/admin/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: member.id, authorized: !authorized })
      });
      if (res.ok) {
        authorized = !authorized;
      } else {
        const txt = await res.text().catch(() => '');
        uiAlert(txt || `Échec de la mise à jour (HTTP ${res.status}).`);
      }
    } catch (e: any) {
      uiAlert('Erreur réseau : ' + (e?.message ?? String(e)));
    }
    toggling = false;
  }

  function ouvrirAttestation() {
    openDocument(`/admin/accounting/attestations/${member.id}`);
  }

  /*
    Les deux gestes de la fiche descendent dans la barre du bas. Ils vivaient dans
    l'en-tête de la carte d'identité — le premier écran à défiler hors de vue — et
    l'autorisation était plus bas encore, dans une rangée de l'onglet Profil.

    Un « + » y annoncerait une création : ces deux-là impriment et autorisent.
  */
  $effect(() => {
    const actions = [];
    if (member.paid) {
      actions.push({ id: 'attestation', label: 'Attestation CSE', icon: FileText, run: ouvrirAttestation });
    }
    if (canWrite) {
      actions.push({
        id: 'notes-de-frais',
        label: authorized ? 'Retirer les notes de frais' : 'Autoriser les notes de frais',
        icon: Receipt,
        run: () => void toggleExpense()
      });
    }
    if (actions.length === 0) return;
    return dockDePage.declarerActions(actions, { icon: FileText, label: 'Actions' });
  });

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
    href={retour.href}
    aria-label={retour.libelle}
    class="glass-surface flex size-11 items-center justify-center rounded-full text-foreground no-underline md:hidden"
  >
    <ChevronLeft class="size-6" />
  </a>

  <a
    href={retour.href}
    class="hidden items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground md:inline-flex"
  >
    <ArrowLeft class="w-4 h-4" />
    {retour.libelle}
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
    <!--
      L'état du règlement est parti à l'onglet Cotisation, où il coiffe les montants qui
      l'expliquent : ici il pesait autant que le nom de l'adhérent pour un fait qui se
      lit en un mot, et il disait « réglée » au-dessus de trois chiffres qui le disaient
      déjà mieux.

      Le bouton, lui, reste au bureau : la barre du bas n'existe pas au-dessus de 768 px.
    -->
    {#if member.paid}
      <div class="hidden w-full shrink-0 justify-end md:flex md:w-auto">
        <!-- Nouvel onglet dans un navigateur, même fenêtre en application installée :
             une fenêtre neuve y est sans retour possible (cf. openDocument). -->
        <Button
          href={`/admin/accounting/attestations/${member.id}`}
          size="sm"
          class="no-underline shrink-0"
          onclick={(e: MouseEvent) => {
            e.preventDefault();
            ouvrirAttestation();
          }}
        >
          <FileText class="w-3.5 h-3.5" />
          Attestation CSE
        </Button>
      </div>
    {/if}
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
      <MemberProfileInfoTab {member} season={seasonId} {clubFunctions} {canWrite} {authorized} {toggling} onToggleExpense={toggleExpense} />
    </Tabs.Content>

    <Tabs.Content value="cotisation">
      <MemberProfileCotisationTab {member} />
    </Tabs.Content>

    <Tabs.Content value="transactions">
      <MemberProfileTransactionsTab {transactions} />
    </Tabs.Content>
  </Tabs.Root>
</div>
