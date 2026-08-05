import { toast, uiConfirm, flashAndReload } from '@nba/ui';
import { apiBulkReconcile, apiBulkIgnore, apiImportOfx, apiAnalyzeAi } from './reconciliation-api';

export function createBulkActions(s: any) {
  async function handleBulkReconcile() {
    const ids = Object.keys(s.selectedTxIds).map(Number).filter(id => s.selectedTxIds[id]);
    if (ids.length === 0) return;
    s.isSubmitting = true; s.errorMsg = '';
    try {
      const requests = ids.map(id => {
        const bt = s.bankStatementLines.find((t: any) => t.id === id);
        if (!bt || !bt.aiSuggestions) return null;
        let memberId = null; let cat = '1';
        try { const sug = JSON.parse(bt.aiSuggestions); memberId = sug.memberId ? parseInt(sug.memberId) : null; cat = sug.category || '1'; } catch {}
        return { btId: bt.id, action: 'create', memberId, transaction: { seasonId: s.selectedSeason, type: bt.amount < 0 ? 'depense' : 'recette', accountId: bt.accountId, category: cat, amount: Math.abs(bt.amount), date: bt.date, paymentMethod: 'virement', description: bt.name, reference: bt.fitid } };
      }).filter(Boolean);
      if (requests.length === 0) throw new Error('Aucune suggestion valide.');
      await apiBulkReconcile(requests);
      s.selectedTxIds = {};
      flashAndReload('Rapprochement par lot réussi !');
    } catch (err: any) { toast.error(err.message); s.isSubmitting = false; }
  }

  async function handleBulkIgnore() {
    const ids = Object.keys(s.selectedTxIds).map(Number).filter(id => s.selectedTxIds[id]);
    if (ids.length === 0) return;
    if (!(await uiConfirm(`Ignorer ces ${ids.length} transactions ?`))) return;
    s.isSubmitting = true; s.errorMsg = '';
    try {
      await apiBulkIgnore(ids);
      s.selectedTxIds = {};
      flashAndReload(`${ids.length} transactions ignorées.`, 'info');
    } catch (err: any) { toast.error(err.message); s.isSubmitting = false; }
  }

  async function handleImport(e: Event) {
    e.preventDefault();
    const fileInput = (e.target as HTMLFormElement).querySelector('input[type="file"]') as HTMLInputElement;
    if (!fileInput.files || fileInput.files.length === 0) return;
    s.isSubmitting = true; s.errorMsg = '';
    try {
      await apiImportOfx(fileInput.files[0], s.selectedAccount);
      flashAndReload('Relevé bancaire importé avec succès !');
    } catch (err: any) { s.errorMsg = err.message || 'Erreur.'; toast.error(s.errorMsg); s.isSubmitting = false; }
  }

  async function handleAnalyze() {
    s.isAnalyzing = true; s.errorMsg = '';
    try {
      await apiAnalyzeAi(s.selectedSeason);
      flashAndReload('Analyse IA terminée !');
    } catch (err: any) { toast.error(err.message); s.isAnalyzing = false; }
  }

  async function handleAnalyzeSingle(btId: number) {
    s.isAnalyzingSingle = true; s.errorMsg = '';
    try {
      await apiAnalyzeAi(s.selectedSeason, btId);
      flashAndReload('Analyse IA de l\'opération effectuée !');
    } catch (err: any) { toast.error(err.message); s.isAnalyzingSingle = false; }
  }

  return { handleBulkReconcile, handleBulkIgnore, handleImport, handleAnalyze, handleAnalyzeSingle };
}
