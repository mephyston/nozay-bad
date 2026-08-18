# RF-MEM-001 : La fonction au club désigne qui gère, pas qui accède

## 1. Description et Objectif Métier

Le club a besoin de joindre « le bureau » : rappeler l'import des classements avant une journée d'interclubs, demain d'autres notifications de gestion. Or rien dans le référentiel ne distingue un président d'un adhérent : la fonction est une décision d'assemblée générale, pas une donnée Poona.

La **fonction au club** attribue à un adhérent, pour une saison, un mandat parmi : Président, Vice-président, Secrétaire, Trésorier, Trésorier adjoint, Membre du comité d'administration, Entraîneur. Elle sert de **cible de notification**, jamais de droit d'accès — les droits restent au domaine `iam`.

---

## 2. Domaine Fonctionnel

- **Domaine** : members
- **Agrégat / Entité clé** : `member_club_functions`
- **Statut** : Validé

---

## 3. Définition de la Règle Métier

- L'attribution se fait par **licence et par saison** — la licence survit aux ré-imports Poona et aux renouvellements, l'identifiant technique non.
- La licence doit figurer au référentiel des adhérents de la saison : une fonction attribuée à une licence inconnue ne notifierait personne.
- **Pas de cumul** : un adhérent ne porte qu'**une** fonction par saison — le président ne peut pas être aussi trésorier. Garanti par index d'unicité `(saison, licence)` et par le handler.
- **Unicité par saison** pour président, secrétaire, trésorier et trésorier adjoint (statuts du club). Le refus nomme le titulaire actuel : c'est lui qu'il faut d'abord relever de sa fonction. Vice-présidents, membres du CA et entraîneurs peuvent être plusieurs — chacun avec cette seule fonction.
- L'enregistrement est un **remplacement** : la fonction saisie est l'état final, une liste vide la retire.
- Un adhérent disparu d'un ré-import garde sa fonction, affichée « sans dossier » : la retirer est une décision humaine, pas un effet de bord d'import.
- Le ciblage de notification résout les titulaires vers leurs **emails de contact** (parents inclus), aux mêmes règles que le reste du domaine.
- **Chaque saison repart vide** : l'assemblée générale élit, quelqu'un ressaisit. L'entrée « Dirigeants » du menu porte un indicateur « action à réaliser » **tant que le président et le trésorier de la saison en cours** (résolue par la date) ne sont pas désignés — un entraîneur saisi ne suffit pas à dire que le bureau est en place.
- La page **Dirigeants** (rubrique Adhérents) liste les fonctions de la saison, signale les titulaires manquants, et permet d'ajouter, changer ou retirer un dirigeant ; la fiche adhérent offre la même écriture, à l'échelle d'une personne.

---

## 4. Scénarios d'Acceptation (Gherkin)

```gherkin
# language: fr

Fonctionnalité: Fonctions au club

  Scénario: Attribuer une fonction à un adhérent
    Étant donné un adhérent licencié de la saison sans fonction
    Quand le bureau lui attribue « Trésorier »
    Alors sa fiche porte cette fonction pour la saison
    Et il fait partie des destinataires des notifications de gestion du club

  Scénario: Refuser le cumul
    Étant donné un adhérent déjà Président de la saison
    Quand le bureau tente de lui attribuer en plus « Trésorier »
    Alors l'enregistrement est refusé : une seule fonction par adhérent

  Scénario: Refuser un second président
    Étant donné un adhérent déjà Président de la saison
    Quand le bureau tente d'attribuer « Président » à un autre adhérent
    Alors l'enregistrement est refusé
    Et le message nomme le titulaire actuel

  Scénario: Plusieurs entraîneurs
    Étant donné un adhérent déjà Entraîneur de la saison
    Quand le bureau attribue « Entraîneur » à un second adhérent
    Alors les deux adhérents portent la fonction

  Scénario: Nouvelle saison sans bureau
    Étant donné une saison en cours où seul un entraîneur est désigné
    Quand un administrateur ouvre le back-office
    Alors l'entrée « Dirigeants » du menu signale une action à réaliser
    Et l'indicateur ne disparaît que lorsque le président et le trésorier sont désignés
```
