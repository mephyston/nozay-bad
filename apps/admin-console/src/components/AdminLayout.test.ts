import { mount, flushSync } from 'svelte';
import { describe, it, expect } from 'vitest';
import AdminLayout from './AdminLayout.svelte';

describe('AdminLayout Component', () => {
  it('should render the desktop navigation items and toggle the mobile sidebar on hamburger click', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(AdminLayout, {
      target,
      props: {
        email: 'test@nozay-bad.fr'
      }
    });
    flushSync();

    // Verify desktop title and navigation items are rendered
    expect(target.textContent).toContain('NBA 91 - CA');
    expect(target.textContent).toContain("Vue d'ensemble");
    expect(target.textContent).toContain("Trésorerie");
    expect(target.textContent).toContain("Adhésions & Poona");
    expect(target.textContent).toContain("Boutique & Volants");

    // The mobile menu close button should not be present initially
    expect(target.querySelector('button[aria-label="Close menu"]')).toBeNull();

    // Find and click the mobile hamburger menu button
    const menuButton = target.querySelector('button[aria-label="Menu"]');
    expect(menuButton).not.toBeNull();
    menuButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    flushSync();

    // Now the mobile drawer is open, so the close button should be in the DOM
    const closeButton = target.querySelector('button[aria-label="Close menu"]');
    expect(closeButton).not.toBeNull();

    // Click the close button to close the drawer
    closeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    flushSync();

    // Mobile menu close button should be removed from DOM
    expect(target.querySelector('button[aria-label="Close menu"]')).toBeNull();

    // Clean up
    target.remove();
  });
});
