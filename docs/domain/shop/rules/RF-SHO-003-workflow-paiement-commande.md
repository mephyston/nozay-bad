# RF-SHO-003 : Cycle de vie et Paiement d'une Commande

## 1. Description et Objectif Métier
Une commande boutique n'entre en comptabilité qu'une fois **réglée**. Entre son
enregistrement et son paiement, elle traverse un état intermédiaire — **en attente de
paiement** — pendant lequel l'article est réservé à l'adhérent et le règlement est
attendu. C'est sur cet état que porte la relance automatique.

La règle sépare deux décisions que le club prenait auparavant en un seul geste :
**accepter la demande** (qui engage le stock) et **encaisser le règlement** (qui écrit
la recette). Une commande jamais réglée ne laisse ainsi aucune trace dans l'exercice.

Une fois réglée, la commande attend encore la **remise** de l'article (`delivered`) :
maillots attendus du fournisseur, volants donnés à l'entraînement suivant. Cet état
final dit au bureau ce qui reste à distribuer, sans effet sur le stock ni la compta.

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
| `created` | Demande enregistrée, non traitée par le bureau. | `awaiting_payment`, `rejected`, `cancelled` (retrait par l'adhérent) |
| `awaiting_payment` | Demande acceptée, stock réservé, règlement attendu. | `paid`, `cancelled` |
| `paid` | Règlement encaissé, recette écrite au grand livre ; article à remettre. | `delivered`, `awaiting_payment` (annulation de l'encaissement) |
| `delivered` | Article remis à l'adhérent. | `paid` (annulation de la remise) |
| `rejected` | Demande refusée avant validation. | — (terminal) |
| `cancelled` | Commande validée puis jamais réglée, ou demande retirée par l'adhérent. | — (terminal) |

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
4. Le refus accepte un **motif facultatif** (500 caractères au plus, blancs de tête et de
   fin ôtés). Il est conservé sur la commande (`rejection_reason`), repris dans la
   notification et montré à l'adhérent dans « Mes commandes ». Sans motif, la
   notification renvoie l'adhérent vers le bureau.

### 3.4 bis Modification et retrait par l'adhérent (`created`)
1. Depuis « Mes commandes », l'adhérent **modifie** ou **annule** une commande **tant que
   le bureau ne l'a pas validée** (`created`). Au-delà, les deux actions disparaissent :
   le stock est réservé et le montant annoncé, c'est au bureau d'agir.
2. La **modification** porte sur l'article (une autre déclinaison), la quantité et le
   moyen de paiement. L'adhérent de la commande ne change jamais. Les contrôles sont
   ceux de la création : stock disponible, déclinaison plutôt que produit parent,
   moyen de paiement proposé. Le montant est recalculé sur le prix actuel.
3. L'**annulation** passe la commande à `cancelled`, sans mouvement de stock ni écriture :
   rien n'était engagé. Elle demande confirmation et ne notifie personne.
4. La commande doit **appartenir à l'adhérent** : l'espace adhérent ne transmet qu'un
   adhérent du foyer de la session, et l'API répond « commande introuvable » pour la
   commande d'un autre, sans révéler qu'elle existe.
5. Si le bureau valide ou refuse la commande au même moment, l'action de l'adhérent
   échoue en conflit et rien n'est écrit.
6. La saison doit être ouverte.

### 3.5 Remise (`paid` → `delivered`) et son annulation
1. La remise n'est permise que sur une commande **payée** : on ne remet pas un article
   non réglé.
2. Elle enregistre la **date de remise** (le jour même) et **ne touche ni au stock ni à la
   comptabilité** : le stock a été réservé à la validation, la recette écrite à
   l'encaissement.
3. Elle ne notifie pas l'adhérent : il a l'article en main.
4. Elle n'est pas bloquée par la clôture d'exercice, faute d'écriture.
5. Une remise cochée par erreur s'**annule** (`delivered` → `paid`) : la date de remise est
   effacée, l'encaissement reste. Une commande livrée ne voit pas son encaissement annulé
   directement : on défait un pas à la fois.
6. Tant qu'elle n'est pas livrée, une commande payée reste **en cours** à l'écran : elle
   compte parmi les commandes à traiter du tableau de bord.

### 3.6 Relance
1. Les commandes en `awaiting_payment` depuis **plus de sept jours** déclenchent une
   relance à l'adhérent, dans la catégorie de notification `reminder`.
2. La relance est **hebdomadaire** et **idempotente** : un déclencheur programmé rejoué
   pour la même échéance n'envoie pas deux messages.
3. Elle ne part que si les relances automatiques sont activées sur le service
   (`PUSH_REMINDERS_ENABLED`), le même interrupteur que les relances de cotisation.

### 3.7 Clôture d'exercice
Une commande portant une **date de paiement** alors qu'elle n'est pas au statut `paid`
signale de l'argent reçu sans écriture correspondante : elle **bloque la clôture** de
l'exercice.

### 3.8 Qui fait quoi
Deux droits se partagent le parcours :

| Droit | Transitions | Rôles |
|---|---|---|
| `shop:orders:approve` | valider, refuser, annuler, livrer, annuler la remise | entraîneur, trésorier, présidence |
| `shop:payments:write` | encaisser, annuler l'encaissement | trésorier |

L'encaissement écrit une recette au grand livre, son annulation la retire : ce sont des
actes comptables, réservés à la trésorerie. L'entraîneur valide donc les commandes de
ses joueurs et leur remet l'article, mais seulement une fois que le trésorier a encaissé.
L'écran n'offre pas une action que l'utilisateur n'a pas le droit d'accomplir.

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

  Scénario: Refus motivé d'une commande
    Étant donné une commande créée de 1 unité de "Maillot Club Taille M"
    Quand le bureau refuse la commande avec le motif "Taille épuisée chez le fournisseur"
    Alors la commande passe au statut "refusée"
    Et le motif est conservé sur la commande
    Et l'adhérent reçoit une notification qui cite ce motif
    Et le motif s'affiche sous la commande dans « Mes commandes »

  Scénario: L'adhérent modifie sa commande avant validation
    Étant donné une commande créée de 1 unité de "Maillot Club Taille M" à 25,00 €
    Quand l'adhérent la modifie pour 2 unités de "Maillot Club Taille L"
    Alors la commande porte 2 unités de "Maillot Club Taille L" pour 50,00 €
    Et elle reste au statut "créée"
    Et le stock n'est pas touché

  Scénario: L'adhérent annule sa commande avant validation
    Étant donné une commande créée de 2 unités de "Boîte Volants Plumes"
    Quand l'adhérent l'annule depuis « Mes commandes »
    Alors la commande passe au statut "annulée"
    Et le stock n'est pas touché

  Scénario: Une commande validée ne se modifie plus depuis l'espace adhérent
    Étant donné une commande en attente de paiement
    Quand l'adhérent tente de la modifier ou de l'annuler
    Alors l'opération est refusée
    Et la commande reste inchangée

  Scénario: La commande d'un autre adhérent est introuvable
    Étant donné une commande créée appartenant à un autre adhérent
    Quand l'adhérent tente de l'annuler
    Alors l'opération est refusée avec le message "Commande introuvable"

  Scénario: Annulation d'une commande jamais réglée
    Étant donné une commande en attente de paiement de 2 unités de "Boîte Volants Plumes"
    Et un stock de 8 unités
    Quand le bureau annule la commande faute de règlement
    Alors la commande passe au statut "annulée"
    Et le stock remonte à 10 unités
    Et aucune écriture n'est enregistrée au grand livre

  Scénario: Remise d'une commande payée
    Étant donné une commande payée de 2 unités de "Boîte Volants Plumes"
    Et un stock de 8 unités
    Quand le bureau enregistre la remise de l'article
    Alors la commande passe au statut "livrée", datée du jour
    Et le stock reste à 8 unités
    Et la recette au grand livre est inchangée

  Scénario: On ne livre pas une commande non réglée
    Étant donné une commande en attente de paiement
    Quand le bureau tente de la livrer
    Alors l'opération est refusée
    Et la commande reste au statut "en attente de paiement"

  Scénario: Annulation d'une remise cochée par erreur
    Étant donné une commande livrée
    Quand le bureau annule la remise
    Alors la commande repasse au statut "payée"
    Et sa date de remise est effacée
    Et la recette au grand livre est inchangée

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

  Scénario: L'entraîneur valide et livre, sans encaisser
    Étant donné un utilisateur portant le seul rôle entraîneur
    Et une commande en attente de paiement
    Quand il tente de l'encaisser
    Alors l'opération est refusée faute de droit
    Et la commande reste au statut "en attente de paiement"
    Quand le trésorier l'encaisse
    Et que l'entraîneur la livre
    Alors la commande passe au statut "livrée"
```
