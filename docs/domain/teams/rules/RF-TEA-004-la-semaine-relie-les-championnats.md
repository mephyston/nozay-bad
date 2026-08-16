# RF-TEA-004 : La semaine relie les championnats, pas le numéro de journée

## 1. Description et Objectif Métier

Chaque championnat publie son propre calendrier et numérote ses journées pour lui seul. La J1 du régional, celle du départemental mixte et celle du départemental masculin sont trois dates sans rapport, arrêtées par des comités différents — la LIFB d'un côté, la CCA de l'Essonne de l'autre.

Pourtant, ces championnats sont liés : un joueur ne peut pas tenir deux équipes du club en même temps. La règle a donc besoin d'une unité commune, et cette unité **n'est pas le numéro de journée** — c'est la **semaine calendaire**.

Se tromper d'unité laisse passer l'infraction la plus coûteuse du règlement : un joueur aligné dans deux équipes fait perdre la rencontre par pénalité à toutes les équipes concernées.

---

## 2. Domaine Fonctionnel

- **Domaine** : teams
- **Agrégat / Entité clé** : `championship_days.weekStart`, `WEEKLY_EXCLUSION_GROUPS`
- **Statut** : Validé

---

## 3. Définition de la Règle Métier

### La journée est une semaine

« Le terme de *journée* s'applique pour les rencontres disputées du lundi au dimanche d'une même semaine » (ICD art. 6.3.6). Le régional dit la même chose : « chaque journée est associée une *semaine*, définie du lundi au dimanche » (art. 1.6.1).

Une journée porte donc deux identités : un **numéro**, propre à son championnat, et une **semaine**, commune à tous.

### Les règles croisées se formulent en semaines

| Règle | Portée |
|---|---|
| ICD art. 6.3.7 — une seule équipe du club, « quel que soit le championnat (Mixte ou Masculin) » | la semaine, à cheval sur les deux départementaux |
| ICD Mixte art. 6.1.7 — pas d'ICD **et** d'ICR ou ICN « sur la même semaine » | la semaine, explicitement |
| ICR art. 4.5 — « une seule équipe de leur club par semaine (du lundi au dimanche) » | la semaine, ICR et ICN |
| ICR art. 5.5 — la hiérarchie des valeurs s'apprécie « au cours d'une même semaine » | la semaine |
| Vétérans art. 6.2.4 — « une seule équipe de son club » par journée | **les vétérans seuls** |

### Deux groupes d'exclusion

Le mixte et le masculin départementaux se citent mutuellement, et le mixte interdit en plus de cumuler avec le régional dans la semaine. Les trois ne forment donc qu'un seul groupe :

- **Groupe 1** : `icd_mixte`, `icd_masculin`, `icr_seniors`
- **Groupe 2** : `icd_veterans`

Les vétérans restent à part parce que **leur règlement ne cite aucun autre championnat**. Étendre la contrainte au-delà de sa lettre bloquerait des compositions que le règlement autorise — un joueur vétéran peut disputer un interclub vétérans et un interclub mixte la même semaine.

### La normalisation au lundi

`championship_days.weekStart` est ramené au **lundi** de sa semaine à l'écriture (`mondayOf`). C'est ce qui en fait une clé de jointure fiable entre championnats : deux journées de championnats différents appartiennent à la même semaine si et seulement si leurs `weekStart` sont égaux.

Le piège à connaître : `getUTCDay()` vaut `0` le dimanche. Un dimanche de rencontre rattaché au lundi *suivant* décalerait la journée d'une semaine entière et ferait disparaître le conflit qu'on cherche à détecter.

### Conséquence sur les écrans

Le contrôle porte deux lectures distinctes, et les confondre serait une erreur :

- **La hiérarchie des valeurs** se contrôle **par championnat et par journée** : elle ne compare que des équipes d'un même championnat.
- **Les doubles alignements** se contrôlent **par semaine**, sur tous les championnats du groupe.

---

## 4. Scénarios d'Acceptation (Gherkin)

```gherkin
# language: fr

Fonctionnalité: La semaine relie les championnats

  Scénario: Deux journées de numéros différents tombent la même semaine
    Étant donné que la J3 du départemental mixte est la semaine du lundi 12/10/2026
    Et que la J5 du départemental masculin est la même semaine
    Quand Camille est alignée en mixte NBA91-2 et en masculin NBA91-1
    Alors une infraction est signalée
    Bien que les numéros de journée soient différents

  Scénario: Deux journées de même numéro dans des semaines différentes
    Étant donné que la J1 du régional est la semaine du 05/10/2026
    Et que la J1 du départemental mixte est la semaine du 12/10/2026
    Quand un joueur est aligné dans les deux
    Alors aucune infraction n'est signalée

  Scénario: Le régional et le départemental sur la même semaine
    Étant donné qu'une journée de régional et une journée de départemental mixte
      tombent la semaine du 12/10/2026
    Quand un joueur est aligné dans les deux
    Alors une infraction est signalée, au titre de l'article 6.1.7

  Scénario: Les vétérans ne sont pas dans le groupe des autres championnats
    Étant donné qu'une journée de vétérans et une journée de mixte tombent la même semaine
    Quand un joueur est aligné dans les deux
    Alors aucune infraction n'est signalée
    Car le règlement vétérans ne cite aucun autre championnat

  Scénario: Une date de journée saisie un mercredi
    Quand le coach enregistre une journée dont la date est le mercredi 14/10/2026
    Alors la semaine enregistrée commence le lundi 12/10/2026
    Et elle se compare correctement aux journées des autres championnats

  Scénario: Une rencontre disputée le dimanche
    Quand une journée porte la date du dimanche 18/10/2026
    Alors sa semaine commence le lundi 12/10/2026, et non le 19/10/2026
```
