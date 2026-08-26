import type { InvoiceFormItem, Invoice } from './invoices-types';

export function getTodayString() {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

export function getFutureDateString(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

export class InvoiceFormState {
  showModal = $state(false);
  editingId = $state<number | null>(null);

  clientName = $state('');
  clientAddress = $state('');
  clientEmail = $state('');
  date = $state('');
  items = $state<InvoiceFormItem[]>([]);

  openCreateModal() {
    this.editingId = null;
    this.clientName = '';
    this.clientAddress = '';
    this.clientEmail = '';
    this.date = getTodayString();
    this.items = [{ description: '', quantity: 1, unitPriceStr: '', categoryId: '' }];
    this.showModal = true;
  }

  openEditModal(invoice: Invoice, fetchedItems: InvoiceFormItem[]) {
    this.editingId = invoice.id;
    this.clientName = invoice.clientName;
    this.clientAddress = invoice.clientAddress || '';
    this.clientEmail = invoice.clientEmail || '';
    this.date = invoice.date;
    this.items = fetchedItems.length > 0 ? fetchedItems : [{ description: '', quantity: 1, unitPriceStr: '', categoryId: '' }];
    this.showModal = true;
  }

  validate(): string | null {
    if (!this.clientName.trim()) {
      return 'Le nom du client est requis.';
    }
    if (!this.date) {
      return 'La date de facturation est requise.';
    }

    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      if (!item.description.trim()) {
        return `La description de la ligne ${i + 1} est requise.`;
      }
      const q = item.quantity;
      if (isNaN(q) || q <= 0) {
        return `La quantité de la ligne ${i + 1} doit être supérieure à 0.`;
      }
      const p = parseFloat(item.unitPriceStr.replace(',', '.'));
      if (isNaN(p) || p < 0) {
        return `Le prix unitaire de la ligne ${i + 1} doit être un nombre supérieur ou égal à 0.`;
      }
    }
    return null;
  }
}
