export async function getErrorMessage(res: Response, defaultMsg: string): Promise<string> {
  try {
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      return json.error || json.message || defaultMsg;
    } catch {
      return text || defaultMsg;
    }
  } catch {
    return defaultMsg;
  }
}

export async function approveOrder(orderId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve', id: orderId })
    });

    if (!res.ok) {
      const errText = await getErrorMessage(res, 'Erreur lors de la validation');
      return { success: false, error: errText };
    }

    setTimeout(() => {
      window.location.reload();
    }, 1000);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Une erreur est survenue' };
  }
}

export async function rejectOrder(orderId: number): Promise<{ success: boolean; error?: string }> {
  if (!confirm('Êtes-vous sûr de vouloir refuser cette commande ?')) {
    return { success: false };
  }

  try {
    const res = await fetch('', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject', id: orderId })
    });

    if (!res.ok) {
      const errText = await getErrorMessage(res, 'Erreur lors du rejet');
      return { success: false, error: errText };
    }

    setTimeout(() => {
      window.location.reload();
    }, 1000);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Une erreur est survenue' };
  }
}
