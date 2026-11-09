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

**Des conditions acceptées.** Avant de recevoir son code, le client coche l'acceptation des conditions d'utilisation de la carte. Sans elle, aucun code ne part. La version acceptée et sa date sont enregistrées sur la carte, à chaque ouverture. Les conditions, la politique de confidentialité et les mentions légales se lisent sans carte, depuis la page de connexion.

**Le chargement se fait à la buvette.** Aucun paiement en ligne : la page de connexion et l'accueil de la carte le disent.

**Une carte de compte créditée peut être retrouvée.** Comme la vérification précède la création, aucune carte de compte n'a de solde sans adresse vérifiée. Une carte papier, elle, est au porteur (RF-BUV-006).

**Le parcours se fait avant la caisse.** Une affiche à la buvette et un QR code affiché par la caisse mènent à la même page.

**Plusieurs appareils pour une carte.** Le même parcours ouvre la carte sur un autre téléphone. C'est ainsi qu'un parent la partage avec son enfant, et qu'on la retrouve après une perte.

**Un seul courriel : le code.** La buvette n'envoie aucun autre courriel, ni alerte de nouvel appareil, ni confirmation de recharge, de remboursement ou de suppression. Un tournoi compte 250 à 300 clients sur un week-end, et le quota d'envoi est réservé aux codes.

**« Déconnecter tous les appareils ».** Depuis n'importe quel appareil ouvert, le client ferme tous les autres. Le solde ne bouge pas.

**Le QR code expire.** Il reste valable 60 secondes et se renouvelle tant que la page est ouverte. Une capture d'écran devient vite inutilisable, et un appareil déconnecté n'en obtient plus. Il ne contient ni le solde ni l'adresse.

**Un code à saisir, si la caméra ne lit pas.** Sous le QR code, l'application affiche le numéro de la carte suivi de 6 chiffres. Ces chiffres changent chaque minute et restent acceptés 2 à 3 minutes, le temps de les dicter. Ils dépendent de l'appareil : un appareil déconnecté n'a plus de code valable.

**Le solde n'expire pas.** Il reste dû jusqu'à sa consommation ou son remboursement (RF-BUV-004).

**Un plafond de solde.** Le club le règle ; 100 € par défaut. Une recharge qui le dépasserait est refusée.

**Buvette éteinte par le club.** Quand le club désactive la buvette dans ses fonctionnalités, l'app des clients affiche « La buvette est fermée » et rappelle que la carte et son solde sont conservés. La caisse affiche « La caisse est désactivée » et indique où la réactiver. Les deux répondent 503 (fermée pour le moment) et non 404, et les soldes ne bougent pas.

**Une carte à solde nul peut être supprimée** à la demande du client. L'adresse est effacée, les appareils sont fermés et l'historique comptable est conservé. La même adresse peut ensuite ouvrir une nouvelle carte.

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

  Scénario: Les conditions doivent être acceptées
    Étant donné un visiteur qui n'a pas coché les conditions d'utilisation
    Quand il demande son code
    Alors aucun code n'est envoyé

  Scénario: La version acceptée est gardée
    Étant donné une carte ouverte avec les conditions du 8 novembre 2026
    Quand son titulaire la rouvre en acceptant une version plus récente
    Alors la carte garde la version la plus récente et sa date

  Scénario: Un code erroné n'ouvre rien
    Étant donné un code envoyé à une adresse
    Quand le visiteur saisit un autre code
    Alors la carte ne s'ouvre pas

  Scénario: Un téléphone perdu ne peut plus payer
    Étant donné une carte ouverte sur deux téléphones
    Quand le titulaire déconnecte tous les appareils depuis l'un d'eux
    Alors l'autre téléphone n'obtient plus de QR code valable
    Et le solde reste inchangé

  Scénario: Le bénévole saisit le code affiché sous le QR code
    Étant donné une caisse dont la caméra ne lit pas
    Quand le bénévole saisit le code affiché sur le téléphone du client
    Alors la carte est reconnue comme par un scan

  Scénario: Un code noté trop tôt est refusé
    Étant donné un code affiché il y a plus de 3 minutes
    Quand le bénévole le saisit
    Alors la caisse demande le code affiché à cet instant

  Scénario: Un QR code expiré est refusé
    Étant donné un QR code émis il y a plus de 60 secondes
    Quand la caisse le scanne
    Alors la caisse demande un QR code à jour
```
