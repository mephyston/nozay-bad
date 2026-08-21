---
title: "Dirigeants"
description: "Enregistrer les fonctions au club de la saison : bureau, comité d'administration et entraîneurs."
category: "adherents"
order: 3
---

**Adhérents → Dirigeants** enregistre qui fait tourner le club cette saison. C'est la traduction dans l'application des décisions prises en assemblée générale.

Ces fonctions ne viennent pas de Poona : la fédération connaît des licenciés, pas un bureau. Elles se saisissent donc à la main, et elles sont **rattachées à une saison** — une nouvelle assemblée générale, une nouvelle saisie.

## Les fonctions

| Fonction | Titulaires |
|---|---|
| **Président** | Un seul par saison |
| **Secrétaire** | Un seul par saison |
| **Trésorier** | Un seul par saison |
| **Trésorier adjoint** | Un seul par saison |
| **Vice-président** | Plusieurs possibles |
| **Membre du comité d'administration** | Plusieurs possibles |
| **Entraîneur** | Plusieurs possibles |

Les quatre premières n'ont qu'un titulaire par saison : ce sont les statuts du club. Si vous attribuez la présidence à quelqu'un alors qu'elle est déjà tenue, l'enregistrement est refusé et le refus **nomme le titulaire actuel** — c'est lui qu'il faut d'abord relever de sa fonction.

> [!IMPORTANT]
> **Pas de cumul** : un adhérent ne porte **qu'une** fonction par saison. Le président ne peut pas être aussi trésorier. Cocher une autre fonction remplace la précédente ; recocher la même la retire.

## À quoi ça sert

Le club a besoin de joindre « le bureau ». Les rappels de gestion — l'import des classements avant une journée d'interclubs régionale, par exemple — sont adressés aux dirigeants de la saison. Sans fonction saisie, ces rappels ne partent à personne.

> [!CAUTION]
> **Une fonction au club n'est pas un droit d'accès.** Elle dit qui gère le club, pas qui peut ouvrir l'administration. Nommer quelqu'un président ici ne lui donne aucun accès supplémentaire ; inversement, un président sans compte d'administration est un cas parfaitement normal. Les accès se règlent depuis [Accès & Rôles](/admin/help/acces-permissions).

C'est la même logique que la capitainerie côté interclubs : désigner un capitaine dit qui compose l'équipe, pas qui administre le club.

## L'écran

Le tableau liste les fonctions de la saison choisie, et **signale les titulaires manquants**. Tant que le président ou le trésorier n'est pas renseigné, un point d'alerte s'affiche à côté de **Dirigeants** dans le menu de gauche : ce sont les deux fonctions sans lesquelles le club ne tourne pas.

Le sélecteur de saison en haut de l'écran permet de consulter les bureaux précédents. La saison proposée par défaut est celle en cours **par ses dates**, indépendamment de l'exercice comptable ouvert.

Un dirigeant dont le dossier a disparu d'un ré-import Poona reste affiché, marqué **sans dossier**. Sa fonction n'est pas retirée automatiquement : le faire serait un effet de bord d'import, pas une décision. À vous de trancher.

## Depuis la fiche adhérent

La [fiche d'un adhérent](/admin/help/fiche-adherent) porte le même bloc **Fonction au club** : c'est le même enregistrement, à l'échelle d'une personne. Utilisez la page Dirigeants pour composer le bureau après une assemblée générale, la fiche pour corriger un cas isolé.

## Qui peut le faire

| Action | Droit requis |
|---|---|
| Consulter les dirigeants | Consulter les adhérents |
| Attribuer, changer, retirer une fonction | Modifier une fiche adhérent |

Le droit d'écriture est celui du fichier des adhérents : les rôles **Secrétaire**, **Président·e** et **Super administrateur** en disposent. Les rôles **Entraîneur·e** et **Trésorier·ère** consultent la page sans pouvoir la modifier.
