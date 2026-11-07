# RF-BUV-004 : Remboursement du solde en espèces

## 1. Description et Objectif Métier

Un client qui ne veut plus utiliser sa carte récupère son solde en espèces auprès d'un bénévole, sans intervention du trésorier.

---

## 2. Domaine Fonctionnel

- **Domaine** : buvette
- **Agrégat / Entité clé** : Carte buvette, Session de caisse
- **Statut** : Draft

---

## 3. Définition de la Règle Métier

**Le solde entier.** Le remboursement porte sur tout le solde, jamais sur une partie. La carte reste ouverte, à 0 €, et peut être rechargée.

**En espèces uniquement,** dans une session de caisse ouverte.

**Le client est présent.** Le bénévole scanne le QR code à jour de sa carte, ou saisit le code affiché dessous (RF-BUV-001). Un client qui a perdu son téléphone rouvre d'abord sa carte sur un autre appareil (RF-BUV-001).

**Rien n'est en cours.** Le remboursement est refusé tant qu'une réservation existe sur la carte.

**La caisse doit pouvoir payer.** Le remboursement est refusé si les espèces théoriques sont inférieures au montant.

**Le bénévole confirme la remise.** Après le remboursement, la caisse lui demande de confirmer qu'il a remis les espèces au client.

**Atomique.** La mise à zéro de la carte et la sortie d'espèces sont enregistrées ensemble, sous un identifiant qui empêche de rembourser deux fois.

**Traçabilité.** Le remboursement apparaît dans l'historique de la carte, un courriel en informe le titulaire, chaque mouvement garde le nom du bénévole et la clôture en donne le total.

**Comptabilité.** Ce n'est pas une dépense : un virement va de la caisse vers le compte de dette de cartes (RF-BUV-003).

---

## 4. Scénarios d'Acceptation (Gherkin)

```gherkin
# language: fr

Fonctionnalité: Remboursement du solde

  Scénario: Remboursement nominal
    Étant donné une carte de 15 € et des espèces théoriques de 60 €
    Quand le bénévole scanne le QR code et confirme le remboursement
    Alors le solde passe à 0 €
    Et les espèces théoriques passent à 45 €
    Et le titulaire reçoit un courriel

  Scénario: Pas assez d'espèces
    Étant donné une carte de 15 € et des espèces théoriques de 10 €
    Quand le bénévole demande le remboursement
    Alors il est refusé et le solde reste à 15 €

  Scénario: Une vente est en cours sur la carte
    Étant donné une carte de 15 € dont 5 € sont réservés
    Quand le bénévole demande le remboursement
    Alors il est refusé tant que la vente n'est pas terminée

  Scénario: Double validation
    Étant donné un remboursement de 15 € déjà enregistré
    Quand la même demande est rejouée
    Alors aucune nouvelle sortie d'espèces n'est enregistrée

  Scénario: Carte à solde nul
    Étant donné une carte à 0 €
    Quand le bénévole la scanne pour un remboursement
    Alors la caisse indique qu'il n'y a rien à rembourser

  Scénario: QR code expiré
    Étant donné une capture d'écran d'un QR code vieille de plus de 60 secondes
    Quand le bénévole la scanne pour un remboursement
    Alors le remboursement est refusé
```
