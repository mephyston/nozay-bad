import { toast, uiConfirm, flashAndReload } from '@nba/ui';

/**
 * Extrait le message d'erreur d'une réponse, qu'elle soit JSON ou texte brut : les
 * pages admin relaient tantôt le corps JSON de l'API, tantôt un simple message.
 */
async function readError(res: Response): Promise<string> {
  const raw = await res.text();
  if (!raw) return '';
  try {
    const parsed = JSON.parse(raw);
    return parsed?.error || raw;
  } catch {
    return raw;
  }
}

export async function handleAnalyzeScan(file: File, seasonId: string, state: any) {
  if (!file) return;

  state.isAnalyzing = true;
  state.formError = '';

  const formData = new FormData();
  formData.append('file', file);
  formData.append('seasonId', seasonId);

  try {
    const res = await fetch(`?season=${seasonId}`, {
      method: 'POST',
      headers: {
        'x-action': 'analyze'
      },
      body: formData
    });

    const json = await res.json() as any;

    if (res.ok && json.success) {
      toast.success('Chèque analysé par IA !');
      state.checkNumber = json.data.checkNumber || '';
      state.checkAmount = json.data.amount ? (json.data.amount / 100).toString() : '';
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
    toast.error(state.formError);
  } finally {
    state.isAnalyzing = false;
  }
}

export async function handlePhotoSelected(e: Event, seasonId: string, state: any) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  await handleAnalyzeScan(file, seasonId, state);
}

export async function handleAddCheck(e: SubmitEvent, seasonId: string, state: any) {
  e.preventDefault();
  if (!state.checkNumber || !state.checkAmount || !state.checkEmitter) {
    state.formError = 'Veuillez renseigner le numéro, le montant et l\'émetteur.';
    toast.error(state.formError);
    return;
  }

  state.isSubmittingCheck = true;
  state.formError = '';

  try {
    const res = await fetch(`?season=${seasonId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // `create-check` et les noms de champs doivent correspondre exactement au
      // contrat de l'API (number / emitter) : un intitulé d'action inconnu passait
      // à travers toutes les branches de la page et renvoyait un faux succès.
      body: JSON.stringify({
        action: 'create-check',
        seasonId,
        number: state.checkNumber,
        amount: Math.round(parseFloat(state.checkAmount) * 100),
        emitter: state.checkEmitter,
        bank: state.checkBank,
        date: state.checkDate,
        memberId: state.checkMemberId ? parseInt(state.checkMemberId) : undefined
      })
    });

    if (res.ok) {
      state.showAddCheckModal = false;
      flashAndReload('Chèque enregistré avec succès.');
    } else {
      state.formError = (await readError(res)) || 'Erreur lors de la création du chèque.';
      toast.error(state.formError);
    }
  } catch (err) {
    console.error(err);
    state.formError = 'Une erreur est survenue.';
    toast.error(state.formError);
  } finally {
    state.isSubmittingCheck = false;
  }
}

export async function handleDeleteCheck(id: number, seasonId: string) {
  if (!(await uiConfirm('Êtes-vous sûr de vouloir supprimer ce chèque ?'))) return;

  try {
    const res = await fetch(`?season=${seasonId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete-check', id })
    });

    if (res.ok) {
      flashAndReload('Chèque supprimé.');
    } else {
      toast.error((await readError(res)) || 'Erreur lors de la suppression du chèque.');
    }
  } catch (err) {
    console.error(err);
    toast.error('Erreur lors de la suppression.');
  }
}

export async function handleCreateDeposit(seasonId: string, state: any) {
  const checkIds = Object.keys(state.selectedCheckIds).map(Number).filter(id => state.selectedCheckIds[id]);
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
      flashAndReload('Bordereau de remise de chèques créé.');
    } else {
      toast.error((await readError(res)) || 'Erreur lors de la création du bordereau.');
    }
  } catch (err) {
    console.error(err);
    toast.error('Erreur lors de la création du bordereau.');
  } finally {
    state.isSubmittingDeposit = false;
  }
}

export async function handleDeleteDeposit(id: number, seasonId: string) {
  if (!(await uiConfirm('Êtes-vous sûr de vouloir supprimer ce bordereau ? Les chèques associés repasseront au statut "Reçus" et le rapprochement bancaire sera annulé.'))) return;

  try {
    const res = await fetch(`?season=${seasonId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete-deposit', id })
    });

    if (res.ok) {
      flashAndReload('Bordereau supprimé.');
    } else {
      toast.error((await readError(res)) || 'Erreur lors de la suppression du bordereau.');
    }
  } catch (err) {
    console.error(err);
    toast.error('Erreur lors de la suppression.');
  }
}

export async function handleClearDeposit(e: SubmitEvent, seasonId: string, state: any) {
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
        bankStatementLineId: parseInt(state.selectedBankTransactionId)
      })
    });

    if (res.ok) {
      state.showClearModal = false;
      state.selectedDepositToClear = null;
      state.selectedBankTransactionId = '';
      flashAndReload('Bordereau encaissé.');
    } else {
      toast.error((await readError(res)) || 'Erreur lors du rapprochement.');
    }
  } catch (err) {
    console.error(err);
    toast.error('Erreur lors du rapprochement.');
  } finally {
    state.isSubmittingClear = false;
  }
}
