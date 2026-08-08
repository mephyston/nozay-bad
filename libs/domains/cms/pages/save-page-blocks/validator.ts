import { Type } from '@sinclair/typebox';
import { BLOCK_TYPES } from '../../shared/blocks';

/**
 * Enveloppe seulement.
 *
 * La charge utile reste `Unknown` ici : elle ne peut être validée qu'une fois son
 * discriminant connu, et c'est le handler qui s'en charge, type par type
 * (`normaliseBlockPayload`). Valider deux fois la même chose à deux endroits
 * conduirait à ce que l'une des deux dérive.
 */
export const savePageBlocksSchema = Type.Object({
  blocks: Type.Array(
    Type.Object({
      type: Type.Union(BLOCK_TYPES.map((type) => Type.Literal(type))),
      payload: Type.Unknown()
    }),
    // Au-delà, ce n'est plus une page mais un site entier dans une page.
    { maxItems: 60 }
  )
});
