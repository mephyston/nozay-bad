<script module>
  export * from './announcements-manager-types';
  export * from './announcements-manager-actions';
</script>
<script lang="ts">
  import { Plus, Edit } from '@lucide/svelte';
  import { Sheet, submitForm, toast, flashAndReload } from '@nba/ui';
  import type { Announcement } from './announcements-manager-types';
  import {
    submitAnnouncement,
    validateAnnouncement,
    toggleAnnouncementStatus,
    notifyAnnouncement,
    deleteAnnouncement
  } from './announcements-manager-actions';
  import AnnouncementFormCard from './AnnouncementFormCard.svelte';
  import AnnouncementListTable from './AnnouncementListTable.svelte';

  let {
    announcements = [],
    canWrite = false,
    canDelete = false,
    canNotify = false
  }: {
    announcements?: Announcement[];
    canWrite?: boolean;
    canDelete?: boolean;
    canNotify?: boolean;
  } = $props();

  // svelte-ignore state_referenced_locally
  let announcementsList = $state<Announcement[]>(announcements);
  let searchTerm = $state('');
  let isSubmitting = $state(false);
  let errorMsg = $state('');
  let showFormSheet = $state(false);

  let editingId = $state<number | null>(null);
  let title = $state('');
  let bodyHtml = $state('');
  let status = $state<'draft' | 'published'>('draft');
  let notify = $state(false);
  let alreadyNotified = $state(false);

  $effect(() => {
    announcementsList = announcements;
  });

  const filteredAnnouncements = $derived(
    announcementsList.filter((announcement) => {
      const term = searchTerm.trim().toLowerCase();
      if (!term) return true;
      return (
        announcement.title.toLowerCase().includes(term) ||
        announcement.bodyHtml.replace(/<[^>]*>/g, '').toLowerCase().includes(term)
      );
    })
  );

  function resetForm() {
    editingId = null;
    title = '';
    bodyHtml = '';
    status = 'draft';
    notify = false;
    alreadyNotified = false;
    errorMsg = '';
  }

  function openAddForm() {
    resetForm();
    showFormSheet = true;
  }

  function startEdit(announcement: Announcement) {
    editingId = announcement.id;
    title = announcement.title;
    bodyHtml = announcement.bodyHtml;
    status = announcement.status;
    alreadyNotified = Boolean(announcement.notifiedAt);
    notify = false;
    errorMsg = '';
    showFormSheet = true;
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    errorMsg = '';
    isSubmitting = true;

    const values = { editingId, title, bodyHtml, status, notify, alreadyNotified };
    const willNotify = notify && status === 'published' && !alreadyNotified;

    await submitForm({
      validate: () => validateAnnouncement(values),
      submit: () => submitAnnouncement(values),
      success: willNotify
        ? 'Annonce publiée et diffusée aux adhérents.'
        : editingId
          ? 'Annonce mise à jour.'
          : 'Annonce créée.',
      close: () => {
        resetForm();
        showFormSheet = false;
      },
      // Le sheet couvre la page : le refus s'affiche dans le formulaire lui-même.
      onError: (message) => {
        errorMsg = message;
      }
    });

    isSubmitting = false;
  }

  async function handleToggleStatus(announcement: Announcement) {
    try {
      const next = await toggleAnnouncementStatus(announcement);
      if (next === announcement.status) return; // confirmation refusée
      flashAndReload(
        next === 'published' ? 'Annonce publiée.' : "Annonce repassée en brouillon.",
        'success'
      );
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleNotify(announcement: Announcement) {
    try {
      if (!(await notifyAnnouncement(announcement))) return;
      flashAndReload('Annonce diffusée aux adhérents.', 'success');
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleDelete(announcement: Announcement) {
    try {
      if (!(await deleteAnnouncement(announcement))) return;
      flashAndReload('Annonce supprimée.', 'success');
    } catch (err: any) {
      toast.error(err.message);
    }
  }
</script>

<div class="space-y-6">
  <AnnouncementListTable
    {filteredAnnouncements}
    {canWrite}
    {canDelete}
    {canNotify}
    bind:searchTerm
    onOpenAdd={openAddForm}
    onStartEdit={(a) => startEdit(a)}
    onToggleStatus={(a) => { handleToggleStatus(a); }}
    onNotify={(a) => { handleNotify(a); }}
    onDelete={(a) => { handleDelete(a); }}
  />
</div>

<Sheet.Root bind:open={showFormSheet}>
  <Sheet.Content size="md" class="overflow-y-auto">
    <Sheet.Header>
      <Sheet.Title class="flex items-center gap-2">
        {#if editingId}
          <Edit class="w-5 h-5 text-primary" />
          Modifier l'annonce
        {:else}
          <Plus class="w-5 h-5 text-primary" />
          Nouvelle annonce
        {/if}
      </Sheet.Title>
      <Sheet.Description>
        {#if editingId}
          Modifiez le titre, le texte ou le statut de l'annonce.
        {:else}
          Un brouillon reste invisible des adhérents jusqu'à sa publication.
        {/if}
      </Sheet.Description>
    </Sheet.Header>

    <AnnouncementFormCard
      {editingId}
      bind:title
      bind:bodyHtml
      bind:status
      bind:notify
      {alreadyNotified}
      {canNotify}
      {isSubmitting}
      {errorMsg}
      onSubmit={handleSubmit}
    />
  </Sheet.Content>
</Sheet.Root>
