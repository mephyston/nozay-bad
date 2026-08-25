import { toast, uiConfirm, flashAndReload } from '@nba/ui';
import { apiBulkReconcile, apiBulkIgnore, apiImportOfx, apiAnalyzeAi, type ImportSummary } from './reconciliation-api';
import type { ReconciliationStateFields } from './reconciliation-types';

export function createBulkActions(s: ReconciliationStateFields) {
  async function handleBulkReconcile() {
    const ids = Object.keys(s.selectedTxIds).map(Number).filter(id => s.selectedTxIds[id]);
    if (ids.length === 0) return;
    s.isSubmitting = true; s.errorMsg = '';
    try {
      const requests = ids.map(id => {
        const bt = s.bankStatementLines.find((t) => t.id === id);
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

  /**
   * Le compte rendu de l'import, en toutes lettres.
   *
   * « Importé avec succès » ne disait rien de ce qui était entré. Un identifiant réutilisé a
   * ainsi fait disparaître une dépense de 120 € sans laisser de trace, et personne ne s'en est
   * aperçu avant qu'un rapprochement ne la réclame, huit mois plus tard.
   */
  function resumeImport(r: ImportSummary): string {
    if (typeof r.read !== 'number') return 'Relevé bancaire importé avec succès !';

    const parts = [`${r.read} opération${r.read > 1 ? 's' : ''} lue${r.read > 1 ? 's' : ''}`];
    parts.push(`${r.inserted ?? 0} importée${(r.inserted ?? 0) > 1 ? 's' : ''}`);
    if (r.skipped) parts.push(`${r.skipped} déjà connue${r.skipped > 1 ? 's' : ''}`);
    if (r.balanceRecorded && r.balanceDate) parts.push(`solde du relevé au ${r.balanceDate.split('-').reverse().join('/')} enregistré`);

    return parts.join(', ') + '.';
  }

  async function handleImport(e: Event) {
    e.preventDefault();
    const fileInput = (e.target as HTMLFormElement).querySelector('input[type="file"]') as HTMLInputElement;
    if (!fileInput.files || fileInput.files.length === 0) return;
    s.isSubmitting = true; s.errorMsg = '';
    try {
      const summary = await apiImportOfx(fileInput.files[0], s.selectedAccount);
      flashAndReload(resumeImport(summary));
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
