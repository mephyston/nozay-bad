import { Type } from '@sinclair/typebox';
import { MAX_OPEN_PLAY_GUESTS } from '../../shared/open-play';

/**
 * `maxItems` tient du même chiffre que la liste déroulante de l'écran, pour que celui-ci
 * ne propose jamais une valeur que l'API refuserait.
 */
export const registerToOpenPlaySchema = Type.Object({
  memberId: Type.Integer({ minimum: 1 }),
  licence: Type.String({ minLength: 1, maxLength: 20 }),
  firstName: Type.String({ minLength: 1, maxLength: 120 }),
  lastName: Type.String({ minLength: 1, maxLength: 120 }),
  email: Type.String({ minLength: 3, maxLength: 200 }),
  guests: Type.Optional(
    Type.Array(
      Type.Object({
        firstName: Type.String({ minLength: 1, maxLength: 120 }),
        lastName: Type.String({ minLength: 1, maxLength: 120 })
      }),
      { maxItems: MAX_OPEN_PLAY_GUESTS }
    )
  )
});
