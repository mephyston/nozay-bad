---
title: "Notifications push"
description: "Diffuser un message aux adhérents, suivre les envois automatiques et les abonnés."
category: "communication"
order: 2
---

La rubrique **Communication → Notifications** envoie des messages sur le téléphone des adhérents. Ils ne les reçoivent que s'ils ont **activé les notifications** depuis leur espace, appareil par appareil.

## Ce que montre l'écran

Trois indicateurs : le nombre d'**appareils** abonnés, le nombre de **comptes** distincts, et le nombre de notifications **en attente d'envoi**.

## Envoyer un message

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

Beaucoup de messages partent sans intervention. Le **registre des envois automatiques**, en bas de l'écran, en donne la liste complète : c'est la seule vue exhaustive de ce qui part tout seul. Il est replié par défaut et **en consultation seule** — les conditions de déclenchement sont câblées dans le code.

Deux sections l'organisent.

**Notifications programmées** — les envois récurrents, avec leur fréquence et une pastille *Active* / *Désactivée* :

| Message | Quand |
|---|---|
| **Anniversaire(s) du jour** | Tous les jours vers 8-9h, si au moins un adhérent de la saison en cours est concerné, quel que soit l'état de son règlement ; un dossier annulé ou de la saison passée n'est pas fêté |
| **Cotisation en attente** | Le lundi vers 9-10h, aux foyers dont la cotisation reste due |
| **Commande à régler** | Le lundi vers 9-10h, pour les commandes validées depuis plus de 7 jours |
| **Classements à mettre à jour** | Le jeudi précédant chaque journée d'interclubs régionale, **aux dirigeants du club** |
| **Composition à valider** | Chaque jour de la veille de la journée jusqu'à la première rencontre, aux capitaines |

Une notification désactivée indique la variable du Worker API qui l'active. C'est un réglage technique, hors de cet écran.

> [!NOTE]
> Le rappel « Classements à mettre à jour » est adressé aux **fonctions au club** de la saison — bureau, comité d'administration, entraîneurs. Si aucune n'est saisie, le message ne part à personne : voir [Dirigeants](/admin/help/dirigeants).

**Notifications sur événement** — déclenchées par une action métier, et toujours actives :

- **Note de frais** validée ou refusée — au dépositaire ;
- **Commande boutique** validée, payée, refusée ou annulée — au commanditaire ;
- **Interclubs** : convocation ou non-sélection à la validation d'une composition, alerte de **dépassement de valeur d'équipe**, et demande de reprise envoyée depuis *Interclubs → Contrôle des journées* ;
- **Actualité réservée aux adhérents** diffusée manuellement depuis l'écran Actualités.

> [!IMPORTANT]
> Toute nouvelle notification automatique doit apparaître dans ce registre — un test le vérifie. Si un message part sans y figurer, c'est un défaut à signaler.

## Ce que règle l'adhérent

Depuis son espace, chaque adhérent active les notifications sur son appareil, puis choisit les catégories qu'il souhaite recevoir : *Communications du bureau*, *Anniversaires*, *Mes notes de frais*, *Mes commandes boutique*, *Relances* et *Mes équipes interclubs*. Tout est actif par défaut ; il décoche ce qu'il ne veut plus.

> [!NOTE]
> Sur iPhone et iPad, les notifications ne fonctionnent **que si l'espace adhérent a été ajouté à l'écran d'accueil** (Partager → Sur l'écran d'accueil, depuis Safari, Chrome ou Firefox). C'est une contrainte d'iOS. Un adhérent qui consulte le site dans un onglet classique voit la marche à suivre à la place du bouton d'activation.

Un appareil devenu injoignable — application désinstallée, autorisation révoquée — est retiré automatiquement de la liste des abonnés.
