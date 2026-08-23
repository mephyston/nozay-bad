# RF-SCH-004 : Ouvreurs désignés et confirmation d'une séance

## 1. Description et Objectif Métier

Une séance de jeu libre ne se tient que si quelqu'un ouvre le gymnase. Le club cherchait ce bénévole par SMS, une fois le tableur consulté à l'œil nu — sans savoir précisément quelles séances en avaient besoin.

Cette règle décrit **qui peut ouvrir**, comment il s'engage, et ce que son engagement lie.

---

## 2. Domaine Fonctionnel

- **Domaine** : schedules
- **Agrégat / Entité clé** : Ouvreur (`open_play_openers`), Séance (`open_play_sessions`)
- **Statut** : Validé

---

## 3. Définition de la Règle Métier

**Le bureau désigne les ouvreurs**, par saison. Ce sont les détenteurs d'une clé des gymnases. La liste ne stocke que des **licences** : c'est une liste *courante*, et y recopier un prénom le laisserait diverger de l'annuaire. Les noms sont résolus par l'écran qui les affiche.

**Cette liste n'est pas une fonction au club.** Les fonctions (président, trésorier…) n'admettent qu'un titulaire par personne et par saison, et se décident en assemblée générale ; or les détenteurs de clé *sont* souvent les gens du bureau, et un trousseau change quand la mairie refait les serrures. Deux natures de chose, deux listes.

**Seul un ouvreur désigné peut s'engager.** Le refus est rendu par le serveur, à partir de la licence portée par la session — pas par la disparition d'un bouton. Un adhérent qui forgerait la requête se ferait refuser de la même façon. C'est le seul refus du domaine qui signifie « il vous manque quelque chose » ; tous les autres disent « c'est l'état qui s'y oppose ».

**Une séance n'a qu'un ouvreur.** L'engagement est pris en une écriture conditionnelle : si quelqu'un s'est engagé entre-temps, l'opération est refusée. Deux bénévoles qui cliquent en même temps ne peuvent donc pas se remplacer l'un l'autre sans que le second l'apprenne. **Reprendre une séance qu'on ouvre déjà n'est pas une erreur.**

**S'engager confirme la séance.** « Confirmée » signifie exactement « un ouvreur est renseigné » ; les deux ne peuvent pas diverger. Les inscriptions **restent ouvertes** — c'est même le but : on veut du monde.

**L'identité de l'ouvreur est recopiée sur la séance**, contrairement à la liste. Elle y devient une **trace** : qui a réellement ouvert le gymnase ce soir-là. Reprendre sa clé plus tard ne doit pas effacer son nom des séances qu'il a tenues.

**Se rétracter est réservé à l'ouvreur en place**, et refusé une fois la séance passée. La séance redevient « à pourvoir » si le seuil tient toujours, et **les inscrits restent inscrits** : ils n'ont rien fait de mal. Le bureau, lui, peut retirer n'importe quel ouvreur — c'est son outil de correction.

**Reprendre une clé ne défait rien.** Ni le passé, ni les séances à venir déjà acceptées. Le retrait signifie « ne lui en confie plus », pas « annule ce qu'il a promis » : une séance qui redeviendrait « à pourvoir » dans le dos de tout le monde ferait venir des gens devant une porte close. Le bureau retire l'ouvreur séance par séance s'il le faut.

**Un désistement d'inscrit ne dé-confirme jamais une séance**, même s'il la fait repasser sous son seuil. C'est au bénévole de décider s'il se retire.

---

## 4. Scénarios d'Acceptation (Gherkin)

```gherkin
# language: fr

Fonctionnalité: Ouvreurs désignés et confirmation d'une séance

  Scénario: Le bureau confie une clé
    Étant donné une saison en cours
    Quand le bureau désigne Marie comme ouvreuse
    Alors Marie peut s'engager à ouvrir une séance
    Et le bouton « J'ouvre ce créneau » lui apparaît dans son espace

  Scénario: Désigner deux fois la même personne
    Étant donné Marie déjà désignée comme ouvreuse
    Quand le bureau la désigne de nouveau
    Alors l'opération réussit sans créer de doublon

  Scénario: Un bénévole s'engage
    Étant donné une séance à venir sans ouvreur
    Et Marie désignée comme ouvreuse
    Quand Marie s'engage à ouvrir la séance
    Alors la séance est confirmée
    Et elle porte le nom de Marie
    Et les inscriptions restent ouvertes

  Scénario: Un adhérent non désigné ne peut pas s'engager
    Étant donné une séance à venir sans ouvreur
    Et un adhérent qui n'est pas ouvreur désigné
    Quand il tente de s'engager
    Alors l'opération est refusée
    Et le refus indique qu'il ne fait pas partie des ouvreurs désignés

  Scénario: Deux bénévoles pour la même séance
    Étant donné une séance déjà ouverte par Marie
    Quand Pierre, également ouvreur désigné, tente de s'engager
    Alors l'opération est refusée
    Et le refus indique qu'un autre bénévole ouvre déjà cette séance

  Scénario: Se réengager sur sa propre séance
    Étant donné une séance ouverte par Marie
    Quand Marie s'engage de nouveau
    Alors l'opération réussit sans rien changer

  Scénario: Un bénévole se rétracte
    Étant donné une séance ouverte par Marie, à laquelle deux adhérents sont inscrits
    Quand Marie déclare ne plus pouvoir ouvrir
    Alors la séance repart à la recherche d'un bénévole
    Et les deux adhérents restent inscrits

  Scénario: On ne libère pas la séance d'un autre
    Étant donné une séance ouverte par Marie
    Quand Pierre tente de la libérer
    Alors l'opération est refusée

  Scénario: Se rétracter après coup est refusé
    Étant donné une séance passée, qui avait été ouverte par Marie
    Quand Marie tente de se retirer
    Alors l'opération est refusée
    Et la séance conserve la trace de qui l'a ouverte

  Scénario: Reprendre une clé ne défait pas le passé
    Étant donné Marie qui a ouvert deux séances cette saison
    Quand le bureau lui reprend sa clé
    Alors les deux séances gardent son nom et restent confirmées
    Et Marie ne peut plus s'engager sur de nouvelles séances

  Scénario: Aucun ouvreur désigné
    Étant donné une saison où personne n'a reçu de clé
    Quand le bureau ouvre l'écran des séances
    Alors il est averti qu'aucune séance ne pourra être confirmée
```
