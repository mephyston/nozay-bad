export interface GetAttachmentInput {
  expenseId: number;
  attachmentId: number;
}

/** Une pièce, contenu compris. */
export interface GetAttachmentOutput {
  id: number;
  mediaType: string;
  dataUrl: string;
}
