# RF-SCH-002 : Inscription d'un adhérent à une séance

## 1. Description et Objectif Métier

Dans le tableur, n'importe qui écrivait n'importe où — y compris à la place d'un autre — et personne ne savait qui s'était réellement inscrit. Le bureau surveillait le seuil de quatre joueurs à l'œil nu.

Cette règle décrit **qui peut s'inscrire**, ce que le club apprend d'une inscription, et ce qu'il n'en apprend pas.

---

## 2. Domaine Fonctionnel

- **Domaine** : schedules
- **Agrégat / Entité clé** : Inscription (`open_play_registrations`)
- **Statut** : Validé

---

## 3. Définition de la Règle Métier

**Seul un adhérent connecté s'inscrit**, et seulement pour lui-même. L'identité de l'inscrit — identifiant d'adhésion, licence, prénom, nom, adresse — est **imposée par la session** et jamais lue dans la requête du navigateur. C'est la garde centrale : le navigateur choisit une séance et des invités, il ne choisit jamais qui s'inscrit.

**Une inscription par adhérent et par séance.** C'est cette contrainte qui rend l'opération **idempotente** : se réinscrire met la ligne à jour au lieu d'en créer une seconde, et un double-clic ne fausse jamais le compte. Il n'existe donc pas d'action « modifier » : réémettre une inscription, c'est la mettre à jour.

**Trois refus, dans cet ordre** : la séance n'existe pas, elle est annulée, elle est passée. Ils sont vérifiés **à l'écriture** et non à l'affichage — un écran ouvert depuis une heure ne dit plus l'état réel, et entre le moment où l'adhérent a vu le bouton et celui où il clique, le bureau a pu annuler.

**Une séance reste inscriptible jusqu'à minuit**, la comparaison portant sur la date seule. L'adhérent qui arrive en cours de séance doit pouvoir se compter — c'est même à ce moment-là que le compte importe le plus.

**Il n'y a pas de refus « séance pleine »** : le club n'a pas de jauge. Ni de refus « séance confirmée » : une séance qui a trouvé son ouvreur reste ouverte, c'est son intérêt.

**Se désinscrire est plus permissif que s'inscrire.** Le seul refus est l'inexistence de la séance ; se retirer d'une séance **annulée** reste possible, puisqu'on veut légitimement quitter une liste devenue sans objet. L'opération est **tolérante à l'absence** : se désinscrire deux fois, ou sans avoir été inscrit, n'est pas une erreur — l'appelant demande un état, « je ne viens pas », et cet état est atteint dans les deux cas.

**L'identité est recopiée** au moment de l'inscription. Une liste d'appel est une trace : elle doit dire qui s'était inscrit ce soir-là, même si la personne a changé de nom depuis.

**Compter n'est pas savoir qui.** L'espace adhérent reçoit des compteurs — inscrits, invités, joueurs attendus — et **aucun nom**, sauf ceux des invités de l'adhérent au nom duquel la lecture est faite : ce sont les siens, il vient de les saisir. La liste nominative relève d'un droit distinct, `schedules:registrations:read`, et n'est jamais ouverte aux appelants de service.

**Un désistement qui repasse sous le seuil ne dé-confirme pas la séance.** C'est au bénévole de décider s'il se retire ; une séance qui s'annulerait toute seule est le meilleur moyen de faire venir des gens devant une porte close.

---

## 4. Scénarios d'Acceptation (Gherkin)

```gherkin
# language: fr

Fonctionnalité: Inscription d'un adhérent à une séance de jeu libre

  Scénario: Un adhérent s'inscrit
    Étant donné une séance à venir, ouverte aux inscriptions
    Et un adhérent connecté à son espace
    Quand il s'inscrit
    Alors la séance compte un adhérent inscrit
    Et son identité est enregistrée telle qu'elle figure dans sa session

  Scénario: Un double-clic ne compte pas deux joueurs
    Étant donné un adhérent connecté sur une séance à venir
    Quand il s'inscrit deux fois de suite
    Alors la séance ne compte qu'une seule inscription à son nom

  Scénario: Nul ne s'inscrit à la place d'un autre
    Étant donné un adhérent connecté à son espace
    Quand la requête envoyée désigne un autre adhérent
    Alors l'inscription est enregistrée au nom de l'adhérent connecté
    Et l'identité annoncée dans la requête est ignorée

  Scénario: La séance du jour reste ouverte
    Étant donné une séance qui a commencé à 9 h
    Quand un adhérent s'inscrit à 10 h le même jour
    Alors l'inscription est acceptée

  Scénario: Une séance passée est refusée
    Étant donné une séance dont la date est passée
    Quand un adhérent tente de s'y inscrire
    Alors l'opération est refusée
    Et le refus indique que la séance est passée

  Scénario: Une séance annulée est refusée à l'inscription
    Étant donné une séance annulée
    Quand un adhérent tente de s'y inscrire
    Alors l'opération est refusée
    Et le refus indique que la séance a été annulée

  Scénario: Se retirer d'une séance annulée reste possible
    Étant donné un adhérent inscrit à une séance ensuite annulée
    Quand il se désinscrit
    Alors son inscription est retirée

  Scénario: Se désinscrire sans être inscrit n'est pas une erreur
    Étant donné un adhérent qui n'est pas inscrit à une séance
    Quand il se désinscrit
    Alors l'opération réussit sans rien changer

  Scénario: L'espace adhérent ne reçoit aucun nom
    Étant donné une séance à laquelle deux adhérents se sont inscrits
    Quand l'espace adhérent affiche la liste des séances
    Alors il reçoit le nombre d'inscrits et le nombre de joueurs attendus
    Et il ne reçoit le nom d'aucun inscrit

  Scénario: Le bureau lit la liste d'appel
    Étant donné une séance à laquelle trois adhérents se sont inscrits
    Quand un utilisateur portant le droit de lire les inscrits ouvre la séance
    Alors il lit les trois noms, triés par nom de famille
    Et il lit le total des personnes attendues
```
