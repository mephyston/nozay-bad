import { type Db } from '@nba/db';
import { AnalyzeBankStatementLinesRepository } from './repository';
import { cleanName } from '../../shared/helpers';
import { resolveCategoryMap, resolveProductAccountingCategory } from '../../shared/category';
import type { AnalyzeBankStatementLinesInput, AnalyzeBankStatementLinesOutput } from './dto';

export async function analyzeBankStatementLines(db: Db, ai: any, input: AnalyzeBankStatementLinesInput): Promise<AnalyzeBankStatementLinesOutput> {
  const repo = new AnalyzeBankStatementLinesRepository();
  const pendingTxs = await repo.getPendingTransactions(db, input.seasonId, input.singleId);
  const members = await repo.getMembersBySeason(db, input.seasonId);
  const pastReconciled = await repo.getPastReconciledTransactions(db);
  const categories = await repo.getCategories(db);
  const catMap = resolveCategoryMap(categories);

  let examplesPrompt = "";
  if (pastReconciled.length > 0) {
    examplesPrompt = "\nVoici des exemples récents de rapprochements réels déjà validés par le trésorier (sers-toi en comme référence) :\n";
    for (const ex of pastReconciled) {
      const memberName = ex.memberLastName ? `${ex.memberLastName} ${ex.memberFirstName}` : "Aucun";
      const catLabel = ex.category ? String(ex.category) : "Inconnue";
      const exAmt = ex.amountCents ?? 0;
      examplesPrompt += `- Libellé bancaire : "${ex.name}" | Mémo : "${ex.memo || ''}" | Montant : ${(exAmt / 100).toFixed(2)} EUR | Catégorie attribuée : ${catLabel} | Adhérent lié : ${memberName}\n`;
    }
    examplesPrompt += "\nSers-toi de ces exemples historiques pour orienter ton choix de catégorie ou de membre si l'opération à rapprocher est similaire.\n";
  }

  const activeProducts = await repo.getActiveProducts(db);

  const productsPrompt = activeProducts.map(p => {
    const accCat = resolveProductAccountingCategory(p.category, categories);
    return `- Produit : "${p.name}" | Prix : ${(p.price / 100).toFixed(2)} EUR | Catégorie Comptable associée : ${accCat}`;
  }).join('\n');

  const categoriesPrompt = categories.map(c =>
    `- ID: ${c.id} (${c.adminLabel} / ${c.adherentLabel})`
  ).join('\n');

  let analyzedCount = 0;

  for (const tx of pendingTxs) {
    const txAmount = tx.amountCents ?? 0;
    let suggestedCategory = txAmount < 0 ? catMap.fonctionnement : catMap.adhesions;
    const absAmount = Math.abs(txAmount);
    const matchingProduct = activeProducts.find(p => {
      if (p.price === absAmount) return true;
      if (p.category === 'shuttlecock' && absAmount % p.price === 0 && absAmount <= p.price * 4) return true;
      if (p.category === 'string' && absAmount % p.price === 0 && absAmount <= p.price * 4) return true;
      return false;
    });
    if (matchingProduct) {
      suggestedCategory = resolveProductAccountingCategory(matchingProduct.category, categories);
    }

    const textToLower = `${tx.name} ${tx.memo || ''}`.toLowerCase();
    
    if (
      /\b\d{20,}\b/.test(textToLower) || 
      textToLower.includes('virement interne') || 
      textToLower.includes('virmt interne') ||
      textToLower.includes('de: nozay badminton') ||
      textToLower.includes('de: nozay bad') ||
      textToLower.includes('de: nba') ||
      textToLower.includes('pour: nozay badminton') ||
      textToLower.includes('pour: nozay bad') ||
      textToLower.includes('pour: nba') ||
      (textToLower.includes('nozay badminton') && textToLower.includes('recharge'))
    ) {
      suggestedCategory = catMap.virementsInternes;
    } else if (
      textToLower.includes('adhesion') || 
      textToLower.includes('cotisation') || 
      (textToLower.includes('inscription') && !textToLower.includes('tournoi') && !textToLower.includes('ebad')) ||
      (textToLower.includes('licence') && txAmount > 0) ||
      (textToLower.includes('licences') && txAmount > 0)
    ) {
      suggestedCategory = catMap.adhesions;
    } else if (textToLower.includes('ionos')) {
      suggestedCategory = catMap.fonctionnement;
    } else if (textToLower.includes('urssaf') || textToLower.includes('afdas')) {
      suggestedCategory = catMap.salaires;
    } else if (
      textToLower.includes('deplacement jeune') || 
      textToLower.includes('deplacement jeunes') || 
      textToLower.includes('accompagnement jeune') || 
      textToLower.includes('accompagnement jeunes') || 
      textToLower.includes('tournoi jeune') ||
      textToLower.includes('tournoi jeunes') ||
      ((textToLower.includes('deplacement') || textToLower.includes('déplacement') || textToLower.includes('deplacements') || textToLower.includes('déplacements')) &&
        (textToLower.includes('jeune') || textToLower.includes('jeunes') || textToLower.includes('minibad') || textToLower.includes('minibadminton') || textToLower.includes('poussin') || textToLower.includes('benjamin') || textToLower.includes('minime') || textToLower.includes('cadet') || textToLower.includes('junior') || textToLower.includes('toussaint') || textToLower.includes('paques') || textToLower.includes('pâques') || textToLower.includes('noel') || textToLower.includes('noël') || textToLower.includes('fevrier') || textToLower.includes('février') || textToLower.includes('avril') || textToLower.includes('printemps') || textToLower.includes('hiver') || textToLower.includes('hivers'))) ||
      ((textToLower.includes('stage') || textToLower.includes('stg')) &&
        (textToLower.includes('jeune') || textToLower.includes('jeunes') || textToLower.includes('minibad') || textToLower.includes('minibadminton') || textToLower.includes('poussin') || textToLower.includes('benjamin') || textToLower.includes('minime') || textToLower.includes('cadet') || textToLower.includes('junior') || textToLower.includes('toussaint') || textToLower.includes('paques') || textToLower.includes('pâques') || textToLower.includes('noel') || textToLower.includes('noël') || textToLower.includes('fevrier') || textToLower.includes('février') || textToLower.includes('avril') || textToLower.includes('printemps') || textToLower.includes('hiver') || textToLower.includes('hivers') || textToLower.includes('juillet') || textToLower.includes('aout') || textToLower.includes('août'))) ||
      textToLower.includes('toussaint') ||
      textToLower.includes('paques') ||
      textToLower.includes('pâques') ||
      textToLower.includes('noel') ||
      textToLower.includes('noël') ||
      textToLower.includes('minibad') ||
      textToLower.includes('minibadminton') ||
      textToLower.includes('airbnb') ||
      textToLower.includes('air bnb')
    ) {
      suggestedCategory = catMap.actionsJeunes;
    } else if (
      textToLower.includes('ebad') || 
      textToLower.includes('e-bad') || 
      textToLower.includes('portefeuille ebad') || 
      textToLower.includes('portefeuille e-bad') ||
      textToLower.includes('blackminton') ||
      (textToLower.includes('tournoi') && !textToLower.includes('jeune'))
    ) {
      suggestedCategory = catMap.tournoisSenior;
    } else if (textToLower.includes('larde')) {
      if (textToLower.includes('cordage')) {
        suggestedCategory = catMap.cordage;
      } else if (textToLower.includes('volant')) {
        suggestedCategory = catMap.volants;
      } else {
        suggestedCategory = catMap.materiel;
      }
    } else if (textToLower.includes('ligue') || textToLower.includes('badminton')) {
      suggestedCategory = textToLower.includes('licence') ? catMap.licences : catMap.championnats;
    } else if (
      textToLower.includes('codep91') || 
      textToLower.includes('comite') ||
      /\b(icr|icd|icp)\b/.test(textToLower) ||
      textToLower.includes('interclub') ||
      textToLower.includes('interclubs')
    ) {
      suggestedCategory = catMap.championnats;
    } else if (textToLower.includes('sumup') || textToLower.includes('buvette')) {
      suggestedCategory = catMap.buvette;
    } else if (textToLower.includes('cordage') || textToLower.includes('raquette')) {
      suggestedCategory = catMap.cordage;
    } else if (textToLower.includes('volant')) {
      suggestedCategory = catMap.volants;
    } else if (textToLower.includes('stage')) {
      suggestedCategory = catMap.stagesFormations;
    } else if (
      (textToLower.includes('licence') && txAmount < 0) ||
      (textToLower.includes('licences') && txAmount < 0)
    ) {
      suggestedCategory = catMap.licences;
    } else if (textToLower.includes('salaire') || textToLower.includes('tetevuide') || textToLower.includes('meunier')) {
      suggestedCategory = catMap.salaires;
    } else if (textToLower.includes('versement express')) {
      suggestedCategory = catMap.adhesions;
    }

    const candidates = members.filter(m => {
      const cleanLast = cleanName(m.lastName);
      const cleanFirst = cleanName(m.firstName);
      const cleanP1 = cleanName(m.parent1Name);
      const cleanP2 = cleanName(m.parent2Name);

      const matchesLastName = cleanLast && textToLower.includes(cleanLast);
      const matchesFirstName = cleanFirst && textToLower.includes(cleanFirst);
      const matchesParent1 = cleanP1 && textToLower.includes(cleanP1);
      const matchesParent2 = cleanP2 && textToLower.includes(cleanP2);
      const memberRem = m.amountRemainingCents ?? 0;
      const matchesAmount = Math.abs(memberRem) === Math.abs(txAmount);
      
      return matchesLastName || matchesFirstName || matchesParent1 || matchesParent2 || matchesAmount;
    }).slice(0, 5);

    let exactCandidate: any = null;
    const textNormalized = textToLower.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    for (const m of candidates) {
      const firstNorm = cleanName(m.firstName);
      const lastNorm = cleanName(m.lastName);
      const p1Norm = cleanName(m.parent1Name);
      const p2Norm = cleanName(m.parent2Name);
      
      const hasFirstAndLast = firstNorm && lastNorm && textNormalized.includes(firstNorm) && textNormalized.includes(lastNorm);
      const hasParent1 = p1Norm && textNormalized.includes(p1Norm);
      const hasParent2 = p2Norm && textNormalized.includes(p2Norm);

      if (hasFirstAndLast || hasParent1 || hasParent2) {
        exactCandidate = m;
        break;
      }
    }

    let suggestionResult = {
      category: suggestedCategory,
      memberId: exactCandidate ? exactCandidate.id : null,
      memberName: exactCandidate ? `${exactCandidate.lastName} ${exactCandidate.firstName}` : null,
      confidence: exactCandidate ? 0.9 : 0.5
    };

    if (candidates.length > 0) {
      const prompt = `Tu es l'assistant comptable du club Nozay Badminton.
Opération bancaire à rapprocher :
- Libellé : "${tx.name}"
- Détails : "${tx.memo || 'Aucun'}"
- Montant : ${(txAmount / 100).toFixed(2)} EUR (${txAmount < 0 ? 'Débit' : 'Crédit'})

Catégories valides pour l'écriture :
${categoriesPrompt}
${examplesPrompt}

Tarifs des produits de la boutique (si le montant correspond exactement, sers-toi en pour déduire la catégorie) :
${productsPrompt}

Liste des candidats adhérents possibles :
${candidates.map(c => `- ID: ${c.id}, Nom: ${c.lastName} ${c.firstName}, Parent 1: ${c.parent1Name || 'Aucun'}, Montant Restant Dû Adhésion: ${((c.amountRemainingCents ?? 0) / 100).toFixed(2)} EUR`).join('\n')}

Instructions :
1. Associe l'adhérent (memberId et memberName) si son nom ou prénom (ou celui d'un de ses parents) apparaît clairement dans le libellé ou memo de l'opération, même si son "Montant Restant Dû Adhésion" est de 0.00 EUR.
2. Choisis la catégorie la plus adaptée parmi la liste des catégories valides ci-dessus.
3. Si le libellé bancaire ou le mémo est composé principalement d'une longue suite de chiffres (plus de 20 chiffres d'affilée), il s'agit d'un virement interne de compte à compte. Associe impérativement la catégorie ${catMap.virementsInternes} et aucun adhérent.
4. Si le montant correspond exactement au tarif d'un produit (par exemple 31.50 EUR pour les volants) ou à un multiple entier de celui-ci (comme 63.00 EUR pour 2 boîtes de volants, ou 30.00 EUR pour 2 cordages), et qu'il n'y a pas d'autre indication de catégorie dans le texte, choisis la catégorie associée à ce produit. Si le texte mentionne explicitement "adhesion", "cotisation" ou "inscription", choisis impérativement la catégorie ${catMap.adhesions}.
5. Si le libellé bancaire ou le mémo mentionne des déplacements, tournois, accompagnements pour les jeunes (ex: "deplacement jeune", "tournoi jeune") ou des stages de vacances scolaires ou d'entraînement pour jeunes (ex: "minibad", "stage minibad", "toussaint", "paques", "pâques", "stage février", "stage toussaint", "stg paques", "stage d'hiver", "stage de pâques", "stage de printemps", "stage jeunes", "course stage hivers") ou des frais d'hébergement/logement liés à ces déplacements pour les jeunes ou parents accompagnateurs (ex: "airbnb", "air bnb"), choisis impérativement la catégorie ${catMap.actionsJeunes}.
6. Si le libellé bancaire ou le mémo mentionne l'application "ebad" (ex: "ebad", "e-bad", "portefeuille ebad", "portefeuille e-bad") ou des tournois/événements adultes comme "blackminton", ou des inscriptions à des tournois adultes/seniors (sans mention de jeunes), choisis impérativement la catégorie ${catMap.tournoisSenior}.

Renvoie STRICTEMENT un objet JSON sous la forme suivante :
{
  "memberId": <ID de l'adhérent associé ou null>,
  "memberName": "<Nom Prénom de l'adhérent associé ou null>",
  "category": <ID entier de la catégorie choisie>,
  "confidence": <nombre entre 0.0 et 1.0 indiquant ton niveau de certitude>,
  "reasoning": "<explication concise>"
}`;

      try {
        const aiResponse = await ai.run('@cf/meta/llama-3-8b-instruct', {
          messages: [{ role: 'user', content: prompt }]
        });
        const textRes = aiResponse.response || aiResponse.text || '';
        const jsonMatch = textRes.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          suggestionResult = {
            category: parsed.category ? Number(parsed.category) : suggestedCategory,
            memberId: parsed.memberId || null,
            memberName: parsed.memberName || null,
            confidence: parsed.confidence || 0.5
          };
        }
      } catch (e) {
        if (candidates.length === 1) {
          suggestionResult.memberId = candidates[0].id;
          suggestionResult.memberName = `${candidates[0].lastName} ${candidates[0].firstName}`;
          suggestionResult.confidence = 0.7;
        }
      }
    }

    if (suggestionResult.memberId) {
      const matchedMember = members.find(m => m.id === suggestionResult.memberId);
      if (matchedMember && matchedMember.birthDate) {
        const birthYear = new Date(matchedMember.birthDate).getFullYear();
        const currentYear = new Date().getFullYear();
        const age = currentYear - birthYear;
        if (age <= 18) {
          if (suggestionResult.category === catMap.stagesFormations || suggestionResult.category === catMap.tournoisSenior) {
            suggestionResult.category = catMap.actionsJeunes;
          }
        }
      }
    }

    await repo.updateAISuggestions(db, tx.id, suggestionResult);
    analyzedCount++;
  }

  return { count: analyzedCount };
}
