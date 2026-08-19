import type { Permission } from '@nba/iam';

/**
 * Permission de lecture exercée par chaque outil.
 *
 * `ai:assistant:use` n'ouvre que la conversation : les outils exécutent des lectures
 * réelles (fichier des adhérents, rapports financiers) et doivent donc être bornés
 * aux droits de l'acteur. Sans cette table, accorder l'assistant à un rôle sans accès
 * aux finances lui ouvrirait un canal d'exfiltration par simple question.
 *
 * Tout outil ajouté à AI_TOOLS doit déclarer sa permission ici : la route refuse
 * d'exécuter un outil absent de cette table.
 */
export const TOOL_PERMISSIONS: Record<string, Permission> = {
  get_season_reports: 'accounting:reports:read',
  list_members: 'members:members:read',
  get_member_stats: 'members:members:read'
};

export const AI_TOOLS = [
  {
    type: "function",
    function: {
      name: "get_season_reports",
      description: "Récupère le compte de résultat et le bilan comptable complet pour la saison active ou une saison spécifique. Le résultat inclut le détail des recettes (subventions, cotisations, boutique...) et des dépenses. ATTENTION: Tous les montants retournés (total, totalRecettes, etc) sont en CENTIMES. Tu dois obligatoirement diviser les montants par 100 pour les afficher en Euros (€) à l'utilisateur.",
      parameters: { 
        type: "object", 
        properties: { 
           seasonId: { type: "string", description: "L'ID de la saison. Par défaut, utiliser 'active'." },
           arretedAu: { type: "string", description: "Date d'arrêt au format YYYY-MM-DD (optionnel)" }
        } 
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_members",
      description: "Récupère la liste des membres du club, utile pour savoir qui n'a pas payé, qui est inscrit, etc. Retourne un résumé pour économiser du contexte. ATTENTION: Si des montants financiers sont retournés, ils sont en CENTIMES. Divise-les par 100 pour obtenir des Euros.",
      parameters: { 
        type: "object", 
        properties: { 
           paid: { type: "boolean", description: "True pour les membres ayant payé, False pour ceux n'ayant pas payé. Omettre pour tous." },
           search: { type: "string", description: "Nom ou prénom à rechercher." },
           limit: { type: "number", description: "Nombre maximum de résultats (défaut 50)." }
        } 
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_member_stats",
      description: "Récupère des statistiques globales sur les adhérents du club (nombre total, moyenne d'âge, répartition hommes/femmes, et répartition par tranches d'âge: -18, 18-30, et +30).",
      parameters: { 
        type: "object", 
        properties: { 
           season: { type: "string", description: "L'ID de la saison (ex: 'active' ou '24-25'). Par défaut: 'active'." }
        } 
      }
    }
  }
];
