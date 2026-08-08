# RF-IAM-001 : Aucun droit par défaut

## 1. Description et Objectif Métier

Un compte d'administration n'accède qu'à ce qui lui a été explicitement accordé. L'objectif est qu'une erreur ou un oubli se traduise par un accès refusé, jamais par un accès ouvert : c'est la seule façon de garder un système d'autorisation vrai dans la durée, quand des écrans s'ajoutent au fil des saisons.

---

## 2. Domaine Fonctionnel

- **Domaine** : iam
- **Agrégat / Entité clé** : Compte d'administration (`admin_users`), Rôle (`admin_user_roles`)
- **Statut** : Validé

---

## 3. Définition de la Règle Métier

**Un compte sans rôle n'a aucun droit.** Les permissions d'un compte sont l'union de celles de ses rôles. Sans rôle, l'union est vide, et chaque contrôle échoue.

**La création attribue « membre » à défaut.** Un compte créé sans rôle explicite reçoit `membre`, qui donne le tableau de bord et le centre d'aide. Un compte strictement sans droit ne pourrait pas même constater qu'il est connecté ; l'utilisateur croirait à une panne plutôt qu'à une configuration incomplète.

**Une route non déclarée est refusée.** Toute route de l'API doit figurer dans `ROUTE_PERMISSIONS`. En son absence, la requête est refusée sans même atteindre le gestionnaire. Un test de couverture compare cette table aux routes réellement montées, dans les deux sens : une route ajoutée sans droit fait échouer la suite, et une règle qui ne correspond plus à rien aussi.

**Une page non déclarée est refusée.** Même règle côté administration, avec `PAGE_PERMISSIONS` et son propre test de couverture. Cela vaut pour les pages qu'on n'a pas pensé à garder — c'est précisément la catégorie qui posait problème : une dizaine de pages acceptaient des écritures (grand livre, caisse, rapprochement bancaire, réglages) sans le moindre contrôle.

**Une action inconnue est refusée.** Les pages reçoivent leurs écritures sous la forme `{ action: '...' }`. Une action absente de la table de la page est refusée : un nom inventé par le client n'atteint jamais le gestionnaire. La vérification d'existence utilise `Object.hasOwn` et non `in`, sans quoi `constructor` ou `toString`, vrais par héritage, franchiraient ce filtre.

**Un rôle inconnu n'accorde rien.** Un rôle rangé en base par une version antérieure du code est ignoré, avec un avertissement. La conséquence est une absence de droit, jamais un droit accordé par erreur.

**Le développement applique les mêmes règles.** En local, le jeton Cloudflare Access n'est pas vérifié, mais l'autorisation, elle, s'applique à l'identique. C'est parce que l'ancien mode développement court-circuitait tout — avec un repli sur tous les droits — que les pages sans garde sont passées inaperçues aussi longtemps. `DEV_ROLE` permet d'exercer chaque rôle localement.

---

## 4. Cas limites

| Situation | Comportement attendu |
|---|---|
| Adresse authentifiée par Cloudflare Access mais sans compte en base | 403, message « Compte non configuré » (et non une erreur brute) |
| Compte existant sans aucun rôle | Trouvé, zéro permission — distinct du cas précédent, pour que le message le soit aussi |
| Base de comptes vide, première connexion | Le premier compte est créé avec `super_admin`. La condition « la table est vide » est évaluée *dans* l'INSERT : deux premières requêtes concurrentes créeraient sinon deux super administrateurs |
| Retrait du rôle du dernier super administrateur | Refusé : la gestion des accès deviendrait inatteignable, sans moyen d'en désigner un autre |
| Suppression du dernier super administrateur | Refusée, pour la même raison |
