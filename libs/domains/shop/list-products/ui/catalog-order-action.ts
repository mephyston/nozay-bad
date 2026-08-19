import type { Product } from './catalog-types';
import { isOutOfStock } from './catalog-types';

export function handleMemberKeyDown(
  e: KeyboardEvent,
  state: {
    isMemberDropdownOpen: boolean;
    highlightedIndex: number;
    filteredMembersCount: number;
    onSelectMember: (index: number) => void;
    onOpenDropdown: () => void;
  }
) {
  if (!state.isMemberDropdownOpen) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      state.onOpenDropdown();
      e.preventDefault();
    }
    return;
  }

  if (e.key === 'ArrowDown') {
    if (state.filteredMembersCount > 0) {
      const next = (state.highlightedIndex + 1) % state.filteredMembersCount;
      state.onSelectMember(next);
      scrollOptionIntoView(next);
    }
    e.preventDefault();
  } else if (e.key === 'ArrowUp') {
    if (state.filteredMembersCount > 0) {
      const prev = (state.highlightedIndex - 1 + state.filteredMembersCount) % state.filteredMembersCount;
      state.onSelectMember(prev);
      scrollOptionIntoView(prev);
    }
    e.preventDefault();
  } else if (e.key === 'Enter') {
    if (state.highlightedIndex >= 0 && state.highlightedIndex < state.filteredMembersCount) {
      state.onSelectMember(state.highlightedIndex);
      e.preventDefault();
    }
  } else if (e.key === 'Escape') {
    e.preventDefault();
  }
}

export function scrollOptionIntoView(index: number) {
  setTimeout(() => {
    const container = document.getElementById('member-listbox');
    const option = document.getElementById(`member-option-${index}`);
    if (container && option) {
      const containerTop = container.scrollTop;
      const containerBottom = containerTop + container.clientHeight;
      const optionTop = option.offsetTop;
      const optionBottom = optionTop + option.clientHeight;

      if (optionTop < containerTop) {
        container.scrollTop = optionTop;
      } else if (optionBottom > containerBottom) {
        container.scrollTop = optionBottom - container.clientHeight;
      }
    }
  }, 0);
}

export async function submitOrder(params: {
  selectedMemberId: string;
  selectedProduct: Product | null;
  selectedQuantity: number;
  selectedPaymentMethod: string;
  activeSeasonId: string;
}): Promise<{ success: boolean; message?: string; error?: string }> {
  if (!params.selectedMemberId) {
    return { success: false, error: "Veuillez sélectionner un adhérent pour commander." };
  }
  if (!params.selectedProduct) {
    return { success: false, error: "Veuillez sélectionner un produit." };
  }
  // Le stock ne fait obstacle que s'il est réellement suivi (trackStock) : sinon
  // `stock` vaut 0 par convention et bloquerait tous les articles non suivis.
  if (isOutOfStock(params.selectedProduct)) {
    return { success: false, error: `« ${params.selectedProduct.name} » est en rupture de stock.` };
  }
  if (params.selectedProduct.trackStock && params.selectedProduct.stock < params.selectedQuantity) {
    return {
      success: false,
      error: `Stock insuffisant : il ne reste que ${params.selectedProduct.stock} « ${params.selectedProduct.name} ».`
    };
  }

  try {
    const res = await fetch('', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seasonId: params.activeSeasonId,
        memberId: parseInt(params.selectedMemberId),
        productId: params.selectedProduct.id,
        quantity: params.selectedQuantity,
        paymentMethod: params.selectedPaymentMethod
      })
    });

    const data = await res.json() as any;
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || "Une erreur est survenue lors de l'enregistrement de la commande." };
    }

    return {
      success: true,
      message: `Votre souhait d'achat de ${params.selectedQuantity} ${params.selectedProduct.name} a bien été enregistré. Il sera comptabilisé dès validation par le trésorier.`
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Une erreur est survenue." };
  }
}
