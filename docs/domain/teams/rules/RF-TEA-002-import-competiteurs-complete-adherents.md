# RF-TEA-002 : L'import des compétiteurs complète celui des adhérents

## 1. Description et Objectif Métier

Deux imports alimentent le club, et ils ne viennent pas du même endroit ni au même rythme : le bureau importe les **adhérents** depuis Poona, l'entraîneur importe les **classements des compétiteurs** depuis l'export ELO.

Le second complète le premier ; il ne le remplace pas et ne crée jamais personne. Sans cette règle, l'import des classements deviendrait une seconde porte d'entrée dans le fichier des adhérents — avec des données incomplètes (ni date de naissance, ni cotisation, ni contact) et sans le contrôle du bureau.

Mais rester silencieux ne suffit pas : un compétiteur absent du référentiel est invisible dans tous les sélecteurs de composition, et le capitaine qui ne trouve pas son joueur n'a aucun moyen de comprendre pourquoi. L'import doit donc **le dire**.

---

## 2. Domaine Fonctionnel

- **Domaine** : teams
- **Agrégat / Entité clé** : `player_rankings`, rapproché de `members`
- **Statut** : Validé

---

## 3. Définition de la Règle Métier

L'import rapproche chaque ligne du fichier avec les adhérents de la saison, **sur la licence normalisée à huit caractères**. Il en tire trois catégories :

| Cas | Traitement | Restitution |
|---|---|---|
| Licence connue comme adhérent de la saison | Classement enregistré | Compté en « lignes importées » |
| **Licence inconnue du référentiel** | Classement enregistré **quand même** | Listé sous « compétiteurs sans adhérent correspondant », licence, nom et prénom |
| Ligne sans aucun classement | Enregistrée, mais hors calcul | Compté en « non compétiteurs », **jamais en erreurs** |

**Pourquoi enregistrer malgré tout un classement sans adhérent.** Le décalage est un problème de calendrier entre deux imports, pas une donnée fausse. Refuser la ligne obligerait à tout rejouer et perdrait de l'information exacte.

**Ce que cela n'autorise pas.** Le joueur reste **non alignable** : les sélecteurs de composition sont peuplés depuis le référentiel des adhérents, où il ne figure pas. La correction appartient au bureau — relancer l'import des adhérents — après quoi l'import des classements peut être rejoué sans effet de bord, l'écriture étant idempotente sur `(licence, date ELO)`.

**Pourquoi les non-compétiteurs ne sont pas des erreurs.** Ils représentent environ un tiers d'un export réel (73 lignes sur 213). Les compter comme des erreurs ferait passer un import parfaitement réussi pour un échec, et pousserait à chercher un problème qui n'existe pas.

---

## 4. Scénarios d'Acceptation (Gherkin)

```gherkin
# language: fr

Fonctionnalité: Import des classements des compétiteurs

  Scénario: Un compétiteur absent du référentiel est signalé sans être créé
    Étant donné que Joël est adhérent de la saison 26-27
    Et que Fabien ne l'est pas
    Quand on importe un export ELO contenant Joël et Fabien
    Alors les classements de Joël et de Fabien sont tous deux enregistrés
    Et aucun adhérent n'est créé
    Et le rapport liste Fabien sous « compétiteurs sans adhérent correspondant »
    Et il invite à relancer l'import des adhérents puis à rejouer cet import

  Scénario: Un licencié non compétiteur n'est pas signalé
    Étant donné une ligne d'export sans aucun classement dans les trois disciplines
    Quand on importe le fichier
    Alors cette ligne est comptée en « non compétiteurs »
    Et elle n'apparaît ni en erreur ni en compétiteur sans adhérent

  Scénario: Le rapprochement survit à la perte des zéros de tête
    Étant donné un adhérent dont la licence est enregistrée « 210759 »
    Quand on importe un export où elle s'écrit « 00210759 »
    Alors le rapprochement réussit
    Et aucun compétiteur sans adhérent n'est signalé

  Scénario: Rejouer l'import après correction du référentiel
    Étant donné un import ayant signalé Fabien comme non adhérent
    Et que le bureau a depuis importé Fabien parmi les adhérents
    Quand on rejoue le même export
    Alors plus aucun compétiteur sans adhérent n'est signalé
    Et aucune ligne de classement n'est dupliquée
```
