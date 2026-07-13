import { describe, it, expect } from 'vitest';
import { mount } from 'svelte';
import ProductsManager from './ProductsManager.svelte';

describe('ProductsManager Component', () => {
  it('renders shuttlecocks correctly', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(ProductsManager, {
      target,
      props: {
        category: 'shuttlecock',
        products: [
          {
            id: 1,
            name: 'Babolat Tour shuttlecock',
            category: 'shuttlecock',
            price: 2500, // 25.00 €
            stock: 10,
            active: true,
            createdAt: '2026-07-13'
          },
          {
            id: 2,
            name: 'Yonex Mavis 300',
            category: 'shuttlecock',
            price: 1550, // 15.50 €
            stock: 0,
            active: false,
            createdAt: '2026-07-13'
          }
        ]
      }
    });

    // Check header
    expect(target.innerHTML).toContain('Gestion des Volants');
    
    // Check product names
    expect(target.innerHTML).toContain('Babolat Tour shuttlecock');
    expect(target.innerHTML).toContain('Yonex Mavis 300');
    
    // Check price formats
    expect(target.innerHTML).toContain('25.00 €');
    expect(target.innerHTML).toContain('15.50 €');
    
    // Check stock values/badges
    expect(target.innerHTML).toContain('10 en stock');
    expect(target.innerHTML).toContain('Rupture');
    
    // Check status values
    expect(target.innerHTML).toContain('Actif');
    expect(target.innerHTML).toContain('Inactif');
  });

  it('renders strings correctly', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(ProductsManager, {
      target,
      props: {
        category: 'string',
        products: [
          {
            id: 3,
            name: 'Yonex BG65 String',
            category: 'string',
            price: 1200, // 12.00 €
            stock: 5,
            active: true,
            createdAt: '2026-07-13'
          }
        ]
      }
    });

    // Check header
    expect(target.innerHTML).toContain('Gestion des Cordages');
    
    // Check product details
    expect(target.innerHTML).toContain('Yonex BG65 String');
    expect(target.innerHTML).toContain('12.00 €');
    expect(target.innerHTML).toContain('5 en stock');
  });

  it('renders all products with category column correctly', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(ProductsManager, {
      target,
      props: {
        category: 'all',
        products: [
          {
            id: 1,
            name: 'Babolat Tour shuttlecock',
            category: 'shuttlecock',
            price: 2500,
            stock: 10,
            active: true,
            createdAt: '2026-07-13'
          },
          {
            id: 3,
            name: 'Yonex BG65 String',
            category: 'string',
            price: 1200,
            stock: 5,
            active: true,
            createdAt: '2026-07-13'
          }
        ]
      }
    });

    // Check header
    expect(target.innerHTML).toContain('Gestion des Produits');
    
    // Check categories are displayed in table
    expect(target.innerHTML).toContain('Volants');
    expect(target.innerHTML).toContain('Cordages');

    // Check Category select field exists in form
    expect(target.innerHTML).toContain('Catégorie');
  });
});
