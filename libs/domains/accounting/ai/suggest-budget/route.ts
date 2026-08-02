import { Hono } from 'hono';
import { Type } from '@sinclair/typebox';
import { tbValidator } from '@hono/typebox-validator';
import { hasPermission } from '../../../iam/shared/permissions';

export type Bindings = {
  AI: any;
};

export const suggestBudgetRoute = new Hono<{ Bindings: Bindings }>();

const requestSchema = Type.Object({
  report: Type.Any(),
  categories: Type.Array(Type.Any()),
  currentBudget: Type.Record(Type.String(), Type.Number()),
});

suggestBudgetRoute.post(
  '/:seasonId/ai/budget-suggestion',
  tbValidator('json', requestSchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: 'Invalid request' }, 400);
    }
  }),
  async (c) => {
    if (!c.env || !c.env.AI) {
      return c.json({ success: false, error: 'AI binding is missing' }, 500);
    }

    const permissionsHeader = c.req.header('x-user-permissions') || '';
    const permissions = permissionsHeader ? permissionsHeader.split(',') : [];
    if (!hasPermission(permissions, 'ai:*') && !hasPermission(permissions, 'ai:chat')) {
      return c.json({ success: false, error: 'Unauthorized: missing ai:chat permission' }, 403);
    }

    const { report, categories, currentBudget } = c.req.valid('json');
    
    // Extrait les prévisions de trésorerie pour avoir la moyenne historique de cash
    const projections = report.projections?.treasuryForecast || [];
    const projectionsCat = report.projections?.categories || [];

    const historyData = projectionsCat.map((p: any) => ({
      name: p.categoryName,
      type: p.type,
      historicalAvg: p.remainingBudgetCents / 100 // Approximation de l'historique
    })).filter((p: any) => p.historicalAvg > 0);

    const prompt = `Tu es un expert comptable. Ton objectif est d'aider le trésorier à remplir les champs vides de son budget prévisionnel.
Voici l'historique moyen des dépenses et recettes (en euros) de l'association, basé sur les années précédentes :
${JSON.stringify(historyData, null, 2)}

Analyse ces données et renvoie UNIQUEMENT un objet JSON (sans texte avant ni après) avec tes suggestions de budget pour l'année à venir. 
Format attendu:
{
  "suggestions": [
    { "categoryName": "...", "type": "recette ou depense", "suggestedAmount": 1200, "justification": "Basé sur la moyenne historique." }
  ]
}`;

    try {
      const response = await c.env.AI.run('@cf/meta/llama-3.1-8b-instruct-fp8', {
        messages: [
          { role: 'system', content: 'Tu es un expert financier qui répond uniquement en JSON valide.' },
          { role: 'user', content: prompt }
        ]
      });

      // Essaie de parser la réponse JSON (llama-3 peut parfois mettre des backticks ```json ... ```)
      let rawText = response.response;
      rawText = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      let parsed = { suggestions: [] };
      try {
        parsed = JSON.parse(rawText);
      } catch (e) {
        console.error("Failed to parse AI JSON:", rawText);
        return c.json({ success: false, error: "Failed to parse AI response" }, 500);
      }

      return c.json({ success: true, data: parsed });
    } catch (err: any) {
      return c.json({ success: false, error: err.message }, 500);
    }
  }
);
