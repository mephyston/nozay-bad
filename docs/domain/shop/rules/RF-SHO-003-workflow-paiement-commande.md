# RF-SHO-003 : Cycle de vie et Paiement d'une Commande

## 1. Description et Objectif Métier
Une commande boutique n'entre en comptabilité qu'une fois **réglée**. Entre son
enregistrement et son paiement, elle traverse un état intermédiaire — **en attente de
paiement** — pendant lequel l'article est réservé à l'adhérent et le règlement est
attendu. C'est sur cet état que porte la relance automatique.

La règle sépare deux décisions que le club prenait auparavant en un seul geste :
**accepter la demande** (qui engage le stock) et **encaisser le règlement** (qui écrit
la recette). Une commande jamais réglée ne laisse ainsi aucune trace dans l'exercice.

---

## 2. Domaine Fonctionnel
- **Domaine** : `shop`
- **Agrégat / Entité clé** : `Commande`
- **Statut** : Validé

---

## 3. Définition de la Règle Métier

### 3.1 Les états

| Statut | Signification | Suite possible |
|---|---|---|
| `created` | Demande enregistrée, non traitée par le bureau. | `awaiting_payment`, `rejected` |
| `awaiting_payment` | Demande acceptée, stock réservé, règlement attendu. | `paid`, `cancelled` |
| `paid` | Règlement encaissé, recette écrite au grand livre. | — (terminal) |
| `rejected` | Demande refusée avant validation. | — (terminal) |
| `cancelled` | Commande validée puis jamais réglée. | — (terminal) |

Aucune autre transition n'est permise. Chaque transition est protégée par un verrou
optimiste : si deux personnes agissent en même temps sur la même commande, la seconde
reçoit une erreur de conflit et rien n'est écrit deux fois.

### 3.2 Validation (`created` → `awaiting_payment`)
1. Le stock du produit est **décrémenté** de la quantité commandée, s'il fait l'objet
   d'un suivi. L'article est dès lors promis à cet adhérent.
2. La disponibilité est **revérifiée au moment de la réservation** : le stock a pu
   fondre depuis la demande. Il est alors refusé, sans mouvement de stock.
3. La **date de mise en attente** est enregistrée : elle sert de point de départ aux
   relances.
4. **Aucune écriture comptable** n'est produite.
5. L'adhérent est notifié du montant restant à régler.

### 3.3 Encaissement (`awaiting_payment` → `paid`)
1. Une **recette est écrite au grand livre**, imputée à la catégorie comptable de la
   famille du produit et rattachée à l'adhérent.
2. L'exercice de rattachement est déduit de la **date de paiement**, jamais de la date
   de commande. Une date tombant sur un exercice arrêté produit une **régularisation**
   documentée sur l'exercice ouvert.
3. Une date de paiement **postérieure au jour même** est refusée.
4. Le stock n'est **pas** retouché : il l'a été à la validation.

### 3.4 Refus (`created` → `rejected`) et annulation (`awaiting_payment` → `cancelled`)
1. Le **refus** ne libère aucun stock : rien n'avait été réservé.
2. L'**annulation** **rend au stock** la quantité réservée à la validation.
3. Ni l'un ni l'autre ne touche à la comptabilité : la recette n'a jamais existé.

### 3.5 Relance
1. Les commandes en `awaiting_payment` depuis **plus de sept jours** déclenchent une
   relance à l'adhérent, dans la catégorie de notification `reminder`.
2. La relance est **hebdomadaire** et **idempotente** : un déclencheur programmé rejoué
   pour la même échéance n'envoie pas deux messages.
3. Elle ne part que si les relances automatiques sont activées sur le service
   (`PUSH_REMINDERS_ENABLED`), le même interrupteur que les relances de cotisation.

### 3.6 Clôture d'exercice
Une commande portant une **date de paiement** alors qu'elle n'est pas au statut `paid`
signale de l'argent reçu sans écriture correspondante : elle **bloque la clôture** de
l'exercice.

---

## 4. Scénarios d'Acceptation (Gherkin)

```gherkin
# language: fr

Fonctionnalité: Cycle de vie et paiement d'une commande boutique

  Scénario: Validation d'une demande, sans effet comptable
    Étant donné une commande créée de 2 unités de "Boîte Volants Plumes" à 20,00 € pièce
    Et un stock de 10 unités pour ce produit
    Quand le bureau valide la commande
    Alors la commande passe au statut "en attente de paiement"
    Et le stock restant devient 8 unités
    Et aucune écriture n'est enregistrée au grand livre
    Et l'adhérent est notifié qu'il reste 40,00 € à régler

  Scénario: Encaissement d'une commande, qui entre en comptabilité
    Étant donné une commande en attente de paiement de 40,00 €
    Quand le bureau enregistre le règlement à la date du jour
    Alors la commande passe au statut "payée"
    Et une recette de 40,00 € est écrite au grand livre à cette date
    Et le stock reste inchangé

  Scénario: Refus de validation faute de stock disponible
    Étant donné une commande créée de 2 unités de "Maillot Club Taille M"
    Et un stock retombé à 1 unité depuis la demande
    Quand le bureau tente de valider la commande
    Alors la validation est refusée avec le message "Stock insuffisant pour Maillot Club Taille M"
    Et le stock reste inchangé à 1 unité
    Et la commande reste au statut "créée"

  Scénario: Annulation d'une commande jamais réglée
    Étant donné une commande en attente de paiement de 2 unités de "Boîte Volants Plumes"
    Et un stock de 8 unités
    Quand le bureau annule la commande faute de règlement
    Alors la commande passe au statut "annulée"
    Et le stock remonte à 10 unités
    Et aucune écriture n'est enregistrée au grand livre

  Scénario: Une commande payée ne peut plus être annulée
    Étant donné une commande au statut "payée"
    Quand le bureau tente de l'annuler
    Alors l'opération est refusée
    Et la commande reste au statut "payée"

  Scénario: Relance d'une commande en attente depuis plus d'une semaine
    Étant donné une commande en attente de paiement depuis 15 jours
    Et les relances automatiques activées sur le service
    Quand la relance hebdomadaire s'exécute
    Alors l'adhérent reçoit une notification "Commande à régler" de catégorie "reminder"

  Scénario: Pas de relance sur une commande validée dans la semaine
    Étant donné une commande en attente de paiement depuis 2 jours
    Quand la relance hebdomadaire s'exécute
    Alors aucune notification n'est envoyée pour cette commande

  Scénario: Une relance déjà partie n'est pas répétée
    Étant donné une commande en attente de paiement depuis 15 jours
    Et une relance déjà envoyée il y a 2 jours
    Quand la relance hebdomadaire s'exécute à nouveau
    Alors aucune seconde notification n'est envoyée
```
