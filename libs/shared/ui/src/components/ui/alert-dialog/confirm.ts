import { writable } from 'svelte/store';

type ConfirmRequest = {
  message: string;
  resolve: (value: boolean) => void;
};

export const confirmStore = writable<ConfirmRequest | null>(null);

export function uiConfirm(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    confirmStore.set({ message, resolve });
  });
}
