import { toast, uiConfirm, flashAndReload, submitForm, readApiError } from '@nba/ui';
import type { AnalyzeCheckOutput } from '../../record-check-ledger-entry/dto';
import { shrinkPhoto } from './shrink-photo';

/**
 * Destinations des écritures : les relais du domaine, et non la page hôte.
 *
 * Ce module visait `?season=…` — une URL relative, donc « la page qui m'affiche avec
 * cette requête ». Deux pages l'hébergeaient, et rien ne rappelait ce lien : le jour où
 * elles ont cessé de porter un gestionnaire `POST`, elles auraient répondu 200 en rendant
 * leur HTML, et l'écran aurait annoncé des enregistrements qui n'avaient pas eu lieu.
 *
 * La lecture d'une image de chèque est un **dépôt de fichier** : elle a sa propre route,
 * où elle porte enfin une permission — elle s'exécutait jusqu'ici avant toute garde.
 */
const RELAIS = '/admin/api/accounting/cheques';
const DEPOT_ANALYSE = '/admin/api/accounting/upload?doc=check-analyze';

/**
 * Lecture d'une photo de chèque, champ par champ, dans le formulaire.
 *
 * La réponse est typée par le DTO de l'API : ce module lisait `checkNumber` là où l'API
 * a toujours renvoyé `number`, et le numéro n'arrivait jamais à l'écran — sans erreur,
 * puisque `any` acceptait tout. Le montant arrive en centimes, comme le reste du domaine.
 *
 * La photo est réduite avant l'envoi (`shrinkPhoto`) : le modèle n'a pas besoin des
 * douze mégapixels d'un téléphone, et les recevait jusqu'ici tels quels.
 */
export async function handleAnalyzeScan(file: File, seasonId: string, state: any) {
  if (!file) return;

  state.isAnalyzing = true;
  state.formError = '';

  const formData = new FormData();
  formData.append('file', await shrinkPhoto(file));
  formData.append('seasonId', seasonId);

  try {
    const res = await fetch(DEPOT_ANALYSE, {
      method: 'POST',
      body: formData
    });

    const json = (await res.json()) as { success: boolean; data?: AnalyzeCheckOutput; error?: string };

    if (res.ok && json.success && json.data) {
      const lu = json.data;
      state.checkNumber = lu.number || '';
      state.checkAmount = lu.amount ? (lu.amount / 100).toString() : '';
      state.checkEmitter = lu.emitter || '';
      state.checkBank = lu.bank || '';
      state.checkMemberId = lu.memberId ? lu.memberId.toString() : '';
      state.matchedMemberName = lu.memberName || '';
      if (lu.date) {
        state.checkDate = lu.date;
      }
      const manquants = [
        !lu.number && 'le numéro',
        !lu.amount && 'le montant',
        !lu.emitter && "l'émetteur",
        !lu.date && 'la date'
      ].filter(Boolean);
      // Dire ce qui n'a pas été lu vaut mieux qu'un « analysé ! » qui laisse croire que
      // tout l'est : le trésorier relit alors les bons champs.
      if (manquants.length === 0) toast.success('Chèque lu : relisez les champs avant d\'enregistrer.');
      else toast.success(`Chèque lu, sauf ${manquants.join(', ')} : à compléter à la main.`);
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

/**
 * Enregistrement d'un chèque, nouveau ou corrigé : le formulaire est le même, seule
 * l'action relayée change (`editingCheckId` porté par l'état). En modification,
 * `memberId: null` détache l'adhérent ; en création on l'omet, le validateur de l'API
 * n'accepte pas `null` sur ce chemin.
 */
export async function handleSaveCheck(e: SubmitEvent, seasonId: string, state: any) {
  e.preventDefault();
  state.isSubmittingCheck = true;
  state.formError = '';

  const editing = state.editingCheckId !== null && state.editingCheckId !== undefined;
  const memberId = state.checkMemberId ? parseInt(state.checkMemberId) : undefined;

  await submitForm({
    validate: () =>
      !state.checkNumber || !state.checkAmount || !state.checkEmitter
        ? 'Veuillez renseigner le numéro, le montant et l\'émetteur.'
        : null,
    submit: async () => {
      const res = await fetch(RELAIS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Les intitulés d'action et les noms de champs doivent correspondre exactement au
        // contrat de l'API (number / emitter) : un intitulé d'action inconnu passait
        // à travers toutes les branches de la page et renvoyait un faux succès.
        body: JSON.stringify({
          action: editing ? 'update-check' : 'create-check',
          id: editing ? state.editingCheckId : undefined,
          seasonId,
          number: state.checkNumber,
          amount: Math.round(parseFloat(state.checkAmount) * 100),
          emitter: state.checkEmitter,
          bank: state.checkBank,
          date: state.checkDate,
          category: state.checkCategory,
          // Indicatif : `null` efface l'indication en modification, l'absence n'en pose pas en création.
          plannedDepositMonth: state.checkPlannedDepositMonth ? parseInt(state.checkPlannedDepositMonth) : (editing ? null : undefined),
          memberId: memberId ?? (editing ? null : undefined)
        })
      });
      if (!res.ok) throw new Error(await readApiError(res, editing ? 'Erreur lors de la modification du chèque.' : 'Erreur lors de la création du chèque.'));
    },
    success: editing ? 'Chèque modifié.' : 'Chèque enregistré.',
    close: () => { state.showAddCheckModal = false; },
    onError: (message) => { state.formError = message; toast.error(message); }
  });

  state.isSubmittingCheck = false;
}

export async function handleDeleteCheck(id: number, seasonId: string) {
  if (!(await uiConfirm('Êtes-vous sûr de vouloir supprimer ce chèque ?'))) return;

  try {
    const res = await fetch(RELAIS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete-check', id })
    });

    if (res.ok) {
      flashAndReload('Chèque supprimé.');
    } else {
      toast.error(await readApiError(res, 'Erreur lors de la suppression du chèque.'));
    }
  } catch (err) {
    console.error(err);
    toast.error('Erreur lors de la suppression.');
  }
}

/**
 * Génération d'un bordereau de remise.
 *
 * L'événement est le premier paramètre, comme pour les autres gestionnaires de ce module.
 * Il manquait : l'appelant passait bien `(e, seasonId, state)`, si bien que `state`
 * recevait la chaîne de la saison, et `Object.keys(undefined)` levait au clic. Sans
 * `preventDefault`, le navigateur enchaînait sur une soumission native du formulaire vers
 * la page — ce qui masquait l'erreur derrière un rechargement.
 */
export async function handleCreateDeposit(e: SubmitEvent, seasonId: string, state: any) {
  e.preventDefault();
  const checkIds = Object.keys(state.selectedCheckIds).map(Number).filter(id => state.selectedCheckIds[id]);
  if (checkIds.length === 0) return;

  state.isSubmittingDeposit = true;

  await submitForm({
    submit: async () => {
      const res = await fetch(RELAIS, {
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
      if (!res.ok) throw new Error(await readApiError(res, 'Erreur lors de la création du bordereau.'));
    },
    success: 'Bordereau de remise de chèques créé.',
    close: () => { state.showCreateDepositModal = false; state.selectedCheckIds = {}; }
  });

  state.isSubmittingDeposit = false;
}

/** Le bordereau a été remis au guichet : la remise et ses chèques passent « déposés ». */
export async function handleConfirmDeposit(id: number) {
  if (!(await uiConfirm('Confirmer que cette remise a été déposée en banque ? Les chèques qu\'elle contient passeront au statut "Déposés".'))) return;

  try {
    const res = await fetch(RELAIS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'confirm-deposit', id })
    });

    if (res.ok) {
      flashAndReload('Dépôt en banque confirmé.');
    } else {
      toast.error(await readApiError(res, 'Erreur lors de la confirmation du dépôt.'));
    }
  } catch (err) {
    console.error(err);
    toast.error('Erreur lors de la confirmation du dépôt.');
  }
}

export async function handleDeleteDeposit(id: number, seasonId: string) {
  if (!(await uiConfirm('Êtes-vous sûr de vouloir supprimer ce bordereau ? Les chèques associés repasseront au statut "Reçus" et le rapprochement bancaire sera annulé.'))) return;

  try {
    const res = await fetch(RELAIS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete-deposit', id })
    });

    if (res.ok) {
      flashAndReload('Bordereau supprimé.');
    } else {
      toast.error(await readApiError(res, 'Erreur lors de la suppression du bordereau.'));
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
    const res = await fetch(RELAIS, {
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
      flashAndReload('Remise encaissée : la ligne du relevé et les recettes des chèques sont pointées.');
    } else {
      toast.error(await readApiError(res, 'Erreur lors du rapprochement.'));
    }
  } catch (err) {
    console.error(err);
    toast.error('Erreur lors du rapprochement.');
  } finally {
    state.isSubmittingClear = false;
  }
}
