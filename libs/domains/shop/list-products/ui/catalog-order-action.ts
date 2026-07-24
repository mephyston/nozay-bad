import type { Product } from './catalog-types';

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
  if (params.selectedProduct.stock < params.selectedQuantity || params.selectedProduct.stock <= 0) {
    return { success: false, error: "Stock insuffisant pour ce produit." };
  }

  const isTest = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
  const turnstileResponse = isTest
    ? 'mock-test-token'
    : (document.getElementsByName('cf-turnstile-response')[0] as HTMLInputElement)?.value;
  if (!turnstileResponse) {
    return { success: false, error: "Veuillez valider le test de sécurité anti-bot." };
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
        paymentMethod: params.selectedPaymentMethod,
        turnstileToken: turnstileResponse
      })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || "Une erreur est survenue lors de l'enregistrement de la commande." };
    }

    if (typeof window !== 'undefined' && (window as any).turnstile) {
      (window as any).turnstile.reset();
    }

    return {
      success: true,
      message: `Votre souhait d'achat de ${params.selectedQuantity} ${params.selectedProduct.name} a bien été enregistré. Il sera comptabilisé dès validation par le trésorier.`
    };
  } catch (err: any) {
    if (typeof window !== 'undefined' && (window as any).turnstile) {
      (window as any).turnstile.reset();
    }
    return { success: false, error: err.message || "Une erreur est survenue." };
  }
}
