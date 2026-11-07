/** Les cases à barrer d'une carte : autant que la valeur en contient. */
export function boxesFor(faceValueCents: number, boxCents: number): number {
  return Math.floor(faceValueCents / boxCents);
}
