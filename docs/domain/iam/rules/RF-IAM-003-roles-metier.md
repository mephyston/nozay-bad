# RF-IAM-003 : Rôles métier et séparation des tâches

## 1. Description et Objectif Métier

Les droits s'attribuent par fonction dans l'association, pas permission par permission. Un rôle correspond à un métier réel — présidence, trésorerie, secrétariat — et porte ce que ce métier exige, ni plus ni moins. L'objectif est qu'attribuer un accès soit une décision compréhensible par un bénévole, et relisible par le suivant.

---

## 2. Domaine Fonctionnel

- **Domaine** : iam
- **Agrégat / Entité clé** : Rôle (`ROLE_PERMISSIONS`)
- **Statut** : Validé

---

## 3. Définition de la Règle Métier

**Six rôles, cumulables.** `super_admin`, `president`, `tresorier`, `secretaire`, `coach`, `membre`. Un compte peut en porter plusieurs ; ses droits sont l'union des leurs. Une même personne assurant deux fonctions reçoit deux rôles, plutôt qu'un rôle sur mesure.

**Pas de permission à l'unité.** Le modèle n'accorde des droits que par rôle. Une liste de permissions par compte, en plus des rôles, recréerait exactement le désordre que ce modèle remplace : des droits attribués au cas par cas, impossibles à auditer d'un coup d'œil. Si un besoin ne rentre dans aucun rôle, c'est le rôle qu'on ajuste — et la modification est alors relue.

**La présidence n'écrit pas en comptabilité.** Elle dispose de la lecture intégrale et des actes de gouvernance : ouverture et clôture d'exercice, vote du budget, validation des notes de frais et des commandes, gestion des accès. Mais pas de la saisie comptable. C'est une séparation des tâches : le trésorier saisit, la présidence contrôle, et le grand livre reste imputable à une seule personne. Un club qui souhaite cumuler les deux fonctions ajoute une ligne (`...ACCOUNTING_FULL`) — et l'instantané de la matrice en fait un diff visible en revue.

**Le trésorier encaisse les commandes.** Valider une commande écrit une recette au grand livre : c'est un acte comptable, pas une opération de boutique. Le secrétariat gère donc le catalogue et suit les commandes, sans pouvoir les encaisser.

**L'entraîneur équipe ses joueurs.** Il tient le catalogue de la boutique et passe des commandes pour les adhérents, dont il consulte le fichier sans pouvoir le modifier. Il ne valide pas les commandes : l'encaissement écrit une recette au grand livre et reste à la trésorerie. C'était déjà l'usage sous l'ancien modèle, où la permission `shop:products` portait la mention « (Coach) » sans qu'aucun rôle ne l'incarne.

**Le secrétariat communique.** Une notification part vers tous les téléphones du club ; le droit d'émission n'est jamais accordé implicitement. Il est attribué délibérément au secrétariat, qui assure la communication, et à la présidence.

**Seul `super_admin` peut usurper.** `iam:sessions:impersonate` est délibérément refusé à la présidence : l'usurpation est un outil de support technique, pas un attribut de gouvernance. Elle ne peut viser un autre super administrateur — c'est un outil de désescalade, jamais d'escalade — et le droit est revérifié à chaque requête sur l'identité réelle, si bien que retirer le rôle coupe une usurpation en cours.

**`super_admin` est calculé.** Il vaut la totalité du catalogue, et non un jeton spécial. Une permission nouvellement ajoutée lui revient donc automatiquement, tandis que chaque autre rôle doit être modifié explicitement.

---

## 4. Répartition

| | Membre | Entraîneur | Secrétaire | Trésorier | Président | Super admin |
|---|---|---|---|---|---|---|
| Tableau de bord, aide | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Adhérents (lecture) | | ✓ | ✓ | ✓ | ✓ | ✓ |
| Adhérents (écriture, import) | | | ✓ | | | ✓ |
| Attestations CSE | | | ✓ | ✓ | lecture | ✓ |
| Comptabilité (lecture) | | | rapports | ✓ | ✓ | ✓ |
| Comptabilité (écriture) | | | | ✓ | | ✓ |
| Exercices, budget (écriture) | | | | ✓ | ✓ | ✓ |
| Notes de frais | | | lecture | ✓ | lecture + validation | ✓ |
| Boutique (catalogue) | | ✓ | ✓ | lecture | lecture | ✓ |
| Commandes (création) | | ✓ | lecture | ✓ | lecture | ✓ |
| Commandes (encaissement) | | | | ✓ | ✓ | ✓ |
| Notifications (émission) | | | ✓ | lecture | ✓ | ✓ |
| Assistant IA | | | | ✓ | ✓ | ✓ |
| Gestion des accès | | | | | ✓ | ✓ |
| Usurpation | | | | | | ✓ |

La matrice complète, permission par permission, est figée par un instantané dans `libs/domains/iam/shared/roles.test.ts`. Toute modification d'un rôle y apparaît comme un diff explicite : c'est ce qui empêche une attribution accidentelle de passer inaperçue.
