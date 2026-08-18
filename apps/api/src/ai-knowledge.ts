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

- **Accès minimal** — Tableau de bord et centre d'aide uniquement, aucun droit métier. C'est ce qu'on attribue à un compte créé sans rôle : il peut se connecter, rien de plus.
- **Communication** — Les annonces du club, les notifications aux adhérents et **le site public dans son ensemble** : pages, actualités, médiathèque, créneaux, agenda et menus. Ni finances, ni fichier des adhérents : c'est le rôle à donner au bénévole qui anime la communication, sans lui ouvrir le secrétariat.
- **Entraîneur·e** — Le catalogue de la boutique et les commandes passées pour les adhérents, dont il consulte le fichier. Il tient également **les créneaux** à jour : ce sont les encadrants qui vivent les horaires au quotidien. Il ne valide pas les commandes : l'encaissement relève de la trésorerie.
- **Secrétaire** — Le fichier des adhérents (consultation, modification, import Poona), les attestations CSE, la communication (annonces et notifications), le catalogue de la boutique, et la **rédaction** sur le site public (pages, actualités, médiathèque, agenda) sans la main sur l'arborescence ni les suppressions. Consultation seule côté finances.
- **Trésorier·ère** — La comptabilité complète : grand livre, factures, rapprochement bancaire, chèques, exercices, budget et rapports. Les notes de frais, de la saisie au remboursement. L'encaissement des commandes. Consultation seule des pages, actualités, créneaux et agenda du site public.
- **Président·e** — La consultation de l'ensemble du club, les actes de gouvernance (ouverture et clôture d'exercice, vote du budget), la validation des notes de frais et des commandes, la communication, le site public dans son ensemble, et la gestion des accès.
- **Super administrateur** — Tous les droits, y compris la configuration technique.

> [!NOTE]
> La présidence peut tout consulter mais ne saisit pas d'écriture comptable. C'est volontaire : le trésorier saisit, la présidence contrôle, et chaque écriture du grand livre reste attribuable à une seule personne. Si la même personne assure les deux fonctions, attribuez-lui les deux rôles.

## Attribuer un rôle

Depuis **Réglages → Accès & Rôles**, ajoutez la personne avec l'adresse e-mail qu'elle utilise pour se connecter, puis cochez ses rôles. La liste des droits accordés s'affiche juste en dessous : vérifiez-la avant d'enregistrer, elle dit exactement ce que la personne pourra faire.

> [!CAUTION]
> Ne donnez le rôle **Super administrateur** qu'aux personnes qui en ont réellement besoin. Il ouvre la configuration technique et permet de consulter l'application sous l'identité d'un autre compte.

## Ajuster ce qu'un rôle permet

Depuis le panneau **Que permet chaque rôle ?**, un super administrateur peut cocher ou décocher les droits d'un rôle. La modification s'applique immédiatement à tous les comptes qui le portent — comptez quelques secondes de propagation.

Trois points à connaître :

- Le rôle **Super administrateur** n'est pas modifiable : il détient tous les droits par construction, y compris ceux des fonctionnalités à venir. C'est aussi ce qui garantit qu'on ne peut pas se verrouiller hors de cet écran.
- Le tableau de bord et le centre d'aide restent toujours accordés, même si vous les décochez : sans eux, la personne ne verrait plus rien après s'être connectée.
- Un rôle qui s'écarte de sa définition d'origine est signalé, avec le nombre d'ajouts et de retraits, et un bouton pour y revenir. Chaque modification est enregistrée avec son auteur et sa date.

> [!CAUTION]
> Modifier un rôle change les droits de **toutes** les personnes qui le portent, pas seulement les vôtres. Vérifiez la colonne concernée avant d'enregistrer.

## Retirer un accès

Supprimer un compte lui retire immédiatement l'accès. Un garde-fou empêche de supprimer — ou de rétrograder — le dernier super administrateur : sans lui, plus personne ne pourrait attribuer de rôle, et il faudrait une intervention technique pour rouvrir l'application.

## Consulter en tant qu'un autre compte

Un super administrateur peut consulter l'application sous l'identité d'un autre compte, pour reproduire ce qu'une personne voit quand elle signale un problème. Un bandeau orange rappelle en permanence sous quelle identité vous agissez. Cette fonction ne permet jamais d'obtenir plus de droits que les siens.


--- Article: agenda.md ---
---
title: "Agenda"
description: "Publier les compétitions, stages et animations sur l'agenda du site public."
category: "communication"
order: 4
---

**Communication → Agenda** tient le calendrier du club : compétitions, interclubs, tournois, stages, animations et assemblées. Les événements publiés composent la page **Agenda** du site public.

Ils remplacent l'agenda Google intégré de l'ancien site, dont le contenu était **entièrement invisible pour les moteurs de recherche** : une compétition annoncée n'existait que pour qui ouvrait la page. Chaque événement publié est désormais du texte indexable, accompagné de ses données structurées — c'est ce qui permet à une date d'apparaître directement dans une recherche.

## Ajouter un événement

| Champ | Détail |
|---|---|
| **Titre** | 200 caractères au maximum. « Interclubs D3 — journée 4 » |
| **Début** | Date et heure. Obligatoire |
| **Fin** | Facultative. Déplacer le début décale la fin d'autant, en conservant la durée |
| **Catégorie** | Compétition, Interclubs, Tournoi, Stage, Vie du club, Assemblée |
| **Lieu** | Texte libre : « Halle des Sports », ou le gymnase du club adverse |

Le **lieu** est volontairement libre, et non choisi parmi les gymnases du club : la moitié des événements se déroulent en déplacement, dans des salles que le club ne référence pas.

L'événement est créé **en brouillon** : il n'apparaît sur le site qu'une fois publié.

> [!NOTE]
> Le formulaire ne demande pas de description ni de lien vers la fiche FFBaD ou Badnet. Le modèle les prévoit, mais les champs correspondants ne sont pas encore dans l'écran. Mettez l'essentiel dans le titre en attendant.

## Ouvrir les inscriptions

Un stage, une soirée raclette, une assemblée générale : le champ **Inscriptions** — visible à la modification d'un événement, pas à sa création — décide si les adhérents peuvent s'annoncer.

| État | Ce qui se passe |
|---|---|
| **Sans inscription** | Rien n'est proposé. C'est le cas par défaut, et celui de la plupart des compétitions |
| **Inscriptions ouvertes** | L'adhérent s'inscrit depuis son espace, en indiquant s'il vient accompagné et de combien de personnes. Il peut aussi se désinscrire |
| **Inscriptions closes** | La liste est arrêtée : plus personne ne s'ajoute ni ne se retire. Elle reste consultable ici |

Les inscriptions ne sont proposées que sur un événement **publié** et **à venir**. Un événement en brouillon dont on aurait ouvert les inscriptions par avance ne laisse entrer personne, et le jour même reste ouvert jusqu'à minuit.

Il n'y a **pas de nombre de places** : le club ne joue aucun de ces rendez-vous à la place près, et une jauge imposerait une course à l'inscription puis une liste d'attente pour un problème qui ne se pose pas. Si l'affluence dépasse ce qui était prévu, passez les inscriptions en **closes**.

## Voir les inscrits

Menu **⋯** → **Voir les inscrits**, sur tout événement qui en accepte. Le panneau donne le nom, le prénom et le nombre d'accompagnants de chacun, classés par nom de famille, avec en pied les deux chiffres qui comptent : le nombre d'**inscrits** et le nombre de **personnes** — accompagnants compris. C'est le second qu'on donne au traiteur.

Le bouton **Copier la liste** recopie le tout en texte, prêt à coller dans un message ou un tableur.

> [!IMPORTANT]
> Cette liste nomme des adhérents : elle demande le droit **Voir les inscrits à un événement**, distinct de la tenue de l'agenda. La fiche d'un événement est publique, la liste de ses inscrits ne l'est pas.

## Publier, annuler, supprimer

Le statut se change **depuis la liste**, par le menu **⋯**.

| Statut | Sur le site public |
|---|---|
| **Brouillon** | Invisible |
| **En ligne** | Affiché dans l'agenda, s'il est à venir |
| **Annulé** | Retiré de l'agenda |

> [!IMPORTANT]
> **Annuler retire l'événement du site**, il ne l'y laisse pas barré. Si l'annulation doit être portée à la connaissance de ceux qui comptaient s'y rendre, publiez une [annonce](/admin/help/annonces) ou une [actualité](/admin/help/site-actualites) : l'agenda, lui, ne montre que ce qui aura bien lieu.

Le statut **Annulé** garde une trace côté administration : l'événement reste dans la liste, marqué en rouge, plutôt que d'être effacé. C'est ce qui le distingue de la **suppression**, définitive, réservée à un événement saisi par erreur.

## Ce que voit le visiteur

La page **Agenda** liste les cinquante prochains événements publiés, du plus proche au plus lointain, avec leur date en toutes lettres, leur heure, leur catégorie et leur lieu.

Un événement du jour **reste affiché jusqu'à minuit**, même si son heure de début est passée : une compétition ne disparaît pas de l'affiche à 9 h 01.

Les événements passés disparaissent du site le lendemain, mais restent visibles dans l'écran d'administration, qui affiche aussi l'historique.

## Agenda ou créneaux ?

Deux rubriques voisines, à ne pas confondre :

- l'**Agenda** porte des événements **datés et ponctuels** : un tournoi le 14 novembre, l'assemblée générale du 20 juin ;
- les [**Créneaux**](/admin/help/creneaux) portent les **horaires hebdomadaires** d'entraînement, qui reviennent chaque semaine de la saison.

## Qui peut faire quoi

| Action | Droit requis |
|---|---|
| Consulter l'agenda | Consulter l'agenda |
| Ajouter, modifier, publier, annuler | Créer et modifier un événement |
| Ouvrir ou fermer les inscriptions | Créer et modifier un événement |
| Voir les inscrits | Voir les inscrits à un événement |
| Supprimer | Supprimer un événement |

Les rôles **Communication**, **Président·e** et **Super administrateur** disposent de l'ensemble. Le rôle **Secrétaire** peut créer, modifier et voir les inscrits, mais pas supprimer. Les droits se règlent depuis [Accès & Rôles](/admin/help/acces-permissions).


--- Article: annonces.md ---
---
title: "Annonces"
description: "Publier les informations du club sur l'accueil de l'espace adhérent."
category: "communication"
order: 1
---

**Communication → Annonces** sert à publier les informations du club : tournois, assemblée générale, fermeture des créneaux, changement d'horaire.

À ne pas confondre avec les [actualités du site](/admin/help/site-actualites), qui sont publiques et lisibles par n'importe qui : une annonce s'adresse aux **adhérents connectés**, et peut faire sonner leur téléphone.

Une annonce publiée apparaît **sur l'accueil de l'espace adhérent** (les 3 plus récentes) et **sur la page « Annonces du club »**, qui en conserve l'historique complet. Contrairement à une notification, elle reste consultable indéfiniment : un adhérent qui n'a pas activé les notifications, ou qui a balayé la notification sur son téléphone, retrouve l'information.

## Rédiger une annonce

| Champ | Détail |
|---|---|
| **Titre** | Ce que l'adhérent lit en premier. 200 caractères au maximum |
| **Texte** | Le corps de l'annonce, avec sa mise en forme |
| **Statut** | **Brouillon** (invisible des adhérents) ou **Publiée** (visible) |

La barre d'outils au-dessus du texte permet de mettre en **gras**, en *italique*, de souligner, d'insérer un lien et de créer des listes à puces ou numérotées. C'est volontairement limité : une annonce doit rester lisible sur un téléphone.

> [!TIP]
> Vous pouvez coller du texte depuis un traitement de texte ou un e-mail : seul le texte est repris, sans les polices ni les couleurs d'origine. Vous remettez ensuite la mise en forme voulue avec la barre d'outils.

Pour un lien, sélectionnez d'abord le texte à transformer en lien, puis cliquez sur l'icône de chaîne. Les adresses acceptées commencent par \`https://\`, \`http://\`, \`mailto:\` ou \`/\` (une page de l'espace adhérent, par exemple \`/boutique\`).

## Brouillon ou publiée

Une annonce est créée **en brouillon** par défaut : vous pouvez la préparer, la relire, la faire valider, et ne la publier qu'au bon moment. Tant qu'elle est en brouillon, aucun adhérent ne la voit.

Passez le statut à **Publiée** pour la rendre visible. La date de publication est alors enregistrée — c'est elle qui détermine l'ordre d'affichage.

Depuis la liste, le menu **⋯** permet de basculer une annonce d'un statut à l'autre sans rouvrir le formulaire : **Publier** pour un brouillon, **Repasser en brouillon** pour une annonce publiée. C'est le geste à retenir en cas d'urgence — un tournoi annulé, une date erronée : deux clics et l'annonce disparaît de l'espace adhérent.

> [!NOTE]
> Repasser une annonce en brouillon puis la republier **ne change pas** sa date de publication d'origine. Corriger une faute de frappe dans une vieille annonce ne la fait donc pas remonter en tête de l'accueil.

## Prévenir les adhérents

Publier une annonce ne prévient personne : elle attend d'être lue. Pour faire sonner les téléphones, cochez **« Prévenir les adhérents »** au moment de la publication. Une notification part alors vers tous les adhérents qui ont activé les notifications, et les renvoie vers la page des annonces.

La notification reprend le **titre de l'annonce** et le **début de son texte** (environ 300 caractères, sans la mise en forme). Un aperçu de ce que recevront les adhérents s'affiche sous la case une fois celle-ci cochée.

La case n'est activable que lorsque le statut est **Publiée** : tant que l'annonce est un brouillon, elle reste visible mais grisée.

Vous pouvez aussi diffuser après coup : dans la liste, ouvrez le menu **⋯** d'une annonce publiée et choisissez **Prévenir les adhérents**.

> [!IMPORTANT]
> Une annonce n'est diffusée **qu'une seule fois**. Une fois l'envoi effectué, l'option disparaît, et modifier l'annonce ne déclenche aucun nouvel envoi. C'est ce qui évite de notifier tout le club à chaque correction.

La colonne **Diffusion** de la liste indique la date d'envoi, ou un tiret si l'annonce n'a jamais été diffusée.

## Qui peut faire quoi

| Action | Droit requis |
|---|---|
| Consulter les annonces | Consulter les annonces |
| Créer, modifier, publier | Rédiger et publier une annonce |
| Supprimer | Supprimer une annonce |
| Prévenir les adhérents | **Envoyer une notification au club** |

La diffusion relève du même droit que l'envoi depuis l'écran [Notifications](/admin/help/notifications) : une annonce diffusée atteint tous les téléphones du club, ce qui n'est pas du même ordre que la rédaction. Un compte qui peut rédiger sans pouvoir diffuser ne voit simplement pas la case à cocher.

Le rôle **Communication** réunit exactement ces droits — annonces et notifications, sans accès aux finances ni au fichier des adhérents. C'est celui à attribuer au bénévole qui anime la communication du club.

Les droits se règlent depuis [Accès & Rôles](/admin/help/acces-permissions), rubrique **Annonces**.

## Supprimer une annonce

La suppression est **définitive** : l'annonce disparaît de l'accueil et de l'historique. Si vous souhaitez seulement la retirer de la vue des adhérents en la conservant, repassez-la en **brouillon**.


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
description: "Valider, encaisser ou refuser les commandes des adhérents, et l'écriture qui en découle."
category: "boutique"
order: 2
---

**Boutique → Commandes** présente trois listes : les commandes **à valider**, celles **en attente de paiement** et l'**historique** (payées, refusées, annulées). La recherche porte sur l'adhérent, sa licence, le produit, le moyen de paiement et le montant.

Une commande suit le parcours **créée** → **en attente de paiement** → **payée**. Deux issues la referment sans règlement : le **refus** d'une demande non validée, et l'**annulation** d'une commande validée que le paiement n'a jamais suivie.

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

La validation accepte la demande et met la commande **en attente de paiement**. Elle produit deux effets :

1. **Le stock est décrémenté**, si le produit en assure le suivi : l'article est désormais réservé à cet adhérent ;
2. **L'adhérent est notifié** que sa commande est validée et du montant à régler.

Rien n'est écrit en comptabilité à ce stade : une commande non réglée n'a pas à peser sur l'exercice.

## Encaisser une commande

L'encaissement est l'acte comptable de la boutique. Il enchaîne deux effets :

1. **Une recette est écrite au grand livre**, libellée « Achat boutique – *adhérent* – *produit* × *quantité* », imputée à la catégorie comptable de la **famille du produit** et rattachée à l'adhérent ;
2. **L'adhérent est notifié** de l'enregistrement de son règlement.

L'exercice de rattachement est déduit de la **date de paiement**, et non de la date de la commande. Si cette date tombe dans un exercice déjà arrêté, la recette est portée sur l'exercice ouvert sous forme de **régularisation** documentée, plutôt que refusée.

Une commande déjà traitée ne peut pas l'être une seconde fois : si deux personnes encaissent en même temps, la seconde reçoit un message de conflit.

## Les relances

Les commandes en attente de paiement depuis **plus de sept jours** déclenchent une relance hebdomadaire à l'adhérent, dans la catégorie **Relances** de ses notifications. La liste affiche l'ancienneté de chaque attente, pour repérer d'un coup d'œil celles qui traînent.

Les relances automatiques ne partent que si elles ont été activées sur le service (variable \`PUSH_REMINDERS_ENABLED\`), le même interrupteur que les relances de cotisation.

## Refuser ou annuler une commande

- Le **refus** ferme une demande **non encore validée**. Aucun mouvement de stock, aucune écriture.
- L'**annulation** ferme une commande **validée et jamais réglée** : le stock réservé est rendu au catalogue. Aucune écriture non plus, puisque la recette n'a jamais existé.

Les deux laissent la commande dans l'historique et notifient l'adhérent.

## Ce qui bloque la clôture

Une **commande portant une date de paiement mais non encaissée** empêche la clôture de l'exercice : la recette correspondante n'existe pas encore en comptabilité. Voir [Saisons comptables](/admin/help/gestion-saisons).

> [!NOTE]
> Consulter les commandes et les traiter sont deux droits distincts. Le secrétariat suit les commandes, le trésorier et la présidence les valident et les encaissent — parce qu'encaisser, c'est écrire une recette.


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


--- Article: creneaux.md ---
---
title: "Créneaux"
description: "Tenir à jour les horaires d'entraînement affichés sur le site public."
category: "communication"
order: 3
---

**Communication → Créneaux** tient les horaires d'entraînement de la saison : jour, heure, groupe, gymnase.

Ces créneaux sont **la source unique** des horaires. Ils alimentent le site public dès qu'ils changent, sans qu'aucune page ait à être modifiée : chaque page qui porte un bloc **Créneaux** les affiche à jour. Voir [Les blocs de contenu](/admin/help/site-blocs).

Ils remplacent la feuille Google de l'ancien site, que les moteurs de recherche ne voyaient pas : « horaires badminton Nozay » ne ramenait rien. Le tableau est désormais du texte indexable, lisible aussi par un lecteur d'écran.

## La saison

L'écran travaille sur la **saison en cours**, indiquée sous le titre. Elle bascule au mois d'août, comme le calendrier sportif : la saison 25-26 commence en août 2025.

Un créneau créé est rattaché à cette saison. Ceux des saisons précédentes restent en base mais ne s'affichent plus.

## Les gymnases

Un créneau se rattache obligatoirement à un **gymnase**. Si aucun n'est enregistré, l'écran vous le signale et le bouton de création reste indisponible : commencez par faire enregistrer les gymnases du club.

L'adresse du gymnase sert aussi aux données structurées du site — c'est ce qui permet à une recherche « badminton près de chez moi » de situer le club.

## Ajouter un créneau

| Champ | Détail |
|---|---|
| **Jour** | Du lundi au dimanche |
| **Début** et **Fin** | En heure locale. La fin doit suivre le début, l'application le vérifie |
| **Groupe** | Minibad (U9), Poussins (U11), Jeunes, Élite Jeunes, Adultes loisirs, Adultes compétition, Jeu libre |
| **Gymnase** | Parmi ceux enregistrés |
| **Intitulé** | Facultatif. Remplace le nom du groupe sur le site : « Jeunes — groupe compétition » |

Un créneau est **affiché sur le site dès son ajout** : il n'y a pas d'étape de publication. C'est volontaire — un horaire est un fait du club, pas une publication à préparer.

## Masquer plutôt que supprimer

Le menu **⋯** propose **Masquer du site** : le créneau disparaît des pages publiques mais reste dans la liste, grisé, avec la mention « Masqué ». **Réafficher** le remet en ligne.

C'est le bon geste pour une interruption temporaire — vacances scolaires, gymnase indisponible, créneau suspendu quelques semaines.

> [!TIP]
> Préférez toujours le masquage à la suppression pour un retrait temporaire : l'historique est conservé, et vous n'avez pas à ressaisir le créneau au retour.

La **suppression** est définitive. Elle se justifie pour un créneau saisi par erreur.

## Ce que voit le visiteur

Un tableau groupé par jour, avec l'horaire, le groupe (ou l'intitulé si vous en avez saisi un) et le gymnase. Les créneaux masqués n'y figurent jamais.

Une page peut n'afficher qu'une partie des créneaux — ceux des jeunes sur la page Jeunes, par exemple. Ce filtrage se règle dans le bloc de la page, pas ici : voir [Les blocs de contenu](/admin/help/site-blocs).

## Qui peut faire quoi

| Action | Droit requis |
|---|---|
| Consulter les créneaux | Consulter les créneaux |
| Ajouter, modifier, masquer, supprimer | Modifier les créneaux |

Le rôle **Entraîneur·e** porte le droit d'écriture : ce sont les encadrants qui vivent les créneaux au quotidien, et qui savent le premier soir qu'un horaire a changé. Les rôles **Communication**, **Président·e** et **Super administrateur** l'ont également. Les droits se règlent depuis [Accès & Rôles](/admin/help/acces-permissions).


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
- Les annonces envoyées par le bureau et, si elles sont activées, les relances de cotisation et de commande à régler, ainsi que les anniversaires.

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
- des commandes boutique portent une date de règlement sans avoir été encaissées en comptabilité.

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

Les colonnes suivantes sont utilisées si elles sont présentes : \`Email\`, \`Téléphone\`, \`Statut\` (ou \`Adhérent validé\`, \`Etat de dossier\`), \`Montant\`, \`Montant reçu\`, \`Montant restant\`, \`Payé\`, \`Date de paiement\`, et les contacts \`Nom / Email / Tél. du contact 1\` et \`... contact 2\`, qui deviennent les représentants légaux.

La colonne \`Date de paiement\` sert de **date d'émission sur l'attestation CSE**. Poona la laisse vide dans la plupart des exports, y compris pour des dossiers marqués payés : dans ce cas l'attestation est datée du **1er septembre de la saison** qu'elle couvre. Un ré-import dont la colonne est vide n'efface pas une date déjà enregistrée.

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


--- Article: interclubs-classements.md ---
---
title: Classements et date de référence
description: Importer les classements fédéraux depuis Poona et choisir la date qui fait foi pour chaque championnat.
category: interclubs
order: 1
---

Tout le calcul des valeurs d'équipe repose sur les classements. Cet écran les alimente et
décide **lesquels font foi**.

## L'écran

Deux zones repliables — **dates de référence** et **classements** — dont l'état de pli est
conservé d'une navigation à l'autre.

Les dates restent repliées tant qu'elles sont complètes, et **s'ouvrent d'elles-mêmes dès
qu'une date manque** : sans elle, aucune valeur d'équipe n'est calculable, et la cacher
serait cacher ce qu'il faut corriger. Les classements, que l'on vient consulter, s'ouvrent
par défaut.

L'**import** et les **règlements** ont chacun leur page, atteintes par les boutons du haut
de l'écran. Ce sont des gestes rares — quelques fois par saison — qui n'ont pas à occuper
un écran consulté chaque semaine.

## Importer les classements

L'import attend l'export **« compétiteurs »** de Poona, celui qui porte les colonnes
\`ELO simple / double / mixte\`. Glissez le fichier, vérifiez ce que l'écran a lu, puis
importez.

Trois points méritent votre attention avant de valider.

**La date des classements.** Elle est lue dans le fichier et affichée en grand, modifiable.
C'est elle qui détermine quel classement fera foi pour toute la saison en départemental :
ne la validez pas machinalement. La CCA la communique en début de saison — pour 2026-2027,
c'est le **jeudi 8 octobre 2026**.

**Les non-compétiteurs.** Environ un tiers du fichier n'a aucun classement : ce sont les
licenciés loisir. Ils sont comptés à part, et ce n'est pas une anomalie.

**Les compétiteurs sans adhérent.** L'import des classements **complète** le fichier des
adhérents, il ne le remplace pas et n'y ajoute personne. Si un compétiteur n'y figure pas,
son classement est tout de même enregistré, mais il vous est signalé : demandez au bureau
de relancer l'import des adhérents, puis rejouez celui-ci. Tant que le rapprochement n'est
pas fait, ce joueur **n'apparaît dans aucun sélecteur de composition**.

Rejouer un import ne crée jamais de doublon : il corrige les lignes de la même date.

## L'historique

Chaque import est conservé sous sa date, il n'écrase pas le précédent. C'est ce qui permet
de recalculer une journée passée, et de justifier une valeur d'équipe contestée. Le
sélecteur de date, au-dessus du tableau, liste les instantanés disponibles avec le nombre
de joueurs de chacun ; en changer fait relire tout le tableau à cette date.

Un export de début de saison ne contient que quelques licenciés : c'est normal, et les
autres joueurs conservent leur classement antérieur.

## Les dates de référence

Les règlements ne désignent pas tous la même date, et cet écran suit chacun d'eux.

| Championnat | Comment la date est choisie |
|---|---|
| Départemental mixte, masculin, vétérans | **Une date fixe pour toute la saison**, que vous épinglez ici (art. 6.1.3). Un reclassement obtenu en cours de saison ne la déplace pas. |
| Régional | **Recalculée à chaque journée** : le jeudi précédant la semaine de la rencontre (art. 4.4.2). Rien à épingler. |

Tant qu'un championnat départemental n'a pas de date épinglée, **aucune valeur d'équipe
n'y est calculable** — l'écran le signale plutôt que de deviner.

## Le règlement de la saison

Le bouton **Règlements** ouvre une page dédiée, où un champ par championnat reçoit le
**lien du règlement**. Déposez le PDF dans la médiathèque du site, puis collez son adresse
ici : il apparaîtra en téléchargement sur la fiche de chaque équipe du championnat, dans
l'espace adhérent.

C'est le texte qui fait foi le soir de la rencontre — composition, ordre des joueurs,
valeurs d'équipe — et qu'aucun joueur ne retrouve seul sur le site du comité. Le lien vaut
pour les quatre championnats, y compris le régional, indépendamment de la politique de date.

## Corriger un classement à la main

Les trois classements — simple, double, mixte — se choisissent directement dans le tableau,
sans quitter l'écran. La ligne passe alors en source **« Saisi à la main »**, ce qui reste
visible : une valeur d'équipe calculée sur une donnée saisie à la main doit pouvoir être
questionnée.

La liste distingue **« — non compétiteur »** de **NC**. Le premier décrit un licencié qui
ne joue pas en compétition ; le second un compétiteur sans résultat, qui vaut zéro point
mais **peut être aligné**. Les confondre ferait entrer en équipe quelqu'un qui n'y a pas sa
place.

La correction ne touche que **l'instantané affiché**, celui de la date sélectionnée. Écrire
sur une date antérieure changerait rétroactivement toutes les journées qui la prennent pour
référence, et donc la conformité de compositions déjà validées : un instantané est un fait
daté, on le corrige là où il est faux, jamais ailleurs.

> Le sélecteur de saison, en haut de l'écran, indique à quelle saison s'appliquent l'import
> et les dates de référence. Vérifiez-le avant d'enregistrer.


--- Article: interclubs-compositions.md ---
---
title: Compositions et valeurs d'équipe
description: Comment les capitaines composent depuis l'espace adhérent, et ce que le calcul de valeur contrôle.
category: interclubs
order: 3
---

C'est la raison d'être de la fonctionnalité. Le règlement sanctionne **les deux équipes**
par rencontre perdue par pénalité dès qu'une équipe présente une valeur inférieure à celle
de l'équipe qui la suit dans la hiérarchie du club. Le vérifier suppose de croiser les
compositions de toutes les équipes d'un même championnat, pour une même journée — ce que
personne ne peut faire de tête le samedi matin.

## Qui compose

Depuis l'espace adhérent, menu **Équipes**, tout le club consulte les équipes, leur staff et
leur effectif. Seuls le **capitaine** et le **vice-capitaine** d'une équipe peuvent en
modifier la composition. Ce droit vient de leur désignation dans l'écran *Équipes*, pas d'un
rôle d'administration.

L'écran masque le bouton aux autres, mais c'est le serveur qui tient la règle : une
tentative d'écriture par quelqu'un d'autre est refusée.

## Ce que voit le capitaine

Une ligne par match du format de sa division, avec pour chacune le classement lu et les
points correspondants, puis le total et la **valeur d'équipe**. Le tout se recalcule à
chaque changement.

Sous le total figure la phrase qui décide de tout : *« NBA91-2 est à 5,20 sur cette journée :
votre équipe doit rester inférieure ou égale. »* Le capitaine voit sa contrainte **avant**
d'enregistrer. Si l'équipe du dessus n'a pas encore composé, l'écran le dit plutôt que
d'afficher une contrainte fausse.

Les sélecteurs ne proposent que des joueurs de genre compatible avec la ligne, l'effectif
en tête, et grisent ceux qui sont indisponibles en indiquant pourquoi.

## Ce qui bloque, et ce qui avertit

**Bloquant** — objectif et vérifiable :

| | Règle |
|---|---|
| Classement | hors des limites de la division, dans la discipline jouée |
| Nombre de matchs | plus de deux pour un même joueur |
| Discipline | deux matchs dans la même discipline |
| Semaine | joueur déjà aligné dans une autre équipe du club cette semaine |
| Genre | homme en simple dame, et réciproquement |
| Catégorie | non admise dans le championnat |
| Mutés | plus de deux sur la rencontre |

**Avertissement** — dépend d'informations encore en mouvement :

- **la valeur dépasse celle de l'équipe du dessus** ;
- l'ordre des joueurs n'est pas décroissant ;
- l'équipe est incomplète ;
- un classement manque à la date de référence.

La hiérarchie des valeurs n'est **jamais bloquante**, et c'est délibéré : la valeur de
l'équipe supérieure change tant que son capitaine saisit. Bloquer le premier parce que le
troisième n'a rien rempli rendrait l'outil inutilisable.

### Trois avertissements qui regardent la saison passée

Ceux-là ne se déduisent d'aucune composition du jour — ils lisent l'historique des
rencontres déjà saisies.

| | Règle |
|---|---|
| **Titularisation** | Trois rencontres avec une équipe et le joueur ne peut plus être aligné dans une équipe inférieure du même championnat (art. 6.3.2). Monter reste libre. |
| **Renforts croisés** | Une équipe ne se renforce pas de plus de deux joueurs dont la **dernière** rencontre était dans l'autre championnat départemental (art. 6.3.2). |
| **Venus du régional** | Une équipe départementale ne présente qu'un seul joueur ayant déjà disputé le régional cette saison (art. 6.1.7). |

Ils restent des avertissements, et non des refus : l'historique ne connaît que les
rencontres saisies dans l'outil. Une partie de la saison a pu se jouer avant sa mise en
service, et bloquer sur une base incomplète refuserait des compositions parfaitement
régulières.

## Comment la valeur se calcule

Les formules diffèrent d'un championnat à l'autre.

**Départemental.** Chaque ligne vaut les points de son joueur, ou la **moyenne** de la paire
en double. On additionne, puis on divise par le **nombre de lignes composées** — et non par
le format. Le règlement est explicite : une équipe incomplète se divise par le nombre de
matchs joués.

*Exemple, tiré de l'annexe du règlement mixte :* SH1 N3 (10), SH2 R4 (9), SH3 D7 (6),
SD R6 (7), DH N2-D7 (8,5), DD R6-R6 (7), MX D8-R5 (6,5) → total 54, valeur **54 / 7 = 7,71**.

**Régional.** On ignore les lignes : les **3 meilleurs joueurs et les 3 meilleures joueuses**
de la feuille, chacun au meilleur de ses trois classements, divisés par 6. Un joueur aligné
deux fois ne compte qu'une. Les places non pourvues valent zéro.

**Vétérans.** Aucune valeur d'équipe : leur règlement n'en définit pas, et aucune contrainte
de hiérarchie n'en découle.

Une valeur **non calculable** — classement manquant, date de référence non épinglée — est
affichée comme telle. Elle n'est jamais remplacée par une estimation.

## La date de la rencontre

Au-dessus de la composition, le capitaine fixe la **date réelle** de sa rencontre et le
gymnase. C'est une information de logistique, propre à son équipe : elle ne déplace jamais
la journée, qui reste celle du calendrier du comité et porte les règles.

Une date hors de la semaine théorique est refusée au premier essai, avec l'explication de
ce qu'elle changerait ; un second envoi la confirme. Le calendrier signale alors la
rencontre comme reportée, en rappelant la semaine d'origine.

## Enregistrer ou valider

**Enregistrer** conserve la composition en brouillon. **Valider** la fige et la signale au
coach. Dans les deux cas, une règle bloquante refuse l'écriture, et la composition
précédente reste intacte — le motif du refus s'affiche sous la composition, avec l'article
concerné.

## Qui est prévenu, et quand

Rien ne part tant que la composition reste un brouillon : elle se construit en plusieurs
passes, et une notification par passe apprendrait à l'équipe à les ignorer toutes.

À la **validation** — et à chaque modification d'une composition déjà validée — deux
messages partent, dans la catégorie *Mes équipes interclubs* que chacun peut couper depuis
ses préférences de notification :

- aux **joueurs alignés** : l'équipe, l'adversaire, le lieu, et la date si elle est connue
  — sinon la semaine ;
- aux **joueurs de l'effectif non retenus** : ils ne sont pas sur la feuille de cette
  journée. C'est l'information qui manquait le plus : sans elle, un joueur ne sait pas s'il
  est attendu ou si le capitaine n'a rien saisi, et doit poser la question chaque semaine.

Le capitaine qui enregistre n'est jamais destinataire de son propre envoi.

Sur l'accueil de l'espace adhérent, un encart **Prochaine rencontre** annonce la même chose
en permanence : l'équipe, la journée, la date, et si l'adhérent figure sur la feuille.

Le calendrier est arrêté par le comité en septembre-octobre et transmis aux capitaines par
le président : **porter la date exacte sur la rencontre, comme saisir la composition, est
la responsabilité du capitaine**. Tant que ce n'est pas fait, l'encart annonce la semaine
théorique et l'écrit sans détour — « votre capitaine n'a pas encore renseigné la date
exacte », « votre capitaine n'a pas encore saisi la composition ». Présenter ces absences
comme des décisions en attente laisserait les joueurs patienter là où il suffit de relancer
leur capitaine. Un adhérent que la composition existante ne retient pas lit, lui, qu'il
n'est pas aligné : les deux situations ne se confondent jamais.

## Les journées dans l'agenda

Les journées de championnat apparaissent aussi dans l'**agenda de l'espace adhérent**, pour
les seuls adhérents engagés en équipe, mêlées aux rendez-vous du club et dans la couleur de
la catégorie *Interclubs* — c'est le même rendez-vous, il n'a pas à s'afficher deux fois de
deux façons. Chaque ligne rappelle le championnat, la division, et si l'adhérent est aligné.

La date affichée suit trois sources, dans cet ordre :

1. **la date saisie par le capitaine**, heure comprise : elle fait foi ;
2. à défaut, le **jour commun du calendrier** — le dimanche des vétérans ;
3. à défaut encore, le **lundi de la semaine théorique**, pour le mixte et le masculin qui
   se jouent en semaine sans jour commun. La ligne précise alors que la date reste à
   préciser par le capitaine, et que la rencontre se joue dans la semaine, pas
   nécessairement le lundi.

On ne s'inscrit pas à une rencontre : ces lignes ne portent aucun bouton d'inscription.

## Signaler une anomalie depuis l'écran de contrôle

Sur *Interclubs → Contrôle des journées*, chaque anomalie porte un bouton de signalement.
Le message est **construit à partir du constat affiché**, jamais saisi : le coach clique,
il ne rédige pas.

Un **dépassement de valeur part aux deux capitaines concernés** — celui de l'équipe qui
dépasse et celui de l'équipe du dessus. Le règlement fait perdre la rencontre aux deux, et
la correction peut venir de l'une comme de l'autre : renforcer celle du dessus vaut alléger
celle du dessous. Chaque message nomme l'autre capitaine pour qu'ils se rapprochent.

Une **erreur dure** ne part qu'au capitaine fautif : elle se corrige dans sa seule
composition. Le vice-capitaine est prévenu avec le capitaine dans les deux cas. Rien n'est
envoyé si la composition est saine.


--- Article: interclubs-equipes.md ---
---
title: Équipes, staff et calendrier
description: Engager les équipes du club, désigner capitaines et vice-capitaines, saisir les journées de championnat.
category: interclubs
order: 2
---

Le club engage des équipes dans quatre championnats aux règlements distincts. Cet écran les
déclare, leur donne un staff et un effectif, et pose leur calendrier.

## Créer une équipe

Le **championnat** est le premier champ, et il commande tout le reste : les divisions
proposées, le format de la rencontre et les limites de classement affichées en aide
changent avec lui.

Le **numéro d'équipe** n'est pas une étiquette. C'est lui qui porte la **hiérarchie du
club** : le règlement exige que la valeur de l'équipe *n* reste inférieure ou égale à celle
de l'équipe *n−1*, et sanctionne **les deux équipes** par rencontre perdue si ce n'est pas
le cas. Le nom en découle — \`NBA91-3\` — et ne se saisit pas, pour qu'il ne puisse jamais
contredire le numéro.

Deux équipes ne peuvent pas porter le même numéro dans un championnat. Elles le peuvent en
revanche dans deux championnats différents : \`NBA91-1\` en mixte et \`NBA91-1\` en masculin
sont deux équipes distinctes.

> Une équipe vit **une saison**. D'une saison à l'autre, elle peut changer de division,
> d'effectif et de capitaine : ce sont de nouvelles équipes, pas les mêmes modifiées.
> Le sélecteur de saison, en haut de l'écran, indique celle que vous garnissez.

## Staff et effectif

La désignation du **capitaine** et du **vice-capitaine** n'est pas décorative : c'est elle,
et rien d'autre, qui ouvre le droit de composer l'équipe depuis l'espace adhérent. Le
vice-capitaine est une notion interne au club, absente des règlements — il est là pour
suppléer.

Les deux doivent figurer au fichier des adhérents de la saison. Une licence inconnue est
refusée : ce serait un droit accordé à personne.

L'**effectif** est indicatif. Le règlement autorise un joueur à évoluer dans n'importe
quelle équipe de son club ; l'effectif sert à présélectionner dans l'écran de composition,
pas à interdire. Chaque joueur y est affiché avec ses classements et signalé s'il n'est pas
éligible à la division.

## Les journées

Le bouton **Journées** ouvre le calendrier du championnat choisi.

Une journée **est une semaine**, du lundi au dimanche. Ce n'est pas un détail : chaque
championnat numérote ses journées pour lui seul — la J1 du régional et celle du mixte sont
deux dates sans rapport — et ce sont les **semaines**, jamais les numéros, qui les relient.

Quand deux championnats tombent la même semaine, l'écran l'indique par un badge
« aussi *Interclubs Départemental Masculin* » en face de la journée. C'est le signal à
surveiller : un joueur ne tient qu'une seule équipe du club par semaine, mixte, masculin et
régional confondus. Les vétérans font exception — leur règlement ne cite aucun autre
championnat.

Vous saisissez n'importe quelle date de la semaine : elle est ramenée au lundi.

**Les jours de jeu diffèrent d'un championnat à l'autre**, ce qui explique que deux équipes
puissent partager une semaine sans partager un seul jour :

| Championnat | Jour de rencontre |
|---|---|
| Départemental mixte et masculin | du **lundi au vendredi**, en soirée (art. 3.4.1) |
| Départemental vétérans | le **dimanche**, samedi par dérogation (art. 3.3.1) |
| Régional | **samedi ou dimanche** — deux rencontres par journée |

Les **barrages** sont des journées à part : toutes les équipes ne les disputent pas, seules
celles que leur classement y envoie. Une équipe sans composition y est donc normale.

## Deux dates à ne pas confondre

C'est le point le plus subtil de la fonctionnalité.

**La semaine théorique de la journée** vient du calendrier du comité. Elle est **figée**,
commune à toutes les équipes, et porte **toutes les règles** : valeur d'équipe, mouvements
de joueurs, « un joueur ne tient qu'une seule équipe du club » (art. 6.3.7). Rien ne la
déplace.

**La date réelle de la rencontre** est **propre à chaque équipe**. C'est le capitaine qui la
saisit depuis l'espace adhérent, et elle dit simplement quand se présenter. Elle tombe
normalement dans la semaine théorique, mais un gymnase indisponible ou des intempéries
peuvent l'en faire sortir (art. 4.2.3).

Dans ce cas, l'écran du capitaine **refuse d'abord** la date — c'est presque toujours une
faute de frappe — puis l'accepte s'il confirme. Le calendrier affiche alors la date réelle
en rappelant la journée d'origine.

Les faire porter les mêmes règles reviendrait à laisser un aléa de gymnase changer ce que
le règlement autorise : la J2 de l'équipe 2 se compare à la J2 de l'équipe 3, reportée ou
non.


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

Le menu latéral regroupe les rubriques par domaine : Adhérents, Comptabilité, Boutique, Communication, Site public, Réglages, Assistance. **Vous ne voyez que les rubriques auxquelles vous avez droit** — le menu est construit à partir des mêmes permissions que le contrôle d'accès des pages, une entrée visible mène donc toujours à une page qui s'ouvre.

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


--- Article: site-actualites.md ---
---
title: "Actualités du site"
description: "Rédiger et publier les actualités publiques du club."
category: "site"
order: 3
---

**Site public → Actualités du site** publie les nouvelles du club sur le site public : compétitions, résultats, animations, vie de l'association.

> [!IMPORTANT]
> À ne pas confondre avec les [Annonces](/admin/help/annonces). Une **actualité** est publique, lisible par n'importe qui, indexée par Google, et ne prévient personne. Une **annonce** s'adresse aux adhérents connectés à leur espace, et peut déclencher une notification sur leur téléphone. Une soirée du club se raconte en actualité ; un changement d'horaire de dernière minute se diffuse en annonce.

## Rédiger une actualité

Le bouton **Nouvelle actualité** ouvre le formulaire.

| Champ | Détail |
|---|---|
| **Titre** | 200 caractères au maximum. Il donne l'adresse publique de l'article |
| **Chapô** | Une phrase d'accroche, 500 caractères. Reprise dans les listes, les partages et les résultats de recherche |
| **Image de couverture** | Choisie dans la [médiathèque](/admin/help/site-mediatheque). Elle illustre les cartes des listes et le partage sur les réseaux |
| **Catégories** | À cocher, si des catégories existent. Elles servent de filtre sur la page d'archives |
| **Texte** | Le corps de l'article |

L'actualité est créée **en brouillon** : elle n'apparaît sur le site qu'une fois publiée.

Le **chapô** mérite qu'on s'y arrête : c'est lui qui s'affiche sous le titre dans la liste des actualités, dans les cartes de la page d'accueil, dans les résultats Google et dans l'aperçu quand quelqu'un partage le lien. Sans chapô, c'est le début du texte qui sert, souvent maladroitement.

## La barre d'outils

**Gras**, *italique*, souligné, liste à puces, liste numérotée, insérer un lien, retirer un lien, et **insérer un fichier à télécharger** — ce dernier ouvre la médiathèque et pose un lien vers le document choisi.

Le collage depuis un traitement de texte ou un courriel ne reprend **que le texte**, sans les polices ni les couleurs.

Pour un lien, sélectionnez le texte à transformer, puis cliquez sur l'icône de chaîne. Les adresses acceptées commencent par \`https://\`, \`http://\`, \`mailto:\` ou \`/\`.

## Publier

Le statut se change **depuis la liste**, par le menu **⋯** : **Publier**, ou **Repasser en brouillon**. Le formulaire ne sert qu'au contenu.

La **date de publication** est posée à la première mise en ligne, et ne bouge plus ensuite. Corriger une faute dans un vieil article ne le fait donc pas remonter en tête du flux.

Une actualité publiée apparaît :

- sur la page **Actualités** du site, paginée par douze, avec ses filtres par catégorie ;
- dans les blocs **Actualités** des pages qui en portent un (voir [Les blocs de contenu](/admin/help/site-blocs)) ;
- dans le **flux RSS** du site.

Publier ou dépublier renouvelle le cache du site : comptez quelques secondes.

L'entrée **Voir sur le site** du menu **⋯** ouvre l'article dans un nouvel onglet, pour vérifier le rendu.

## Les catégories

Les catégories permettent de filtrer les archives (\`/actualites/?categorie=…\`). Elles ne se créent pas encore depuis cet écran : celles reprises de l'ancien site sont disponibles, et l'ajout d'une nouvelle catégorie passe pour l'instant par le responsable technique.

Une actualité peut appartenir à plusieurs catégories, ou à aucune.

## Supprimer

La suppression est **définitive** et l'adresse de l'article ne répond plus.

> [!CAUTION]
> Un article publié a pu être partagé par courriel ou sur les réseaux sociaux, et il est probablement indexé. Le supprimer produit une erreur 404 pour tous ceux qui suivent ces liens. Pour le retirer de la vue du public sans casser les liens existants, préférez **Repasser en brouillon** — l'adresse répondra alors une page « introuvable », mais l'article restera récupérable.

## Qui peut faire quoi

| Action | Droit requis |
|---|---|
| Consulter les actualités | Consulter les actualités du site |
| Créer, modifier, publier | Rédiger et publier une actualité |
| Supprimer | Supprimer une actualité |

Les rôles **Communication** et **Président·e** disposent de l'ensemble. Le rôle **Secrétaire** peut rédiger et publier, mais pas supprimer. Les droits se règlent depuis [Accès & Rôles](/admin/help/acces-permissions).


--- Article: site-blocs.md ---
---
title: "Les blocs de contenu"
description: "Catalogue des blocs disponibles dans une page du site : ce que fait chacun, ses champs et ses limites."
category: "site"
order: 2
---

Une page du site public se compose en empilant des **blocs**. Cet article décrit chacun d'eux : à quoi il sert, ce qu'il demande, et ce que le visiteur voit à l'arrivée. Pour la mécanique de l'éditeur — créer, enregistrer, publier —, voir [Pages du site](/admin/help/site-pages).

## Choisir le bon bloc

| Ce que vous voulez faire | Le bloc |
|---|---|
| Écrire des paragraphes | **Texte** |
| Poser deux ou trois contenus côte à côte | **Colonnes** |
| Ouvrir la page par une grande accroche | **Accroche** |
| Proposer des raccourcis ou afficher des partenaires | **Grille de liens** |
| Ouvrir par un grand bandeau d'images qui défilent | **Carrousel** |
| Montrer plusieurs photos | **Galerie** |
| Mettre un PDF en téléchargement | **Document** |
| Afficher les horaires d'entraînement | **Créneaux** |
| Reprendre les dernières actualités | **Actualités** |
| Intégrer une vidéo ou un agenda extérieur | **Intégration** |
| Présenter le bureau ou les encadrants | **Personnes** *(pas encore affiché)* |

> [!WARNING]
> Le bloc **Personnes** peut être ajouté et enregistré, mais **ne produit encore rien sur le site public** : son rendu n'est pas écrit. Ne l'utilisez pas sur une page en ligne, vous obtiendriez un trou dans la mise en page. En attendant, présentez le bureau avec un bloc **Texte**.

---

## Texte

Le bloc de base : des paragraphes, des listes et des liens. C'est celui qui porte la prose d'une page.

**La barre d'outils** propose, dans l'ordre : **titre de section**, **sous-titre**, puis **gras**, *italique*, souligné, liste à puces, liste numérotée, insérer un lien, retirer un lien.

### Les titres à l'intérieur d'un texte

Deux niveaux sont disponibles, et c'est volontaire :

- **Titre de section** — le niveau le plus fort dont vous disposez. Il découpe la page en grandes parties.
- **Sous-titre** — un cran en dessous, pour subdiviser une section.

Placez le curseur dans la ligne à transformer et cliquez le bouton ; le bouton reste enfoncé tant que le curseur est dans un titre. **Recliquer dessus rend la ligne à un paragraphe ordinaire** — c'est ainsi qu'on défait un titre posé par mégarde.

> [!NOTE]
> Il n'y a pas de troisième niveau plus fort, et il n'y en aura pas : le **titre de la page** occupe déjà ce rang. Deux grands titres concurrents sur une même page brouillent la lecture, et les moteurs de recherche comme les lecteurs d'écran s'appuient sur cette hiérarchie pour comprendre la structure. C'est aussi pourquoi l'éditeur ne propose pas de « taille de police » libre : ce qui compte n'est pas qu'un texte soit gros, c'est qu'il soit **un titre**.

Pour un lien, sélectionnez d'abord le texte à transformer, puis cliquez sur l'icône de chaîne. Les adresses acceptées commencent par \`https://\`, \`http://\`, \`mailto:\` ou \`/\` (une page du site, par exemple \`/inscription/\`).

> [!TIP]
> Vous pouvez coller depuis un traitement de texte ou un courriel : **seul le texte est repris**, sans les polices ni les couleurs d'origine. Vous remettez ensuite la mise en forme voulue avec la barre d'outils. C'est ce qui évite les pages bariolées de l'ancien site.

Quelques points à connaître :

- Le **titre de la page** est déjà affiché au-dessus : ne le répétez pas dans le texte.
- Un bloc **Texte vide est refusé** à l'enregistrement. Il occuperait une place dans la page sans que personne comprenne pourquoi elle « saute ».
- Les tableaux et les images à l'intérieur d'un texte sont **conservés** lorsqu'ils existent — c'est le cas des pages reprises de WordPress — mais la barre d'outils ne permet pas d'en créer. Pour des photos, utilisez un bloc **Galerie** ; pour un PDF, un bloc **Document**.
- Les images d'un texte doivent pointer la [médiathèque](/admin/help/site-mediatheque). Une image hébergée ailleurs est retirée à l'enregistrement — c'est ce qui écarte d'un geste les pixels de suivi et les images qui disparaissent le jour où le site voisin ferme.

---

## Colonnes

Deux ou trois contenus **côte à côte** sur ordinateur, **empilés** sur téléphone. C'est le bloc qui remplace les tableaux de mise en page de l'ancien site, dont les colonnes restaient côte à côte jusque sur un écran de téléphone — et rendaient ces pages illisibles.

| Réglage | Ce qu'il fait |
|---|---|
| **Titre** | Facultatif, affiché au-dessus de l'ensemble des colonnes |
| **Largeur des colonnes** | À **deux colonnes seulement** : égales, première large, ou dernière large. Une colonne large occupe les deux tiers, l'autre le tiers restant |
| **Contenu de la colonne** | Texte, ou l'un des blocs listés ci-dessous |
| **Ajouter / Retirer une colonne** | Deux au minimum, trois au maximum |

### Ce qu'une colonne peut contenir

- **Texte** — une image facultative *au-dessus*, puis des paragraphes. C'est le choix par défaut.
- **Actualités**, **Agenda**, **Créneaux**, **Galerie**, **Document**, **Grille de liens** — le bloc s'y règle exactement comme au premier niveau.

Les autres blocs ne sont pas proposés : **Accroche** et **Carrousel** ont besoin de toute la largeur de la page, et un bloc **Colonnes** ne s'imbrique pas dans un autre.

### La disposition de la page d'accueil

Pour afficher les actualités sur deux tiers de la page et l'agenda sur le dernier tiers :

1. Ajoutez un bloc **Colonnes** — il arrive avec deux colonnes de texte.
2. **Largeur des colonnes** : « Première colonne large (deux tiers) ».
3. **Colonne 1**, contenu : « Actualités ». Réglez le nombre et la catégorie.
4. **Colonne 2**, contenu : « Agenda ». Réglez le nombre et les catégories.

Sur téléphone, les actualités s'affichent d'abord, l'agenda en dessous.

> [!NOTE]
> Changer le contenu d'une colonne **efface ce qu'elle contenait**. Le texte remplacé reste consultable dans l'historique des révisions de la page.

**Bon à savoir**

- Trois colonnes sont toujours **de largeur égale** : le réglage disparaît dès qu'on ajoute la troisième.
- Une colonne de texte **vide est refusée** à l'enregistrement, comme un bloc **Texte** vide : elle occuperait sa part de la grille et décalerait ses voisines. Une image seule suffit à la remplir.
- Les blocs **Actualités**, **Agenda** et **Créneaux** posés dans une colonne se tiennent à jour tout seuls, exactement comme ailleurs : ils affichent ce qui vient, pas la liste du jour où la page a été composée.

---

## Accroche

Le grand bandeau qui ouvre une page : un titre, une phrase, et jusqu'à **quatre boutons**.

| Champ | Détail |
|---|---|
| **Titre** | Obligatoire. 160 caractères au maximum |
| **Sous-titre** | Une phrase, 320 caractères |
| **Boutons** | Un libellé et une adresse par bouton, quatre au maximum |

L'adresse d'un bouton est soit un chemin du site (\`/creneaux/\`), soit une adresse extérieure complète (\`https://…\`). Un bouton dont l'adresse n'est pas exploitable **disparaît entièrement** à l'enregistrement : un bouton sans destination n'a pas de sens.

> [!IMPORTANT]
> Placez l'accroche en **premier bloc** de la page. Le titre de l'accroche tient alors lieu de titre principal ; ailleurs dans la page, le titre de la page s'affiche en plus et vous vous retrouvez avec deux grands titres concurrents.

Quatre boutons est un maximum volontaire : au-delà, ce n'est plus une accroche, c'est un menu — utilisez une **Grille de liens**.

---

## Grille de liens

Des cartes cliquables disposées en colonnes. Le même bloc sert deux usages : les raccourcis de la page d'accueil, et une rangée de logos de partenaires.

| Champ | Détail |
|---|---|
| **Titre de section** | Facultatif, affiché au-dessus de la grille |
| **Colonnes** | 2, 3 ou 4. Sur téléphone, tout passe en une seule colonne |
| **Image de fond (bannière)** | Facultative, choisie dans la médiathèque |
| **Boutons** | Jusqu'à 24 entrées, chacune avec un libellé, une cible et une description facultative |

Pour la cible de chaque bouton, choisissez d'abord sa nature :

- **Une page ou actualité du site** — un champ de recherche propose toutes les pages et actualités existantes. C'est la bonne option dans la quasi-totalité des cas : le lien reste juste.
- **Une adresse extérieure** — saisissez l'adresse complète. Elle s'ouvrira dans un nouvel onglet.

> [!NOTE]
> Changer la nature d'un lien **vide l'adresse déjà saisie**. C'est voulu : une adresse extérieure n'est pas un chemin interne, et conserver l'ancienne valeur produirait un lien silencieusement faux.

**Avec une image de fond**, la grille devient une bannière : l'image occupe toute la largeur, un voile sombre est appliqué pour que le texte reste lisible, et les boutons se posent devant. **Sans image**, les cartes s'affichent bordées sur fond neutre — la forme adaptée à des logos ou à une liste de liens.

---

## Carrousel

Un **bandeau pleine largeur** : une grande image à la fois, avec un titre, une phrase et un bouton posés **devant** elle, en bas à gauche. Les diapositives se succèdent toutes seules, en fondu enchaîné.

| Champ | Détail |
|---|---|
| **Titre de section** | Facultatif, affiché au-dessus du bandeau |
| **Diapositives** | Douze au maximum, chacune avec une image, un titre, une description et un bouton |

Pour chaque diapositive :

| Champ | Détail |
|---|---|
| **Image** | **Obligatoire**, choisie dans la médiathèque |
| **Titre de la diapositive** | **Obligatoire**, 120 caractères au maximum |
| **Description courte** | Facultative, 240 caractères |
| **Libellé du bouton** + **cible** | Facultatifs, mais l'un ne va pas sans l'autre |

Les commandes **↑**, **↓** et la corbeille, en haut de chaque diapositive, servent à la déplacer dans le bandeau ou à la retirer. L'ordre affiché ici est celui que verra le visiteur.

La cible du bouton se choisit comme dans une **Grille de liens** : une page du site, ou une adresse extérieure. Un bouton dont il manque le libellé ou l'adresse **disparaît à l'enregistrement**, mais la diapositive reste — son image, son titre et sa description valent d'être lus sans lui.

> [!TIP]
> **Ne recadrez pas vos images avant de les déposer.** Le carrousel s'en charge : quelle que soit la forme de l'image d'origine — large, verticale, carrée — toutes les diapositives sortent à la même bande. Deux conseils cependant : un sujet **au centre**, c'est ce que le recadrage conserve ; et une image **pas trop chargée en bas à gauche**, puisque c'est là que se posent le titre et le bouton.

### Ce que voit le visiteur

Le bandeau occupe toute la largeur de la page, sur une hauteur fixe — environ 420 pixels sur téléphone, 520 sur ordinateur. Un voile sombre est appliqué en bas de l'image : sans lui, un titre blanc deviendrait illisible sur une photo claire.

Chaque diapositive reste affichée **six secondes**, puis cède la place à la suivante en fondu. Le défilement **s'arrête dès que la souris survole le bandeau**, et reprend quand elle en sort : c'est ce qui permet de lire tranquillement et de cliquer le bouton. Il s'arrête de même quand on l'atteint au clavier.

En bas du bandeau, deux commandes que vous n'avez rien à régler — elles apparaissent toutes seules :

- Les **pastilles**, à gauche, disent combien il y a de diapositives et laquelle est affichée. On clique l'une d'elles pour y aller directement.
- Le **bouton de pause**, à droite. Contrairement au survol, il arrête durablement : le visiteur qui a besoin de temps le pose, lit, puis relance d'un second clic.

Pour un visiteur qui a demandé à son appareil de limiter les animations, plus rien ne défile tout seul et le fondu disparaît — les pastilles restent, ce sont elles qui lui servent à parcourir les diapositives. Le bouton de pause s'efface alors, n'ayant plus rien à arrêter.

> [!TIP]
> Une seule diapositive est parfaitement valable : vous obtenez une grande image de tête, sans rien qui bouge. Ni pastilles ni bouton de pause ne s'affichent, puisqu'il n'y a rien à parcourir.

> [!NOTE]
> **Carrousel ou Grille de liens ?** Le carrousel quand l'**image** est le sujet et qu'elle mérite toute la largeur — les temps forts de la saison, une accroche en tête de page. La grille quand ce sont les **liens** qui comptent : raccourcis de la page d'accueil, rangée de logos. Une information que tout le monde doit voir n'a pas sa place au-delà de la première diapositive : beaucoup de visiteurs ne verront jamais les suivantes.

---

## Galerie

Plusieurs images de la médiathèque, affichées en grille régulière.

| Champ | Détail |
|---|---|
| **Titre de section** | Facultatif : « Le tournoi 2026 en images » |
| **Images par rangée** | 1, 2, 3 ou 4. **C'est ce réglage qui décide de la taille des images** |
| **Images** | Ajoutées une à une depuis la médiathèque, soixante au maximum |

Le nombre par rangée est le seul réglage de taille, et c'est voulu : une image à qui l'on donnerait « 75 % » rétrécirait *à l'intérieur* de sa case sans réduire la case, laissant un blanc autour d'elle. Quatre par rangée pour des vignettes, une seule pour une image pleine largeur. Sur téléphone, jamais plus de deux — au-delà on ne verrait plus rien.

> [!NOTE]
> **Toutes les cases font la même taille**, quelle que soit la forme des images d'origine. C'est ce qui évite qu'une seule image verticale n'étire toute sa rangée et ne fasse paraître ses voisines démesurées — le défaut que corrige ce réglage.
>
> En revanche, **aucune image n'est rognée** : la case impose sa place, jamais son cadrage. Une image plus verticale ou plus large que sa case s'y pose entière, avec une bande neutre de part et d'autre. Vos affiches et vos logos gardent donc leur haut et leur bas. Les photos prises au téléphone, en 4/3, remplissent la case sans aucune bande.

**Ajouter une image** ouvre la médiathèque filtrée sur les images. Chaque vignette ajoutée porte ses commandes : **↑** et **↓** pour changer sa place dans la grille, **✕** pour la retirer. L'ordre affiché ici est celui que verra le visiteur.

Ajouter deux fois la même image est sans effet : une répétition dans une galerie est toujours une fausse manœuvre.

Si une image a été supprimée de la médiathèque depuis, sa vignette affiche « Image introuvable » avec son numéro — retirez l'entrée. Le site public, lui, l'ignore déjà : une image manquante ne casse jamais la galerie.

---

## Document

Un lien de téléchargement vers un PDF de la médiathèque, présenté en carte cliquable.

| Champ | Détail |
|---|---|
| **Libellé du lien** | Obligatoire. Ce que lit le visiteur : « Télécharger le livret d'accueil » |
| **Document** | Choisi dans la médiathèque, parmi les fichiers qui ne sont pas des images |
| **Description** | Facultative, affichée sous le libellé |

Le bouton **Choisir un document** ouvre la médiathèque filtrée sur les documents. La taille du fichier est affichée à côté du nom une fois le document choisi — un PDF de 8 Mo se télécharge mal en 4G, pensez à l'alléger avant de le déposer.

Si le document venait à être supprimé de la médiathèque, le bloc n'afficherait rien plutôt qu'un lien mort.

---

## Créneaux

Le tableau des horaires d'entraînement, par jour de la semaine.

| Champ | Détail |
|---|---|
| **Titre de section** | Facultatif : « Les créneaux », « Horaires des jeunes » |
| **Publics** | Les groupes à afficher, séparés par des virgules. Vide = tous les créneaux |

> [!IMPORTANT]
> Ce bloc **n'enregistre aucun horaire**. Il affiche ceux tenus à jour dans [Communication → Créneaux](/admin/help/creneaux), pour qu'ils ne soient saisis qu'à un seul endroit. Modifier un horaire là-bas met à jour toutes les pages qui l'affichent.

Le champ **Publics** attend les codes internes des groupes, pas leur libellé :

| À saisir | Groupe affiché |
|---|---|
| \`minibad\` | Minibad (U9) |
| \`poussins\` | Poussins (U11) |
| \`jeunes\` | Jeunes |
| \`elite_jeunes\` | Élite Jeunes |
| \`adultes_loisir\` | Adultes loisirs |
| \`adultes_competition\` | Adultes compétition |
| \`jeu_libre\` | Jeu libre |

Ainsi, une page « Jeunes » porte \`minibad, poussins, jeunes, elite_jeunes\`. Un code mal orthographié ne fait pas d'erreur : il ne remonte simplement aucun créneau.

Le visiteur voit un vrai tableau — jour, horaire, groupe, gymnase — lisible par les moteurs de recherche et par un lecteur d'écran, là où l'ancien site enfermait la même information dans une feuille Google invisible. Si aucun créneau ne correspond, le bloc affiche « Les créneaux ne sont pas encore renseignés pour cette saison. »

Les créneaux **masqués** dans l'écran Créneaux n'apparaissent jamais ici.

---

## Actualités

Les dernières actualités du site, en cartes.

| Champ | Détail |
|---|---|
| **Titre de section** | Facultatif : « Actualités du club » |
| **Nombre d'actualités** | 3, 6, 9 ou 12 |
| **Catégorie** | Restreint la liste à une catégorie. « Toutes les catégories » par défaut |
| **Afficher les images de couverture** | Coché par défaut |
| **Afficher le lien « Toutes les actualités »** | Coché par défaut, renvoie vers la page d'archives |

Comme le bloc Créneaux, celui-ci ne fige rien : il interroge les actualités au moment où le visiteur ouvre la page. Une actualité publiée ce matin apparaît d'elle-même sur l'accueil, sans avoir à republier la page.

Seules les actualités **publiées** remontent, de la plus récente à la plus ancienne. S'il n'y en a aucune, le bloc affiche « Aucune actualité pour le moment. »

Choisir une **catégorie** restreint la liste, et fait pointer le lien « Toutes les actualités » vers les archives de cette catégorie. Une page « Jeunes » peut ainsi ne montrer que les actualités des jeunes.

> [!TIP]
> Deux blocs Actualités sur la même page sont possibles — les compétitions d'un côté, la vie du club de l'autre. Donnez un titre de section à chacun, sans quoi le visiteur voit deux grilles sans comprendre ce qui les distingue.

---

## Intégration

Insère une vidéo YouTube, une feuille de calcul ou un agenda Google dans la page.

| Champ | Détail |
|---|---|
| **Service** | YouTube, Google Sheets ou Google Agenda |
| **Identifiant** | L'identifiant de la ressource, **pas son adresse** : dans \`youtu.be/T4_qiRVEXcI\`, c'est \`T4_qiRVEXcI\` |
| **Titre** | Obligatoire : un cadre sans titre est incompréhensible pour un lecteur d'écran |
| **Format du cadre** | 16/9 pour une vidéo, 4/3 pour un cadre plus haut, ou une hauteur fixe en pixels |

On n'enregistre jamais une adresse complète, mais un service pris dans une liste fermée et un identifiant. C'est ce qui empêche qu'un écran d'administration devienne un moyen d'insérer n'importe quel contenu extérieur dans le site.

La forme attendue dépend du service : un **jeton** pour YouTube et Sheets (lettres, chiffres, tirets et soulignés, huit caractères au minimum), une **adresse** pour Google Agenda — \`nozaybad@gmail.com\`, ou \`…@group.calendar.google.com\` pour un agenda partagé. Dans les deux cas, coller l'adresse d'intégration complète est refusé, avec un message qui le dit.

**Choisir le format.** Le 16/9 convient à une vidéo. Un **agenda mensuel** ou une grande feuille de calcul y seraient illisibles : prenez une **hauteur fixe**, environ 600 pixels pour un agenda. Le cadre réserve sa place avant de charger, quel que soit le choix — sans quoi le reste de la page sauterait à l'arrivée du contenu.

> [!NOTE]
> La vidéo est servie par **youtube-nocookie.com** : YouTube ne dépose aucun traceur tant que le visiteur n'a pas lancé la lecture. C'est aussi pourquoi la vignette met parfois un instant de plus à apparaître.

> [!TIP]
> Pour une feuille de calcul ou un agenda, vérifiez d'abord qu'ils sont **partagés publiquement** (« Tout utilisateur disposant du lien »). Sinon le cadre s'affiche, mais le visiteur y voit une demande de connexion à Google.

---

## Personnes *(pas encore affiché sur le site)*

Prévu pour les cartes de contact : bureau, commissions, encadrants.

| Champ | Détail |
|---|---|
| **Titre de section** | « Le bureau », « Les encadrants » |
| **Nom** et **Fonction** | Une ligne par personne |
| **Adresse électronique** et **Téléphone** | Facultatifs. Une adresse mal formée est effacée à l'enregistrement plutôt que de produire un lien cassé |
| **Responsabilités** | Une par ligne, douze au maximum |

Quarante personnes au maximum par bloc.

> [!CAUTION]
> Publier le téléphone personnel d'un bénévole sur un site public l'expose au démarchage et à la récupération automatisée. Préférez une adresse électronique dédiée à la fonction (\`president@…\`) plutôt qu'un numéro privé — et demandez son accord à la personne concernée.

Rappel : ce bloc **n'affiche rien** sur le site public pour le moment.

---

## Ce qui est vérifié à l'enregistrement

Tout ce que vous saisissez est contrôlé par le serveur, jamais seulement par le navigateur :

- Les liens dangereux sont refusés — un bouton dont l'adresse ne va nulle part disparaît.
- Le texte riche est nettoyé : scripts, styles et cadres sont retirés ; les images doivent venir de la médiathèque.
- Un bloc refusé fait échouer **tout l'enregistrement**, avec un message indiquant le numéro du bloc en cause. La page n'est jamais enregistrée à moitié.
--- Article: site-mediatheque.md ---
---
title: "Médiathèque"
description: "Déposer et gérer les images et documents utilisés par le site public."
category: "site"
order: 4
---

**Site public → Médiathèque** regroupe les images et les documents du site. Un fichier déposé ici est réutilisable partout : couverture d'actualité, bannière d'une grille de liens, galerie, PDF en téléchargement.

L'écran affiche une grille de vignettes — on y cherche une image à l'œil, pas une ligne dans un tableau. La barre de recherche filtre sur la description et le nom de fichier.

## Déposer un fichier

Le bouton **Ajouter un média** demande deux choses : le fichier, et son **texte alternatif**.

**Formats acceptés** : JPEG, PNG, WebP, AVIF, GIF et PDF. Tout le reste est refusé, y compris les fichiers SVG — ce sont des documents qui peuvent porter du code exécutable.

**Taille maximale** : 12 Mo.

> [!NOTE]
> Les images sont **réduites à 1600 pixels de large et converties en WebP dans votre navigateur** avant d'être envoyées. Une photo de téléphone de 4 Mo arrive donc allégée, sans que vous ayez à la retoucher. Une image déjà petite et bien compressée est laissée telle quelle : la réencoder ferait perdre de la qualité pour rien.

Déposer deux fois le même fichier **ne crée pas de doublon** : l'application reconnaît un contenu identique et vous renvoie vers le média existant.

## Le texte alternatif

Il est demandé au dépôt, et obligatoire pour une image. Ce n'est pas une formalité : il est lu à voix haute par les lecteurs d'écran, affiché si l'image ne se charge pas, et utilisé par les moteurs de recherche.

Décrivez ce que **montre** l'image, en quelques mots : « L'équipe interclubs devant le gymnase Pierre Dupuis », et non « photo » ou « IMG_2451 ». C'est aussi ce texte qui sert de nom au média dans les listes et les sélecteurs — un média bien décrit se retrouve à la recherche.

Il est demandé au dépôt parce que personne ne revient le remplir ensuite.

## Utiliser un média

Vous ne choisissez jamais un fichier depuis cet écran : c'est le formulaire qui en a besoin qui ouvre la médiathèque, filtrée sur ce qu'il attend.

| Où | Ce qui est proposé |
|---|---|
| Couverture d'une [actualité](/admin/help/site-actualites) | Les images |
| Fichier inséré dans un texte d'actualité | Les documents |
| Image de fond d'une **Grille de liens** | Les images |
| Image d'une diapositive de **Carrousel** | Les images |
| Bloc **Galerie** | Les images, ajoutées une à une |
| Bloc **Document** | Les documents |

Voir [Les blocs de contenu](/admin/help/site-blocs) pour le détail de chaque bloc.

Le menu **⋯** d'une vignette permet d'**Ouvrir** le fichier dans un nouvel onglet — pratique pour récupérer son adresse publique, de la forme \`/media/…\`.

Dans tous les cas, la médiathèque s'ouvre avec sa recherche : c'est le texte alternatif et le nom du fichier qui sont interrogés. Une raison de plus de décrire correctement ce que vous déposez.

## Supprimer un média

La suppression est refusée si le média est utilisé comme **couverture d'une actualité ou image d'une page** : le message vous le dit, et vous devez d'abord le retirer de là où il sert.

> [!WARNING]
> Ce contrôle ne couvre pas tous les usages : un fichier utilisé à l'intérieur du texte d'un article, ou dans une galerie, peut être supprimé sans avertissement. Vérifiez avant, surtout pour un document mis en téléchargement depuis plusieurs pages.

Le fichier lui-même reste stocké : seule sa fiche disparaît de la médiathèque. Le redéposer plus tard retombera sur le même fichier, sans occuper d'espace supplémentaire.

## Qui peut faire quoi

| Action | Droit requis |
|---|---|
| Consulter la médiathèque | Consulter la médiathèque |
| Déposer un fichier | Ajouter un média |
| Supprimer | Supprimer un média |

Déposer et supprimer sont deux droits distincts : ajouter un fichier est sans conséquence, alors que retirer un média peut vider l'illustration d'une page déjà en ligne. Les rôles **Communication** et **Président·e** disposent des trois ; le rôle **Secrétaire** peut déposer sans pouvoir supprimer. Les droits se règlent depuis [Accès & Rôles](/admin/help/acces-permissions).


--- Article: site-menus.md ---
---
title: "Menus du site (à venir)"
description: "Ce que permettra la gestion des menus du site public, et comment faire en attendant."
category: "site"
order: 5
---

> [!IMPORTANT]
> **Cette fonctionnalité est en cours de développement.** Aucun écran ne lui correspond encore dans le menu d'administration. Cet article décrit ce qu'elle permettra, pour que vous sachiez ce qui vous attend — et surtout comment faire d'ici là.

## Comment se règle le menu aujourd'hui

Le menu de l'en-tête du site public et les liens du pied de page sont **écrits dans le code**. Créer une page ne l'y ajoute pas, et la retirer du site ne l'en enlève pas.

Pour faire figurer une nouvelle page dans le menu du site, demandez la modification au responsable technique. Prévoyez le délai d'une mise en production.

> [!CAUTION]
> Conséquence à connaître : si vous **supprimez** une page qui figure dans le menu, le lien reste affiché sur le site et mène à une erreur 404 jusqu'à la prochaine mise en production. Prévenez avant de supprimer une page référencée par le menu — voir [Pages du site](/admin/help/site-pages).

En attendant, une page peut parfaitement être atteinte sans figurer au menu : depuis un bloc **Grille de liens** ou **Accroche** posé sur une page qui, elle, est au menu. C'est souvent suffisant pour une page saisonnière — inscriptions, tournoi annuel.

## Ce que permettra l'écran à venir

Deux menus distincts seront administrables :

- l'**en-tête**, la navigation principale du site ;
- le **pied de page**, réservé aux liens de bas de page.

Chaque entrée portera :

| Champ | Détail |
|---|---|
| **Libellé** | Le texte affiché, 80 caractères au maximum. Il est indépendant du titre de la page : une page « Présentation du club et de ses activités » peut s'appeler « Le club » dans le menu |
| **Cible** | **Soit** une page du site, **soit** une adresse extérieure — jamais les deux |
| **Emplacement** | En-tête ou pied de page |
| **Position** | L'ordre dans le menu ; une nouvelle entrée se pose à la fin |
| **Sous-menu** | Une entrée peut être rangée sous une autre |

Deux niveaux au maximum : une entrée, et son sous-menu. Un troisième niveau serait inatteignable au survol sur grand écran et illisible une fois replié sur téléphone.

Une entrée qui pointe une **page du site** suit cette page : son adresse est résolue au moment de l'affichage, et supprimer la page emportera l'entrée de menu avec elle. C'est précisément ce que le menu écrit en dur ne sait pas faire aujourd'hui.

## Les redirections

**Site public → Redirections** liste les anciennes adresses du site — héritées de WordPress ou laissées par le renommage d'une page — avec leur destination et leur **nombre de visites**. Le compteur dit si une adresse sert encore : une redirection jamais empruntée peut être supprimée sans risque, une redirection encore utilisée doit être conservée.

Chaque adresse répond de l'une de ces deux façons :

- **Redirection (301)** : les visiteurs et les moteurs sont envoyés vers l'adresse cible ;
- **Page supprimée (410)** : l'adresse n'a pas de successeur, et les moteurs la retirent de leur index.

Vous pouvez modifier la destination d'une redirection, en créer une à la main — typiquement après la suppression d'une page dont l'adresse circulait — ou en supprimer une devenue inutile. L'application refuse les montages qui se paient en référencement : une redirection qui pointe sur elle-même, ou vers une adresse elle-même redirigée.

## Qui pourra le faire

Le droit correspondant s'appelle **Modifier les menus et les redirections**. Il est déjà attribué aux rôles **Communication**, **Président·e** et **Super administrateur**.

Il n'est **pas** accordé au rôle **Secrétaire**, qui peut rédiger des pages mais pas toucher à l'arborescence : modifier un menu ou une redirection se paie en référencement, et cela relève de la commission Communication et de la présidence. Voir [Accès & Rôles](/admin/help/acces-permissions).


--- Article: site-pages.md ---
---
title: "Pages du site"
description: "Composer, publier et faire évoluer les pages du site public."
category: "site"
order: 1
---

**Site public → Pages** contient les pages du site que voient les visiteurs — présentation du club, inscription, contacts. C'est le site public, à ne pas confondre avec l'[espace adhérent](/admin/help/espace-adherent), qui demande une connexion.

## Une page est une pile de blocs

Une page n'est pas un document libre : c'est une **suite ordonnée de blocs**, chacun d'un type précis — un texte, une accroche, une galerie, un tableau de créneaux. Vous les empilez, vous les déplacez, vous les retirez.

C'est un choix délibéré. Un éditeur libre laisse produire des pages illisibles sur téléphone, des images de 4 Mo et des titres dans le désordre — c'est exactement ce que faisait l'ancien site WordPress. Avec des blocs, la mise en page reste cohérente quoi que vous saisissiez.

Le détail de chaque type de bloc est décrit dans [Les blocs de contenu](/admin/help/site-blocs).

## Créer une page

Le bouton **Nouvelle page** ne demande qu'un titre. La page est créée **en brouillon**, et son adresse est déduite du titre : « Notre club » donne \`/notre-club/\`.

> [!IMPORTANT]
> L'adresse est fixée à la création et ne se modifie pas depuis l'application. Choisissez le titre en conséquence : une page publiée puis renommée garderait son adresse d'origine. En cas d'erreur, supprimez la page tant qu'elle est en brouillon et recréez-la.

Une page est toujours créée en brouillon, jamais en ligne : une page vide publiée le temps d'être rédigée serait indexée dans cet état par les moteurs de recherche.

## L'éditeur

Cliquez sur le titre d'une page pour l'ouvrir. L'écran réunit :

| Zone | Rôle |
|---|---|
| **Bandeau du haut** | Statut (Brouillon / En ligne), adresse publique, lien **Aperçu**, et la mention « Modifications non enregistrées » s'il y a lieu |
| **Titre** | Le titre affiché en haut de la page publique, et repris dans l'onglet du navigateur |
| **Titre pour les moteurs** | Ce que Google affiche dans ses résultats. Vide, c'est le titre de la page qui sert |
| **Description pour les moteurs** | La phrase sous le lien dans les résultats de recherche. Visez 155 caractères |
| **Les blocs** | Le contenu proprement dit, dans l'ordre où il s'affichera |
| **Ajouter un bloc** | Un bouton par type de bloc ; survolez-en un pour lire ce qu'il fait |
| **Anciennes adresses** | Les adresses qui redirigent vers cette page, avec leur nombre de visites |
| **Historique** | Les versions précédentes de la page |

Chaque bloc porte son numéro, son type, et trois commandes : **↑** et **↓** pour le déplacer, **Retirer** pour le supprimer. Retirer un bloc ne prend effet qu'à l'enregistrement.

## Enregistrer, puis publier

Ce sont deux gestes distincts.

**Enregistrer** écrit vos modifications et crée une version dans l'historique. Une page en ligne est mise à jour immédiatement pour les visiteurs ; une page en brouillon reste invisible.

**Publier** met la page en ligne. **Retirer du site** l'en enlève sans rien effacer : la page redevient un brouillon, son contenu est conservé.

> [!NOTE]
> Publier exige d'avoir enregistré au préalable. Si vous tentez de publier avec des modifications en cours, l'application refuse et vous le dit : sans cela, vous mettriez en ligne la version précédente en croyant publier celle que vous avez sous les yeux.

Publier ou dépublier **renouvelle le cache de tout le site**. Comptez quelques secondes avant que le changement soit visible partout — et sachez que c'est ce mécanisme qui garantit qu'aucun visiteur ne reste sur une version périmée.

La **date de publication** n'est posée qu'à la première mise en ligne. Corriger une faute dans une vieille page ne la fait donc pas passer pour une nouveauté aux yeux de Google.

## Relire avant de publier

Le lien **Aperçu** ouvre la page sur le site public, telle qu'elle sera rendue, même si elle est encore en brouillon. Le lien porte un jeton signé, valable pour cette page : il permet de faire relire un brouillon par quelqu'un d'autre sans le publier.

C'est le seul moyen fiable de vérifier une mise en page : l'éditeur montre les champs, pas le rendu.

## L'historique

Chaque enregistrement conserve un instantané de l'état **précédent** — celui qui fonctionnait. Le panneau **Historique**, en bas de l'éditeur, les liste avec leur date, leur auteur et leur nombre de blocs. Les **vingt dernières versions** d'une page sont conservées ; au-delà, les plus anciennes sont effacées.

**Restaurer** remplace le contenu actuel par celui de la version choisie. L'adresse et la mise en ligne ne changent pas, et le contenu remplacé part lui-même dans l'historique : un retour en arrière reste réversible.

## Supprimer une page

La suppression est **définitive** : la page, ses blocs et son historique disparaissent, et son adresse ne répond plus.

> [!CAUTION]
> Si la page était en ligne, son adresse est probablement connue de Google et partagée dans des courriels ou sur les réseaux. La supprimer produit une erreur 404 pour tous ces visiteurs. Pour retirer une page de la vue du public en conservant cette possibilité de retour, préférez **Retirer du site**.

Les redirections d'une ancienne adresse vers une nouvelle se consultent et se règlent depuis **Site public → Redirections** : après une suppression, vous pouvez y rediriger l'ancienne adresse vers une page qui la remplace, ou la déclarer supprimée (410) pour que les moteurs l'oublient. Il faut pour cela le droit *Modifier les menus et les redirections*.

## Qui peut faire quoi

| Action | Droit requis |
|---|---|
| Consulter les pages | Consulter les pages du site |
| Créer, modifier, publier, restaurer une version | Créer et modifier une page du site |
| Supprimer | Supprimer une page du site |

Les rôles **Communication** et **Président·e** disposent de l'ensemble. Le rôle **Secrétaire** peut créer et modifier, mais pas supprimer. Les droits se règlent depuis [Accès & Rôles](/admin/help/acces-permissions).


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
  season_id: integer('season_id').notNull().references(() => seasonsTable.id),
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
  season_id: integer('season_id').notNull().references(() => seasonsTable.id),
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
  season_id: integer('season_id').notNull().references(() => seasonsTable.id),
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
  season_id: integer('season_id').notNull().references(() => seasonsTable.id),
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
  season_id: integer('season_id').notNull().references(() => seasonsTable.id),
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
  season_id: integer('season_id').notNull().references(() => seasonsTable.id),
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
  // created → awaiting_payment → paid. \`rejected\` ferme une demande non validée,
  // \`cancelled\` une commande validée que le règlement n'a jamais suivie.
  status: text('status', {
    enum: ['created', 'awaiting_payment', 'paid', 'rejected', 'cancelled']
  }).notNull().default('created'),
  /** Date de mise en attente de règlement : point de départ des relances. */
  awaiting_payment_since: text('awaiting_payment_since'),
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

/**
 * Droits accordés par chaque rôle, modifiables depuis l'application.
 *
 * \`super_admin\` n'y figure pas : il vaut toujours la totalité du catalogue, calculée
 * en code. S'il était rangé ici sous forme de lignes figées, une permission ajoutée
 * par une nouvelle fonctionnalité ne lui serait pas accordée — on livrerait un écran
 * que le super administrateur ne peut pas ouvrir — et retirer par mégarde son droit
 * d'édition verrouillerait l'application sans recours.
 *
 * Les valeurs de départ viennent de \`ROLE_PERMISSIONS\` (migration 0013), qui reste la
 * définition d'origine : l'écran signale les rôles qui s'en écartent.
 */
export const rolePermissionsTable = sqliteTable(
  'role_permissions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    role: text('role').notNull(),
    permission: text('permission').notNull(),
    created_at: integer('created_at', { mode: 'timestamp' }).notNull()
  },
  (table) => ({
    role_permissions_role_permission_idx: uniqueIndex('role_permissions_role_permission_idx').on(
      table.role,
      table.permission
    ),
    role_permissions_role_idx: index('role_permissions_role_idx').on(table.role)
  })
);

/**
 * Journal des modifications de droits.
 *
 * Tant que le mapping vivait en code, git donnait gratuitement l'auteur, la date et
 * la justification de chaque changement. En le rendant modifiable depuis l'écran, on
 * perd cette trace : ce journal la remplace. Il est en ajout seul.
 */
export const rolePermissionLogTable = sqliteTable(
  'role_permission_log',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    role: text('role').notNull(),
    permission: text('permission').notNull(),
    action: text('action', { enum: ['granted', 'revoked'] }).notNull(),
    /** Adresse du compte auteur de la modification. */
    actor_email: text('actor_email').notNull(),
    created_at: integer('created_at', { mode: 'timestamp' }).notNull()
  },
  (table) => ({
    role_permission_log_role_idx: index('role_permission_log_role_idx').on(table.role),
    role_permission_log_created_at_idx: index('role_permission_log_created_at_idx').on(table.createdAt)
  })
);

export type AdminUserRow = typeof adminUsersTable.\$inferSelect;
export type RolePermissionRow = typeof rolePermissionsTable.\$inferSelect;
export type RolePermissionLogRow = typeof rolePermissionLogTable.\$inferSelect;
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
  // Date de règlement issue de Poona (« Date de paiement »), ISO \`YYYY-MM-DD\`.
  // Sert de date d'émission à l'attestation CSE. Poona la laisse vide en pratique :
  // le repli (1er septembre de la saison) est le cas courant, pas l'exception.
  payment_date: text('payment_date'),
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
