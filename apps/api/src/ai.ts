import { Hono } from 'hono';
import { HELP_DOCS, DB_SCHEMA } from './ai-knowledge';

export const aiRouter = new Hono<{ Bindings: { DB: D1Database, AI: any } }>();

const SYSTEM_PROMPT = `Tu es l'assistant IA exclusif du club Nozay Badminton (NBA).
Tu ne dois JAMAIS répondre à des questions qui ne concernent pas le club, la comptabilité, la boutique, ou le fonctionnement de l'association. Si on te pose une question hors sujet, refuse poliment (ex: "Je suis désolé, je ne peux répondre qu'aux questions concernant le club").

Voici la documentation du centre d'aide :
${HELP_DOCS}

Voici le schéma de la base de données SQLite :
${DB_SCHEMA}

Ton but est d'aider le bénévole. Si la question porte sur le fonctionnement du logiciel, réponds en utilisant la documentation.
Si la question nécessite d'interroger la base de données (ex: "Combien de ventes", "Qui n'a pas payé", "Total des subventions"), tu dois générer une requête SQL valide pour SQLite.
RÈGLE D'OR SQL : Tu dois utiliser les NOMS DE COLONNES DE LA BASE DE DONNÉES (snake_case, ex: 'admin_label'), et non les propriétés TypeScript (camelCase, ex: 'adminLabel'). Regarde la chaîne de caractères à l'intérieur des déclarations text('...'), integer('...') dans le schéma.
ATTENTION: Pour générer du SQL, tu DOIS retourner uniquement la requête SQL encapsulée dans <SQL>...</SQL>. N'ajoute pas de texte avant ou après. La requête doit utiliser les tables existantes.
Si tu n'as pas besoin de SQL, réponds directement à l'utilisateur de manière claire et concise.`;

aiRouter.post('/chat', async (c) => {
  const { prompt } = await c.req.json();

  if (!prompt) {
    return c.json({ success: false, error: 'Prompt manquant' }, 400);
  }

  try {
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ];

    let response = await c.env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
      messages
    });

    let aiText = response.response;
    let type = 'rag';

    if (aiText.includes('<SQL>') && aiText.includes('</SQL>')) {
      type = 'sql';
      const sqlMatch = aiText.match(/<SQL>([\s\S]*?)<\/SQL>/);
      if (sqlMatch && sqlMatch[1]) {
        let sql = sqlMatch[1].trim();
        sql = sql.replace(/^```sql/i, '').replace(/```$/i, '').trim();
        
        try {
          // Sécurité stricte : blocage des mots-clés d'écriture
          const forbiddenKeywords = ['insert', 'update', 'delete', 'drop', 'alter', 'create', 'replace', 'grant', 'revoke'];
          const lowerSql = sql.toLowerCase();
          
          if (forbiddenKeywords.some(kw => new RegExp(`\\b${kw}\\b`).test(lowerSql))) {
             throw new Error('Sécurité : Seules les requêtes de lecture (SELECT) sont autorisées.');
          }

          const { results } = await c.env.DB.prepare(sql).all();

          messages.push({ role: 'assistant', content: aiText });
          messages.push({ 
            role: 'user', 
            content: `Voici le résultat de la requête SQL en JSON:\n${JSON.stringify(results)}\nFormule une réponse finale claire et lisible pour le bénévole, sans jargon technique. Ne parle pas de SQL dans ta réponse.` 
          });

          const finalResponse = await c.env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
            messages
          });

          aiText = finalResponse.response;
        } catch (dbError: any) {
          console.error('SQL Execution Error:', dbError, 'SQL:', sql);
          aiText = `Erreur lors de l'interrogation de la base de données: ${dbError.message}`;
        }
      }
    }

    return c.json({ success: true, text: aiText, type });
  } catch (error: any) {
    console.error('AI Chat Error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});
