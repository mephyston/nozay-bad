/**
 * Média tel que les sélecteurs le manipulent.
 *
 * Déclaré dans un module TypeScript et non dans `MediaPicker.svelte` : un `.ts` ne
 * peut pas importer un type exporté depuis un bloc `<script module>`, et le module
 * de sélection (`media-pick.svelte.ts`) en a besoin.
 */
export interface PickableMedia {
  id: number;
  key: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  alt: string;
}
