import { Hono } from 'hono';
import { tbValidator } from '@hono/typebox-validator';
import { streamText } from 'hono/streaming';
import { generateAnalysisSchema } from './validator';

export type Bindings = {
  AI: any;
};

export const generateAiAnalysisRoute = new Hono<{ Bindings: Bindings }>();

generateAiAnalysisRoute.post(
  '/:seasonId/ai/analysis',
  tbValidator('json', generateAnalysisSchema, (result, c) => {
    if (!result.success) {
      const errs = [...result.errors].map(e => `${e.path}: ${e.message}`).join(', ');
      console.error("Validation failed:", errs);
      return c.json({ success: false, error: 'Invalid request: ' + errs }, 400);
    }
  }),
  async (c) => {
    if (!c.env || !c.env.AI) {
      return c.json({ success: false, error: 'AI binding is missing' }, 500);
    }

    // `ai:assistant:use` est exigé par ROUTE_PERMISSIONS, en amont de ce gestionnaire.
    const { report, section } = c.req.valid('json');
    const seasonId = c.req.param('seasonId');

    let prompt = '';
    if (section === 'tresorerie') {
      const treso = report.bilanTrésorerie;
      const initial = treso.reduce((acc: number, t: any) => acc + t.initialBalance, 0);
      const final = treso.reduce((acc: number, t: any) => acc + t.finalBalance, 0);
      
      prompt = `Tu es le trésorier d'une association sportive. Rédige un commentaire très concis (1 paragraphe, maximum 4-5 lignes) pour le bilan de trésorerie de cette saison.
Les données : Solde initial total = ${initial / 100} €. Solde final = ${final / 100} €. Évolution = ${(final - initial) / 100} €.
Explique brièvement la tendance. Ton ton doit être professionnel, rassurant, et s'adresser à l'Assemblée Générale. Ne dis pas bonjour, va droit au but.`;
    } else {
      const net = (report.compteResultat?.netResult || 0) / 100;
      prompt = `Tu es le trésorier d'une association sportive. Rédige un commentaire très concis (1 paragraphe, maximum 4-5 lignes) pour le Compte de Résultat de cette saison.
Le résultat net est de ${net} €. 
Analyse brièvement ce résultat (est-il excédentaire ou déficitaire ?). Ton ton doit être professionnel et s'adresser à l'Assemblée Générale. Ne dis pas bonjour, va droit au but.`;
    }

    try {
      const response = await c.env.AI.run('@cf/meta/llama-3.1-8b-instruct-fp8', {
        messages: [
          { role: 'system', content: 'Tu es un expert financier associatif.' },
          { role: 'user', content: prompt }
        ],
        stream: true
      });

      return new Response(response as any, {
        headers: {
          'Content-Type': 'text/event-stream',
        }
      });
    } catch (err: any) {
      console.error('Erreur lors de la génération IA:', err);
      return c.json({ success: false, error: 'Erreur lors de la génération IA: ' + err.message }, 500);
    }
  }
);
