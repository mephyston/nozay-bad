import { uiConfirm } from '../../components/ui/alert-dialog/confirm.js';
import type { SwipeAction } from '../../components/patterns/list/list-types.js';

/**
 * Exécute une action de ligne, sa confirmation comprise.
 *
 * Partagée par les trois voies d'accès — balayage, menu de la liste, menu de la
 * table — pour qu'une action déclarée une fois se comporte pareil partout, y
 * compris sa question de confirmation.
 */
export async function runAction<T>(action: SwipeAction<T>, item: T): Promise<void> {
  if (action.confirm) {
    const ok = await uiConfirm({
      description: action.confirm,
      confirmLabel: action.label,
      destructive: action.tone === 'destructive',
    });
    if (!ok) return;
  }
  await action.run(item);
}
