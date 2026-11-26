# RF-TEA-013 : Rappel des volants aux capitaines des vétérans

## 1. Description et Objectif Métier

Aux interclubs vétérans, c'est au capitaine de prévoir les boîtes de volants de la journée. Il les récupère au club, au début de l'entraînement du jeudi. L'oubli se découvre le dimanche matin, trop tard.

---

## 2. Domaine Fonctionnel

- **Domaine** : teams (`remind-shuttles`), déclenché par `apps/api/src/scheduled.ts`
- **Agrégat / Entité clé** : `CHAMPIONSHIP_RULES.shuttlesReminder`, `team_fixtures.played_at`, `championship_days.match_date`
- **Statut** : Validé

---

## 3. Définition de la Règle Métier

**Qui.** Le capitaine et le vice-capitaine d'une équipe dont le championnat porte la règle (les vétérans), sur leur adresse personnelle (jamais celle des parents). Un championnat aux effectifs non publiés n'a pas de staff aux yeux des adhérents : rien ne part.

**Quand.** Le jeudi à 19 h 30, heure du club, au début de l'entraînement. Le rappel vaut pour les rencontres datées du vendredi au dimanche qui suivent : le dimanche, ou le samedi par dérogation. Il part une fois ; si le passage de 19 h 30 est manqué, il se rattrape jusqu'à 19 h 59.

**Quelle date.** Celle du capitaine, sinon le jour commun fixé par le comité. Sans date, rien ne part. Une équipe au repos ou forfait ne joue pas. Une journée à deux rencontres ne donne qu'un rappel, pour la première qui se joue ; un rang exempt ne compte pas.

**Où.** Notification de la catégorie « Mes équipes interclubs », qui mène à la journée. Sur l'écran de composition de la journée, le capitaine et le vice-capitaine lisent aussi « Volants à prévoir ».

**Réglage du club.** « Rappel des volants », dans les envois programmés ; il suppose les notifications et les interclubs.

---

## 4. Scénarios d'Acceptation (Gherkin)

```gherkin
# language: fr

Fonctionnalité: Rappel des volants aux vétérans

  Scénario: Le jeudi de l'entraînement
    Étant donné une rencontre de vétérans le dimanche 29 novembre
    Quand arrive le jeudi 26 novembre à 19 h 30
    Alors le capitaine et le vice-capitaine reçoivent « volants à prévoir »
    Et ne le reçoivent pas une seconde fois ce jour-là

  Scénario: Le samedi par dérogation
    Étant donné une rencontre de vétérans le samedi 28 novembre
    Quand arrive le jeudi 26 novembre à 19 h 30
    Alors le rappel part aussi

  Scénario: Les autres championnats
    Étant donné une rencontre de mixte le dimanche
    Quand arrive le jeudi à 19 h 30
    Alors aucun rappel de volants ne part

  Scénario: L'écran de composition
    Étant donné le capitaine d'une équipe de vétérans
    Quand il ouvre la composition d'une journée
    Alors il lit « Volants à prévoir »
```
