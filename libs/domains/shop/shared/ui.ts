export { default as OrdersManager } from '../list-orders/ui/OrdersManager.svelte';
export { default as ProductsManager } from '../list-products/ui/ProductsManager.svelte';
export { default as ShopStorefront } from '../list-products/ui/ShopStorefront.svelte';

// Le type du catalogue, pour les pages qui composent la liste avant de la passer au
// composant : la boutique en avait recopié une version divergente.
export type { Product } from '../list-products/ui/catalog-types';

// « Mes commandes » de l'espace adhérent : modifier ou annuler tant que le bureau n'a rien validé.
export { default as MemberOrders } from '../amend-order/ui/MemberOrders.svelte';
export type { MemberOrderRow } from '../amend-order/ui/member-orders-actions';
