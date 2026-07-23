import type { CheckDepositState } from './check-deposit-state.svelte';

export async function handlePhotoSelected(e: Event, seasonId: string, state: CheckDepositState) {
  const input = e.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;
  const file = input.files[0];

  state.isAnalyzing = true;
  state.formError = '';

  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch(`?season=${seasonId}`, {
      method: 'POST',
      headers: { 'x-action': 'analyze' },
      body: formData
    });

    if (!res.ok) {
      throw new Error(await res.text() || 'Failed to analyze check');
    }

    const json = await res.json();
    if (json.success && json.data) {
      state.checkNumber = json.data.number || '';
      state.checkAmount = json.data.amount ? json.data.amount.toString() : '';
      state.checkEmitter = json.data.emitter || '';
      state.checkBank = json.data.bank || '';
      state.checkMemberId = json.data.memberId ? json.data.memberId.toString() : '';
      state.matchedMemberName = json.data.memberName || '';
      if (json.data.date) {
        state.checkDate = json.data.date;
      }
    } else {
      throw new Error(json.error || 'Erreur lors de la lecture des données.');
    }
  } catch (err: any) {
    console.error(err);
    state.formError = "L'analyse IA a échoué (" + (err.message || 'erreur de connexion') + "). Vous pouvez saisir les informations manuellement.";
  } finally {
    state.isAnalyzing = false;
  }
}

export async function handleAddCheck(e: SubmitEvent, seasonId: string, state: CheckDepositState) {
  e.preventDefault();
  if (!state.checkNumber || !state.checkAmount || !state.checkEmitter) {
    state.formError = 'Veuillez renseigner le numéro, le montant et l\'émetteur.';
    return;
  }

  state.isSubmittingCheck = true;
  state.formError = '';

  try {
    const res = await fetch(`?season=${seasonId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create-check',
        seasonId,
        number: state.checkNumber,
        amount: Math.round(parseFloat(state.checkAmount) * 100),
        emitter: state.checkEmitter,
        bank: state.checkBank || null,
        memberId: state.checkMemberId ? parseInt(state.checkMemberId) : null,
        category: state.checkCategory,
        date: state.checkDate
      })
    });

    if (!res.ok) {
      throw new Error(await res.text());
    }

    state.showAddCheckModal = false;
    state.checkNumber = '';
    state.checkAmount = '';
    state.checkEmitter = '';
    state.checkBank = '';
    state.checkMemberId = '';
    state.checkDate = new Date().toISOString().split('T')[0];
    state.matchedMemberName = '';
    state.categorySearchQuery = '';
    window.location.reload();
  } catch (err: any) {
    state.formError = err.message || 'Erreur lors de l\'enregistrement du chèque.';
  } finally {
    state.isSubmittingCheck = false;
  }
}

export async function handleDeleteCheck(id: number, seasonId: string) {
  if (!confirm('Êtes-vous sûr de vouloir supprimer ce chèque ? Cette action annulera le règlement associé dans le Grand Livre.')) return;

  try {
    const res = await fetch(`?season=${seasonId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete-check', id })
    });

    if (res.ok) {
      window.location.reload();
    } else {
      alert('Erreur lors de la suppression.');
    }
  } catch (err) {
    console.error(err);
  }
}

export async function handleCreateDeposit(e: SubmitEvent, seasonId: string, state: CheckDepositState) {
  e.preventDefault();
  const checkIds = state.selectedChecksList.map(c => c.id);
  if (checkIds.length === 0) return;

  state.isSubmittingDeposit = true;
  try {
    const res = await fetch(`?season=${seasonId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create-deposit',
        seasonId,
        reference: state.depositReference,
        date: state.depositDate,
        checkIds
      })
    });

    if (res.ok) {
      state.showCreateDepositModal = false;
      state.selectedCheckIds = {};
      window.location.reload();
    } else {
      alert('Erreur lors de la création du bordereau.');
    }
  } catch (err) {
    console.error(err);
  } finally {
    state.isSubmittingDeposit = false;
  }
}

export async function handleDeleteDeposit(id: number, seasonId: string) {
  if (!confirm('Êtes-vous sûr de vouloir supprimer ce bordereau ? Les chèques associés repasseront au statut "Reçus" et le rapprochement bancaire sera annulé.')) return;

  try {
    const res = await fetch(`?season=${seasonId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete-deposit', id })
    });

    if (res.ok) {
      window.location.reload();
    } else {
      alert('Erreur lors de la suppression.');
    }
  } catch (err) {
    console.error(err);
  }
}

export async function handleClearDeposit(e: SubmitEvent, seasonId: string, state: CheckDepositState) {
  e.preventDefault();
  if (!state.selectedDepositToClear || !state.selectedBankTransactionId) return;

  state.isSubmittingClear = true;
  try {
    const res = await fetch(`?season=${seasonId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'clear-deposit',
        id: state.selectedDepositToClear.id,
        bankTransactionId: parseInt(state.selectedBankTransactionId)
      })
    });

    if (res.ok) {
      state.showClearModal = false;
      state.selectedDepositToClear = null;
      state.selectedBankTransactionId = '';
      window.location.reload();
    } else {
      alert('Erreur lors du rapprochement.');
    }
  } catch (err) {
    console.error(err);
  } finally {
    state.isSubmittingClear = false;
  }
}
