<script lang="ts">
  import { Loader2 } from '@lucide/svelte';
  import { Button, Badge, Sheet, Alert } from '@nba/ui';
  import AnalyzeCheck from '../../record-check-transaction/ui/AnalyzeCheck.svelte';
  import CheckManualForm from './CheckManualForm.svelte';
  import type { CheckDepositState } from './check-deposit-state.svelte';

  interface Props {
    depositState: CheckDepositState;
    seasonId: string;
    onAddCheck: (e: SubmitEvent) => Promise<void>;
    onPhotoSelected: (e: Event) => Promise<void>;
  }

  let { depositState, seasonId, onAddCheck, onPhotoSelected }: Props = $props();

  let fileInput = $state<HTMLInputElement | undefined>();
</script>

<Sheet.Root bind:open={depositState.showAddCheckModal}>
  <Sheet.Content class="w-full sm:max-w-md p-0 flex flex-col h-full bg-card border-border overflow-hidden">
    <Sheet.Header class="p-6 border-b border-border">
      <Sheet.Title>Enregistrer un Chèque</Sheet.Title>
      <Sheet.Description class="hidden">Enregistrement d'un chèque physique avec assistance IA optionnelle par photo.</Sheet.Description>
    </Sheet.Header>

    <form onsubmit={onAddCheck} class="flex flex-col flex-grow overflow-hidden">
      <div class="p-6 overflow-y-auto flex-grow space-y-4">
        <!-- Photo/Camera Upload section -->
        <AnalyzeCheck
          isAnalyzing={depositState.isAnalyzing}
          bind:fileInput
          onFileSelected={onPhotoSelected}
        />

        {#if depositState.formError}
          <Alert.Root variant="destructive">
            <Alert.Description>{depositState.formError}</Alert.Description>
          </Alert.Root>
        {/if}

        {#if depositState.matchedMemberName && depositState.checkMemberId}
          <Alert.Root class="bg-primary/10 border-primary/20 text-primary">
            <Alert.Description class="flex justify-between items-center text-xs w-full">
              <span>Adhérent détecté : <strong>{depositState.matchedMemberName}</strong></span>
              <Badge variant="secondary" class="bg-primary/20 hover:bg-primary/20 text-primary border-transparent">Automatiquement sélectionné</Badge>
            </Alert.Description>
          </Alert.Root>
        {/if}

        <div class="relative flex py-2 items-center">
          <div class="flex-grow border-t border-border"></div>
          <span class="flex-shrink mx-4 text-muted-foreground text-xs font-semibold uppercase tracking-wider">Ou Saisir Manuellement</span>
          <div class="flex-grow border-t border-border"></div>
        </div>

        <!-- Manual form fields -->
        <CheckManualForm {depositState} />
      </div>

      <Sheet.Footer class="p-6 border-t border-border bg-muted/30 flex justify-end gap-2 shrink-0">
        <Button
          variant="outline"
          onclick={() => depositState.showAddCheckModal = false}
        >
          Annuler
        </Button>
        <Button
          type="submit"
          disabled={depositState.isSubmittingCheck}
          class="flex items-center gap-2"
        >
          {#if depositState.isSubmittingCheck}
            <Loader2 class="h-4 w-4 animate-spin" />
          {/if}
          Enregistrer
        </Button>
      </Sheet.Footer>
    </form>
  </Sheet.Content>
</Sheet.Root>
