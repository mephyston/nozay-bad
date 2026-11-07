# RF-BUV-001 : La carte buvette

## 1. Description et Objectif Métier

N'importe qui obtient une carte buvette en moins d'une minute, sans mot de passe ni licence, et la retrouve avec son solde s'il change ou perd de téléphone.

---

## 2. Domaine Fonctionnel

- **Domaine** : buvette
- **Agrégat / Entité clé** : Carte buvette, Appareil
- **Statut** : Draft

---

## 3. Définition de la Règle Métier

**Une carte, une adresse vérifiée.** Le client saisit son adresse électronique puis le code à 6 chiffres reçu. La carte existe dès que le code est validé. Aucune autre donnée n'est demandée. Une adresse déjà connue rouvre sa carte au lieu d'en créer une.

**Toute carte créditée peut être retrouvée.** Comme la vérification précède la création, aucune carte n'a de solde sans adresse vérifiée.

**Le parcours se fait avant la caisse.** Une affiche à la buvette et un QR code affiché par la caisse mènent à la même page.

**Plusieurs appareils pour une carte.** Le même parcours ouvre la carte sur un autre téléphone. C'est ainsi qu'un parent la partage avec son enfant, et qu'on la retrouve après une perte. Un courriel signale chaque nouvel appareil.

**« Déconnecter tous les appareils ».** Depuis n'importe quel appareil ouvert, le client ferme tous les autres. Le solde ne bouge pas.

**Le QR code expire.** Il reste valable 60 secondes et se renouvelle tant que la page est ouverte. Une capture d'écran devient vite inutilisable, et un appareil déconnecté n'en obtient plus. Il ne contient ni le solde ni l'adresse.

**Le solde n'expire pas.** Il reste dû jusqu'à sa consommation ou son remboursement (RF-BUV-004).

**Un plafond de solde.** Le club le règle ; 100 € par défaut. Une recharge qui le dépasserait est refusée.

**Une carte à solde nul peut être supprimée** à la demande du client. L'historique comptable est conservé sans l'adresse.

---

## 4. Scénarios d'Acceptation (Gherkin)

```gherkin
# language: fr

Fonctionnalité: Carte buvette

  Scénario: Créer une carte
    Étant donné un visiteur sans carte
    Quand il saisit son adresse et le code reçu
    Alors sa carte s'affiche avec un solde de 0 € et un QR code

  Scénario: Retrouver sa carte sur un nouveau téléphone
    Étant donné une carte de 18 € rattachée à une adresse
    Quand son titulaire saisit cette adresse et le code reçu sur un nouveau téléphone
    Alors la carte s'ouvre avec un solde de 18 €
    Et un courriel signale le nouvel appareil

  Scénario: Un code erroné n'ouvre rien
    Étant donné un code envoyé à une adresse
    Quand le visiteur saisit un autre code
    Alors la carte ne s'ouvre pas

  Scénario: Un téléphone perdu ne peut plus payer
    Étant donné une carte ouverte sur deux téléphones
    Quand le titulaire déconnecte tous les appareils depuis l'un d'eux
    Alors l'autre téléphone n'obtient plus de QR code valable
    Et le solde reste inchangé

  Scénario: Un QR code expiré est refusé
    Étant donné un QR code émis il y a plus de 60 secondes
    Quand la caisse le scanne
    Alors la caisse demande un QR code à jour
```
