# Politique de sécurité

La plateforme gère des données personnelles d'adhérents et la trésorerie d'un club : une faille se signale, elle ne se publie pas.

## Version maintenue

Seule la version **en production** reçoit des correctifs. Le dépôt n'a qu'une branche durable, `main`, et chaque correctif part en production par promotion d'un commit. Il n'y a pas d'ancienne version à maintenir.

## Signaler une faille

Écrivez à [david@nozaybad.fr](mailto:david@nozaybad.fr), en décrivant :

- l'application concernée (site public, espace adhérent, administration ou API) ;
- les étapes pour reproduire, et ce qu'un attaquant pourrait obtenir ;
- vos coordonnées, si vous souhaitez être tenu informé.

Ce même contact figure dans `/.well-known/security.txt` sur le site public et l'espace adhérent.

### Ce que vous pouvez attendre

- Un accusé de réception sous **3 jours ouvrés**.
- Un premier diagnostic sous **10 jours ouvrés** : faille confirmée ou non, et gravité retenue.
- Une faille confirmée est corrigée en priorité et mise en production dès que le correctif est vérifié. Vous êtes prévenu à ce moment-là.

### En retour, merci de

- ne pas divulguer la faille avant son correctif ;
- ne pas accéder aux données d'autres personnes au-delà de ce qu'exige la démonstration, et ne rien modifier ni supprimer ;
- ne pas mener de test de déni de service ni d'envoi massif (courriels, codes de connexion).

Le projet est maintenu bénévolement : il n'y a pas de programme de récompense.
