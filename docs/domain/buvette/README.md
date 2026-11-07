# Domaine Métier : Buvette (caisse et carte prépayée)

Le domaine **Buvette** encaisse les ventes de la buvette du club et tient la carte buvette, un porte-monnaie dématérialisé ouvert à tous, licencié ou non.

Deux applications s'appuient sur lui :

- **la caisse** (`caisse.nozaybad.fr`), utilisée par les bénévoles (adresse du club, derrière Cloudflare Access) : panier, encaissement, session de caisse. Elle s'utilise dans le navigateur par défaut du téléphone, sans installation : pour la CB, elle ouvre l'application SumUp du téléphone par le Payment Switch, et c'est cette application qui encaisse, en Tap to Pay ou avec un lecteur ;
- **la buvette** (`buvette.nozaybad.fr`), utilisée par les clients : la carte, son QR code, son solde et son historique.

Le solde vit côté serveur : le QR code identifie la carte, il ne porte aucune valeur.

Le domaine ne dépend d'aucun adhérent. La comptabilité reçoit une synthèse à chaque clôture de caisse, écrite dans le même lot que la clôture : le domaine dépend donc d'`accounting`, comme la boutique.

---

## Dictionnaire de Données & Glossaire Métier

| Terme Métier | Définition & Contexte | Type / Exemple |
|---|---|---|
| **Article** | Ce que vend la buvette, avec son prix et sa catégorie comptable. Distinct des produits de la boutique, qui suivent un parcours de commande et exigent un adhérent. | `Entity` (café, sandwich) |
| **Carte buvette** | Le porte-monnaie d'un client, rattaché à une adresse électronique vérifiée. Elle est gratuite : ce qu'on achète, c'est sa recharge. Une carte par adresse. | `Entity` |
| **Recharge** | Ligne de panier qui crédite une carte. Elle ne se paie jamais avec une carte buvette. | `integer` (centimes) |
| **Appareil** | Un navigateur ou un téléphone où la carte est ouverte. Une carte peut en avoir plusieurs : c'est ainsi qu'un parent la partage avec son enfant. | `Entity` |
| **Vente** | Un panier encaissé ou en cours d'encaissement, dans une session de caisse. | `Entity` (`in_progress`, `paid`, `cancelled`) |
| **Commande** | Ce qu'un porteur de carte prépare sur son téléphone, à encaisser au comptoir. Une par carte, modifiable sans changer de numéro, sans prix figé ni débit avant l'encaissement. | `Entity` (`pending`, `collected`, `cancelled`) |
| **Moyen de paiement** | Espèces, carte buvette ou CB. Une vente se paie d'un seul moyen, ou de la carte buvette complétée par un seul autre. | `Enum` (`cash`, `prepaid`, `card`) |
| **Tentative CB** | Un envoi d'un montant vers l'application SumUp pour une vente, avec son propre identifiant (`foreign-tx-id`). Une vente peut en compter plusieurs, une seule peut aboutir. | `Entity` (`pending`, `successful`, `failed`) |
| **Réservation** | La part du solde bloquée par une vente en cours. Elle n'est plus disponible pour une autre vente et devient un débit à l'encaissement. | `Entity` |
| **Solde disponible** | Le solde de la carte, moins ses réservations. | `integer` (centimes) |
| **Session de caisse** | Une période d'encaissement sur un même tiroir d'espèces, de l'ouverture à la clôture. Plusieurs bénévoles peuvent y encaisser. | `Entity` |
| **Fond de caisse** | Les espèces comptées à l'ouverture. | `integer` (centimes) |
| **Espèces théoriques** | Le fond de caisse, plus les espèces encaissées, moins les remboursements en espèces. | `integer` (centimes) |
| **Écart de caisse** | Les espèces comptées à la clôture, moins les espèces théoriques. | `integer` (centimes, signé) |
| **Dette de cartes** | La somme des soldes : l'argent reçu des clients et pas encore consommé. Elle se suit sur un compte de tiers de classe 4, hors des totaux de trésorerie. | Compte de tiers |

---

## Règles fonctionnelles

- [RF-BUV-001 : La carte buvette](rules/RF-BUV-001-carte-buvette.md)
- [RF-BUV-002 : Vente et encaissement](rules/RF-BUV-002-vente-et-encaissement.md)
- [RF-BUV-003 : Session de caisse et comptabilité](rules/RF-BUV-003-session-de-caisse.md)
- [RF-BUV-004 : Remboursement du solde en espèces](rules/RF-BUV-004-remboursement-du-solde.md)
- [RF-BUV-005 : La commande préparée par le client](rules/RF-BUV-005-commande-client.md)
