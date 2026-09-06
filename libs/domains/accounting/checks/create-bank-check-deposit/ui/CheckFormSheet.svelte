<script lang="ts">
  import { Camera, Pencil } from '@lucide/svelte';
  import { Badge, Alert, FormSheet } from '@nba/ui';
  import AnalyzeCheck from '../../record-check-ledger-entry/ui/AnalyzeCheck.svelte';
  import CheckManualForm from './CheckManualForm.svelte';
  import type { CheckDepositState } from './check-deposit-state.svelte';

  interface Props {
    depositState: CheckDepositState;
    onSaveCheck: (e: SubmitEvent) => Promise<void>;
    onPhotoSelected: (e: Event) => Promise<void>;
  }

  let { depositState, onSaveCheck, onPhotoSelected }: Props = $props();

  let fileInput = $state<HTMLInputElement | undefined>();

  /** Le même formulaire sert à créer et à corriger ; seule la lecture par photo est réservée à la création. */
  const editing = $derived(depositState.editingCheckId !== null);

  // Un formulaire refermé — annulé ou enregistré — ne garde pas la saisie précédente.
  $effect(() => {
    if (!depositState.showAddCheckModal) depositState.resetCheckForm();
  });
</script>

<FormSheet
  bind:open={depositState.showAddCheckModal}
  title={editing ? 'Modifier le chèque' : 'Enregistrer un chèque'}
  description={editing
    ? 'Les corrections sont reportées sur la recette du grand livre liée à ce chèque.'
    : "Enregistrement d'un chèque physique, avec lecture par photo facultative."}
  icon={editing ? Pencil : Camera}
  error={depositState.formError}
  isSubmitting={depositState.isSubmittingCheck}
  submitLabel={editing ? 'Enregistrer les modifications' : 'Enregistrer'}
  onSubmit={onSaveCheck}
>
  {#if !editing}
    <AnalyzeCheck
      isAnalyzing={depositState.isAnalyzing}
      bind:fileInput
      onFileSelected={onPhotoSelected}
    />

    {#if depositState.matchedMemberName && depositState.checkMemberId}
      <Alert.Root class="bg-primary/10 border-primary/20 text-primary">
        <Alert.Description class="flex justify-between items-center text-xs w-full">
          <span>Adhérent détecté : <strong>{depositState.matchedMemberName}</strong></span>
          <Badge variant="primary-soft">Automatiquement sélectionné</Badge>
        </Alert.Description>
      </Alert.Root>
    {/if}

    <div class="relative flex py-2 items-center">
      <div class="flex-grow border-t border-border"></div>
      <span class="flex-shrink mx-4 text-muted-foreground text-xs font-semibold uppercase tracking-wider">Ou saisir manuellement</span>
      <div class="flex-grow border-t border-border"></div>
    </div>
  {/if}

  <CheckManualForm {depositState} />
</FormSheet>
