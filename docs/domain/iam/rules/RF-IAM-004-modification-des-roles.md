# RF-IAM-004 : Modification des droits d'un rôle

## 1. Description et Objectif Métier

Un club peut ajuster ce qu'un rôle accorde sans attendre un déploiement : ajouter la lecture des notes de frais à l'entraîneur, retirer un droit devenu inutile. L'objectif est de rendre le modèle adaptable sans ouvrir une voie d'escalade ni perdre la trace de ce qui a changé.

---

## 2. Domaine Fonctionnel

- **Domaine** : iam
- **Agrégat / Entité clé** : Droits par rôle (`role_permissions`), journal (`role_permission_log`)
- **Statut** : Validé

---

## 3. Définition de la Règle Métier

**Le droit d'édition n'appartient qu'à `super_admin`.** Modifier ce qu'un rôle accorde revient à pouvoir s'accorder n'importe quel droit : il suffit d'ajouter la permission voulue au rôle que l'on porte. L'accorder à la présidence ou à la trésorerie en ferait des super administrateurs déguisés et effacerait la séparation des tâches établie par RF-IAM-003.

La présidence conserve `iam:roles:read` et `iam:users:write` : elle décide **qui** occupe quel poste, sans pouvoir déplacer les limites du poste lui-même.

**`super_admin` n'est pas modifiable.** Il vaut toujours la totalité du catalogue, calculée en code, et n'est jamais stocké en base. Deux raisons, chacune suffisante : figé en base, il n'obtiendrait pas les permissions ajoutées par les fonctionnalités futures — on livrerait un écran que le super administrateur ne peut pas ouvrir ; et lui retirer par mégarde `iam:roles:write` fermerait la gestion des rôles sans aucun recours depuis l'application.

**Le socle commun est réimposé.** `dashboard:overview:read` et `help:docs:read` sont réintroduits quoi qu'envoie l'appelant. Un compte privé de son tableau de bord ne verrait plus rien après connexion, sans comprendre pourquoi ; ces deux droits n'ouvrent aucune donnée sensible.

**Une permission hors catalogue est ignorée.** Elle serait rangée en base sans effet et donnerait l'illusion d'un droit accordé. Même principe pour un rôle inconnu, refusé.

**Chaque modification est journalisée.** `role_permission_log` enregistre le rôle, la permission, le sens (accordé ou retiré), l'auteur et la date. Tant que le mapping vivait en code, git donnait cette trace gratuitement ; en rendant les rôles modifiables, on la perd — ce journal la remplace. Il est en ajout seul, et rien n'y est écrit lorsque la modification ne change rien.

**L'auteur est l'identité affirmée à l'API.** C'est la même que celle sur laquelle l'autorisation a été décidée : le journal ne peut pas mentir sur qui a agi sans que la requête ait été refusée en amont.

**La dérive reste visible.** Le code garde la définition d'origine de chaque rôle. L'écran compare les droits appliqués à cette définition et signale les ajouts et retraits, avec un bouton pour y revenir. Sans cela, une dérive s'installerait sans que personne ne la remarque — et les rôles cesseraient silencieusement d'être comparables d'un environnement à l'autre.

**La propagation est bornée par le cache.** Une modification de rôle change les droits de tous les comptes qui le portent, au plus tard après l'expiration du cache de résolution (30 s, voir README).

---

## 4. Cas limites

| Situation | Comportement attendu |
|---|---|
| Modification de `super_admin` | Refusée (400), message explicite |
| Rôle inconnu | Refusé (404) |
| Permission hors catalogue | Ignorée silencieusement, jamais stockée |
| Liste de droits vide | Le rôle conserve le socle commun, et lui seul |
| Modification sans changement réel | Aucune écriture, aucune entrée au journal |
| Appelant sans `iam:roles:write` | Refusé (403) par la table de routes de l'API |
| Ligne en base portant un rôle ou une permission inconnus | Ignorée à la résolution — une absence de droit, jamais un droit accordé |
