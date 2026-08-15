# RF-EVT-002 : Inscription et désinscription d'un adhérent

## 1. Description et Objectif Métier

Un adhérent connecté s'annonce à un rendez-vous du club, en indiquant s'il vient accompagné et de combien de personnes. Il peut revenir sur sa décision tant que les inscriptions sont ouvertes.

Le bureau y gagne les deux chiffres qui comptent — combien d'inscrits, combien de personnes au total — et la liste nominative de ceux qui viennent.

---

## 2. Domaine Fonctionnel

- **Domaine** : events
- **Agrégat / Entité clé** : Inscription (`club_event_registrations`), rattachée à l'Événement
- **Statut** : Validé

---

## 3. Définition de la Règle Métier

### Qui s'inscrit, et comment il est identifié

L'inscription est réservée aux **adhérents connectés** à l'espace adhérent. Il n'existe aucun formulaire public.

L'identité de l'inscrit — identifiant, nom, prénom, adresse e-mail — est **imposée par la session** et jamais lue du corps de la requête. C'est la garde qui empêche un adhérent d'en inscrire un autre, ou de se faire passer pour lui.

Ces quatre valeurs sont **recopiées** dans l'inscription plutôt que référencées. Le fichier des adhérents porte une ligne par licence *et par saison* : une clé étrangère ferait pointer une inscription de novembre vers une ligne périmée dès le renouvellement suivant. La liste survit ainsi à la bascule de saison, et se lit sans jointure.

### Une inscription par adhérent et par événement

L'unicité est garantie en base, sur le couple (événement, adhérent). Elle rend l'inscription **idempotente** : se réinscrire met à jour le nombre d'accompagnants au lieu de créer une seconde ligne. Un double-clic ne fausse jamais le compte, et deux requêtes parties en même temps ne peuvent pas produire de doublon.

### Ce qui est refusé

L'inscription est refusée, dans cet ordre, lorsque :

1. l'événement n'existe pas — **404** ;
2. il n'est pas publié, ou ses inscriptions ne sont pas ouvertes — **409** ;
3. il est déjà passé — **409**.

Les refus 2 et 3 sont des **409** et non des 403 : rien ne manque au demandeur, c'est l'état de l'événement qui s'oppose à sa demande. Un adhérent qui laisse un onglet ouvert pendant que le bureau ferme les inscriptions doit lire « c'est fermé », pas « vous n'avez pas le droit ».

Ces contrôles sont faits **à l'écriture** et non à l'affichage : entre le moment où l'adhérent a vu le bouton et celui où il clique, l'état a pu changer.

Un événement reste inscriptible **jusqu'à minuit** le jour où il commence, comme il reste affiché à l'agenda : on ne ferme pas les inscriptions à la soirée raclette à 20 h 01 sous prétexte qu'elle commençait à 20 h.

### Accompagnants

Le nombre d'accompagnants vaut `0` par défaut — « je viens seul ». Le total des présents vaut `1 + accompagnants`.

Il est plafonné, non pour jauger l'événement mais pour arrêter une faute de frappe : au-delà, c'est une erreur de saisie, pas une famille. La même constante borne la liste déroulante et le validateur, pour que l'écran ne propose jamais une valeur que l'API refuserait.

**Zéro accompagnant et absence d'inscription ne se confondent pas** : c'est ce qui décide du libellé du bouton, « Je m'inscris » ou « Me désinscrire ».

### Désinscription

Réservée aux inscriptions **ouvertes** : une fois closes, la liste est arrêtée et seul le bureau y touche. Le club a commandé les parts, se décommander relève alors de la conversation.

Elle est **tolérante à l'absence** : se désinscrire deux fois, ou sans l'avoir été, n'est pas une erreur. L'appelant demande un état — « je ne viens pas » — et cet état est atteint dans les deux cas.

### Qui voit quoi

| Lecture | Ouverte aux appelants de service | Droit requis |
|---|---|---|
| Nombre d'inscrits et de personnes | Oui | `events:events:read` |
| Mes propres accompagnants | Oui, pour l'adhérent nommé par la session | `events:events:read` |
| **Liste nominative** | **Non** | `events:registrations:read` |

Savoir qu'il y a douze inscrits n'apprend rien sur personne ; savoir lesquels, si. La liste nominative ne sort qu'auprès d'une identité d'administration porteuse du droit, jamais auprès d'un appelant de service.

Supprimer un événement emporte ses inscriptions.

---

## 4. Scénarios d'Acceptation (Gherkin)

```gherkin
# language: fr

Fonctionnalité: Inscription d'un adhérent à un événement

  Scénario: Un adhérent s'inscrit avec deux accompagnants
    Étant donné un événement « Soirée raclette » publié, à venir, aux inscriptions ouvertes
    Et un adhérent connecté à son espace
    Quand il s'inscrit en annonçant deux accompagnants
    Alors son inscription est enregistrée à son nom
    Et l'événement compte 1 inscrit et 3 personnes

  Scénario: Se réinscrire corrige, sans doubler
    Étant donné un adhérent inscrit à un événement avec deux accompagnants
    Quand il s'inscrit de nouveau en annonçant un seul accompagnant
    Alors il n'existe toujours qu'une seule inscription à son nom
    Et l'événement compte 1 inscrit et 2 personnes

  Scénario: Se désinscrire tant que les inscriptions sont ouvertes
    Étant donné un adhérent inscrit à un événement aux inscriptions ouvertes
    Quand il se désinscrit
    Alors son inscription est retirée
    Et l'événement ne compte plus personne

  Scénario: Le bureau relève la liste des inscrits
    Étant donné un événement auquel deux adhérents se sont inscrits
    Quand un utilisateur portant le droit de voir les inscrits ouvre la liste
    Alors il lit leur nom, leur prénom et leur nombre d'accompagnants
    Et la liste est classée par nom de famille
    Et le total des personnes attendues lui est donné

  Scénario: L'espace adhérent ne reçoit aucun nom
    Étant donné un événement auquel deux adhérents se sont inscrits
    Quand l'espace adhérent lit l'agenda
    Alors il reçoit le nombre d'inscrits et le nombre de personnes
    Et il ne reçoit le nom d'aucun inscrit

  Scénario: Inscription refusée une fois les inscriptions closes
    Étant donné un événement dont les inscriptions viennent d'être closes
    Quand un adhérent tente de s'y inscrire
    Alors l'opération est refusée
    Et le refus indique que les inscriptions ne sont pas ouvertes

  Scénario: Inscription refusée à un événement passé
    Étant donné un événement aux inscriptions ouvertes dont la date est dépassée
    Quand un adhérent tente de s'y inscrire
    Alors l'opération est refusée
    Et le refus indique que l'événement est passé

  Scénario: Se désinscrire sans être inscrit n'est pas une erreur
    Étant donné un événement aux inscriptions ouvertes
    Et un adhérent qui ne s'y est jamais inscrit
    Quand il demande à se désinscrire
    Alors l'opération est acceptée
    Et rien n'est retiré
```
