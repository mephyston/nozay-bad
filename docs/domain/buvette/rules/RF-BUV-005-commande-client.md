# RF-BUV-005 : La commande préparée par le client

## 1. Description et Objectif Métier

Un porteur de carte prépare sa commande sur son téléphone. Le bénévole n'a plus de saisie à faire : il retrouve la commande, l'encaisse et la prépare.

---

## 2. Domaine Fonctionnel

- **Domaine** : buvette
- **Agrégat / Entité clé** : Commande
- **Statut** : Draft

---

## 3. Définition de la Règle Métier

**Réservée aux porteurs de carte.** La commande se passe depuis l'app buvette, carte ouverte, et seulement quand une session de caisse est ouverte. Une carte à zéro peut commander : tout se règle alors à la caisse.

**Rien n'est débité ni réservé avant l'encaissement.** Une commande jamais présentée ne coûte rien.

**Une commande en cours par carte.** Le client peut la modifier ou l'annuler tant qu'elle n'est pas encaissée. Une modification garde le numéro, qu'il a peut-être déjà donné.

**Un article en rupture disparaît.** Le bureau le retire de la vente dans le catalogue : il sort aussitôt de l'app et de la caisse. Il n'y a pas de suivi de stock. Une commande qui contient un article retiré ne s'encaisse pas : le client doit la modifier.

**Un numéro court.** Il repart à 1 à chaque session de caisse, pour se dicter facilement. Une commande ne vaut que pour la session où elle a été passée.

**Trois façons de la retrouver à la caisse.** Par le QR code du client, par son numéro ou par le début de son adresse, à partir de trois caractères. L'adresse reste masquée à l'écran.

**Elle s'encaisse sans QR code.** Le client y a consenti depuis son appareil : la carte de la commande paie ce qu'elle peut, sans nouveau scan, et la caisse ne peut pas en changer le contenu. Le bénévole vérifie le numéro avec le client.

**Le prix est celui du moment de l'encaissement,** relu sur le serveur.

**Le reste se règle en espèces ou en CB,** comme toute vente (RF-BUV-002).

**Une seule vente par commande.** Deux caisses ne peuvent pas l'encaisser. Une CB abandonnée rend la commande au client ; une vente remboursée l'annule.

---

## 4. Scénarios d'Acceptation (Gherkin)

```gherkin
# language: fr

Fonctionnalité: Commande préparée par le client

  Scénario: Commander ne débite rien
    Étant donné une carte de 10 €
    Quand le client commande pour 6 €
    Alors le solde reste à 10 €

  Scénario: Modifier une commande garde son numéro
    Étant donné une commande n° 42
    Quand le client en change les articles
    Alors elle porte toujours le n° 42

  Scénario: Le numéro repart à 1
    Étant donné une session clôturée et une nouvelle session ouverte
    Quand un client commande
    Alors sa commande porte le n° 1

  Scénario: Retrouver une commande sans QR code
    Étant donné une commande n° 42 de 6 € sur une carte de 10 €
    Quand le bénévole cherche "42" et encaisse la commande
    Alors la vente est payée et le solde passe à 4 €

  Scénario: Carte trop courte
    Étant donné une commande de 6 € sur une carte de 2 €
    Quand le bénévole encaisse la commande
    Alors il reste 4 € à régler en espèces ou en CB

  Scénario: Deux caisses sur la même commande
    Étant donné une commande déjà encaissée
    Quand une autre caisse tente de l'encaisser
    Alors l'encaissement est refusé et rien n'est débité

  Scénario: Article en rupture
    Étant donné un article retiré de la vente
    Quand le client ouvre l'onglet Commander
    Alors l'article n'apparaît pas
```
