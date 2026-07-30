<script lang="ts">
  import * as AlertDialog from './index';
  import { confirmStore } from './confirm';

  let currentReq = $state<{message: string, resolve: (v: boolean) => void} | null>(null);

  confirmStore.subscribe(req => {
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

<AlertDialog.Root open={!!currentReq} onOpenChange={(o) => { if(!o) handleCancel() }}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Confirmation</AlertDialog.Title>
      <AlertDialog.Description>
        {currentReq?.message}
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel onclick={handleCancel}>Annuler</AlertDialog.Cancel>
      <AlertDialog.Action onclick={handleConfirm} class="bg-primary text-primary-foreground hover:bg-primary/90">
        Confirmer
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
