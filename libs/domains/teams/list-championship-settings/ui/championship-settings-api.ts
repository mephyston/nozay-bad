/**
 * Enregistrement d'un réglage de championnat.
 *
 * Partagé par les deux panneaux — dates de référence et règlements — qui écrivent dans la
 * même table sans se recouvrir. Le corps ne porte **que les clés à modifier** : le handler
 * fait des mises à jour partielles, si bien que régler le lien n'efface pas la date, et
 * réciproquement.
 *
 * La destination est un paramètre, et ce n'est pas un détail : les deux panneaux vivent
 * sur deux écrans distincts, dont les relais n'acceptent pas les mêmes clés. Celui des
 * règlements ne peut pas toucher à la date de référence — une garde qui ne tiendrait plus
 * si les deux publiaient au même endroit.
 */
export async function saveChampionshipSetting(
  endpoint: string,
  seasonCode: string,
  championship: string,
  changes: Record<string, unknown>
): Promise<void> {
  const response = await fetch(endpoint, {
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
