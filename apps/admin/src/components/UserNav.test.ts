import { mount, flushSync } from 'svelte';
import { describe, it, expect } from 'vitest';
import UserNav from './UserNav.svelte';

describe('UserNav Component', () => {
  it('should render the user initials and toggle the dropdown menu on click', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(UserNav, {
      target,
      props: {
        email: 'admin@nozaybad.fr'
      }
    });
    flushSync();

    // Check if the user initials 'AD' (first two letters of admin@nozaybad.fr in uppercase) are rendered
    expect(target.textContent).toContain('AD');

    // Initially, the dropdown content should not be in the DOM
    expect(document.body.innerHTML).not.toContain('Profil');

    // Find and click the trigger button
    const trigger = target.querySelector('button');
    expect(trigger).not.toBeNull();
    trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    flushSync();

    // Now the dropdown should be visible, containing "Profil"
    expect(document.body.innerHTML).toContain('Profil');

    // Clean up
    target.remove();
  });
});
