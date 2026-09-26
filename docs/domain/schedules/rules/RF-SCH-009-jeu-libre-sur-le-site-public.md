# RF-SCH-009 : Le jeu libre sur le site public

## 1. Description et Objectif Métier

Le bloc de contenu **« Jeu libre »** affiche, sur une page du site public, les prochaines séances de jeu libre : qui s'y est inscrit, et si un bénévole a pris l'ouverture du gymnase. Sans ouvreur, le bloc annonce qu'on en cherche toujours un.

L'objectif est de donner envie de venir — on vient jouer parce que ses partenaires viennent — et de rendre visible, au-delà de l'espace adhérent, qu'une séance attend encore son ouvreur.

Le site public est lu par n'importe qui et indexé par les moteurs de recherche. Cette règle fixe donc **ce qui peut en sortir**.

---

## 2. Domaine Fonctionnel

- **Domaine** : schedules (données), cms (bloc `open_play`)
- **Agrégat / Entité clé** : Séance (`open_play_sessions`), Inscription (`open_play_registrations`)
- **Statut** : Validé

---

## 3. Définition de la Règle Métier

**Le bloc porte une requête, jamais des séances.** Le rédacteur choisit un titre et un nombre de séances (1 à 12). Le site affiche, à chaque rendu, les prochaines séances à partir du jour même, de la plus proche à la plus lointaine.

**Les adhérents inscrits sont nommés « Prénom I. »** — le prénom entier, l'initiale du nom en capitale : « Camille D. ». Le nom complet, la licence, l'adresse électronique et l'identifiant d'adhésion ne sortent jamais. La réduction est faite **par l'API** : le site public ne reçoit pas de quoi afficher davantage.

**Les invités sont comptés, jamais nommés.** Ce ne sont pas des adhérents. Le bloc affiche « + 2 invités » à la suite des inscrits, et les invités comptent dans le nombre de joueurs, comme pour le seuil d'ouverture.

**L'ouvreur est nommé sous la même forme** (« Robert M. ») dès qu'il s'est engagé. Tant qu'aucun ouvreur ne s'est engagé, le bloc affiche **« On cherche toujours un ouvreur »**.

**Une séance annulée reste affichée, barrée**, avec la mention « Séance annulée ». Son motif, lui, n'est pas repris : il est rédigé pour les inscrits, pas pour le public. Les consignes du bureau (« clé chez Robert ») ne sont jamais affichées.

**S'inscrire.** Sauf si le rédacteur le masque, le bloc porte un bouton « S'inscrire au jeu libre » qui mène au calendrier de l'espace adhérent filtré sur le jeu libre (`/agenda?vue=jeu-libre`). Le site public n'inscrit personne : l'inscription se fait dans l'espace adhérent, au nom de la session. Un visiteur non connecté est d'abord conduit à la connexion, qui le ramène à ce calendrier.

**Fraîcheur.** Une page qui porte ce bloc est gardée **une minute** en cache au lieu d'une journée : une inscription ou un engagement d'ouvreur y apparaît donc au plus une minute plus tard. Les pages sans ce bloc ne sont pas concernées.

**Fonctionnalité éteinte.** Si le club n'a pas activé le jeu libre, le bloc affiche « Aucune séance de jeu libre de prévue pour le moment. »

---

## 4. Scénarios d'Acceptation (Gherkin)

```gherkin
# language: fr

Fonctionnalité: Le jeu libre sur le site public

  Contexte:
    Étant donné une page publiée qui porte un bloc « Jeu libre » limité à 6 séances
    Et une séance le samedi 21 mars de 14:00 à 17:00 au gymnase Pierre Dupuis

  Scénario: Les inscrits sont nommés par leur prénom et l'initiale de leur nom
    Étant donné que Camille Durand et Léo Martin sont inscrits à la séance
    Quand un visiteur ouvre la page
    Alors il lit « Camille D. » et « Léo M. » sous la séance
    Et le nom « Durand » n'apparaît nulle part dans la page

  Scénario: Les invités sont comptés sans être nommés
    Étant donné que Camille Durand est inscrite avec deux invités, Paul et Zoé
    Quand un visiteur ouvre la page
    Alors il lit « 3 joueurs inscrits » et « + 2 invités »
    Et ni « Paul » ni « Zoé » n'apparaissent dans la page

  Scénario: L'ouvreur identifié est affiché
    Étant donné que Robert Moreau s'est engagé à ouvrir la séance
    Quand un visiteur ouvre la page
    Alors il lit « Ouvreur : Robert M. »

  Scénario: Aucun ouvreur ne s'est encore engagé
    Étant donné qu'aucun ouvreur ne s'est engagé pour la séance
    Quand un visiteur ouvre la page
    Alors il lit « On cherche toujours un ouvreur »

  Scénario: Une séance annulée ne livre pas son motif
    Étant donné que la séance est annulée avec le motif « Gymnase fermé »
    Quand un visiteur ouvre la page
    Alors il lit « Séance annulée »
    Et le motif « Gymnase fermé » n'apparaît pas dans la page

  Scénario: Le bouton d'inscription mène au calendrier filtré de l'espace adhérent
    Étant donné que le bouton « S'inscrire » n'est pas masqué dans le bloc
    Quand un visiteur non connecté clique sur « S'inscrire au jeu libre »
    Alors il est conduit à la connexion de l'espace adhérent
    Et, une fois connecté, il arrive sur le calendrier filtré sur le jeu libre

  Scénario: Une séance passée n'est plus affichée
    Étant donné une séance le vendredi 13 mars
    Et que nous sommes le samedi 14 mars
    Quand un visiteur ouvre la page
    Alors la séance du 13 mars n'est pas affichée
```
