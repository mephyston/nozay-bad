# RF-BUV-004 : Remboursement du solde

## 1. Description et Objectif Métier

Un client qui ne veut plus utiliser sa carte récupère son solde auprès d'un bénévole, sans intervention du trésorier : sur la carte bancaire qui l'avait chargée quand c'est possible, sinon en espèces.

---

## 2. Domaine Fonctionnel

- **Domaine** : buvette
- **Agrégat / Entité clé** : Carte buvette, Session de caisse
- **Statut** : Draft

---

## 3. Définition de la Règle Métier

**Le solde entier.** Le remboursement porte sur tout le solde, jamais sur une partie. La carte reste ouverte, à 0 €, et peut être rechargée.

**D'abord sur la CB qui a chargé la carte.** Ce que des recharges payées par CB ont apporté revient sur ces CB, par l'API SumUp : la recharge la plus récente d'abord, pour sa part recharge, jusqu'à épuiser le solde. Le reste sort en espèces. Une recharge déjà remboursée, même en partie ou dans l'application SumUp, ne sert pas une seconde fois. Sans SumUp configuré, tout sort en espèces. Le tout se fait dans une session de caisse ouverte.

**Rien ne se dépense pendant le remboursement.** Le solde est réservé le temps que SumUp réponde. Une part que SumUp refuse est rendue en espèces sur-le-champ. Une part sans réponse reste « demandée » : la vérification périodique la confirme, ou la signale à la caisse au bout de 30 minutes pour être relancée.

**Le bénévole sait toujours ce qu'il remet.** Avant comme après, la caisse montre en grand les espèces à remettre, ou « Aucune espèce à remettre ». Chaque part rendue par SumUp dit qu'elle ne se rend pas en espèces.

**Le client est présent.** Le bénévole scanne le QR code à jour de sa carte, ou saisit le code affiché dessous (RF-BUV-001). Un client qui a perdu son téléphone rouvre d'abord sa carte sur un autre appareil (RF-BUV-001).

**Rien n'est en cours.** Le remboursement est refusé tant qu'une réservation existe sur la carte.

**La caisse doit pouvoir payer.** Le remboursement est refusé si les espèces théoriques sont inférieures à la part en espèces.

**Le bénévole confirme la remise.** Après le remboursement, la caisse lui demande de confirmer qu'il a remis les espèces au client.

**Atomique.** La mise à zéro de la carte et la sortie d'espèces sont enregistrées ensemble, sous un identifiant qui empêche de rembourser deux fois.

**Traçabilité.** Le remboursement apparaît dans l'historique de la carte, chaque mouvement garde le nom du bénévole et la clôture en donne le total.

**Aucun courriel.** Le remboursement n'envoie pas de courriel (RF-BUV-001) : l'historique de la carte en fait foi.

**Comptabilité.** Ce n'est pas une dépense : un virement va de la caisse vers le compte de dette de cartes pour la part en espèces, du compte SumUp vers ce même compte pour la part rendue sur CB (RF-BUV-003).

---

## 4. Scénarios d'Acceptation (Gherkin)

```gherkin
# language: fr

Fonctionnalité: Remboursement du solde

  Scénario: Remboursement nominal
    Étant donné une carte de 15 € rechargée en espèces et des espèces théoriques de 60 €
    Quand le bénévole scanne le QR code et confirme le remboursement
    Alors le solde passe à 0 €
    Et les espèces théoriques passent à 45 €

  Scénario: Le solde revient sur la CB de recharge
    Étant donné une carte rechargée de 20 € par CB, dont 5 € ont été dépensés
    Quand le bénévole la rembourse
    Alors SumUp rend 15 € sur la carte bancaire
    Et la caisse indique qu'aucune espèce n'est à remettre

  Scénario: Recharges mêlées
    Étant donné une carte rechargée de 10 € en espèces puis de 8 € par CB
    Quand le bénévole la rembourse
    Alors 8 € reviennent sur la CB et 10 € sont à remettre en espèces

  Scénario: SumUp refuse
    Étant donné une carte rechargée de 10 € par CB
    Quand SumUp refuse le remboursement
    Alors les 10 € sont à remettre en espèces

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
