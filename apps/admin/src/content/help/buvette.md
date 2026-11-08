---
title: "Buvette"
description: "Préparer le catalogue, tenir la caisse et retrouver la buvette en comptabilité."
category: "boutique"
order: 5
---

La buvette repose sur deux applications : la **caisse**, utilisée par les bénévoles sur leur téléphone, et la **carte buvette**, que les clients ouvrent avec leur adresse e-mail. Licence ou non, tout le monde peut avoir une carte.

Pour ouvrir sa carte, le client accepte les conditions d'utilisation de la carte buvette ; elles sont lisibles depuis la page de connexion, avec la politique de confidentialité et les mentions légales. La carte se charge uniquement à la buvette, en espèces ou par carte bancaire : il n'y a rien à payer en ligne.

## Préparer le catalogue

Dans **Buvette → Catalogue buvette**, ajoutez les articles avec leur prix et leur catégorie comptable. Un article qu'on ne vend plus se désactive avec **En vente** : les ventes passées y renvoient, il ne se supprime pas.

Le **plafond de solde** limite ce qu'une carte peut contenir. Une recharge qui le dépasserait est refusée à la caisse.

## Tenir la caisse

1. **Ouvrir** : dans **Buvette → Session de caisse**, comptez le fond de caisse et saisissez-le. Une seule session peut être ouverte à la fois, et plusieurs bénévoles peuvent y encaisser. Sans cela, la caisse des bénévoles affiche qu'elle est fermée.
2. **Encaisser** : composez le panier, puis appuyez sur **Encaisser**.
   - **Carte buvette** : scannez le QR code du client. Si le solde suffit, la vente est payée aussitôt. Sinon, le reste se paie en espèces ou en CB.
   - **Espèces** : appuyez sur **Montant exact** ou sur le billet reçu : la caisse affiche la monnaie à rendre. Pour un autre montant, saisissez-le.
   - **CB** : appuyez sur **CB**. L'application SumUp s'ouvre avec le montant, le client présente sa carte, puis revenez à la caisse.
3. **Recharger** : touchez **Recharge carte** dans la grille, choisissez un montant et scannez la carte. Une recharge se paie en espèces ou en CB, jamais avec la carte elle-même.
4. **Clôturer** : dans **Buvette → Session de caisse**, comptez les espèces et saisissez le total. L'écran indique l'écart éventuel et la synthèse part en comptabilité.

## Les commandes des clients

Le client peut préparer sa commande dans son application, onglet **Commander**, puis présenter son QR code. Rien n'est débité avant l'encaissement. Un article retiré de la vente dans le catalogue disparaît de l'application.

À la caisse, l'onglet **Commandes** les liste. Scannez le QR du client, ou cherchez la commande par son numéro ou son adresse e-mail si le scan échoue, puis **Encaisser la commande**. La carte du client paie ce qu'elle peut, et le reste se règle en espèces ou en CB.

## Les cartes papier

Pour un enfant ou une personne sans téléphone. Dans **Buvette → Cartes papier**, choisissez la valeur (5 ou 10 €), les cases à barrer (0,50 ou 1 €) et le nombre de cartes, puis imprimez le lot. **Les codes ne s'affichent qu'une fois : imprimez avant de quitter la page.** Une carte n'a aucune valeur avant d'être vendue.

- **Vendre** : **Recharge carte**, puis **Vendre une carte papier**, et scannez-la. Le montant se règle tout seul.
- **Encaisser** : scannez la carte comme une autre, ou saisissez son code, puis barrez les cases consommées.
- **Rembourser** : **Rembourser une carte**, scannez-la et reprenez-la. Une carte remboursée ne vaut plus rien : si elle revient, la caisse le dit et refuse.

Le porteur peut aussi scanner sa carte avec son téléphone et la transférer sur son compte buvette. Elle ne vaut alors plus rien non plus.

## Si la CB n'aboutit pas

La vente reste en attente tant que SumUp n'a pas confirmé le paiement, et la caisse le vérifie à votre retour. Vous pouvez ensuite **Vérifier le paiement**, **Relancer le paiement CB** ou **Abandonner la vente**. La clôture est impossible tant qu'une vente attend.

Si la caisse signale un **paiement CB arrivé sur une vente terminée**, de l'argent a été pris pour une vente abandonnée ou avec un mauvais montant. Touchez **Rembourser** : SumUp le rend sur la carte bancaire du client, sans passer par l'application. Si le remboursement a déjà été fait dans l'application, la caisse le constate et n'envoie rien. **Remboursement en cours** veut dire que SumUp n'a pas encore répondu : ne le refaites pas, la caisse le revérifie toute seule.

## Rembourser une vente

En cas d'erreur, ouvrez l'onglet **Ventes** de la caisse, touchez la vente, puis **Rembourser cette vente**. Un écran annonce d'abord si vous aurez des espèces à remettre, puis la caisse vous demande de confirmer que vous les avez remises : la part payée par carte y revient, ou se rend en espèces si le client a supprimé sa carte ; les espèces se rendent ; une part payée en CB est remboursée par SumUp sur la carte bancaire du client. Si SumUp refuse, la caisse vous dit de le faire dans l'application. Le détail d'une vente montre son numéro de transaction SumUp.

Les remboursements de solde de carte apparaissent aussi dans l'onglet **Ventes**, pour mémoire : ils ne se remboursent pas une seconde fois.

## Rembourser une carte

La tuile **Rembourser une carte**, à côté de **Recharge carte**, rend tout le solde en espèces. Scannez le QR code à jour du client, ou saisissez le code affiché dessous si la caméra ne le lit pas : il doit être présent. Sa carte reste ouverte à 0 €, et le remboursement apparaît dans son historique : aucun e-mail ne part, la buvette n'en envoie que pour le code de connexion. S'il a perdu son téléphone, il rouvre d'abord sa carte sur un autre appareil avec son adresse e-mail.

## En comptabilité

La clôture pose une écriture de synthèse, pas une écriture par café :

- **Articles** : une recette par catégorie et par moyen de paiement ;
- **Recharges et remboursements** : des virements avec le compte **Soldes des cartes buvette**, car l'argent reste dû au client tant qu'il n'est pas consommé ;
- **CB** : sur le compte **À recevoir de SumUp**, à solder au virement reçu en banque, la commission étant saisie en dépense ;
- **Écart de caisse** : une recette ou une dépense dans la catégorie **Écarts de caisse**.
