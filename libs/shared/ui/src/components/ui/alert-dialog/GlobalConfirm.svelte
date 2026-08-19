<script lang="ts">
  import * as AlertDialog from './index';
  import { confirmStore, type ConfirmRequest } from './confirm';

  let currentReq = $state<ConfirmRequest | null>(null);

  confirmStore.subscribe((req) => {
    currentReq = req;
  });

  function handleCancel() {
    if (currentReq) {
      currentReq.resolve(false);
      confirmStore.set(null);
    }
  }

  function handleConfirm() {
    if (currentReq) {
      currentReq.resolve(true);
      confirmStore.set(null);
    }
  }
</script>

<AlertDialog.Root open={!!currentReq} onOpenChange={(o) => { if (!o) handleCancel(); }}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>{currentReq?.title}</AlertDialog.Title>
      <AlertDialog.Description>
        {currentReq?.description}
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel onclick={handleCancel}>{currentReq?.cancelLabel}</AlertDialog.Cancel>
      <!--
        Le rouge est réservé aux actions sans retour : l'appliquer partout le rendrait
        muet, et c'est justement là qu'il doit arrêter la main.
      -->
      <AlertDialog.Action
        onclick={handleConfirm}
        class={currentReq?.destructive
          ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
          : 'bg-primary text-primary-foreground hover:bg-primary/90'}
      >
        {currentReq?.confirmLabel}
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
