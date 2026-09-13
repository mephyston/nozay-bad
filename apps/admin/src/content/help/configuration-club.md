---
title: "Configuration du club"
description: "Tout ce qui nomme le club — identité, contacts, mentions légales, banque, images des documents — et les fonctionnalités qu'il utilise."
category: "admin"
order: 4
---

**Réglages → Configuration → Configuration du club** rassemble tout ce qui décrit le club. Ces valeurs apparaissent sur les trois applications (administration, espace adhérent, site public), dans les mails envoyés aux adhérents et sur les documents PDF (factures, bordereaux, attestations). Rien de tout cela n'est écrit ailleurs : ce que vous saisissez ici est la seule source.

## Les écrans

| Écran | Ce qu'il règle | Où ça se voit |
|---|---|---|
| **Identité** | Nom complet, sigle, slogan, ville, code postal, département, région, adresse. | Titres des applications, pied de page du site, données pour les moteurs de recherche, en-tête des documents. |
| **Contacts** | Adresses de contact, de trésorerie et de présidence, nom d'expéditeur des mails, page de prise de licence FFBaD. | Mails de connexion et de rappel, mentions légales, bouton « Prenez votre licence ». |
| **Mentions légales** | Siège, directeur de la publication, RNA, SIRET, agrément, affiliation FFBaD. | Bas de page des PDF, page « Mentions légales » de l'espace adhérent. |
| **Coordonnées bancaires** | Titulaire, banque, IBAN, BIC. La clé de l'IBAN est vérifiée. | Factures, bordereaux de remise de chèques, confirmation de commande par virement. |
| **Compétition et numérotation** | Préfixe des équipes (« CLUB-1 »), préfixe des factures, comité, ligue. | Noms d'équipe, numéros de facture. Changer un préfixe ne renumérote pas l'existant. |
| **Couleur de la marque** | La couleur des titres et filets. | PDF, applications installées. |
| **Envois et rappels** | Fuseau horaire, heure des envois quotidiens, jour et heure des envois hebdomadaires, délai de relance d'une commande, signature des mails, texte d'accueil. | Notifications automatiques, mails. |
| **Règles** | Le mot du type d'adhésion qui ouvre les séances individuelles ; l'annuaire des adhérents entre eux. | Espace adhérent. |
| **Fonctionnalités** | Ce que le club utilise. | Menus, espace adhérent, envois automatiques. |
| **Images des documents** | Logo, bande d'en-tête, bas de page, tampon, logos partenaires. | PDF, menu des applications. |

## Les fonctionnalités

Chaque rubrique de l'application s'allume ou s'éteint : boutique, notes de frais, interclubs, jeu libre, séances individuelles, notifications, site public, attestations, rappels automatiques… Une rubrique éteinte **disparaît du menu**, ses pages répondent « introuvable » dans l'administration comme dans l'espace adhérent, et ses envois automatiques ne partent plus. Rien n'est supprimé : rallumer la rubrique rend tout tel quel.

Certaines fonctionnalités en supposent une autre : sans **Notifications**, les rappels sont inactifs ; sans **Comptabilité**, les factures et les remises de chèques le sont aussi. L'écran le montre en grisant la case et en disant pourquoi.

> [!NOTE]
> Le menu se met à jour au chargement suivant de la page ; l'espace adhérent et le site public, au plus tard une minute après l'enregistrement.

## Les images des documents

Les PDF s'impriment sur le papier à lettre du club :

- avec une **bande d'en-tête** déposée, elle occupe toute la largeur en haut de chaque page ;
- sans bande, l'en-tête est composé du **logo**, du nom et du slogan, souligné d'un filet à la couleur de la marque ;
- le **bas de page** (facultatif) se place au-dessus des logos partenaires et des mentions légales, qui sont toujours imprimées ;
- le **tampon** est apposé sur les attestations.

PNG ou JPEG, 2 Mo au plus. Une image retirée ne casse rien : le document suivant s'imprime sans elle.

## Qui peut modifier ?

La présidence et la trésorerie règlent ; le secrétariat consulte. C'est le droit `settings:club:write` qui décide, attribué par rôle dans **Accès & Rôles**.
