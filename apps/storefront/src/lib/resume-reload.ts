// Une page de l'espace adhérent ne doit jamais être réaffichée périmée.
//
// Constaté le 03/10/2026 : dans l'application installée, la boutique s'est rouverte
// sans ses maillots et avec des images cassées, puis tout est revenu seul. La base et
// le code étaient bons ; c'était la page chargée des heures plus tôt, restée en mémoire.
// Une image remplacée dans l'administration supprime l'ancien fichier : la page
// périmée pointe alors dans le vide.
//
// Ici, le rechargement au retour dans l'application — seulement après une longue
// absence : passer d'une application à l'autre ne doit pas recalculer la page.
// L'autre garde-fou, l'en-tête du HTML, est posé par le middleware
// (`applyHtmlCacheControl`, lib/security-headers.ts).

/** Absence au-delà de laquelle une page rouverte est rechargée. */
export const RESUME_RELOAD_AFTER_MS = 30 * 60 * 1000;

/**
 * Faut-il recharger la page au retour au premier plan ?
 *
 * Jamais pendant une saisie : un tiroir ouvert ou un champ actif porte peut-être une
 * commande à moitié remplie, que le rechargement effacerait.
 */
export function shouldReloadOnResume(params: { hiddenAt: number | null; now: number; busy: boolean }): boolean {
  if (params.hiddenAt === null || params.busy) return false;
  return params.now - params.hiddenAt >= RESUME_RELOAD_AFTER_MS;
}

/** Un tiroir, une boîte de dialogue ou un champ en cours d'édition. */
export function isUserBusy(doc: Document): boolean {
  if (doc.querySelector('[role="dialog"], [role="alertdialog"]')) return true;
  const active = doc.activeElement;
  return active instanceof HTMLElement && (active.matches('input, textarea, select') || active.isContentEditable === true);
}

/** Branche le rechargement au retour sur la page courante. */
export function installResumeReload(win: Window = window): void {
  let hiddenAt: number | null = win.document.visibilityState === 'hidden' ? Date.now() : null;
  win.document.addEventListener('visibilitychange', () => {
    if (win.document.visibilityState === 'hidden') {
      hiddenAt = Date.now();
      return;
    }
    if (shouldReloadOnResume({ hiddenAt, now: Date.now(), busy: isUserBusy(win.document) })) {
      win.location.reload();
      return;
    }
    hiddenAt = null;
  });
}
