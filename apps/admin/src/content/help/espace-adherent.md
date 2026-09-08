---
title: "L'espace adhérent"
description: "Ce que les adhérents voient et peuvent faire de leur côté, et ce que cela déclenche pour le bureau."
category: "adherents"
order: 6
---

L'application comporte un second site, destiné aux adhérents. Le bureau n'y intervient pas, mais plusieurs tâches administratives y prennent leur source : les notes de frais et les commandes boutique y sont déposées, les notifications y sont reçues.

## Comment un adhérent se connecte

Il n'y a **pas de mot de passe**. L'adhérent saisit son adresse e-mail ou son numéro de licence, et reçoit un **code à usage unique** par e-mail. Le code est envoyé à l'adresse au dossier — la sienne, ou celle d'un représentant légal. Les demandes sont protégées contre les robots et limitées en nombre par adresse IP.

C'est le **foyer** qui se connecte, pas l'individu : une adresse rattachée à plusieurs licenciés (une fratrie, un parent et son enfant) ouvre l'accès à tous ces dossiers, et l'adhérent bascule de l'un à l'autre depuis son compte.

> [!NOTE]
> Un adhérent qui ne reçoit pas son code a le plus souvent une adresse absente ou erronée dans Poona. Vérifiez sa fiche : l'e-mail de l'adhérent et ceux des deux contacts y sont affichés.

Le code est valable **10 minutes** et accepte **5 tentatives**. Une fois entré, la connexion vaut **30 jours** sur l'appareil.

## « Je n'arrive plus à me connecter »

C'est le motif d'appel le plus fréquent, et il a presque toujours la même cause : **l'accès suit la licence de la saison en cours**, au sens des dates de la saison — pas de l'exercice comptable ouvert dans l'administration.

Concrètement, au 1ᵉʳ septembre, un adhérent qui n'a pas renouvelé perd l'accès. Y compris s'il était connecté la veille : sa session est revalidée et **révoquée** dès que sa saison est close. À l'inverse, celui dont la licence a été enregistrée ne voit rien passer — sa session est renouvelée silencieusement.

Quatre situations, et le message reçu par e-mail :

| Situation | Ce qu'il reçoit |
|---|---|
| **Licence en cours** | Son code de connexion |
| **Licence prise pour la saison suivante seulement** | Un e-mail lui indiquant **la date d'ouverture** de son accès. D'ici là, l'application n'aurait aucune de ses données à lui montrer |
| **Licencié l'an dernier, pas cette année** | Une invitation à réadhérer |
| **Inconnu au fichier depuis plus d'une saison** | Rien |

> [!IMPORTANT]
> Dans les trois derniers cas, l'écran affiche **exactement la même chose** que pour une connexion réussie : « un code vous a été envoyé ». C'est volontaire — répondre « adresse inconnue » permettrait à n'importe qui de tester des adresses pour savoir qui est au club. Ce qu'il y a à dire part par e-mail, le seul canal dont l'adhérent a prouvé la propriété.
>
> Conséquence pratique : un adhérent qui vous dit « je ne reçois rien » n'a pas forcément un problème d'adresse. **Vérifiez d'abord sa licence pour la saison en cours** dans [la liste des adhérents](/admin/help/gestion-adherents).

Si l'API est injoignable, personne n'est déconnecté : la licence est revérifiée à la requête suivante.

## Ce qu'il peut faire

Les écrans personnels (compte, fiche, cotisation, attestation, notifications, notes de frais) se trouvent derrière le **portrait en haut à droite** de l'espace adhérent ; une bulle le lui indique à sa première visite. Les rubriques du club (accueil, actualités, calendrier, boutique, mon club) sont dans la barre de navigation.

- **Mon compte** — l'état de sa cotisation (montant dû, reçu, restant), l'historique de ses commandes et de ses notes de frais avec leur statut, et l'activation des notifications.
- **Boutique** — passer une commande sur le catalogue actif. Elle arrive en attente dans [Boutique → Commandes](/admin/help/boutique-commandes).
- **Notes de frais** — déposer une demande de remboursement avec un justificatif, **uniquement s'il y a été autorisé** depuis sa fiche. Elle arrive en attente dans [Notes de frais](/admin/help/notes-de-frais).
- **Attestation** — télécharger son [attestation CSE](/admin/help/attestation-cse), si sa cotisation est soldée.
- **Notifications** — activer les notifications sur son appareil et choisir les catégories qu'il souhaite recevoir. Voir [Notifications](/admin/help/notifications).

Le site comporte également les pages *Politique de confidentialité* et *Mentions légales*.

## Ce qui remonte automatiquement vers lui

- La **validation ou le refus** de sa note de frais ;
- La **validation ou le refus** de sa commande boutique ;
- Les actualités réservées aux adhérents que le bureau diffuse et, si elles sont activées, les relances de cotisation et de commande à régler, les échéances d'interclubs, ainsi que les anniversaires.

Ces messages ne partent que vers les appareils réellement abonnés aux notifications.
