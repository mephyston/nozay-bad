# RF-BUV-006 : La carte papier

## 1. Description et Objectif Métier

Un enfant ou une personne sans téléphone paie à la buvette avec une carte imprimée de 5 ou 10 €. Le bénévole la scanne, encaisse, puis barre les cases consommées. Le solde du serveur fait foi : les cases ne sont qu'un repère pour le porteur.

---

## 2. Domaine Fonctionnel

- **Domaine** : buvette
- **Agrégat / Entité clé** : Carte buvette (`kind = 'paper'`)
- **Statut** : Draft

---

## 3. Définition de la Règle Métier

**Imprimée par lot, sans valeur avant la vente.** Le bureau génère un lot depuis l'administration. Le code de chaque carte, long et aléatoire, n'est affiché qu'à cette impression : seule son empreinte reste en base. Une carte perdue avant sa vente ne vaut rien.

**Un montant fixe.** 5 ou 10 €, vendus à la caisse en espèces ou en CB. Elle ne se recharge pas : on en vend une nouvelle.

**Au porteur.** Elle vaut de l'argent liquide : perdue, son solde est perdu, sauf si elle a été rattachée à un compte. Son QR code est fixe.

**Le paiement.** Le bénévole scanne la carte ou saisit son code, encaisse, et barre les cases. Si le solde ne suffit pas, le reste se règle en espèces ou en CB.

**Rattacher à un compte.** Le QR code imprimé est une adresse de l'app buvette. Le porteur la scanne, ouvre sa carte, et transfère le solde sur son compte. La carte papier est alors fermée. Le plafond du compte s'applique.

**L'impression.** Dix cartes par page A4, sans rien d'autre sur la feuille. Le QR code porte le logo du club en son centre.

**Vendue une seule fois.** Une carte qui attend déjà sa CB ne se revend pas, et son solde ne dépasse jamais sa valeur : si deux caisses la vendent à la même seconde, la seconde est refusée.

**Remboursée une seule fois.** Le remboursement en espèces porte sur tout le solde et ferme la carte dans le même lot. Une carte remboursée ou transférée présentée à nouveau est refusée avec le motif : la refuser n'est pas laissé à la vigilance du bénévole.

**Comptabilité.** Comme une recharge : un virement vers le compte de dette à la vente, une recette à la consommation, un virement vers la caisse au remboursement. Un transfert vers un compte ne touche ni la caisse ni le grand livre : l'argent reste dû au client.

---

## 4. Scénarios d'Acceptation (Gherkin)

```gherkin
# language: fr

Fonctionnalité: Carte papier

  Scénario: Vendre une carte
    Étant donné une carte de 10 € pas encore vendue
    Quand le bénévole la scanne et encaisse 10 €
    Alors la carte a un solde de 10 €

  Scénario: Payer et barrer
    Étant donné une carte papier de 10 €
    Quand le bénévole la scanne pour un café à 1 €
    Alors le solde passe à 9 €
    Et la caisse lui rappelle de barrer 1 €

  Scénario: Une carte ne se rembourse qu'une fois
    Étant donné une carte papier remboursée
    Quand le bénévole la scanne de nouveau
    Alors la caisse indique qu'elle a déjà été remboursée
    Et aucune espèce ne sort

  Scénario: Rattacher une carte à son compte
    Étant donné une carte papier de 8 € et un compte à 2 €
    Quand le porteur la rattache depuis son téléphone
    Alors le compte passe à 10 €
    Et la carte papier ne vaut plus rien

  Scénario: Une carte transférée ne se rembourse pas
    Étant donné une carte papier rattachée à un compte
    Quand elle est présentée pour un remboursement
    Alors le remboursement est refusé
```
