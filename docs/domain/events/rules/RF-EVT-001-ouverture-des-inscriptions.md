# RF-EVT-001 : Ouverture des inscriptions à un événement

## 1. Description et Objectif Métier

Le club ouvre régulièrement des inscriptions : un stage, une soirée raclette, une assemblée générale. Elles se prenaient jusqu'ici par SMS et de bouche à oreille, et personne ne savait combien de couverts prévoir.

Cette règle décrit **qui décide** qu'un événement accepte des inscriptions, et ce que chacun des trois états emporte. L'objectif métier est de donner au bureau un chiffre sur lequel engager une commande, sans introduire de gestion de places que le club n'a pas besoin d'arbitrer.

---

## 2. Domaine Fonctionnel

- **Domaine** : events
- **Agrégat / Entité clé** : Événement (`club_events`)
- **Statut** : Validé

---

## 3. Définition de la Règle Métier

Tout événement porte un **état d'inscription** parmi trois valeurs, `none` par défaut.

| État | Ce qu'il emporte |
|---|---|
| `none` | Aucune inscription n'est proposée. Cas de la plupart des compétitions |
| `open` | Les adhérents s'inscrivent et se désinscrivent |
| `closed` | La liste est arrêtée : plus personne ne s'ajoute ni ne se retire. Elle reste lisible par le bureau |

**Trois valeurs et non un booléen.** « Fermé » et « sans objet » ne disent pas la même chose au lecteur : une soirée dont les inscriptions sont closes doit l'annoncer, plutôt que voir son bouton disparaître sans explication.

**Préconditions et effets**

- Changer l'état relève de `events:events:write` : c'est une modification de l'événement comme une autre. Aucune permission particulière n'est créée pour ouvrir ou fermer.
- Le défaut `none` s'applique à tous les événements déjà en base : la fonctionnalité n'en fait apparaître aucun rétroactivement.
- Ouvrir les inscriptions d'un événement **en brouillon** ou **annulé** ne les rend pas effectives : la garde porte à l'inscription, pas à l'ouverture. Un brouillon n'est pas censé être visible, et deviner son identifiant ne doit ouvrir aucune porte dérobée.
- Fermer **ne supprime rien** : les inscriptions déjà prises restent, et restent consultables. C'est ce qui distingue `closed` de `none`.
- Lire la liste nominative relève d'un droit **distinct**, `events:registrations:read` (voir [RF-EVT-002](./RF-EVT-002-inscription-d-un-adherent.md)).

---

## 4. Scénarios d'Acceptation (Gherkin)

```gherkin
# language: fr

Fonctionnalité: Ouverture des inscriptions à un événement

  Scénario: Le bureau ouvre les inscriptions à une soirée
    Étant donné un événement « Soirée raclette » publié et à venir
    Et que ses inscriptions sont « sans objet »
    Quand un utilisateur portant le droit de modifier un événement passe ses inscriptions à « ouvertes »
    Alors les adhérents peuvent s'inscrire depuis leur espace
    Et l'événement annonce que ses inscriptions sont ouvertes

  Scénario: Fermer les inscriptions conserve la liste
    Étant donné un événement dont les inscriptions sont ouvertes
    Et que trois adhérents s'y sont inscrits
    Quand le bureau passe ses inscriptions à « closes »
    Alors plus aucun adhérent ne peut s'inscrire ni se désinscrire
    Et le bureau lit toujours les trois inscriptions

  Scénario: Un événement créé n'accepte aucune inscription
    Étant donné qu'aucun événement « Interclubs D3 » n'existe
    Quand le bureau crée l'événement « Interclubs D3 »
    Alors ses inscriptions sont « sans objet »
    Et aucune inscription n'est proposée aux adhérents

  Scénario: Ouvrir les inscriptions d'un brouillon n'ouvre rien
    Étant donné un événement en brouillon dont les inscriptions ont été passées à « ouvertes »
    Quand un adhérent tente de s'y inscrire
    Alors l'opération est refusée
    Et le refus indique que les inscriptions ne sont pas ouvertes
```
