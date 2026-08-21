-- Retirer ce que `0018` a repris.
--
-- Ces deux tables n'ont plus de contenu propre : `members` a été scindée en `persons` et
-- `memberships`, et `member_profiles` fusionnée dans `persons`. Aucune clé étrangère ne
-- les référence — le dépôt n'en avait jamais déclaré vers `members` — la suppression ne
-- casse donc aucune contrainte.
--
-- Migration **destructive** : `rollback-horizon.mjs` classe `DROP TABLE` comme tel, et la
-- version qui la porte n'est donc pas rollbackable. C'est un choix assumé, l'application
-- n'ayant pas encore d'utilisateurs ; les ~300 lignes concernées ont été reprises par la
-- migration précédente, qui s'exécute dans le même déploiement.
DROP TABLE `member_profiles`;--> statement-breakpoint
DROP TABLE `members`;
