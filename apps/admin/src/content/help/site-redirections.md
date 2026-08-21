---
title: "Redirections"
description: "Rattraper les anciennes adresses du site public pour ne perdre ni visiteurs ni référencement."
category: "site"
order: 6
---

**Site public → Redirections** liste les anciennes adresses du site — héritées de WordPress, ou laissées par le renommage d'une page — avec leur destination et leur **nombre de visites**.

Une adresse qui a circulé ne disparaît jamais vraiment : elle reste dans les favoris, dans l'index des moteurs et dans les liens d'autres sites. La redirection est ce qui évite qu'elle mène à une impasse.

## Que répond une adresse

| Réponse | Effet |
|---|---|
| **Redirection (301)** | Visiteurs et moteurs sont envoyés vers l'adresse cible. Les moteurs reportent le référencement de l'ancienne adresse sur la nouvelle |
| **Page supprimée (410)** | L'adresse n'a pas de successeur. Les moteurs la retirent de leur index |

Une redirection sans cible répond donc « page supprimée ». C'est le bon choix quand la page n'a pas d'équivalent : renvoyer vers l'accueil faute de mieux dessert le visiteur, qui ne comprend pas où il a atterri.

## Le compteur de visites

Le compteur dit si une adresse sert encore : une redirection jamais empruntée peut être supprimée sans risque, une redirection encore utilisée doit être conservée.

> [!NOTE]
> Le compteur des adresses **supprimées (410)** est en dessous de la réalité : le site public garde leur réponse en cache un quart d'heure, et ces passages-là ne sont pas comptés. Ne purgez pas une 410 « jamais empruntée » sur ce seul argument.

## Créer et modifier

Vous pouvez créer une redirection à la main — typiquement après la suppression d'une page dont l'adresse circulait — en modifier la destination, ou en supprimer une devenue inutile. Une **note** facultative dit pourquoi elle existe : dans deux ans, c'est elle qui permettra de trancher.

L'application refuse les montages qui se paient en référencement :

- une redirection qui **pointe sur elle-même** ;
- une **chaîne** : viser une adresse elle-même redirigée, ce qui ferait suivre deux sauts au visiteur ;
- une **source déjà redirigée** : il faut alors modifier la ligne existante, et non en ajouter une seconde.

Renommer une page **publiée** depuis [Pages du site](/admin/help/site-pages) pose automatiquement la redirection correspondante — et repointe au passage celles qui visaient l'ancienne adresse, pour ne pas créer de chaîne. Un brouillon n'ayant jamais eu d'adresse publique, son renommage ne pose rien. Cet écran sert donc aux cas que l'application ne peut pas deviner.

## Qui peut le faire

Le droit s'appelle **Modifier les redirections** (`cms:nav:write`). Il est attribué aux rôles **Communication**, **Président·e** et **Super administrateur**.

Il n'est **pas** accordé au rôle **Secrétaire**, qui peut rédiger des pages et composer les menus, mais qui ne consulte les redirections qu'en lecture : modifier une adresse se paie en référencement, et cela relève de la commission Communication et de la présidence. Voir [Accès & Rôles](/admin/help/acces-permissions).
