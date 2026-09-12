import { toast } from '@nba/ui';
import { apiImportOfx, apiAnalyzeAi, type ImportSummary } from './reconciliation-api';
import type { ReconciliationStateFields } from './reconciliation-types';
import type { createPatchActions } from './reconciliation-patch';

/*
 * Ce qui porte sur le relevé entier : l'import, et l'analyse.
 *
 * Le rapprochement et le masquage **par lot** ont disparu avec la sélection multiple. Le premier
 * contredisait de toute façon la règle posée pour cet écran — une ligne, une écriture validée ; le
 * second masquait de l'argent réellement sorti du compte, sans trace du motif.
 *
 * L'import d'un relevé est le seul à recharger l'écran — depuis le dialogue de verdict.
 *
 * Lui seul fait apparaître des lignes qui n'existaient pas : l'écran passe de la zone de dépôt à
 * la file, et rien de ce que le client tient en mémoire ne décrit le nouvel état. Le compte rendu
 * se lit d'abord dans un dialogue (un toast disparaissait avant d'être lu), dont « Continuer »
 * rouvre le rapprochement. Tout le reste — y compris l'analyse IA, qui ne fait que réécrire des
 * suggestions — s'applique sur place.
 */
export function createBulkActions(s: ReconciliationStateFields, patch: ReturnType<typeof createPatchActions>) {
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
      s.showImportModal = false;
      s.importVerdict = { success: true, message: resumeImport(summary) };
    } catch (err: any) {
      s.errorMsg = err.message || 'Erreur.';
      s.importVerdict = { success: false, message: s.errorMsg };
    } finally {
      s.isSubmitting = false;
    }
  }

  async function handleAnalyze() {
    s.isAnalyzing = true; s.errorMsg = '';
    try {
      const { count, lines } = await apiAnalyzeAi(s.selectedSeason);
      patch.applyAnalyzed(lines);
      toast.success(`Analyse IA terminée : ${count} opération${count > 1 ? 's' : ''}.`);
      s.isAnalyzing = false;
    } catch (err: any) { toast.error(err.message); s.isAnalyzing = false; }
  }

  async function handleAnalyzeSingle(btId: number) {
    s.isAnalyzingSingle = true; s.errorMsg = '';
    try {
      const { lines } = await apiAnalyzeAi(s.selectedSeason, btId);
      patch.applyAnalyzed(lines);
      toast.success('Analyse IA de l\'opération effectuée !');
      s.isAnalyzingSingle = false;
    } catch (err: any) { toast.error(err.message); s.isAnalyzingSingle = false; }
  }

  return { handleImport, handleAnalyze, handleAnalyzeSingle };
}
