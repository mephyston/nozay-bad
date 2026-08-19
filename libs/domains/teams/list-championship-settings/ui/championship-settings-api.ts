/**
 * Enregistrement d'un réglage de championnat, depuis l'écran des classements.
 *
 * Partagé par les deux panneaux — dates de référence et règlements — qui écrivent dans la
 * même table sans se recouvrir. Le corps ne porte **que les clés à modifier** : le handler
 * fait des mises à jour partielles, si bien que régler le lien n'efface pas la date, et
 * réciproquement.
 */
export async function saveChampionshipSetting(
  seasonCode: string,
  championship: string,
  changes: Record<string, unknown>
): Promise<void> {
  const response = await fetch('', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'save-championship-settings',
      seasonCode,
      championship,
      ...changes
    })
  });

  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(payload.error || "L'enregistrement a échoué.");
}
