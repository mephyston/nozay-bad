# RF-ACC-003 : Encaissement d'espèces signé par les deux parties

## 1. Description et Objectif Métier
Des espèces remises au gymnase (cotisation, stage, cordage, volants, maillot…) ont disparu entre l'adhérent et la comptabilité, sans qu'on sache à quelle étape. L'équivalent papier serait un bordereau signé en double exemplaire, encore faut-il l'avoir sous la main.

Chaque passage de main devient un **reçu électronique signé des deux parties, sur place** : de l'adhérent à celui qui encaisse, puis de celui qui encaisse au trésorier. Une somme qui disparaît laisse ainsi une trace : une personne et une étape.

---

## 2. Domaine Fonctionnel
- **Domaine** : accounting (encaissement), members (payeur), iam (droit d'encaisser)
- **Agrégat / Entité clé** : Reçu d'espèces, Remise d'espèces
- **Statut** : Validé (12/11/2026), phase 1 en cours

---

## 3. Définition de la Règle Métier

### 3.1 Qui encaisse
- Seuls les comptes ayant le droit **« Encaisser des espèces »** peuvent ouvrir un encaissement. Ce droit est donné aux rôles entraîneur, trésorier et président.
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
- **Le reçu est scellé.** Il n'est plus modifiable. Une erreur se corrige par un reçu d'annulation signé de la même façon.
- **Le payeur reçoit son reçu par courriel** : son exemplaire.
- **La recette est passée** dans sa catégorie, sur le compte de trésorerie **« Espèces en circulation »**. Une cotisation passe à « réglée », comme pour tout autre règlement.
- **L'argent est « en main de »** l'encaisseur.

### 3.5 Espèces en circulation
- Un écran montre, par personne : la somme détenue, depuis quand, et les reçus qui la composent.
- Au-delà de **7 jours** de détention, le trésorier est alerté.

### 3.6 La remise au trésorier
- Le trésorier ouvre une remise pour un encaisseur. Il **compte l'enveloppe** et saisit le montant compté. L'écran affiche en face la somme des reçus détenus.
- **Les deux signent sur place** : le trésorier par sa saisie, l'encaisseur par un QR code ou la signature au doigt (il est lui aussi connecté à l'admin).
- **Écritures :**
  - un virement interne du montant compté, d'« Espèces en circulation » vers la Caisse ;
  - s'il y a un écart, une écriture en « Écarts de caisse », rattachée à la remise et donc à la personne.
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
    Et la cotisation d'Alex est réglée
    Et Alex reçoit son reçu par courriel
    Et Camille détient 150 € d'espèces en circulation

  Scénario: Pas de signature, pas d'encaissement
    Étant donné un encaissement de 150 € ouvert par Camille
    Quand personne ne le confirme et que Camille l'abandonne
    Alors aucune écriture n'est passée et la cotisation reste due

  Scénario: QR code scanné par un autre foyer
    Étant donné un encaissement ouvert pour le foyer d'Alex
    Quand un adhérent d'un autre foyer scanne le QR code
    Alors la confirmation est refusée

  Scénario: Payeur sans téléphone
    Quand Camille fait signer le payeur au doigt sur son écran
    Alors le reçu est scellé et marqué « signé à l'écran »

  Scénario: Remise avec un écart
    Étant donné Camille détenant 450 € en trois reçus
    Quand le trésorier compte 350 € et que les deux signent la remise
    Alors 350 € passent en Caisse
    Et un écart de 100 € est enregistré au nom de Camille sur cette remise
```

---

## 5. Découpage proposé

- **Phase 1** — Encaissement avec les trois modes de signature, reçu par courriel, espèces en circulation, remise au trésorier.
- **Phase 2** — Rattacher un encaissement à une commande de la boutique (la commande passe à « payée »). Alerte au-delà de 7 jours.
