# RF-SCH-003 : Invités d'un adhérent

## 1. Description et Objectif Métier

Un adhérent amène volontiers quelqu'un au jeu libre. Le tableur n'en gardait aucune trace, et l'agenda du club ne compte ses accompagnants que par un nombre — ce qui suffit pour prévoir des couverts à une soirée raclette, pas pour ouvrir un gymnase.

Cette règle décrit pourquoi l'invité est **nommé**, et ce qu'il pèse dans la décision d'ouvrir.

---

## 2. Domaine Fonctionnel

- **Domaine** : schedules
- **Agrégat / Entité clé** : Invité (`open_play_guests`), rattaché à une Inscription
- **Statut** : Validé

---

## 3. Définition de la Règle Métier

**Un invité porte un prénom et un nom.** Deux raisons qui n'existaient pas pour un accompagnant d'événement : le bénévole qui ouvre le gymnase doit savoir qui franchit la porte, et un invité non licencié pose une question d'assurance que « 2 accompagnants » ne permet pas de traiter. Un invité dont le prénom ou le nom est vide est refusé — il ne dirait rien à l'ouvreur.

**Il n'existe que rattaché à son hôte.** Il n'a ni compte, ni licence, ni existence propre : la seule façon de l'annoncer est depuis l'inscription d'un adhérent connecté. Retirer l'inscription retire les invités avec elle.

**Les invités comptent dans le seuil d'ouverture.** Le seuil de quatre est un seuil de **raquettes sur les terrains**, pas de licences : un bénévole ne traverse pas la ville pour ouvrir un gymnase où trois adhérents et leurs invités joueraient. Compter les seules licences afficherait « 3 joueurs » à une séance qui en réunit six, et le créneau resterait fermé.

Deux corollaires assumés :

- un adhérent seul avec trois invités **atteint le seuil de quatre à lui tout seul**. C'est voulu — ce sont bien quatre personnes qui se présenteront. Le bureau garde la main : il peut relever le seuil d'une séance, ou l'annuler ;
- le **nombre d'adhérents reste affiché séparément** du total. C'est le nombre de personnes que le club assure sans question, et il n'a pas à se confondre avec le nombre de joueurs.

**Trois invités au maximum par adhérent.** Ce n'est pas une jauge de la séance — il n'y en a pas — mais une limite physique : un terrain accueille quatre joueurs, trois invités forment un double complet autour de leur hôte. Au-delà, c'est une sortie de groupe, et cela se discute avec le bureau plutôt que par un formulaire. La même constante borne la liste de l'écran et le contrôle du serveur, pour que l'écran ne propose jamais une valeur que l'API refuserait.

**La liste est remplacée, jamais complétée.** Chaque enregistrement porte la liste **entière** des invités et remplace la précédente. Il n'existe donc pas d'action « ajouter un invité » : il n'y a que « voici qui je viens avec ». C'est ce qui rend l'opération idempotente — un double-clic ne double personne — et ce qui évite d'avoir à rapprocher deux lignes sur une identité que deux prénoms ne donnent pas.

**Les noms des invités ne circulent pas.** L'espace adhérent ne reçoit que les siens ; la liste complète relève du même droit que celle des inscrits.

---

## 4. Scénarios d'Acceptation (Gherkin)

```gherkin
# language: fr

Fonctionnalité: Invités d'un adhérent à une séance de jeu libre

  Scénario: Un adhérent annonce deux invités
    Étant donné une séance à venir, dont le seuil d'ouverture est de 4 joueurs
    Et un adhérent connecté à son espace
    Quand il s'inscrit en annonçant « Léa Martin » et « Paul Martin »
    Alors son inscription est enregistrée à son nom
    Et la séance compte 1 adhérent et 2 invités
    Et la séance compte 3 joueurs attendus
    Et le bureau lit les noms des deux invités sous celui de leur hôte

  Scénario: Les invités comptent dans le seuil d'ouverture
    Étant donné une séance dont le seuil d'ouverture est de 4 joueurs
    Et un adhérent inscrit annonçant trois invités
    Alors la séance compte 4 joueurs attendus
    Et la séance est signalée « à pourvoir »

  Scénario: L'adhérent retire un invité
    Étant donné un adhérent inscrit à une séance avec deux invités
    Quand il enregistre de nouveau son inscription en n'annonçant plus qu'un invité
    Alors il n'existe toujours qu'une seule inscription à son nom
    Et un seul invité est rattaché à cette inscription
    Et la séance compte 2 joueurs attendus

  Scénario: L'adhérent vient finalement seul
    Étant donné un adhérent inscrit à une séance avec un invité
    Quand il enregistre de nouveau son inscription sans annoncer d'invité
    Alors son inscription est conservée
    Et plus aucun invité ne lui est rattaché

  Scénario: Se désinscrire emporte les invités
    Étant donné un adhérent inscrit à une séance avec trois invités
    Quand il se désinscrit
    Alors son inscription est retirée
    Et ses trois invités sont retirés avec elle

  Scénario: Un invité ne peut pas s'inscrire seul
    Étant donné une séance ouverte aux inscriptions
    Quand une personne non adhérente souhaite s'inscrire
    Alors aucune inscription n'est possible : il n'existe aucun formulaire public
    Et un invité ne peut être annoncé que dans l'inscription d'un adhérent connecté

  Scénario: Un invité sans nom est refusé
    Étant donné un adhérent connecté sur une séance à venir
    Quand il s'inscrit en annonçant un invité dont le nom est vide
    Alors l'opération est refusée
    Et le refus demande de renseigner le prénom et le nom de chaque invité
    Et aucune inscription n'est enregistrée

  Scénario: Quatre invités sont refusés
    Étant donné un adhérent connecté sur une séance à venir
    Quand il tente d'annoncer quatre invités
    Alors l'opération est refusée
    Et l'écran ne lui avait de toute façon jamais proposé d'ajouter une quatrième ligne

  Scénario: L'espace adhérent ne reçoit que ses propres invités
    Étant donné une séance à laquelle deux adhérents se sont inscrits avec des invités
    Quand l'un d'eux affiche la liste des séances
    Alors il reçoit le nom de ses propres invités
    Et il ne reçoit le nom d'aucun autre invité
```
