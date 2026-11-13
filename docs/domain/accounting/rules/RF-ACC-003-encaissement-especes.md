# RF-ACC-003 : Encaissement d'espèces signé par les deux parties

## 1. Description et Objectif Métier
Des espèces remises au gymnase (cotisation, stage, cordage, volants, maillot…) ont disparu entre l'adhérent et la comptabilité, sans qu'on sache à quelle étape. L'équivalent papier serait un bordereau signé en double exemplaire, encore faut-il l'avoir sous la main.

Chaque passage de main devient un **reçu électronique signé des deux parties, sur place** : de l'adhérent à celui qui encaisse, puis de celui qui encaisse au trésorier. Une somme qui disparaît laisse ainsi une trace : une personne et une étape.

---

## 2. Domaine Fonctionnel
- **Domaine** : accounting (encaissement et remise), members (payeur), iam (droits d'encaisser et de recevoir une remise)
- **Agrégat / Entité clé** : Reçu d'espèces, Remise d'espèces
- **Statut** : Validé (12/11/2026), phase 1 en cours

---

## 3. Définition de la Règle Métier

### 3.1 Qui encaisse
- Seuls les comptes ayant le droit **« Encaisser des espèces »** peuvent ouvrir un encaissement. Ce droit est donné aux rôles entraîneur, trésorier et président.
- Seul le droit **« Recevoir une remise d'espèces »**, donné au trésorier, ouvre une remise et passe les écritures.
- L'encaissement est **toujours lancé par celui qui reçoit l'argent**, depuis l'admin, connecté avec son propre compte. Cette saisie authentifiée et horodatée est **sa signature** : il ne peut plus nier avoir reçu l'argent.

### 3.2 Ce que l'on encaisse
- **Un payeur.** C'est un adhérent ou un membre de son foyer, par exemple un parent qui paie pour son enfant.
- **Un montant**, en euros, strictement positif.
- **Un motif.** C'est une catégorie comptable : cotisation, stage, cordage, volants, maillot… Une cotisation se rattache à l'adhésion concernée.
- **Un commentaire libre**, facultatif.

### 3.3 La signature du payeur, sur place
L'encaissement **n'existe pas** tant que le payeur ne l'a pas signé. L'écran de l'encaisseur attend. Trois modes, dans l'ordre de préférence :

1. **QR code scanné dans l'espace adhérent.** L'écran de l'encaisseur affiche un QR code. Le payeur le scanne avec le bouton « Scanner un reçu » de son espace adhérent, où il est connecté. Il voit le montant, le motif et le nom de l'encaisseur, puis appuie sur « Je confirme ».
   - Le QR code ne sert qu'une fois, pendant 2 minutes, et pour cet encaissement seulement.
   - Seul un compte du foyer du payeur peut confirmer.
   - Le scan avec l'appareil photo du téléphone n'est pas accepté : sur iPhone, il ouvrirait le navigateur, où l'adhérent n'est pas connecté.
2. **Code reçu par courriel.** C'est le mode à utiliser si le payeur n'est pas connecté à son espace. Un code à 4 chiffres part sur l'adresse du foyer. Le payeur le lit à l'encaisseur, qui le saisit.
   - Le code est valable 10 minutes.
   - Trois essais au plus.
3. **Signature au doigt** sur l'écran de l'encaisseur, en dernier recours (payeur sans téléphone). Le reçu est marqué **« signé à l'écran »** et le bureau voit ces reçus à part.

Abandonné avant signature, l'encaissement est annulé et ne laisse aucune écriture.

### 3.4 Une fois signé
- **Le reçu est scellé.** Il n'est plus modifiable. Une erreur se corrige à la remise : le trésorier compte ce qu'il reçoit, et l'écart se voit.
- **Le payeur reçoit son reçu par courriel** : son exemplaire.
- **L'argent est « en main de »** l'encaisseur.
- **Aucune écriture comptable n'est passée à ce stade.** L'entraîneur et la présidence n'écrivent jamais au grand livre (séparation des tâches). La recette naît à la remise, de la main du trésorier.
- Le statut « réglée » d'une cotisation vient de l'import Poona, jamais de l'application : le reçu n'y touche pas. Il se consulte sur la fiche de l'adhérent.

### 3.5 Espèces en circulation
- Les espèces détenues sont la somme des reçus scellés et pas encore remis. Un écran les montre par personne : la somme, depuis quand, et les reçus qui la composent.
- Au-delà de **7 jours** de détention, le trésorier est alerté (phase 2).

### 3.6 La remise au trésorier
- Le trésorier ouvre une remise pour un encaisseur. Elle reprend tous ses reçus non remis. Il **compte l'enveloppe** et saisit le montant compté. L'écran affiche en face la somme des reçus.
- **Les deux signent sur place.** Le trésorier signe par sa saisie. L'encaisseur scanne le QR code de la remise depuis l'admin, connecté avec son propre compte, ou signe au doigt en dernier recours.
- **Écritures, passées par le trésorier à la signature de la remise :**
  - une recette par reçu, en Caisse, dans la catégorie du reçu, rattachée à l'adhérent et datée du jour du reçu ;
  - s'il y a un écart, une écriture dans la catégorie d'écart choisie par le trésorier (dépense s'il manque de l'argent, recette s'il y en a trop), rattachée à la remise et donc à la personne.
- Les reçus remis sortent de la détention de l'encaisseur.

### 3.7 Ce que l'outil ne peut pas voir
Un encaisseur qui garde l'argent sans rien saisir. La parade est une règle annoncée aux adhérents : **« Pas de reçu sur votre téléphone, pas de paiement. »** Elle est appuyée par le rappel « cotisation due », qui continue de partir tant que rien n'est enregistré.

---

## 4. Scénarios d'Acceptation (Gherkin)

```gherkin
# language: fr

Fonctionnalité: Encaissement d'espèces signé par les deux parties

  Scénario: Cotisation payée en espèces, confirmée par QR code
    Étant donné l'entraîneur Camille connecté à l'admin
    Et l'adhérent Alex connecté à son espace adhérent
    Quand Camille encaisse 150 € pour la cotisation d'Alex
    Et qu'Alex scanne le QR code dans son espace et confirme
    Alors le reçu est scellé, signé par Camille et par le foyer d'Alex
    Et Alex reçoit son reçu par courriel
    Et Camille détient 150 € d'espèces en circulation

  Scénario: Pas de signature, pas d'encaissement
    Étant donné un encaissement de 150 € ouvert par Camille
    Quand personne ne le confirme et que Camille l'abandonne
    Alors l'encaissement est annulé et ne laisse aucune trace en détention

  Scénario: QR code scanné par un autre foyer
    Étant donné un encaissement ouvert pour le foyer d'Alex
    Quand un adhérent d'un autre foyer scanne le QR code
    Alors la confirmation est refusée

  Scénario: Le reçu ne passe aucune écriture
    Étant donné un reçu de 150 € scellé par Camille
    Alors le grand livre n'a aucune écriture nouvelle tant que la remise n'est pas signée

  Scénario: Payeur sans téléphone
    Quand Camille fait signer le payeur au doigt sur son écran
    Alors le reçu est scellé et marqué « signé à l'écran »

  Scénario: Remise avec un écart
    Étant donné Camille détenant 450 € en trois reçus
    Quand le trésorier compte 350 € et que les deux signent la remise
    Alors trois recettes, de 450 € en tout, sont passées en Caisse
    Et une dépense de 100 € est passée en écart de caisse, rattachée à la remise de Camille
    Et Camille ne détient plus rien
```

---

## 5. Découpage proposé

- **Phase 1** — Encaissement avec les trois modes de signature, reçu par courriel, espèces en circulation, remise au trésorier.
- **Phase 2** — Rattacher un encaissement à une commande de la boutique (la commande passe à « payée »). Alerte au-delà de 7 jours.
