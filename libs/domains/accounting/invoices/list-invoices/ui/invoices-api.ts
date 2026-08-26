import type { InvoiceFormItem } from "./invoices-types";

function getErrorMessage(text: string, defaultMsg: string): string {
  if (!text) return defaultMsg;
  try {
    const parsed = JSON.parse(text);
    return parsed.error || parsed.message || defaultMsg;
  } catch (_) {
    return text;
  }
}

export async function fetchInvoiceDetails(id: number): Promise<InvoiceFormItem[]> {
  const res = await fetch('', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'get-details', id })
  });

  if (!res.ok) {
    throw new Error("Impossible de récupérer les lignes de la facture.");
  }

  const json = await res.json() as any;
  if (!json.success) {
    throw new Error(json.error || "Impossible de récupérer les lignes de la facture.");
  }

  if (json.data && json.data.items && Array.isArray(json.data.items)) {
    return json.data.items.map((item: any) => ({
      description: item.description,
      quantity: item.quantity,
      unitPriceStr: ((item.unitPriceCents ?? item.unitPrice ?? 0) / 100).toString(),
      categoryId: item.categoryId != null ? String(item.categoryId) : ''
    }));
  }

  return [];
}

export async function saveInvoice(data: {
  editingId: number | null;
  seasonId: string;
  clientName: string;
  clientAddress: string;
  clientEmail: string;
  date: string;
  itemsTotal: number;
  items: InvoiceFormItem[];
}): Promise<string> {
  const payload = {
    action: data.editingId ? 'update' : 'create',
    id: data.editingId,
    invoice: {
      seasonId: data.seasonId,
      clientName: data.clientName.trim(),
      clientAddress: data.clientAddress.trim() || null,
      clientEmail: data.clientEmail.trim() || null,
      date: data.date,
      totalAmount: data.itemsTotal,
      items: data.items.map(item => ({
        description: item.description.trim(),
        quantity: item.quantity,
        unitPrice: Math.round(parseFloat(item.unitPriceStr.replace(',', '.')) * 100),
        // Non renseignée, l'imputation reste nulle : la comptable la choisira au rapprochement.
        categoryId: item.categoryId ? Number(item.categoryId) : null
      }))
    }
  };

  const res = await fetch('', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(getErrorMessage(text, "Une erreur est survenue lors de l'enregistrement."));
  }

  return data.editingId ? "Facture mise à jour avec succès !" : "Facture créée avec succès !";
}

export async function updateInvoiceStatus(id: number, newStatus: 'sent' | 'paid' | 'cancelled'): Promise<string> {
  const res = await fetch('', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'status', id, status: newStatus })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(getErrorMessage(text, "Erreur lors de la mise à jour du statut."));
  }

  return "Statut de la facture mis à jour avec succès !";
}

export async function deleteInvoice(id: number): Promise<string> {
  const res = await fetch('', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete', id })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(getErrorMessage(text, "Erreur lors de la suppression de la facture."));
  }

  return "Facture supprimée avec succès !";
}
