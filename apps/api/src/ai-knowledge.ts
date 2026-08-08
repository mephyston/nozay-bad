// Fichier généré automatiquement. Ne pas modifier manuellement.
export const HELP_DOCS = `
--- Article: acces-permissions.md ---
---
title: "Accès & Rôles"
description: "Gérer qui a le droit de se connecter et d'agir sur l'interface d'administration."
category: "admin"
order: 4
---

Le module **Accès & Rôles** contrôle qui peut ouvrir l'administration et ce que chacun peut y faire.

## Le principe : aucun droit par défaut

Un compte n'a accès qu'à ce qu'on lui a explicitement accordé. Créer un compte ne donne donc rien de plus que le tableau de bord et le centre d'aide : c'est en lui attribuant un **rôle** qu'on lui ouvre des rubriques.

## Les rôles

Un rôle correspond à une fonction réelle dans l'association. Vous pouvez en attribuer plusieurs à la même personne — une secrétaire qui assure aussi la trésorerie reçoit les deux rôles.

- **Membre** — Tableau de bord et centre d'aide uniquement. C'est le rôle par défaut.
- **Secrétaire** — Le fichier des adhérents (consultation, modification, import Poona), les attestations CSE, la communication (notifications) et le catalogue de la boutique. Consultation seule côté finances.
- **Trésorier·ère** — La comptabilité complète : grand livre, factures, rapprochement bancaire, chèques, exercices, budget et rapports. Les notes de frais, de la saisie au remboursement. L'encaissement des commandes.
- **Président·e** — La consultation de l'ensemble du club, les actes de gouvernance (ouverture et clôture d'exercice, vote du budget), la validation des notes de frais et des commandes, la communication, et la gestion des accès.
- **Super administrateur** — Tous les droits, y compris la configuration technique.

> [!NOTE]
> La présidence peut tout consulter mais ne saisit pas d'écriture comptable. C'est volontaire : le trésorier saisit, la présidence contrôle, et chaque écriture du grand livre reste attribuable à une seule personne. Si la même personne assure les deux fonctions, attribuez-lui les deux rôles.

## Attribuer un rôle

Depuis **Réglages → Accès & Rôles**, ajoutez la personne avec l'adresse e-mail qu'elle utilise pour se connecter, puis cochez ses rôles. La liste des droits accordés s'affiche juste en dessous : vérifiez-la avant d'enregistrer, elle dit exactement ce que la personne pourra faire.

> [!CAUTION]
> Ne donnez le rôle **Super administrateur** qu'aux personnes qui en ont réellement besoin. Il ouvre la configuration technique et permet de consulter l'application sous l'identité d'un autre compte.

## Retirer un accès

Supprimer un compte lui retire immédiatement l'accès. Un garde-fou empêche de supprimer — ou de rétrograder — le dernier super administrateur : sans lui, plus personne ne pourrait attribuer de rôle, et il faudrait une intervention technique pour rouvrir l'application.

## Consulter en tant qu'un autre compte

Un super administrateur peut consulter l'application sous l'identité d'un autre compte, pour reproduire ce qu'une personne voit quand elle signale un problème. Un bandeau orange rappelle en permanence sous quelle identité vous agissez. Cette fonction ne permet jamais d'obtenir plus de droits que les siens.


--- Article: assistant-ia.md ---
---
title: "Assistant IA"
description: "Poser une question sur l'application ou sur les chiffres du club, et les aides IA disséminées dans les écrans."
category: "admin"
order: 5
---

L'application intègre plusieurs aides fondées sur l'intelligence artificielle. Elles nécessitent toutes le droit **Assistant IA**, et aucune n'agit à votre place : elles proposent, vous décidez.

## L'assistant conversationnel

La rubrique **Assistant IA** du menu ouvre une conversation. L'assistant est cantonné au club : il refuse poliment les questions hors sujet.

Il sait faire deux choses :

1. **Répondre sur le fonctionnement du logiciel**, à partir des articles de ce centre d'aide. C'est la même documentation que celle que vous lisez ici — un article incomplet donne donc une réponse incomplète.
2. **Aller chercher les chiffres réels du club** lorsque la question l'exige. Il dispose pour cela de trois outils : les rapports d'une saison, la liste des adhérents, et les statistiques d'effectif (répartition par genre, âge moyen, tranches d'âge).

Vous pouvez repartir de zéro à tout moment ; l'historique n'est pas conservé d'une visite à l'autre.

## L'analyse d'un rapport

Sur le **compte de résultat** et le **bilan de trésorerie**, un bouton propose une analyse rédigée du rapport affiché. Le texte s'écrit progressivement à l'écran.

## La suggestion de budget

Sur l'écran **Budget prévisionnel**, un bouton demande une proposition de montants par catégorie. Les suggestions ne remplissent que les lignes **vides ou à zéro** : ce que vous avez déjà saisi n'est jamais écrasé. Rien n'est enregistré tant que vous n'avez pas cliqué sur *Enregistrer*.

## Les suggestions de rapprochement bancaire

Sur l'écran **Rapprochement bancaire**, l'analyse propose pour chaque ligne du relevé une catégorie comptable et, lorsque c'est possible, l'adhérent concerné. Elle combine des règles de reconnaissance sur le libellé bancaire, les rapprochements déjà validés par le trésorier, le catalogue de la boutique et le montant restant dû par chaque adhérent. Voir [Rapprochement bancaire](/admin/help/rapprochement-bancaire).

## La lecture d'un chèque

Lors de l'enregistrement d'un chèque, la photo peut être analysée pour pré-remplir le numéro, le montant, l'émetteur, la banque et la date, et pour proposer l'adhérent correspondant. Voir [Chèques et remises](/admin/help/remises-cheques).

> [!WARNING]
> Une lecture automatique se trompe. Relisez systématiquement les champs pré-remplis avant d'enregistrer, en particulier le montant et le numéro de chèque.


--- Article: attestation-cse.md ---
---
title: "Attestation CSE"
description: "Générer l'attestation de paiement d'un adhérent et personnaliser le modèle."
category: "adherents"
order: 4
---

L'**attestation CSE** est le document que l'adhérent transmet à son comité d'entreprise pour se faire rembourser sa cotisation. C'est le seul document généré par l'application à destination des adhérents.

## Générer une attestation

Depuis la [liste des adhérents](/admin/help/gestion-adherents) ou depuis sa [fiche](/admin/help/fiche-adherent), l'entrée **Attestation CSE** ouvre le PDF dans un nouvel onglet.

> [!IMPORTANT]
> L'attestation n'est délivrée que si la cotisation est **intégralement réglée**. Tant que le solde n'est pas à zéro, l'application affiche « Attestation indisponible » et en explique la raison.

Le document reprend le nom, le prénom et la date de naissance de l'adhérent, le montant dû (en chiffres et en toutes lettres), la saison, ainsi que le moyen et la date du **dernier paiement enregistré** pour cet adhérent. À défaut de paiement identifié, il mentionne un virement à la date de validation.

L'adhérent peut aussi télécharger lui-même son attestation depuis son espace, sans passer par le bureau.

## Personnaliser le modèle

**Réglages → Attestation CSE** permet de régler ce qui est commun à toutes les attestations :

- **Signataire** — nom, adresse mail et site web imprimés sur le document ;
- **Signature** — l'image apposée en bas de l'attestation.

La signature doit être un fichier **JPEG de 48 Ko au maximum**. Le format et le poids sont vérifiés à la sélection, puis de nouveau à l'enregistrement. Tant qu'aucune signature n'a été déposée, l'application utilise celle du modèle d'origine et l'indique sous l'aperçu.


--- Article: boutique-commandes.md ---
---
title: "Boutique : commandes"
description: "Saisir, valider ou refuser les commandes des adhérents, et l'écriture qui en découle."
category: "boutique"
order: 2
---

**Boutique → Commandes** présente deux listes : les commandes **en attente** et l'**historique** (validées et refusées). La recherche porte sur l'adhérent, sa licence, le produit, le moyen de paiement et le montant.

Une commande suit trois états : **en attente** → **validée** ou **refusée**.

## D'où viennent les commandes

- **De l'adhérent**, depuis son espace ;
- **Du bureau**, avec le bouton de saisie : choisissez l'adhérent, l'article, la quantité, le moyen de paiement et, le cas échéant, la date de paiement.

Une commande est refusée à la saisie si :

- la saison est clôturée ;
- l'adhérent n'est pas inscrit sur la saison choisie ;
- son dossier n'est pas au statut **valide** ;
- le stock est insuffisant ;
- la date de paiement est **postérieure au jour même**.

## Valider une commande

La validation est l'acte comptable de la boutique. Elle enchaîne trois effets :

1. **Une recette est écrite au grand livre**, libellée « Achat boutique – *adhérent* – *produit* × *quantité* », imputée à la catégorie comptable de la **famille du produit** et rattachée à l'adhérent ;
2. **Le stock est décrémenté**, si le produit en assure le suivi ;
3. **L'adhérent est notifié** de la validation sur son téléphone, s'il a activé les notifications.

L'exercice de rattachement est déduit de la **date de paiement**, et non de la date de la commande. Si cette date tombe dans un exercice déjà arrêté, la recette est portée sur l'exercice ouvert sous forme de **régularisation** documentée, plutôt que refusée.

Une commande déjà traitée ne peut pas l'être une seconde fois : si deux personnes valident en même temps, la seconde reçoit un message de conflit.

## Refuser une commande

Le refus laisse la commande dans l'historique, sans écriture comptable ni mouvement de stock, et notifie l'adhérent.

## Ce qui bloque la clôture

Une **commande payée mais non validée** empêche la clôture de l'exercice : la recette correspondante n'existe pas encore en comptabilité. Voir [Saisons comptables](/admin/help/gestion-saisons).

> [!NOTE]
> Consulter les commandes et les valider sont deux droits distincts. Le secrétariat suit les commandes, le trésorier et la présidence les valident — parce que valider, c'est écrire une recette.


--- Article: boutique-produits.md ---
---
title: "Boutique : produits"
description: "Tenir le catalogue proposé aux adhérents : prix, stock, disponibilité."
category: "boutique"
order: 1
---

**Boutique → Produits** contient les articles que les adhérents peuvent commander depuis leur espace : volants, cordages, et tout autre article revendu par le club.

## Ajouter ou modifier un produit

| Champ | Détail |
|---|---|
| **Nom** | Le libellé vu par l'adhérent |
| **Catégorie** | La famille du produit : Volants, Cordages, ou Autre. Elle n'est plus modifiable après création |
| **Prix** | En euros |
| **Gérer le stock** | À cocher pour suivre une quantité ; sinon l'article reste toujours disponible |
| **Quantité en stock** | Visible uniquement si le suivi de stock est activé |
| **Produit actif** | Un produit inactif disparaît du catalogue des adhérents |

## Le stock

Le suivi de stock est **facultatif, produit par produit**. Quand il est activé :

- la **validation** d'une commande décrémente la quantité du nombre d'articles commandés ;
- un article dont le stock est épuisé **n'est plus proposé à la commande** ;
- une commande portant sur une quantité supérieure au stock disponible est refusée à la saisie.

Un produit sans suivi de stock reste commandable sans limite : c'est le réglage à choisir pour un article commandé à la demande auprès du fournisseur.

## Le lien avec la comptabilité

C'est la **famille de produits** — et non le produit lui-même — qui porte l'imputation comptable. Voir [Catégories de produits](/admin/help/categories-produits).

> [!IMPORTANT]
> Si la famille d'un produit n'est rattachée à aucune catégorie comptable, la validation d'une commande portant sur ce produit **échoue** : l'application ne saurait pas où imputer la recette.


--- Article: budget-previsionnel.md ---
---
title: "Budget prévisionnel"
description: "Saisir le budget de la saison, catégorie par catégorie, et le comparer au réalisé."
category: "comptabilite"
order: 9
---

Le **Budget prévisionnel** se saisit depuis **Comptabilité → Rapports financiers → Budget prévisionnel**. Il sert de référence à la colonne *prévisionnel* du compte de résultat et alimente la projection de trésorerie.

## Saisir le budget

L'écran reprend la structure du compte de résultat : les charges d'un côté, les produits de l'autre, regroupés par classe de compte. Chaque **catégorie** dispose d'un champ de saisie en euros.

Seules les catégories rattachées à une classe de compte apparaissent : une catégorie sans classe recette ni classe dépense n'a pas de ligne de budget. Voir [Catégories comptables](/admin/help/categories-comptables).

Les totaux par classe et les totaux généraux se recalculent au fur et à mesure. Rien n'est enregistré tant que vous n'avez pas cliqué sur **Enregistrer**.

## Se faire proposer des montants

Un bouton demande une **suggestion de budget**. Elle ne remplit que les lignes **vides ou à zéro** : les montants déjà saisis ne sont jamais écrasés. Vous restez libre de les corriger avant d'enregistrer. Cette fonction nécessite le droit *Assistant IA*.

## Comparer au réalisé

Une fois le budget enregistré, le [compte de résultat](/admin/help/rapports-financiers) affiche côte à côte le réalisé et le prévisionnel, avec l'écart, et les camemberts du budget se dessinent à côté de ceux du réalisé.

## Reporter le budget sur la saison suivante

Au moment de [clôturer un exercice](/admin/help/gestion-saisons), une option permet de **recopier le budget vers la saison suivante**, ce qui évite de tout ressaisir avant de l'ajuster.

> [!NOTE]
> Le budget se lit et se saisit avec deux droits distincts. La présidence, qui vote le budget, dispose du droit d'écriture ; il ne lui donne pas pour autant accès à la saisie d'écritures comptables.


--- Article: caisse.md ---
---
title: "Caisse"
description: "Suivre les espèces : entrées, sorties et dépôt en banque."
category: "comptabilite"
order: 3
---

La rubrique **Caisse** est une vue dédiée au compte **Caisse physique** : les billets et les pièces détenus par le club.

## Ce que montre l'écran

Quatre indicateurs en haut de page : le **solde initial** de la saison, le total des **entrées**, le total des **sorties** et le **solde courant**. Les virements internes sont comptés dans ce calcul — de l'argent transféré vers la caisse est une entrée, de l'argent transféré depuis la caisse est une sortie.

En dessous, l'historique des mouvements, filtrable par recherche libre sur le libellé, la catégorie, le montant ou la date.

## Enregistrer un mouvement

Le bouton **Nouveau mouvement** ouvre un formulaire simplifié :

- **Type** — Entrée (recette, par exemple une vente à la buvette) ou Sortie (dépense, par exemple un achat de boissons) ;
- **Montant** et **date** ;
- **Catégorie** — la liste s'adapte au sens du mouvement : *Événements & buvette*, *Boutique & cordages*, *Adhésion & cotisation*, *Divers* en entrée ; *Événements & buvette (achats)*, *Matériel club*, *Divers* en sortie ;
- **Description**.

## Déposer les espèces en banque

Un dépôt d'espèces n'est ni une recette ni une dépense : c'est un **virement interne**. Il se saisit depuis le [Grand livre](/admin/help/grand-livre) :

- **Compte source** : Caisse physique
- **Compte destinataire** : Compte Courant

La ligne du relevé bancaire correspondante sera ensuite associée à ce virement lors du [rapprochement bancaire](/admin/help/rapprochement-bancaire).

> [!TIP]
> Le solde affiché doit toujours correspondre à l'argent réellement présent dans la caisse du club. Un écart signale un mouvement oublié : comptez la caisse avant chaque dépôt en banque.

Lorsque la saison est clôturée, l'écran passe en lecture seule et le formulaire est désactivé.


--- Article: categories-comptables.md ---
---
title: "Catégories comptables"
description: "L'imputation choisie par les bénévoles, et son lien avec le plan comptable."
category: "comptabilite"
order: 13
---

Une **catégorie comptable** est l'imputation que choisit le bénévole au moment de saisir une écriture, de déposer une note de frais ou d'enregistrer un chèque. Elle évite d'avoir à connaître le plan comptable.

L'écran se trouve dans **Réglages → Catégories et classes**, onglet *Catégories comptables*.

## Les champs d'une catégorie

| Champ | Rôle |
|---|---|
| **Libellé Admin** | Le nom vu par le bureau dans les écrans comptables (« Achat de grips et accessoires ») |
| **Libellé Adhérent** | Le nom vu par l'adhérent lorsqu'il saisit une note de frais (« Grips & accessoires ») |
| **Classe Recette** | La classe de compte utilisée quand l'argent entre |
| **Classe Dépense** | La classe de compte utilisée quand l'argent sort |
| **Masquer pour les notes de frais** | Retire la catégorie de la liste proposée aux adhérents |
| **Catégorie active** | Une catégorie inactive n'est plus proposée en saisie |

Les deux libellés sont obligatoires ; les deux classes sont facultatives, mais une catégorie sans classe n'apparaît ni dans le compte de résultat par classe ni dans le budget.

## Créer, modifier, supprimer

Le bouton **Nouvelle catégorie** ouvre le formulaire ; le menu de chaque ligne permet de la modifier ou de la supprimer. Une catégorie déjà utilisée par des écritures gagne à être **désactivée** plutôt que supprimée : l'historique reste ainsi lisible.

## Où les catégories interviennent

- Elles sont obligatoires sur toute recette et toute dépense du [grand livre](/admin/help/grand-livre) ; un virement interne n'en porte jamais.
- Elles structurent le [compte de résultat](/admin/help/rapports-financiers) et le [budget](/admin/help/budget-previsionnel).
- Chaque **famille de produits** de la boutique pointe vers une catégorie comptable, ce qui rend automatique l'écriture de recette à la validation d'une commande. Voir [Catégories de produits](/admin/help/categories-produits).
- La catégorie d'**adhésion** a un rôle particulier : un encaissement rattaché à un adhérent et imputé à cette catégorie met à jour le montant reçu de sa cotisation.

> [!NOTE]
> Certaines automatisations reconnaissent une catégorie à son libellé (« volant », « cordage », « matériel », « virement interne »…). Renommer largement une catégorie peut donc changer le comportement des suggestions de rapprochement ou la répartition par pôle du tableau de bord.


--- Article: categories-produits.md ---
---
title: "Catégories de produits"
description: "Regrouper les articles de la boutique et fixer leur imputation comptable."
category: "boutique"
order: 3
---

Une **catégorie de produits** est une famille d'articles de la boutique. Elle se règle dans **Réglages → Catégories produits**.

## Les champs

| Champ | Rôle |
|---|---|
| **Libellé** | Le nom de la famille (Volants, Cordages…) |
| **Catégorie comptable** | L'imputation utilisée pour les recettes de cette famille |
| **Active** | Une famille inactive n'est plus proposée |

## Pourquoi le rattachement comptable est obligatoire

C'est ce lien qui rend automatique l'écriture comptable de la boutique : quand une commande est validée, la recette est imputée à la **catégorie comptable de la famille du produit**, sans aucune double saisie. Voir [Boutique : commandes](/admin/help/boutique-commandes).

Une famille sans catégorie comptable fait **échouer la validation** des commandes portant sur ses produits, avec un message qui la nomme explicitement.

## Supprimer une famille

La suppression est **refusée tant que des produits y sont rattachés**. Réaffectez d'abord ces produits, ou contentez-vous de désactiver la famille.


--- Article: configuration.md ---
---
title: "Configuration"
description: "Le point d'entrée des réglages : attestation, saisons, catégories et classes, catégories produits."
category: "admin"
order: 3
---

**Réglages → Configuration** rassemble les quatre écrans de paramétrage de l'application. Chacun est décrit en détail dans son propre article.

| Écran | Ce qu'il règle | Article |
|---|---|---|
| **Attestation CSE** | Nom, adresse mail et site web du signataire, image de la signature. | [Attestation CSE](/admin/help/attestation-cse) |
| **Saisons comptables** | Exercices, saison active, soldes initiaux, clôture. | [Saisons comptables](/admin/help/gestion-saisons) |
| **Catégories et classes** | Catégories comptables et plan comptable associatif. | [Catégories comptables](/admin/help/categories-comptables), [Plan comptable](/admin/help/plan-comptable) |
| **Catégories produits** | Familles d'articles de la boutique et leur imputation comptable. | [Catégories de produits](/admin/help/categories-produits) |

Chaque écran a ses propres droits : vous n'y voyez que ce que vos rôles autorisent. La page **Accès & Rôles**, qui gère les comptes d'administration, est distincte et se trouve directement dans le menu **Réglages**.

> [!NOTE]
> L'écran **Catégories et classes** est le seul à comporter deux onglets : *Catégories comptables* et *Plan comptable*. Les trois autres écrans n'affichent qu'une seule liste.


--- Article: espace-adherent.md ---
---
title: "L'espace adhérent"
description: "Ce que les adhérents voient et peuvent faire de leur côté, et ce que cela déclenche pour le bureau."
category: "adherents"
order: 5
---

L'application comporte un second site, destiné aux adhérents. Le bureau n'y intervient pas, mais plusieurs tâches administratives y prennent leur source : les notes de frais et les commandes boutique y sont déposées, les notifications y sont reçues.

## Comment un adhérent se connecte

Il n'y a **pas de mot de passe**. L'adhérent saisit son adresse e-mail ou son numéro de licence, et reçoit un **code à usage unique** par e-mail. Le code est envoyé à l'adresse au dossier — la sienne, ou celle d'un représentant légal. Les demandes sont protégées contre les robots et limitées en nombre par adresse IP.

C'est le **foyer** qui se connecte, pas l'individu : une adresse rattachée à plusieurs licenciés (une fratrie, un parent et son enfant) ouvre l'accès à tous ces dossiers, et l'adhérent bascule de l'un à l'autre depuis son compte.

> [!NOTE]
> Un adhérent qui ne reçoit pas son code a le plus souvent une adresse absente ou erronée dans Poona. Vérifiez sa fiche : l'e-mail de l'adhérent et ceux des deux contacts y sont affichés.

## Ce qu'il peut faire

- **Mon compte** — l'état de sa cotisation (montant dû, reçu, restant), l'historique de ses commandes et de ses notes de frais avec leur statut, et l'activation des notifications.
- **Boutique** — passer une commande sur le catalogue actif. Elle arrive en attente dans [Boutique → Commandes](/admin/help/boutique-commandes).
- **Notes de frais** — déposer une demande de remboursement avec un justificatif, **uniquement s'il y a été autorisé** depuis sa fiche. Elle arrive en attente dans [Notes de frais](/admin/help/notes-de-frais).
- **Attestation** — télécharger son [attestation CSE](/admin/help/attestation-cse), si sa cotisation est soldée.
- **Notifications** — activer les notifications sur son appareil et choisir les catégories qu'il souhaite recevoir. Voir [Notifications](/admin/help/notifications).

Le site comporte également les pages *Politique de confidentialité* et *Mentions légales*.

## Ce qui remonte automatiquement vers lui

- La **validation ou le refus** de sa note de frais ;
- La **validation ou le refus** de sa commande boutique ;
- Les annonces envoyées par le bureau et, si elles sont activées, les relances de cotisation et les anniversaires.

Ces messages ne partent que vers les appareils réellement abonnés aux notifications.


--- Article: exports-comptables.md ---
---
title: "Exports comptables"
description: "Récupérer le journal, les factures et les justificatifs d'une saison."
category: "comptabilite"
order: 10
---

L'application produit quatre exports, tous portant sur **une saison**. Ils servent à constituer le dossier de l'exercice, à le transmettre au vérificateur aux comptes, ou à archiver hors de l'application.

| Export | Contenu | Format |
|---|---|---|
| **Complet** | Factures en PDF, justificatifs de notes de frais, journal comptable | ZIP |
| **Factures** | Toutes les factures de la saison en PDF | ZIP |
| **Notes de frais** | Les justificatifs joints aux notes de frais | ZIP |
| **Journal comptable** | Toutes les écritures de la saison | CSV |

## Le journal comptable

Le fichier CSV comporte une ligne par écriture, avec les colonnes : *Date*, *Type*, *Description*, *Montant EUR*, *Catégorie*, *Mode de paiement*, *Référence*, *Membre*. Le séparateur est le point-virgule et le fichier s'ouvre directement dans un tableur, accents compris.

## Où les déclencher

- Le bouton **Exporter (ZIP)** de l'écran [Factures](/admin/help/gestion-factures) télécharge l'export des factures.
- Les autres exports s'obtiennent depuis les écrans de rapports, en ajoutant le paramètre d'export à l'adresse de la page (\`?season=25-26&export=all\`, \`…&export=ledger\`, \`…&export=expenses\`, \`…&export=invoices\`).

Ils exigent le droit d'**export des rapports**, distinct du droit de simple consultation.

> [!NOTE]
> Si un justificatif ou une facture ne peut pas être produit, l'archive contient à sa place un fichier texte décrivant l'erreur : l'export n'échoue jamais en bloc, et vous savez précisément ce qui manque. Une saison sans document donne une archive contenant un fichier \`vide.txt\`.


--- Article: fiche-adherent.md ---
---
title: "Fiche d'un adhérent"
description: "Coordonnées, représentants légaux, état de la cotisation et historique financier."
category: "adherents"
order: 2
---

La fiche s'ouvre depuis la [liste des adhérents](/admin/help/gestion-adherents). Elle porte sur **une saison** : le même licencié a une fiche par saison où il est inscrit.

En haut, un bandeau rappelle le nom, le numéro de licence et l'état du règlement — *Cotisation réglée* ou *Règlement en attente*. Lorsque la cotisation est soldée, un bouton **Attestation CSE** ouvre le PDF dans un nouvel onglet.

## Onglet « Profil & contacts »

Deux blocs :

- **Informations personnelles** — date de naissance, genre, formule d'adhésion, et l'état de l'autorisation de notes de frais avec le bouton qui la bascule.
- **Coordonnées** — d'abord celles de l'adhérent, puis, dans un bloc distinct, celles de ses **représentants légaux** lorsqu'ils sont renseignés. La séparation est volontaire : un adhérent mineur n'a souvent pas d'adresse propre, et l'e-mail affiché est alors celui d'un parent. Un bouton copie l'adresse dans le presse-papiers ; les numéros de téléphone sont cliquables.

## Onglet « Cotisation Poona »

Le montant dû, le montant reçu et le solde restant, tels qu'importés de Poona, avec une barre de progression du règlement.

Ces montants évoluent aussi depuis l'application : lorsqu'un encaissement rattaché à cet adhérent est imputé à la catégorie d'adhésion — par un chèque enregistré ou par un rapprochement bancaire — le montant reçu est mis à jour. Un import Poona ultérieur réécrit ces montants avec ceux du fichier.

## Onglet « Historique financier »

Les écritures du grand livre rattachées à cet adhérent, lues **de son point de vue** :

- une recette du club apparaît comme un **Achat** ;
- une dépense du club apparaît comme un **Remboursement** ;
- un virement interne apparaît comme un **Transfert**.

## Autoriser les notes de frais

L'autorisation se donne depuis cette fiche ou depuis la liste. Elle conditionne l'accès de l'adhérent au dépôt de note de frais dans son espace. Le serveur revérifie ce droit au moment du dépôt : retirer l'autorisation prend effet immédiatement, sans que l'adhérent ait à se reconnecter.


--- Article: gestion-adherents.md ---
---
title: "Liste des adhérents"
description: "Rechercher, filtrer et agir sur les adhérents d'une saison."
category: "adherents"
order: 1
---

La rubrique **Adhérents** affiche les membres inscrits pour une saison. Les dossiers proviennent de l'import Poona : ils ne se créent pas à la main dans l'application.

## Ce qu'affiche la liste

Chaque ligne montre le nom, la date de naissance, le numéro de licence, le genre, la formule d'adhésion (le *type* importé de Poona) et le statut du dossier :

- **Valide** — dossier finalisé côté Poona ;
- **Suspendu** — dossier annulé ou non validé.

La liste est paginée par 20.

## Rechercher et filtrer

La barre de recherche porte sur le nom et le numéro de licence. Le bouton de filtres ouvre quatre critères supplémentaires :

- **Saison** — l'exercice consulté ;
- **Genre** — Homme / Femme ;
- **Type d'adhérent** — Compétiteur / Loisir ;
- **Statut** — Valide / Suspendu.

Un bouton *Réinitialiser* remet les critères à leur valeur par défaut.

## Les actions sur une ligne

Le menu d'actions de chaque ligne propose :

- **Voir le profil** — ouvre la [fiche de l'adhérent](/admin/help/fiche-adherent) ;
- **Autoriser / Retirer note de frais** — ouvre ou ferme à cet adhérent la possibilité de déposer une note de frais depuis son espace ; l'application demande confirmation ;
- **Attestation CSE** — ouvre l'attestation en PDF dans un nouvel onglet. Cette entrée n'apparaît **que si la cotisation est intégralement réglée**.

## Importer les adhérents

Le bouton **Import Poona**, en haut de la liste, mène à l'écran d'import. Voir [Import Poona](/admin/help/import-poona).

> [!NOTE]
> Il n'existe pas d'export de la liste des adhérents depuis cet écran. Les exports disponibles sont ceux de la comptabilité (journal, factures, justificatifs) — voir [Exports comptables](/admin/help/exports-comptables).


--- Article: gestion-factures.md ---
---
title: "Factures"
description: "Émettre une facture au nom du club, suivre son règlement et l'exporter."
category: "comptabilite"
order: 6
---

La rubrique **Factures** sert aux factures **émises par le club** : une commune, un partenaire, un comité d'entreprise à qui l'association facture une prestation.

## Créer une facture

Le bouton **Nouvelle facture** ouvre le formulaire :

- **Client** — nom, adresse et adresse e-mail ;
- **Date** ;
- **Lignes** — description, quantité et prix unitaire. Le total se calcule au fur et à mesure.

Le **numéro de facture est attribué automatiquement** à l'enregistrement ; il est unique. La facture est créée au statut *Brouillon*.

## Les statuts

| Statut | Signification |
|---|---|
| **Brouillon** | En cours de rédaction |
| **En attente de règlement** | Émise, pas encore payée |
| **Payée** | Le règlement est encaissé |
| **Annulée** | Abandonnée |

Le changement de statut se fait depuis le menu de la ligne, avec confirmation. Une facture passe aussi en *Payée* **automatiquement** lorsqu'elle est rattachée à une ligne de relevé pendant le [rapprochement bancaire](/admin/help/rapprochement-bancaire) — c'est la voie normale, car elle crée en même temps l'écriture de recette.

## Consulter, imprimer, supprimer

- **Imprimer** ouvre le PDF de la facture dans un nouvel onglet.
- **Modifier** rouvre le formulaire, lignes comprises.
- **Supprimer** efface définitivement la facture ; cette action exige un droit distinct de la création.

La liste se filtre par saison et par statut, et se cherche par numéro, client, objet ou montant.

## Exporter

Le bouton **Exporter (ZIP)** télécharge l'ensemble des factures de la saison en PDF. Voir [Exports comptables](/admin/help/exports-comptables).

## Ce qui est refusé

Toute création, modification ou suppression est refusée sur une **saison clôturée**. De même, une facture déjà *payée* ou *annulée* ne peut plus être rattachée à une ligne bancaire.

> [!NOTE]
> Les factures **fournisseurs** (ce que le club doit payer) ne se saisissent pas ici : elles se comptabilisent en dépense depuis le [grand livre](/admin/help/grand-livre) ou directement depuis le rapprochement bancaire. Il n'existe pas de pièce jointe sur une facture.


--- Article: gestion-saisons.md ---
---
title: "Saisons comptables"
description: "Créer un exercice, l'activer, le clôturer et reporter les soldes."
category: "comptabilite"
order: 11
---

Une **saison** est un exercice comptable. Elle isole les écritures, les budgets, les factures, les commandes et les dossiers d'adhérents. L'écran se trouve dans **Réglages → Saisons comptables**.

## Créer une saison

Le bouton **Nouvelle saison** demande :

- un **code** (par exemple \`26-27\`) ;
- un **libellé** (par exemple « Saison 2026-2027 ») ;
- la possibilité de la **définir comme active** immédiatement.

Les saisons sont aussi créées automatiquement par l'[import Poona](/admin/help/import-poona) lorsqu'il rencontre un code inconnu ; elles sont alors inactives, du 1er septembre au 31 août.

## La saison active

Une seule saison est active. C'est celle proposée par défaut dans les écrans, et celle sur laquelle portent les fonctions automatiques (ciblage des notifications, espace adhérent). Le bouton **Activer** de la liste la désigne.

## Les soldes initiaux

Le bouton **Soldes** de chaque saison ouvre la saisie du solde de départ des trois comptes financiers. Voir [Soldes initiaux](/admin/help/soldes-initiaux).

## Clôturer un exercice

Le bouton **Clôturer** lance d'abord une **vérification comptable**. La clôture est **refusée** tant que subsiste l'un de ces points :

- l'exercice est déjà clôturé ;
- la date de fin n'est pas encore passée ;
- des lignes de relevé bancaire restent non rapprochées ;
- des remises de chèques ne sont pas encaissées ;
- des chèques restent en coffre, non remis en banque ;
- des commandes boutique payées n'ont pas été validées.

D'autres constats sont signalés en **avertissement**, sans bloquer :

- des écritures en attente de débit ;
- un **écart entre le solde de clôture calculé et le solde initial déjà saisi** sur la saison suivante. Dans ce cas, l'écran affiche les deux montants compte par compte et demande une **confirmation explicite** avant d'écraser.

Deux options accompagnent la clôture : confirmer l'écrasement des soldes initiaux de la saison suivante, et **recopier le budget** vers cette saison suivante.

Une fois clôturé, l'exercice est **en lecture seule** : plus aucune écriture, modification ou suppression n'y est possible, et les écrans concernés affichent un bandeau « Saison clôturée ».

## Rouvrir un exercice

Une saison clôturée peut être rouverte. C'est une opération de rattrapage, à réserver aux cas où la clôture s'est faite trop tôt.

> [!NOTE]
> La clôture et la réouverture relèvent d'un droit spécifique, distinct de la simple création de saison : ce sont des actes de gouvernance, portés par la présidence et le trésorier.


--- Article: grand-livre.md ---
---
title: "Grand livre"
description: "Saisir, retrouver, corriger et supprimer les écritures comptables."
category: "comptabilite"
order: 2
---

Le **Grand livre** (« Journal des écritures ») est le registre de toutes les opérations de la saison. C'est ici que se saisissent les écritures qui ne viennent ni d'un chèque, ni d'un rapprochement bancaire, ni d'une note de frais, ni d'une commande.

## Saisir une écriture

Trois boutons ouvrent le même formulaire, avec des champs adaptés : **recette**, **dépense**, **virement interne**.

| Champ | Détail |
|---|---|
| Montant | En euros, strictement positif |
| Date | La date de l'opération |
| Saison d'affectation | L'exercice auquel rattacher l'écriture |
| Catégorie | Obligatoire pour une recette ou une dépense |
| Compte financier | Compte Courant, Compte Livret ou Caisse physique |
| Comptes source et destinataire | Pour un virement interne, obligatoirement différents |
| Moyen de paiement | Virement, Chèque, Espèces, LABAZ, ANCV, Pass'Sport, Ticket Loisir, Up & Loisir |
| Régularisation | *Normal* par défaut ; les autres motifs exigent une note justificative |
| Description | Le motif de l'opération |
| Référence | Facultative — numéro de chèque, référence de virement… |

Voir [Principes comptables](/admin/help/principes-comptables) pour le détail des régularisations et des règles de date.

## Retrouver une écriture

La liste se filtre par saison, par compte financier, par type, par catégorie, par classe de compte, par adhérent, par mois, et par recherche libre sur la description ou la référence. Un filtre supplémentaire isole les **chèques non encore rapprochés**.

Quand un filtre de catégorie ou de classe est actif, un bandeau le rappelle au-dessus de la liste avec un bouton pour l'effacer.

Chaque ligne affiche la date, le type, la catégorie, le libellé, le montant et le **solde progressif** du compte sélectionné — le solde initial de la saison auquel s'ajoutent les mouvements jusqu'à cette ligne. Une écriture rattachée à une autre saison porte le repère **Cut-off**.

Les écritures issues d'une même ligne de relevé bancaire sont regroupées : on voit d'un coup d'œil comment un versement unique a été ventilé.

## Corriger ou supprimer

Le menu d'actions de chaque ligne permet de **modifier** ou de **supprimer** une écriture. Sur mobile, un appui sur la ligne ouvre directement la modification.

La suppression exige un droit distinct de la saisie : quelqu'un peut avoir le droit d'écrire sans avoir celui de supprimer.

> [!WARNING]
> La suppression est définitive et sans trace. Vérifiez d'abord si l'écriture est rattachée à un chèque, à une note de frais ou à une commande : dans ces cas, il vaut mieux annuler l'opération d'origine (supprimer le chèque, annuler la validation de la note de frais), ce qui défait proprement l'ensemble.

## Ce qui est en lecture seule

Lorsque la saison consultée est clôturée, un bandeau **« Saison clôturée (lecture seule) »** s'affiche et toute écriture est refusée.


--- Article: import-poona.md ---
---
title: "Import Poona"
description: "Charger l'extraction CSV de Poona pour créer ou mettre à jour les dossiers d'adhérents."
category: "adherents"
order: 3
---

Les adhérents entrent dans l'application par un **fichier CSV extrait de Poona**. C'est le seul moyen de créer un dossier.

## Déposer le fichier

Depuis **Adhérents → Import Poona**, glissez le fichier dans la zone de dépôt ou cliquez pour le choisir. Seuls les fichiers \`.csv\` sont acceptés.

L'application lit le fichier dans votre navigateur avant tout envoi et affiche un **aperçu** des premières lignes ainsi que le nombre de lignes détectées. Le séparateur est reconnu automatiquement : point-virgule ou virgule.

## Les colonnes attendues

L'import échoue si l'une de ces colonnes est absente :

\`Licence\`, \`Saison\`, \`Nom\`, \`Prénom\`, \`Sexe\`, \`Date naissance\` (ou \`Date de naissance\`), et \`Tarif\` (ou \`Type\`).

Les colonnes suivantes sont utilisées si elles sont présentes : \`Email\`, \`Téléphone\`, \`Statut\` (ou \`Adhérent validé\`, \`Etat de dossier\`), \`Montant\`, \`Montant reçu\`, \`Montant restant\`, \`Payé\`, et les contacts \`Nom / Email / Tél. du contact 1\` et \`... contact 2\`, qui deviennent les représentants légaux.

## Ce que fait l'import

- Les **saisons absentes sont créées** à partir du code lu dans la colonne \`Saison\` (par exemple \`25-26\` donne « Saison 2025-2026 », du 1er septembre au 31 août). Elles sont créées **inactives** : c'est à vous de désigner la saison active dans les réglages.
- Chaque dossier est identifié par le couple **licence + saison**. Un dossier déjà présent est mis à jour, sinon il est créé.
- Le genre \`H\` ou \`M\` est enregistré comme masculin, \`F\` comme féminin.
- Les dates au format \`JJ-MM-AAAA\` sont converties ; les autres formats non reconnus font rejeter la ligne.
- Le statut est ramené à *valide* (\`Oui\`, \`valide\`, dossier « finalisé ») ou *suspendu* (\`Non\`, \`suspendu\`, dossier « annulé »).

## Le compte rendu

À la fin, l'application indique combien de dossiers ont été **créés**, combien ont été **mis à jour**, et combien de lignes ont été **ignorées**. Une ligne est ignorée lorsqu'une donnée obligatoire manque, que le genre est illisible ou que la date de naissance n'est pas exploitable.

> [!WARNING]
> Un réimport **écrase** les montants de cotisation par ceux du fichier. Si des encaissements ont été saisis dans l'application depuis le dernier export Poona, réimportez de préférence un export Poona à jour.


--- Article: notes-de-frais.md ---
---
title: "Notes de frais"
description: "Traiter les demandes de remboursement des bénévoles, de la saisie au remboursement."
category: "comptabilite"
order: 7
---

Une **note de frais** est une demande de remboursement pour un achat effectué pour le compte du club. L'écran se trouve dans **Comptabilité → Notes de frais** et présente deux listes : les demandes **en attente** et l'**historique** (validées et refusées), toutes deux avec une recherche libre sur le demandeur et le motif.

## D'où viennent les demandes

- **De l'adhérent** — depuis son espace, s'il y a été **autorisé** depuis sa fiche. Voir [Fiche d'un adhérent](/admin/help/fiche-adherent).
- **Du bureau** — le bouton de saisie permet d'enregistrer une note au nom d'un adhérent, avec le même formulaire.

Une note comporte : le **demandeur**, une **catégorie de dépense**, un **montant**, une **description**, et un **justificatif** photographié. Le justificatif est limité à **800 Ko** ; les catégories marquées « masquée pour les notes de frais » n'apparaissent pas dans la liste proposée.

## Traiter une demande

Une note en attente peut être :

- **Consultée** — le justificatif s'ouvre en grand ;
- **Modifiée** — montant, catégorie, description, demandeur, saison d'affectation ;
- **Validée** ou **refusée**.

**La validation crée l'écriture de dépense** dans le grand livre, libellée « Remboursement frais – *demandeur* – *description* », rattachée à l'adhérent et imputée à la catégorie choisie. Le remboursement effectif (le virement) apparaîtra ensuite sur le relevé bancaire et se rattachera à cette écriture lors du [rapprochement bancaire](/admin/help/rapprochement-bancaire).

Un refus laisse la demande dans l'historique sans écrire quoi que ce soit en comptabilité.

Dans les deux cas, **l'adhérent est notifié** sur son téléphone s'il a activé les notifications.

## Revenir sur une décision

**Annuler la validation** remet la note en attente et **supprime l'écriture comptable** créée. Si cette écriture était rapprochée d'une ligne bancaire et qu'aucune autre écriture ne la couvrait, la ligne bancaire repasse en attente.

## Ce qui est refusé

Toute action — dépôt, modification, validation, refus, annulation — est refusée dès lors que la saison concernée est **clôturée**. Réaffecter une note vers une saison clôturée l'est également. Enfin, le serveur revérifie au dépôt que l'adhérent est bien autorisé : retirer l'autorisation prend effet immédiatement.

> [!NOTE]
> Les droits sont séparés : *saisir et modifier* d'un côté, *valider, refuser et annuler* de l'autre. Un trésorier dispose des deux, la présidence uniquement du second.


--- Article: notifications.md ---
---
title: "Notifications push"
description: "Diffuser une annonce aux adhérents, suivre les envois et les abonnés."
category: "communication"
order: 1
---

La rubrique **Communication → Notifications** envoie des messages sur le téléphone des adhérents. Ils ne les reçoivent que s'ils ont **activé les notifications** depuis leur espace, appareil par appareil.

## Ce que montre l'écran

Trois indicateurs : le nombre d'**appareils** abonnés, le nombre de **comptes** distincts, et le nombre de notifications **en attente d'envoi**.

## Envoyer une annonce

| Champ | Détail |
|---|---|
| **Titre** | 80 caractères au maximum |
| **Message** | 300 caractères au maximum |
| **Page de destination** | La page de l'espace adhérent ouverte au clic, choisie dans une liste fermée |
| **Destinataires** | *Tous les abonnés*, *Cotisation non soldée*, ou *Groupes d'adhérents* |

Les **groupes** sont les formules d'adhésion importées de Poona (« Loisirs 1 (Lundi) », « Compétiteurs adultes »…), avec leur effectif. Ils sont lus dans la saison active.

Un envoi manuel part toujours dans la catégorie **« Communications du bureau »** : les autres catégories sont réservées aux messages automatiques. Un adhérent qui a coupé cette catégorie ne le reçoit pas.

L'application demande confirmation en rappelant l'audience visée, puis met les messages en file et déclenche immédiatement leur envoi. Si aucun appareil ne correspond à la cible, elle le signale plutôt que de laisser croire à un envoi.

> [!CAUTION]
> Une notification envoyée ne peut pas être rappelée. Relisez le titre et le message avant de confirmer.

## Historique et abonnés

- **L'historique** liste les messages envoyés avec leur cible, leur catégorie, leur origine et le décompte *envoyés / en échec / en attente*. Il est conservé **90 jours**.
- **La liste des abonnés** montre chaque appareil abonné, l'adresse du compte, le type d'appareil, la date d'abonnement et la date du dernier envoi réussi, ainsi que les adhérents joignables à cette adresse.

## Les envois automatiques

Trois messages partent sans intervention, chacun dans sa catégorie :

- **Note de frais validée ou refusée** — au dépositaire ;
- **Commande boutique validée ou refusée** — au commanditaire ;
- **Relance de cotisation** (hebdomadaire) et **anniversaires du jour** (quotidien) — ces deux-là sont **désactivés par défaut** et s'activent dans la configuration technique du service.

## Ce que règle l'adhérent

Depuis son espace, chaque adhérent active les notifications sur son appareil, puis choisit les catégories qu'il souhaite recevoir : *Communications du bureau*, *Anniversaires*, *Mes notes de frais*, *Mes commandes boutique*, *Relances*. Tout est actif par défaut ; il décoche ce qu'il ne veut plus.

> [!NOTE]
> Sur iPhone et iPad, les notifications ne fonctionnent **que si l'espace adhérent a été ajouté à l'écran d'accueil** depuis Safari. C'est une contrainte d'iOS. Un adhérent qui consulte le site dans un onglet classique voit la marche à suivre à la place du bouton d'activation.

Un appareil devenu injoignable — application désinstallée, autorisation révoquée — est retiré automatiquement de la liste des abonnés.


--- Article: plan-comptable.md ---
---
title: "Plan comptable"
description: "Les classes de compte qui structurent le compte de résultat."
category: "comptabilite"
order: 14
---

Le **plan comptable** de l'application se réduit aux **classes de compte** : les rubriques qui regroupent les catégories dans le compte de résultat. Il se règle dans **Réglages → Catégories et classes**, onglet *Plan comptable*.

## Une classe de compte

| Champ | Détail |
|---|---|
| **Code** | Le numéro de la rubrique (par exemple \`63\`). Il est unique et **non modifiable** après création |
| **Libellé** | Le nom affiché (par exemple « 63 - Impôts et taxes ») |
| **Type** | *Produit* (recette), *Charge* (dépense) ou *Trésorerie* |

## À quoi elles servent

- Le [compte de résultat](/admin/help/rapports-financiers) regroupe les catégories par classe : les classes de type *Charge* forment la colonne des charges, celles de type *Produit* la colonne des produits.
- Le [budget prévisionnel](/admin/help/budget-previsionnel) suit la même structure.
- Le [grand livre](/admin/help/grand-livre) peut être filtré par classe de compte.

Une [catégorie comptable](/admin/help/categories-comptables) porte jusqu'à deux classes : l'une pour ses recettes, l'autre pour ses dépenses.

## Créer, modifier, supprimer

Le bouton **Nouvelle classe** ouvre le formulaire. La modification porte sur le libellé et le type, jamais sur le code. La suppression retire la rubrique du compte de résultat : les catégories qui s'y rattachaient n'y apparaîtront plus tant qu'une autre classe ne leur est pas assignée.

> [!NOTE]
> Les **comptes financiers** — Compte Courant, Compte Livret, Caisse physique — ne se règlent pas ici : ce sont les trois emplacements fixes où l'argent du club est détenu. Voir [Principes comptables](/admin/help/principes-comptables).


--- Article: principes-comptables.md ---
---
title: "Principes comptables de l'application"
description: "Exercices, comptes financiers, catégories, moyens de paiement : le vocabulaire commun à tous les écrans."
category: "comptabilite"
order: 1
---

Cet article décrit les notions qu'on retrouve dans tous les écrans comptables. Le lire une fois évite bien des hésitations ensuite.

## L'exercice, appelé « saison »

Toute la comptabilité est rattachée à une **saison** (un exercice comptable), identifiée par un code du type \`25-26\` et bornée par une date de début et une date de fin. Une seule saison est **active** à la fois : c'est celle proposée par défaut. Voir [Saisons comptables](/admin/help/gestion-saisons).

## Les trois comptes financiers

L'argent du club est suivi sur trois comptes :

- **Compte Courant**
- **Compte Livret**
- **Caisse physique**

Chaque écriture désigne l'un de ces comptes ; un virement interne en désigne deux.

## Les trois types d'écriture

| Type | Effet | Particularité |
|---|---|---|
| **Recette** | L'argent entre sur un compte | Une catégorie est obligatoire |
| **Dépense** | L'argent sort d'un compte | Une catégorie est obligatoire |
| **Virement interne** | L'argent passe d'un compte à l'autre | Deux comptes différents, **aucune catégorie** |

Un virement interne ne change pas le résultat de l'exercice : il n'apparaît ni en produit ni en charge dans le compte de résultat.

## La catégorie, et non le numéro de compte

Le bénévole ne choisit jamais un numéro de compte : il choisit une **catégorie** (« Achat de volants », « Cotisations »…). Chaque catégorie porte deux rattachements — une classe de compte pour les recettes, une pour les dépenses — qui font le lien avec le plan comptable. Voir [Catégories comptables](/admin/help/categories-comptables) et [Plan comptable](/admin/help/plan-comptable).

## Les moyens de paiement

Virement, Chèque, Espèces, LABAZ, ANCV, Pass'Sport, Ticket Loisir, Up & Loisir.

## Les montants

Tous les montants sont stockés en **centimes** et un montant d'écriture est toujours **strictement positif** : c'est le *type* de l'écriture qui donne le sens, jamais le signe.

## Les trois phases d'un exercice

Ce qu'il est possible de saisir dépend de la date du jour par rapport aux bornes de la saison :

1. **Exercice en cours** — la saisie est libre à l'intérieur des bornes de dates.
2. **Période d'inventaire** — la date de fin est passée mais l'exercice n'est pas clôturé. Seules les **régularisations de fin d'exercice** sont acceptées : charge à payer, produit à recevoir.
3. **Exercice arrêté** — l'exercice est clôturé. Il est en **lecture seule** : plus aucune écriture ni modification.

## Les régularisations (cut-off)

Une écriture dont la date sort des bornes de l'exercice sélectionné exige un **motif de rattachement** et une **note justificative** :

- **Produit constaté d'avance** — une recette qui concerne la saison suivante ;
- **Produit à recevoir** — une recette attendue et rattachable à l'exercice (une subvention, par exemple) ;
- **Charge constatée d'avance** — une dépense payée pour la saison suivante ;
- **Charge à payer** — une dépense engagée dont la facture n'est pas parvenue.

Les motifs de type *produit* sont réservés aux recettes, ceux de type *charge* aux dépenses, et **aucune régularisation n'est possible sur un virement interne**.

> [!NOTE]
> Sans motif de rattachement, une écriture doit impérativement être datée à l'intérieur des bornes de sa saison. C'est le refus le plus fréquent au moment d'enregistrer.


--- Article: prise-en-main.md ---
---
title: "Prise en main"
description: "Se connecter, se repérer dans le menu, changer de saison et retrouver les nouveautés."
category: "admin"
order: 1
---

Cette page décrit ce qui est commun à tous les écrans de l'administration.

## Se connecter

L'accès à l'administration passe par **Cloudflare Access** : vous vous authentifiez avec votre adresse e-mail avant même d'atteindre l'application. C'est ensuite cette adresse qui détermine vos droits, à partir des rôles qui lui ont été attribués dans **Réglages → Accès & Rôles**.

Une adresse authentifiée mais inconnue de l'application n'obtient que le rôle par défaut : tableau de bord et centre d'aide.

## Le menu

Le menu latéral regroupe les rubriques par domaine : Adhérents, Comptabilité, Boutique, Communication, Réglages, Assistance. **Vous ne voyez que les rubriques auxquelles vous avez droit** — le menu est construit à partir des mêmes permissions que le contrôle d'accès des pages, une entrée visible mène donc toujours à une page qui s'ouvre.

Sur mobile, une barre d'actions en bas d'écran donne accès au menu et aux gestes les plus fréquents selon vos droits : enregistrer un chèque, créer une commande, saisir une note de frais.

## Changer de saison

La plupart des écrans comptables et le tableau de bord portent un **sélecteur de saison**. Il change la saison consultée et recharge les données affichées. Les filtres de la liste des adhérents, des factures ou des notes de frais comportent également ce choix.

## Thème clair / sombre

Un bouton dans l'en-tête bascule entre le thème clair et le thème sombre. Le choix est conservé sur l'appareil.

## Installer l'application

L'administration est une application web installable (PWA). Une bannière propose l'installation sur les appareils compatibles ; sur iPhone et iPad, l'installation passe par le menu **Partager → Sur l'écran d'accueil** de Safari. La bannière réapparaît au bout de trente jours si vous l'avez fermée.

## Les nouveautés

Le lien **Voir les nouveautés** de l'écran de démarrage, ainsi que la page \`/changelog\`, affichent l'historique des versions de l'application. Cette page est accessible à tout compte, quels que soient ses rôles.

## Assistance

Le **Centre d'aide** (cette rubrique) est ouvert à tout compte. Si vous disposez du droit correspondant, l'**Assistant IA** peut également répondre à vos questions à partir de ces mêmes articles.


--- Article: rapports-financiers.md ---
---
title: "Rapports financiers"
description: "Compte de résultat, suivi analytique, bilan et prévisionnel de trésorerie."
category: "comptabilite"
order: 8
---

**Comptabilité → Rapports financiers** donne accès à quatre rapports. Chacun se lit pour une saison, choisie avec le sélecteur en haut de page.

## Compte de résultat

Les **produits** et les **charges** de la saison, regroupés par classe de compte puis détaillés par catégorie. Trois colonnes de lecture :

- le **réalisé** de la saison ;
- le **réalisé de la saison précédente**, pour comparaison ;
- le **prévisionnel** issu du budget, avec l'écart.

Sur écran étroit, la seconde colonne bascule entre *prévisionnel* et *écart*. En dessous, deux camemberts répartissent les charges et les produits par classe de compte.

## Suivi analytique

Le détail des recettes et des dépenses **catégorie par catégorie**, sans le regroupement par classe.

## Bilan de trésorerie

Pour chacun des trois comptes financiers : le **solde initial** au premier jour de la saison, les **mouvements** de la période, et le **solde final**, avec un total général.

En dessous figure le **prévisionnel de trésorerie** : une projection mois par mois du solde des comptes, fondée sur le budget restant à consommer et sur la saisonnalité observée. Le graphique trace trois courbes — total, compte courant, livret — en trait plein pour les mois réalisés et en pointillés pour les mois projetés. Un tableau reprend les mêmes chiffres.

## Budget prévisionnel

Voir [Budget prévisionnel](/admin/help/budget-previsionnel).

## Date d'arrêté

Pour la saison en cours, les rapports sont arrêtés **à la date du jour** : les écritures postérieures ne sont pas comptées. Pour une saison passée, ils sont arrêtés à sa date de fin. C'est ce qui permet de consulter en cours d'année un résultat cohérent avec ce qui a réellement été encaissé et décaissé.

## Imprimer et exporter

Le menu **Imprimer** propose, selon le rapport affiché :

- le rapport en **PDF**, avec en-tête et pied de page du club, ouvert dans un nouvel onglet ;
- l'impression des **graphiques réalisés**, pour le compte de résultat.

Les exports de données (journal, factures, justificatifs) sont décrits dans [Exports comptables](/admin/help/exports-comptables).

## Analyse assistée

Sur le compte de résultat et le bilan de trésorerie, un bouton demande une **analyse rédigée** du rapport affiché. Elle nécessite le droit correspondant — voir [Assistant IA](/admin/help/assistant-ia).


--- Article: rapprochement-bancaire.md ---
---
title: "Rapprochement bancaire"
description: "Importer le relevé, associer chaque ligne à une écriture, une facture ou un adhérent."
category: "comptabilite"
order: 4
---

Le rapprochement consiste à faire correspondre chaque ligne du relevé de banque avec la comptabilité du club. C'est aussi le moyen le plus rapide de saisir : une ligne non rapprochée peut créer son écriture d'un clic.

## 1. Importer le relevé

Depuis **Comptabilité → Rapprochement bancaire**, le bouton d'import demande un fichier d'export bancaire (format **OFX**) et le compte de destination : *détection automatique depuis le fichier*, Compte Courant, Compte Livret ou Caisse physique.

Chaque opération du fichier porte un identifiant unique fourni par la banque. **Un même relevé peut donc être réimporté sans créer de doublon** : seules les opérations inconnues sont ajoutées, en statut *En attente*.

## 2. Faire analyser les lignes

Le bouton d'analyse fait proposer, pour chaque ligne en attente, une **catégorie comptable** et, lorsqu'il est identifiable, l'**adhérent** concerné. La suggestion s'appuie sur le libellé bancaire, les rapprochements que vous avez déjà validés, le catalogue de la boutique et les montants restant dus par les adhérents. L'analyse peut être relancée sur une seule ligne.

Ce n'est qu'une proposition : rien n'est enregistré tant que vous n'avez pas validé.

## 3. Traiter une ligne

La liste de gauche répartit les lignes en trois onglets — **En attente**, **Rapprochées**, **Ignorées** — avec une recherche libre. Sélectionner une ligne ouvre à droite un panneau proposant trois façons de la traiter :

- **Saisir écriture** — créer l'écriture correspondante (type, catégorie, montant, date, libellé, adhérent). Une même ligne bancaire peut être **ventilée en plusieurs écritures** : ajoutez des lignes de répartition tant que le montant n'est pas soldé.
- **Associer** — rattacher la ligne à une écriture **déjà saisie** dans le grand livre (un chèque enregistré, un virement interne, une note de frais validée…).
- **Associer facture** — rattacher la ligne à une ou plusieurs **factures en attente de règlement**. Les factures concernées passent automatiquement au statut *Payée*.

Une ligne est marquée **Rapprochée** dès que le total des écritures qui lui sont rattachées atteint son montant. Tant qu'il reste un écart, elle demeure en attente et vous pouvez continuer à la ventiler.

### Rattacher un adhérent

Le champ *adhérent* du panneau lie l'écriture à un dossier. Si l'écriture est imputée à la catégorie d'**adhésion**, le montant est en plus **reporté sur la cotisation de l'adhérent** : son montant reçu augmente et son solde diminue.

### Ignorer une ligne

Le bouton **Ignorer** écarte une ligne qui n'a pas à être comptabilisée. Elle bascule dans l'onglet *Ignorées*, d'où elle peut être rétablie.

## 4. Traiter plusieurs lignes d'un coup

Des cases à cocher permettent de sélectionner plusieurs lignes en attente, puis :

- **Rapprocher en lot** — crée pour chaque ligne sélectionnée l'écriture issue de sa suggestion d'analyse. Les lignes sans suggestion sont laissées de côté.
- **Ignorer en lot** — après confirmation.

> [!WARNING]
> Le rapprochement en lot applique les suggestions sans que vous les ayez relues une à une. Réservez-le aux lots homogènes et bien identifiés.

## Contrôles

Le rapprochement d'une écriture ou d'une facture appartenant à une **saison clôturée** est refusé, de même que le rattachement d'une facture déjà payée ou annulée. Les règles de date et de régularisation du [grand livre](/admin/help/grand-livre) s'appliquent aux écritures créées depuis cet écran.

Il reste toujours possible de défaire un rapprochement en supprimant l'écriture rattachée : la ligne bancaire repasse alors en attente.


--- Article: remises-cheques.md ---
---
title: "Chèques et remises"
description: "Enregistrer un chèque reçu, générer un bordereau de remise et l'encaisser."
category: "comptabilite"
order: 5
---

La rubrique **Comptabilité → Remises de chèques** se divise en deux écrans : la **gestion des chèques** reçus, et les **bordereaux de remise** déposés en banque.

Un chèque passe par trois états : *reçu* (en coffre) → *déposé* (inclus dans un bordereau) → *encaissé* (le bordereau est rapproché du relevé).

## 1. Enregistrer un chèque

Depuis **Gestion des chèques**, le bouton **Enregistrer un chèque** ouvre un formulaire en deux parties.

**Scanner** — prenez le chèque en photo. L'analyse remplit le numéro, le montant, l'émetteur, la banque et la date d'émission, et propose l'adhérent dont le nom correspond à celui de l'émetteur ou d'un représentant légal. Relisez toujours les champs remplis ainsi.

**Saisir manuellement** — les mêmes champs, à renseigner vous-même :

- **N° de chèque** (7 chiffres), **montant**, **émetteur** — obligatoires ;
- **Banque** et **date d'émission** — facultatives ;
- **Adhérent concerné** — pour l'imputation de la cotisation ;
- **Affectation / catégorie** — l'imputation comptable de la recette.

À l'enregistrement, l'application crée **automatiquement une recette au Compte Courant**, portant la référence « Chèque n° … ». Si un adhérent est désigné et que la catégorie est celle de l'adhésion, le montant est en plus **reporté sur sa cotisation**.

Supprimer un chèque supprime l'écriture correspondante et défait ce report.

## 2. Générer un bordereau de remise

Lorsque vous partez déposer plusieurs chèques :

1. Cochez les chèques concernés dans la liste des chèques *reçus* ;
2. Cliquez sur **Créer une remise** ;
3. La **référence est proposée automatiquement** (du type \`REMISE-20260315-3\`) et reste modifiable ; renseignez la date ;
4. Validez.

Les chèques sélectionnés passent en *déposé* et la remise apparaît dans l'écran **Bordereaux de remise**, où elle peut être consultée et **imprimée** pour accompagner le dépôt.

## 3. Encaisser la remise

Quand la remise apparaît sur le relevé bancaire, ouvrez-la et choisissez la ligne du relevé correspondante parmi les opérations en attente. La remise passe en *encaissée* et la ligne bancaire est marquée rapprochée.

## Défaire une remise

Supprimer un bordereau **libère les chèques qu'il contenait** — ils redeviennent disponibles pour une nouvelle remise — et remet, le cas échéant, la ligne bancaire associée en attente.

> [!NOTE]
> Un chèque encore en coffre ou une remise non encaissée **empêche la clôture de l'exercice**. Voir [Saisons comptables](/admin/help/gestion-saisons).


--- Article: soldes-initiaux.md ---
---
title: "Soldes initiaux"
description: "Fixer l'état des comptes au premier jour de la saison."
category: "comptabilite"
order: 12
---

Le **solde initial** est le montant présent sur chaque compte financier au premier jour de la saison comptable. Il sert de base à tous les calculs : solde progressif du grand livre, bilan de trésorerie, contrôle de clôture.

## Où les saisir

Depuis **Réglages → Saisons comptables**, le bouton **Soldes** de la saison ouvre la saisie des trois montants :

- **Compte Courant**
- **Compte Livret**
- **Caisse physique**

## Pré-remplissage automatique

Lorsque les soldes n'ont jamais été saisis, l'application les **pré-remplit à partir des soldes de fin de la saison précédente** et l'indique par un message. Ce sont des valeurs proposées, pas enregistrées : **cliquez sur *Enregistrer* pour les valider**.

La [clôture d'un exercice](/admin/help/gestion-saisons) écrit également ces soldes sur la saison suivante, à partir des soldes de clôture calculés.

## Saison clôturée

Sur une saison clôturée, les soldes initiaux sont affichés mais ne sont plus modifiables.

> [!TIP]
> Un écart entre le solde initial saisi et le solde de clôture calculé de la saison précédente est signalé au moment de clôturer. C'est le bon moment pour trancher : soit une écriture manque sur l'exercice qui s'achève, soit le solde de départ est à corriger.


--- Article: tableau-de-bord.md ---
---
title: "Tableau de bord"
description: "Lire d'un coup d'œil l'état des adhésions, de la trésorerie et des tâches en attente."
category: "admin"
order: 2
---

Le **Tableau de bord** est la page d'accueil de l'administration. Il est accessible à tout compte et se lit toujours pour une saison donnée, choisie avec le sélecteur en haut de page.

## Les quatre cartes de synthèse

- **Adhérents** — L'effectif de la saison, comparé à celui de la saison précédente lorsqu'elle existe, et le nombre d'adhésions partiellement réglées.
- **Cotisations incomplètes** — Le nombre d'adhérents qui n'ont pas soldé leur cotisation.
- **Trésorerie & banque** — Les chèques encaissés mais pas encore remis, et les remises créées mais pas encore rapprochées.
- **Tâches administratives** — Les notes de frais en attente de validation, les factures à traiter, et les commandes boutique en attente.

Chaque compteur renvoie vers l'écran concerné, **à condition que vous ayez le droit de l'ouvrir**. Sans ce droit, le chiffre reste affiché mais n'est pas cliquable.

## Le bilan des pôles d'activité

En dessous, quatre cartes répartissent les recettes et dépenses de la saison entre les pôles **Compétition**, **Jeunes**, **Matériel** et **Fonctionnement**. La répartition est déduite du libellé de la catégorie comptable de chaque écriture : par exemple, une catégorie contenant « tournoi », « buvette » ou « interclub » alimente le pôle Compétition, une catégorie contenant « cordage » ou « volant » alimente le pôle Matériel.

> [!NOTE]
> Une catégorie dont le libellé ne correspond à aucun de ces mots-clés n'apparaît dans aucun pôle. Elle reste bien entendu comptée dans les rapports financiers, qui font foi.

`;

export const DB_SCHEMA = `
// Schema: accounting
export const seasonsTable = sqliteTable('seasons', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  start_date: text('start_date').notNull(),
  end_date: text('end_date').notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(false),
  closed_at: integer('closed_at', { mode: 'timestamp' }),
  approved_at: integer('approved_at', { mode: 'timestamp' }),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull()
});


export const accountClassesTable = sqliteTable('account_classes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(),
  label: text('label').notNull(),
  type: text('type', { enum: ['recette', 'depense', 'tresorerie'] }).notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const accountsTable = sqliteTable('accounts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(),
  label: text('label').notNull(),
  account_class_id: integer('account_class_id').notNull().references(() => accountClassesTable.id),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const paymentMethodsTable = sqliteTable('payment_methods', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(),
  label: text('label').notNull(),
  default_account_id: integer('default_account_id').notNull().references(() => accountsTable.id),
  default_entry_status: text('default_entry_status', { enum: ['cleared', 'in_vault', 'pending_debit'] }).notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const categoriesTable = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  // Unique : rend \`INSERT OR IGNORE\` du seed de référence réellement idempotent
  // (un rejeu de migration avait dupliqué toutes les catégories, cf. 0008).
  admin_label: text('admin_label').notNull().unique(),
  adherent_label: text('adherent_label').notNull(),
  hide_in_expenses: integer('hide_in_expenses', { mode: 'boolean' }).notNull().default(false),
  receipt_account_class_id: integer('receipt_account_class_id').references(() => accountClassesTable.id),
  expense_account_class_id: integer('expense_account_class_id').references(() => accountClassesTable.id),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const seasonBalancesTable = sqliteTable('season_balances', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  season_id: integer('season_id').notNull(),
  account_id: integer('account_id').notNull().references(() => accountsTable.id),
  initial_balance_cents: integer('initial_balance_cents').notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull()
}, (table) => ({
  season_account_idx: uniqueIndex('season_account_idx').on(table.seasonId, table.accountId),
}));

export const bankStatementLinesTable = sqliteTable('bank_statement_lines', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  fitid: text('fitid').notNull().unique(),
  account_id: integer('account_id').notNull().references(() => accountsTable.id),
  amount_cents: integer('amount_cents').notNull(),
  date: text('date').notNull(),
  name: text('name').notNull(),
  memo: text('memo'),
  status: text('status', { enum: ['pending', 'reconciled', 'ignored'] }).notNull().default('pending'),
  ai_suggestions: text('ai_suggestions'),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const checkDepositsTable = sqliteTable('check_deposits', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  season_id: integer('season_id').notNull(),
  reference: text('reference').notNull().unique(),
  date: text('date').notNull(),
  amount_cents: integer('amount_cents').notNull(),
  status: text('status', { enum: ['pending', 'deposited', 'cleared'] }).notNull().default('pending'),
  bank_statement_line_id: integer('bank_statement_line_id').references(() => bankStatementLinesTable.id),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const invoicesTable = sqliteTable('invoices', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  invoice_number: text('invoice_number').notNull().unique(),
  season_id: integer('season_id').notNull(),
  date: text('date').notNull(),
  due_date: text('due_date').notNull(),
  client_name: text('client_name').notNull(),
  client_address: text('client_address'),
  client_email: text('client_email'),
  subject: text('subject'),
  location: text('location'),
  period: text('period'),
  attendees: text('attendees'),
  status: text('status', { enum: ['draft', 'sent', 'paid', 'cancelled'] }).notNull().default('draft'),
  total_amount_cents: integer('total_amount_cents').notNull(),
  bank_statement_line_id: integer('bank_statement_line_id').references(() => bankStatementLinesTable.id),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const invoiceItemsTable = sqliteTable('invoice_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  invoice_id: integer('invoice_id').notNull().references(() => invoicesTable.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  quantity: integer('quantity').notNull().default(1),
  unit_price_cents: integer('unit_price_cents').notNull(),
  total_price_cents: integer('total_price_cents').notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const ledgerEntriesTable = sqliteTable('ledger_entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  season_id: integer('season_id').notNull(),
  type: text('type', { enum: ['recette', 'depense', 'transfert'] }).notNull(),
  account_id: integer('account_id').notNull().references(() => accountsTable.id),
  destination_account_id: integer('destination_account_id').references(() => accountsTable.id),
  category_id: integer('category_id').references(() => categoriesTable.id),
  amount_cents: integer('amount_cents').notNull(),
  date: text('date').notNull(),
  payment_method_id: integer('payment_method_id').notNull().references(() => paymentMethodsTable.id),
  description: text('description').notNull(),
  reference: text('reference'),
  accrual_type: text('accrual_type', {
    enum: ['normal', 'produit_constate_avance', 'charge_constatee_avance', 'charge_a_payer', 'produit_a_recevoir']
  }).notNull().default('normal'),
  accrual_note: text('accrual_note'),
  member_id: integer('member_id'),
  bank_statement_line_id: integer('bank_statement_line_id').references(() => bankStatementLinesTable.id),
  invoice_id: integer('invoice_id').references(() => invoicesTable.id),
  status: text('status', { enum: ['pending_debit', 'in_vault', 'cleared'] }).notNull().default('cleared'),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull()
}, (table) => ({
  ledger_entries_amount_cents_check: check('ledger_entries_amount_cents_check', sql\`\${table.amountCents} > 0\`),
  transfertCheck: check(
    'ledger_entries_transfert_check',
    sql\`(\${table.type} = 'transfert' AND \${table.destinationAccountId} IS NOT NULL AND \${table.destinationAccountId} <> \${table.accountId} AND \${table.categoryId} IS NULL) OR (\${table.type} <> 'transfert' AND \${table.destinationAccountId} IS NULL)\`
  )
}));

export const checksTable = sqliteTable('checks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  check_deposit_id: integer('check_deposit_id').references(() => checkDepositsTable.id),
  season_id: integer('season_id').notNull(),
  number: text('number').notNull(),
  amount_cents: integer('amount_cents').notNull(),
  emitter: text('emitter').notNull(),
  bank: text('bank'),
  member_id: integer('member_id'),
  ledger_entry_id: integer('ledger_entry_id').references(() => ledgerEntriesTable.id),
  status: text('status', { enum: ['received', 'deposited'] }).notNull().default('received'),
  photo_url: text('photo_url'),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const seasonCategoryBudgetsTable = sqliteTable('season_category_budgets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  season_id: integer('season_id').notNull(),
  category_id: integer('category_id').notNull().references(() => categoriesTable.id),
  type: text('type', { enum: ['recette', 'depense'] }).notNull(),
  amount_cents: integer('amount_cents').notNull().default(0),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull()
}, (table) => ({
  season_category_idx: uniqueIndex('season_category_idx').on(table.seasonId, table.categoryId, table.type),
}));

// Schema: shop
export const productCategoriesTable = sqliteTable('product_categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  // Unique : rend \`INSERT OR IGNORE\` du seed de référence réellement idempotent
  // (un rejeu de migration avait dupliqué toutes les catégories, cf. 0008).
  label: text('label').notNull().unique(),
  accounting_category_id: integer('accounting_category_id').notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const productsTable = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  product_category_id: integer('product_category_id').notNull().references(() => productCategoriesTable.id),
  price_cents: integer('price_cents').notNull(),
  stock: integer('stock').notNull().default(0),
  track_stock: integer('track_stock', { mode: 'boolean' }).notNull().default(false),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const ordersTable = sqliteTable('orders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  season_id: integer('season_id').notNull(),
  member_id: integer('member_id').notNull(),
  product_id: integer('product_id').notNull().references(() => productsTable.id),
  quantity: integer('quantity').notNull().default(1),
  total_amount_cents: integer('total_amount_cents').notNull(),
  payment_method_id: integer('payment_method_id').notNull(),
  status: text('status', { enum: ['pending', 'approved', 'rejected'] }).notNull().default('pending'),
  paid_at: text('paid_at'),
  ledger_entry_id: integer('ledger_entry_id'),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull()
});

// Schema: iam
export const adminUsersTable = sqliteTable('admin_users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  /**
   * Ancienne liste de permissions à jokers, remplacée par \`admin_user_roles\`.
   *
   * Conservée le temps d'une release : c'est la seule copie de l'état des droits
   * d'avant la migration 0012, et les migrations D1 ne se rejouent pas à l'envers.
   * Supprimée par la migration 0013.
   *
   * @deprecated Utiliser les rôles (\`adminUserRolesTable\`).
   */
  permissions: text('permissions', { mode: 'json' }).\$type<string[]>().notNull().default([]),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
  updated_at: integer('updated_at', { mode: 'timestamp' })
});

/**
 * Rôles attribués à un compte d'administration.
 *
 * Seule la liaison compte↔rôle est en base : le mapping rôle→permissions vit en
 * TypeScript (\`shared/roles.ts\`), où il est versionné, typé et relu. Un compte peut
 * cumuler plusieurs rôles ; ses permissions sont l'union des leurs. Aucune ligne
 * signifie aucun droit — c'est le deny-by-default.
 */
export const adminUserRolesTable = sqliteTable(
  'admin_user_roles',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    user_id: integer('user_id')
      .notNull()
      .references(() => adminUsersTable.id, { onDelete: 'cascade' }),
    // Texte libre plutôt qu'enum figé : un rôle retiré du code ne doit pas rendre la
    // ligne illisible. \`resolvePermissions\` ignore les rôles inconnus, donc un rôle
    // périmé se traduit par une absence de droit, jamais par un droit accordé.
    role: text('role').notNull(),
    created_at: integer('created_at', { mode: 'timestamp' }).notNull()
  },
  (table) => ({
    admin_user_roles_user_role_idx: uniqueIndex('admin_user_roles_user_role_idx').on(table.userId, table.role),
    admin_user_roles_role_idx: index('admin_user_roles_role_idx').on(table.role)
  })
);

export type AdminUserRow = typeof adminUsersTable.\$inferSelect;
export type AdminUserRoleRow = typeof adminUserRolesTable.\$inferSelect;

// Schema: members
export const usersTable = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  name: text('name'),
  role: text('role', { enum: ['admin', 'ca', 'member'] }).notNull().default('member'),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const membersTable = sqliteTable('members', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  licence: text('licence').notNull(),
  season_id: integer('season_id').notNull(),
  last_name: text('last_name').notNull(),
  first_name: text('first_name').notNull(),
  gender: text('gender', { enum: ['M', 'F'] }).notNull(),
  birth_date: text('birth_date').notNull(),
  email: text('email'),
  phone: text('phone'),
  status: text('status', { enum: ['valide', 'suspendu', 'incomplet', 'en_attente'] }).notNull().default('valide'),
  type: text('type').notNull(),
  imported_at: integer('imported_at', { mode: 'timestamp' }).notNull(),
  amount_due_cents: integer('amount_due_cents').notNull().default(0),
  amount_received_cents: integer('amount_received_cents').notNull().default(0),
  amount_remaining_cents: integer('amount_remaining_cents').notNull().default(0),
  paid: integer('paid', { mode: 'boolean' }).notNull().default(false),
  // Autorise l'adhérent à saisir des notes de frais (défaut : non). Piloté depuis l'admin.
  expense_authorized: integer('expense_authorized', { mode: 'boolean' }).notNull().default(false),
  parent1_name: text('parent1_name'),
  parent1_email: text('parent1_email'),
  parent1_phone: text('parent1_phone'),
  parent2_name: text('parent2_name'),
  parent2_email: text('parent2_email'),
  parent2_phone: text('parent2_phone')
}, (table) => ({
  members_licence_season_idx: uniqueIndex('members_licence_season_idx').on(table.licence, table.seasonId),
}));

// Configuration (singleton, id = 1) du modèle d'attestation CSE : identité du
// signataire et signature. La signature est stockée en base64 (TEXT) car le
// worker n'a pas \`nodejs_compat\` (pas de Buffer) et \`pdf-lib\` accepte le base64
// directement. Cap applicatif à l'upload pour rester sous la limite D1 (100 KB/SQL).
export const attestationConfigTable = sqliteTable('attestation_config', {
  id: integer('id').primaryKey(),
  signatory_name: text('signatory_name').notNull().default('Robert THAI'),
  signatory_email: text('signatory_email').notNull().default('president@nozaybad.fr'),
  website_url: text('website_url').notNull().default('www.nozaybad.fr'),
  signature_base64: text('signature_base64'),
  updated_at: integer('updated_at', { mode: 'timestamp' }).notNull()
});
`;
