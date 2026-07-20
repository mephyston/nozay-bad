import { ChecksRepository } from './repository';
import { AppError } from '@metacult/shared-db';
import { cleanName } from '../shared/helpers';

export async function analyzeCheckImage(
  db: any,
  ai: any,
  file: any
) {
  if (!file) {
    throw new AppError('Fichier image manquant.', 400);
  }

  let bytes: ArrayBuffer;
  if (typeof file === 'string') {
    if (file.startsWith('data:')) {
      const base64Data = file.split(',')[1];
      bytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)).buffer;
    } else {
      bytes = new TextEncoder().encode(file).buffer;
    }
  } else if (typeof file === 'object' && file !== null) {
    if ('arrayBuffer' in file && typeof (file as any).arrayBuffer === 'function') {
      bytes = await (file as any).arrayBuffer();
    } else {
      throw new AppError('Format de fichier invalide.', 400);
    }
  } else {
    throw new AppError('Format de fichier invalide.', 400);
  }

  let aiRes: any;
  try {
    const model = '@cf/meta/llama-3.2-11b-vision-instruct';
    const systemPrompt = `Analyze this check image. Extract the following fields as a JSON object:
{
  "number": "string (the 7-digit check number, usually printed at the bottom-left corner, e.g. '2512612'. Do NOT use the longer bank routing or account numbers)",
  "amount": number (the check amount in EUR, e.g. 150.00)",
  "emitter": "string (the pre-printed account holder / owner name, usually printed in black text in the left or upper section, e.g. 'ANTENNE REUNION TELEVISION'. Do NOT use the handwritten beneficiary/payee name written after 'à', e.g. 'Association Sourice de l'enfant')",
  "bank": "string (the bank name, e.g. LCL, SG, Credit Agricole)",
  "date": "string (the handwritten issue date, usually in format DD/MM/YY or DD/MM/YYYY. Look in the bottom-right section, under the numerical amount box and next to the signature, following the pre-printed word 'le' or 'fait le', e.g. '10/09/20' should be extracted as '2020-09-10')"
}
Return ONLY the raw JSON object. Do not wrap it in markdown or other text.`;

    aiRes = await ai.run(model, {
      prompt: systemPrompt,
      image: [...new Uint8Array(bytes)]
    });
  } catch (llamaErr: any) {
    let agreed = false;
    if (llamaErr.message && (llamaErr.message.includes("submit the prompt 'agree'") || llamaErr.message.includes("5016"))) {
      try {
        await ai.run('@cf/meta/llama-3.2-11b-vision-instruct', {
          prompt: 'agree',
          image: [...new Uint8Array(bytes)]
        });
        agreed = true;
        
        aiRes = await ai.run('@cf/meta/llama-3.2-11b-vision-instruct', {
          prompt: `Analyze this check image. Extract the following fields as a JSON object:
{
  "number": "string (the 7-digit check number, usually printed at the bottom-left corner, e.g. '2512612'. Do NOT use the longer bank routing or account numbers)",
  "amount": number (the check amount in EUR, e.g. 150.00)",
  "emitter": "string (the pre-printed account holder / owner name, usually printed in black text in the left or upper section, e.g. 'ANTENNE REUNION TELEVISION'. Do NOT use the handwritten beneficiary/payee name written after 'à', e.g. 'Association Sourice de l'enfant')",
  "bank": "string (the bank name, e.g. LCL, SG, Credit Agricole)",
  "date": "string (the handwritten issue date, usually in format DD/MM/YY or DD/MM/YYYY. Look in the bottom-right section, under the numerical amount box and next to the signature, following the pre-printed word 'le' or 'fait le', e.g. '10/09/20' should be extracted as '2020-09-10')"
}`,
          image: [...new Uint8Array(bytes)]
        });
      } catch (agreeErr) {
        // ignore
      }
    }

    if (!agreed || !aiRes) {
      const modelLlava = '@cf/llava-hf/llava-1.5-7b-hf';
      const systemPrompt = `Identify check details in this image. The check number (number) is always a 7-digit number, usually printed at the bottom-left corner (e.g. '2512612'). Do NOT use the longer account numbers. Look in the bottom-right section below the numerical amount box and next to the signature, following 'le' or 'fait le' for the handwritten issue date (e.g. '10/09/20' should be extracted as '2020-09-10'). Extract the pre-printed account holder name as emitter (e.g. 'ANTENNE REUNION TELEVISION', NOT the payee 'Association Sourice de l'enfant'). Output JSON format: {"number":"1234567", "amount":150.0, "emitter":"JEAN DUPONT", "bank":"LCL", "date":"2026-07-10"}`;

      aiRes = await ai.run(modelLlava, {
        prompt: systemPrompt,
        image: [...new Uint8Array(bytes)]
      });
    }
  }

  let extracted: any = {};
  let textResult = '';
  if (typeof aiRes === 'string') {
    textResult = aiRes;
  } else if (aiRes && typeof aiRes === 'object') {
    if (typeof (aiRes as any).response === 'string') {
      textResult = (aiRes as any).response;
    } else if ((aiRes as any).response !== undefined && (aiRes as any).response !== null) {
      textResult = JSON.stringify((aiRes as any).response);
    } else {
      textResult = JSON.stringify(aiRes);
    }
  }
  
  try {
    const jsonMatch = textResult.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      extracted = JSON.parse(jsonMatch[0]);
    } else {
      extracted = JSON.parse(textResult);
    }
  } catch (e) {
    extracted = {};
  }

  // fallback extraction regex
  if (!extracted.number) {
    const numMatch = textResult.match(/\b\d{7}\b/);
    if (numMatch) {
      extracted.number = numMatch[0];
    } else {
      const numMatchAny = textResult.match(/n°\s*(\d+)/i) || textResult.match(/numero\s*(\d+)/i);
      if (numMatchAny) extracted.number = numMatchAny[1];
    }
  }

  if (!extracted.amount) {
    const amtMatch = textResult.match(/(\d+[\.,]\d{2})\s*€/) || textResult.match(/(\d+[\.,]\d{2})\s*eur/i) || textResult.match(/(\d+)\s*€/) || textResult.match(/montant\s*(?:de\s*)?(\d+)/i);
    if (amtMatch) {
      extracted.amount = parseFloat(amtMatch[1].replace(',', '.'));
    }
  }

  if (!extracted.emitter) {
    const emitMatch = textResult.match(/émetteur\s*:\s*([A-Za-z\s\-]+)/i) || textResult.match(/de\s*([A-Z][a-z\-]+\s+[A-Z][a-z\-]+)/);
    if (emitMatch) {
      const val = emitMatch[1].trim();
      if (!/nozay/i.test(val) && !/bad/i.test(val) && !/association/i.test(val)) {
        extracted.emitter = val;
      }
    }
  }

  if (!extracted.bank) {
    const bankMatch = textResult.match(/banque\s*:\s*([A-Za-z\s]+)/i) || textResult.match(/(Société Générale|Crédit Agricole|LCL|Bred|BNP|La Banque Postale|CIC|Crédit Mutuel)/i);
    if (bankMatch) {
      extracted.bank = bankMatch[1].trim();
    }
  }

  if (!extracted.date) {
    const dateMatch = textResult.match(/(\d{2})[\/\-\s](\d{2})[\/\-\s](\d{2,4})/);
    if (dateMatch) {
      const day = dateMatch[1];
      const month = dateMatch[2];
      let year = dateMatch[3];
      if (year.length === 2) {
        year = `20${year}`;
      }
      extracted.date = `${year}-${month}-${day}`;
    } else {
      const dateMatchISO = textResult.match(/(\d{4})[\/\-](\d{2})[\/\-](\d{2})/);
      if (dateMatchISO) {
        extracted.date = dateMatchISO[0];
      }
    }
  }

  const repo = new ChecksRepository();
  let matchedMember = null;
  const members = await repo.getAllMembers(db);

  if (extracted.emitter) {
    const cleanEmitter = cleanName(extracted.emitter);
    for (const m of members) {
      const cleanLast = cleanName(m.lastName);
      const cleanFirst = cleanName(m.firstName);
      const cleanP1 = cleanName(m.parent1Name);
      const cleanP2 = cleanName(m.parent2Name);

      const hasFirstAndLast = cleanFirst && cleanLast && cleanEmitter.includes(cleanFirst) && cleanEmitter.includes(cleanLast);
      const hasParent1 = cleanP1 && cleanEmitter.includes(cleanP1);
      const hasParent2 = cleanP2 && cleanEmitter.includes(cleanP2);

      if (hasFirstAndLast || hasParent1 || hasParent2) {
        matchedMember = m;
        break;
      }
    }
  }

  return {
    number: extracted.number || '',
    amount: extracted.amount || 0,
    emitter: extracted.emitter || '',
    bank: extracted.bank || '',
    memberId: matchedMember ? matchedMember.id : null,
    memberName: matchedMember ? `${matchedMember.lastName} ${matchedMember.firstName}` : null,
    date: extracted.date || null
  };
}

export async function listChecks(db: any, seasonId: string, status?: string) {
  const repo = new ChecksRepository();
  return repo.listChecks(db, seasonId, status);
}

export async function createCheck(db: any, body: {
  seasonId: string;
  number: string;
  amount: number;
  emitter: string;
  bank?: string;
  memberId?: number;
  category?: string | number;
  description?: string;
  date?: string;
  photoUrl?: string;
}) {
  if (!body.seasonId || !body.number || !body.amount || !body.emitter) {
    throw new AppError('Champs requis manquants.', 400);
  }

  const repo = new ChecksRepository();

  return db.transaction(async (txDb: any) => {
    const categoryVal = body.category ? Number(body.category) : 1;
    const descStr = body.description || `Règlement par chèque n°${body.number} de ${body.emitter}`;

    const newTx = await repo.createTransaction(txDb, {
      seasonId: body.seasonId,
      type: 'recette',
      accountId: 'current',
      category: categoryVal,
      amount: body.amount,
      date: body.date || new Date().toISOString().split('T')[0],
      paymentMethod: 'cheque',
      description: descStr,
      reference: `Chèque n°${body.number}`,
      memberId: body.memberId || null,
      createdAt: new Date()
    });

    const newCheck = await repo.createCheck(txDb, {
      seasonId: body.seasonId,
      number: body.number,
      amount: body.amount,
      emitter: body.emitter,
      bank: body.bank || null,
      memberId: body.memberId || null,
      transactionId: newTx.id,
      status: 'received',
      photoUrl: body.photoUrl || null,
      createdAt: new Date()
    });

    if (body.memberId && (categoryVal === 1 || String(categoryVal) === '1')) {
      const member = await repo.getMemberById(txDb, body.memberId);
      if (member) {
        const newReceived = member.amountReceived + body.amount;
        const newRemaining = Math.max(0, member.amountDue - newReceived);
        const isPaid = newRemaining === 0;

        await repo.updateMemberReceived(txDb, body.memberId, newReceived, newRemaining, isPaid);
      }
    }

    return newCheck;
  });
}

export async function deleteCheck(db: any, id: number) {
  const repo = new ChecksRepository();

  return db.transaction(async (txDb: any) => {
    const check = await repo.getCheckById(txDb, id);
    if (!check) {
      throw new AppError('Chèque non trouvé.', 404);
    }

    if (check.transactionId) {
      await repo.unlinkCheckTransaction(txDb, id);

      const tx = await repo.getTransactionById(txDb, check.transactionId);
      if (tx) {
        if (tx.memberId && (tx.category === 1 || String(tx.category) === '1')) {
          const member = await repo.getMemberById(txDb, tx.memberId);
          if (member) {
            const newReceived = Math.max(0, member.amountReceived - Math.abs(tx.amount));
            const newRemaining = Math.max(0, member.amountDue - newReceived);
            const isPaid = newRemaining === 0;

            await repo.updateMemberReceived(txDb, tx.memberId, newReceived, newRemaining, isPaid);
          }
        }
        await repo.deleteTransaction(txDb, tx.id);
      }
    }

    await repo.deleteCheck(txDb, id);
  });
}

export async function createCheckDeposit(db: any, body: {
  seasonId: string;
  reference: string;
  date: string;
  checkIds: number[];
}) {
  if (!body.seasonId || !body.reference || !body.date || !body.checkIds || body.checkIds.length === 0) {
    throw new AppError('Champs requis manquants.', 400);
  }

  const repo = new ChecksRepository();

  return db.transaction(async (txDb: any) => {
    const checksToDeposit = await repo.getChecksByIds(txDb, body.checkIds);
    if (checksToDeposit.length === 0) {
      throw new AppError('Aucun chèque valide trouvé.', 400);
    }
    const totalAmount = checksToDeposit.reduce((sum, ch) => sum + ch.amount, 0);

    const deposit = await repo.createCheckDeposit(txDb, {
      seasonId: body.seasonId,
      reference: body.reference,
      date: body.date,
      amount: totalAmount,
      status: 'deposited',
      createdAt: new Date()
    });

    await repo.updateChecksDeposit(txDb, body.checkIds, deposit.id, 'deposited');

    return deposit;
  });
}

export async function listCheckDeposits(db: any, seasonId: string) {
  const repo = new ChecksRepository();
  return repo.listCheckDeposits(db, seasonId);
}

export async function clearCheckDeposit(db: any, id: number, body: { bankTransactionId: number }) {
  if (!body.bankTransactionId) {
    throw new AppError('bankTransactionId requis.', 400);
  }

  const repo = new ChecksRepository();

  return db.transaction(async (txDb: any) => {
    await repo.updateCheckDeposit(txDb, id, {
      status: 'cleared',
      bankTransactionId: body.bankTransactionId
    });

    await repo.updateBankTransactionStatus(txDb, body.bankTransactionId, 'reconciled');
  });
}

export async function deleteCheckDeposit(db: any, id: number) {
  const repo = new ChecksRepository();

  return db.transaction(async (txDb: any) => {
    const deposit = await repo.getCheckDepositById(txDb, id);
    if (!deposit) {
      throw new AppError('Remise de chèques non trouvée.', 404);
    }

    if (deposit.bankTransactionId) {
      await repo.updateBankTransactionStatus(txDb, deposit.bankTransactionId, 'pending');
    }

    await repo.unlinkChecksForDeposit(txDb, id);
    await repo.deleteCheckDeposit(txDb, id);
  });
}
