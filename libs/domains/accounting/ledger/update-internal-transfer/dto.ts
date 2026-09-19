import type { CreateInternalTransferDTO, CreateInternalTransferOutput } from '../create-internal-transfer/dto';

/**
 * Un virement se modifie entier, avec les mêmes champs qu'à sa saisie : le trésorier corrige
 * un montant, une date ou un compte, jamais une jambe isolée. Le corps est donc celui de la
 * création ; ce qui distingue la modification, c'est l'identifiant du virement dans l'URL.
 */
export type UpdateInternalTransferDTO = CreateInternalTransferDTO;

export type UpdateInternalTransferOutput = CreateInternalTransferOutput;
