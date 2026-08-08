# RF-NOT-003 : Catégories réglables par l'adhérent

## 1. Description et Objectif Métier

Un adhérent qui accepte les notifications ne veut pas forcément tout recevoir. Cinq catégories lui sont proposées, qu'il coupe ou rétablit depuis son espace, sans avoir à désactiver complètement les notifications — ce qu'il ferait sinon, et le club perdrait le canal.

---

## 2. Domaine Fonctionnel

- **Domaine** : notifications
- **Agrégat / Entité clé** : Préférence (`push_preferences`)
- **Statut** : Validé

---

## 3. Définition de la Règle Métier

**Les cinq catégories.** `announcement` (communications du bureau), `birthday` (anniversaires), `expense` (notes de frais), `order` (commandes boutique), `reminder` (relances cotisation et commandes en attente).

**Réglage par désabonnement.** Activer les notifications donne tout ; l'adhérent décoche ensuite. L'absence de ligne en base vaut « activé ». Deux conséquences voulues : une catégorie ajoutée plus tard est active pour tout le monde sans migration de données, et un adhérent abonné ne peut jamais se retrouver à ne rien recevoir sans l'avoir décidé.

**Portée du réglage.** Les préférences sont attachées au compte (l'email du foyer), pas à l'appareil : un adhérent qui coupe les anniversaires les coupe sur son téléphone comme sur sa tablette. C'est cohérent avec le fait qu'une notification vise un compte.

**Application à l'envoi.** Toute diffusion porte une catégorie et écarte les comptes l'ayant coupée, quel que soit le ciblage — y compris une liste d'emails explicite issue d'un événement métier.

**Envois manuels.** Une annonce envoyée depuis l'administration est toujours une communication du bureau. Les quatre autres catégories ne sont émises que par les crons et les événements métier : les proposer à l'émetteur n'offrirait que des façons de se tromper de destinataires.

**Enregistrement immédiat.** L'écran de réglages enregistre à chaque bascule, sans bouton de validation. En cas d'échec, la case revient à son état précédent : afficher un réglage non enregistré est pire que de ne rien afficher.

**Catégories inconnues.** Une préférence portant sur une catégorie absente du code est ignorée plutôt que stockée, afin qu'un client obsolète ne pollue pas la table.

---

## 4. Scénarios d'Acceptation (Gherkin)

```gherkin
# language: fr

Fonctionnalité: Catégories de notifications réglables

  Scénario: Toutes les catégories sont actives par défaut
    Étant donné un adhérent venant d'activer les notifications
    Quand il ouvre ses réglages de notifications
    Alors les cinq catégories lui sont présentées
    Et toutes sont actives

  Scénario: Couper une catégorie
    Étant donné un adhérent abonné qui coupe la catégorie "Anniversaires"
    Quand le club diffuse les anniversaires du jour
    Alors cet adhérent ne reçoit rien
    Et il reçoit toujours les communications du bureau

  Scénario: Une relance respecte le réglage même sur un ciblage nominatif
    Étant donné un adhérent non soldé ayant coupé la catégorie "Relances"
    Quand le rappel de cotisation est diffusé aux foyers non soldés
    Alors cet adhérent n'est pas destinataire

  Scénario: Rétablir une catégorie
    Étant donné un adhérent ayant coupé "Relances" et "Anniversaires"
    Quand il réactive "Relances" depuis ses réglages
    Alors seule la catégorie "Anniversaires" reste coupée

  Scénario: Le réglage vaut pour tous les appareils du compte
    Étant donné un adhérent abonné depuis son téléphone et sa tablette
    Quand il coupe une catégorie depuis son téléphone
    Alors sa tablette ne reçoit plus cette catégorie non plus

  Scénario: Échec d'enregistrement
    Étant donné un adhérent modifiant un réglage
    Quand l'enregistrement échoue
    Alors la case revient à son état précédent
    Et l'échec lui est signalé
```
