# RF-TEA-007 : Le dépassement de valeur se notifie tout seul, des deux côtés

## 1. Description et Objectif Métier

Le coach dispose déjà d'un constat manuel (« Contrôle des journées » → prévenir le capitaine). Mais entre deux passages du coach, un dépassement de hiérarchie (RF-TEA-003, avertissement W1) peut naître d'une simple validation de composition — et rester invisible jusqu'au forfait.

À la **validation** d'une composition (ou à la modification d'une composition déjà validée), le dépassement de valeur est détecté et notifié immédiatement aux capitaines et vice-capitaines **des deux équipes concernées** : la pénalité frappe les deux, et la correction peut venir de l'une comme de l'autre.

---

## 2. Domaine Fonctionnel

- **Domaine** : teams (détection et destinataires), notifications (diffusion)
- **Agrégat / Entité clé** : `lineup_slots`, `club_teams` (`number`)
- **Statut** : Validé

---

## 3. Définition de la Règle Métier

- Déclenchement : depuis `save-lineup`, uniquement quand la composition est **validée** ou qu'une composition validée est modifiée. Jamais sur brouillon — il bouge encore, notifier chaque frappe apprendrait aux capitaines à ignorer les messages.
- **Deux directions** :
  - *montante* : la composition validée dépasse la valeur de l'équipe du dessus ;
  - *descendante* : la composition validée — celle du dessus — s'affaiblit au point de passer sous une composition **déjà validée** de l'équipe du dessous. Un brouillon du dessous ne déclenche rien.
- Les messages sont ceux du constat manuel (même construction, `shared/notify-value-issue.ts`) : les deux flux doivent dire la même chose, et chaque message nomme l'autre équipe.
- Jamais bloquant : la composition est déjà écrite, le constat est une information. Un échec d'envoi n'annule pas l'enregistrement.
- Dédup de 6 heures par rencontre : une soirée d'ajustements ne devient pas une rafale ; un dépassement recréé le lendemain notifie à nouveau.
- Pas d'interrupteur : le constat est événementiel, déclenché par un geste du capitaine — pas par un déploiement.

---

## 4. Scénarios d'Acceptation (Gherkin)

```gherkin
# language: fr

Fonctionnalité: Constat automatique de dépassement de valeur

  Scénario: Valider une composition trop forte
    Étant donné l'équipe 1 avec une composition validée de valeur 30
    Quand le capitaine de l'équipe 2 valide une composition de valeur 36
    Alors les staffs des équipes 1 et 2 reçoivent chacun un constat
    Et chaque message nomme l'autre équipe

  Scénario: Affaiblir l'équipe du dessus
    Étant donné l'équipe 2 avec une composition validée de valeur 36
    Quand le capitaine de l'équipe 1 valide une composition de valeur 30
    Alors les deux staffs sont prévenus du dépassement

  Scénario: Un brouillon ne dérange personne
    Étant donné l'équipe 2 avec un simple brouillon de valeur 36
    Quand le capitaine de l'équipe 1 valide une composition de valeur 30
    Alors aucun constat ne part

  Scénario: Revalidation rapprochée
    Étant donné un constat parti il y a deux heures pour cette rencontre
    Quand le capitaine revalide sans corriger
    Alors aucun nouveau constat ne part
```
