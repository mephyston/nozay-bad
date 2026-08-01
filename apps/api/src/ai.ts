import { Hono } from 'hono';
import { HELP_DOCS } from './ai-knowledge';
import { AI_TOOLS } from './ai-tools';
import { createDb } from '@nba/db';
import { getSeasonReports } from '@nba/accounting-api';
import { listMembers, getMemberStats } from '@nba/members-api';

export const aiRouter = new Hono<{ Bindings: { DB: D1Database, AI: any } }>();

const SYSTEM_PROMPT = `Tu es l'assistant IA exclusif du club Nozay Badminton (NBA).
Tu ne dois JAMAIS répondre à des questions qui ne concernent pas le club, la comptabilité, la boutique, ou le fonctionnement de l'association. Si on te pose une question hors sujet, refuse poliment (ex: "Je suis désolé, je ne peux répondre qu'aux questions concernant le club").

Voici la documentation du centre d'aide :
${HELP_DOCS}

Ton but est d'aider le bénévole. 
1. Si la question porte sur le fonctionnement du logiciel (comment faire une action), réponds en utilisant la documentation ci-dessus.
2. Si la question nécessite d'accéder aux données réelles du club (ex: obtenir le montant des subventions, lister les membres, connaître le bilan), **TU DOIS IMPÉRATIVEMENT utiliser les outils (tools) mis à ta disposition** (ex: get_season_reports, list_members). Ne dis pas à l'utilisateur d'aller regarder le tableau de bord, donne-lui directement la réponse grâce à l'outil !
3. Si tu ne sais pas, dis simplement que tu ne peux pas répondre avec les informations disponibles.`;

aiRouter.post('/chat', async (c) => {
  const { prompt } = await c.req.json();

  if (!prompt) {
    return c.json({ success: false, error: 'Prompt manquant' }, 400);
  }

  try {
    let messages: any[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ];

    let response = await c.env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
      messages,
      tools: AI_TOOLS
    });

    let aiText = response.response;
    let type = 'rag';

    if (response.tool_calls && response.tool_calls.length > 0) {
      type = 'tool';
      const toolCall = response.tool_calls[0];
      let toolResult: any = null;
      const db = createDb(c.env.DB);

      try {
        if (toolCall.name === 'get_season_reports') {
          const args = toolCall.arguments;
          const params = typeof args === 'string' ? JSON.parse(args) : (args || {});
          
          let targetSeasonId = params.seasonId;
          if (!targetSeasonId || targetSeasonId === 'active') {
             const { seasonsTable } = await import('@nba/accounting/schema');
             const { eq } = await import('drizzle-orm');
             const activeSeason = await db.select().from(seasonsTable).where(eq(seasonsTable.active, true)).get();
             if (activeSeason) {
               targetSeasonId = activeSeason.id;
             } else {
               throw new Error("Aucune saison active n'a été trouvée.");
             }
          }

          toolResult = await getSeasonReports(db, {
            seasonId: targetSeasonId,
            arretedAu: params.arretedAu
          });
        } else if (toolCall.name === 'list_members') {
          const args = toolCall.arguments;
          const params = typeof args === 'string' ? JSON.parse(args) : (args || {});
          
          const filters: any = {};
          if (params.paid === true) filters.paid = true;
          if (params.paid === false) filters.paid = false;
          if (params.search) filters.search = params.search;
          
          toolResult = await listMembers(db, filters, { page: 1, limit: params.limit || 50 });
        } else if (toolCall.name === 'get_member_stats') {
          const args = toolCall.arguments;
          const params = typeof args === 'string' ? JSON.parse(args) : (args || {});
          
          let targetSeasonId = params.season;
          if (!targetSeasonId || targetSeasonId === 'active') {
             const { seasonsTable } = await import('@nba/accounting/schema');
             const { eq } = await import('drizzle-orm');
             const activeSeason = await db.select().from(seasonsTable).where(eq(seasonsTable.active, true)).get();
             if (activeSeason) {
               targetSeasonId = activeSeason.id;
             } else {
               targetSeasonId = undefined;
             }
          }

          toolResult = await getMemberStats(db, { season: targetSeasonId });
        } else {
          toolResult = { error: 'Tool non reconnu.' };
        }
      } catch (err: any) {
        toolResult = { error: `Erreur lors de l'exécution de l'outil: ${err.message}` };
      }

      const toolCallId = "call_" + Math.random().toString(36).substring(7);
      
      messages.push({ 
        role: 'assistant', 
        content: "", 
        tool_calls: [{
          id: toolCallId,
          type: "function",
          function: {
            name: toolCall.name,
            arguments: typeof toolCall.arguments === 'string' ? toolCall.arguments : JSON.stringify(toolCall.arguments)
          }
        }]
      });
      messages.push({ 
        role: 'tool', 
        tool_call_id: toolCallId,
        name: toolCall.name, 
        content: JSON.stringify(toolResult) 
      });

      const finalResponse = await c.env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
        messages,
        tools: AI_TOOLS
      });

      aiText = finalResponse.response;
    }

    return c.json({ success: true, text: aiText, type });
  } catch (error: any) {
    console.error('AI Chat Error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});
