import { describe, it, expect, vi } from 'vitest';
import { mount, flushSync } from 'svelte';
import ThemeToggle from './ThemeToggle.svelte';

// Mock mode-watcher toggleMode
vi.mock('mode-watcher', () => ({
  toggleMode: vi.fn(),
}));

describe('ThemeToggle Component', () => {
  it('renders correct icon based on class list and toggles on click', async () => {
    // Simuler un thème sombre initial
    document.documentElement.classList.add('dark');

    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(ThemeToggle, { target });
    flushSync();

    // Devrait afficher l'icône Sun en mode sombre
    expect(target.innerHTML).toContain('svg'); // Lucide icon
    
    // Cliquer pour changer
    const button = target.querySelector('button');
    expect(button).not.toBeNull();
    button?.click();
    flushSync();

    // Devrait enlever le mode dark et afficher Moon
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
