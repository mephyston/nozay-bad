# RF-CMS-001 : Visibilité d'une actualité

## 1. Description et Objectif Métier

Le club publie deux natures d'information sous une même forme rédactionnelle. Les unes s'adressent au public — un tournoi ouvert, un résultat d'équipe, une inscription qui démarre — et servent aussi de vitrine. Les autres ne concernent que les adhérents : l'organisation d'une soirée, un appel aux bénévoles, une consigne de créneau. Cette règle établit qui lit quoi, et où la décision est prise.

---

## 2. Domaine Fonctionnel

- **Domaine** : cms
- **Agrégat / Entité clé** : Actualité (`cms_posts.visibility`)
- **Statut** : Validé

---

## 3. Définition de la Règle Métier

**Une actualité est publique ou réservée.** Publique, elle se lit sur le site public et dans l'espace adhérent. Réservée, dans l'espace adhérent seul.

**Le défaut est « publique ».** C'est le sens de la reprise WordPress, dont les 99 articles importés étaient tous en ligne : l'inverse les aurait tous fait disparaître du site le jour de la migration. Une restriction se déclare ; une publication ne se déclare pas.

**Le cloisonnement est appliqué par l'API, d'après l'appelant.** Le site public et l'espace adhérent interrogent la **même** route. C'est `x-caller` qui tranche, jamais un paramètre du client : un oubli côté appelant ne doit pas pouvoir divulguer une actualité réservée.

**La liste des appelants privilégiés est une liste blanche.** Seuls `admin` et `storefront` voient les actualités réservées. Tout le reste — le site public, un appelant inconnu, un en-tête absent — est ramené au public. Une liste noire (« exclure `website` ») ferait fuiter au premier appelant qu'on oublierait d'énumérer.

**Une actualité réservée est introuvable depuis le site, y compris par son adresse.** La résolution d'URL l'écarte au même titre que les listes : sans cette garde, elle resterait absente des pages d'archives mais servie à qui devinerait son chemin — et indexée dès le premier partage de lien.

**La restriction ne dépend pas du statut.** Un brouillon reste invisible partout ; publier une actualité réservée la rend visible des seuls adhérents.

---

## 4. Critères d'Acceptation

```gherkin
Fonctionnalité: Visibilité d'une actualité

  Scénario: Une actualité publique est lisible partout
    Étant donné une actualité publiée et publique
    Quand le site public demande la liste des actualités
    Alors elle y figure
    Et elle figure aussi dans l'espace adhérent

  Scénario: Une actualité réservée reste dans l'espace adhérent
    Étant donné une actualité publiée et réservée
    Quand le site public demande la liste des actualités
    Alors elle n'y figure pas
    Quand l'espace adhérent demande la liste des actualités
    Alors elle y figure

  Scénario: Une actualité réservée n'est pas atteignable par son adresse
    Étant donné une actualité publiée et réservée, d'adresse "/soiree-benevoles/"
    Quand un visiteur du site public ouvre "/soiree-benevoles/"
    Alors il reçoit la page « introuvable »

  Scénario: Un appelant non identifié ne voit que le public
    Étant donné une actualité publiée et réservée
    Quand un appelant sans en-tête "x-caller" demande la liste des actualités
    Alors elle n'y figure pas

  Scénario: Un brouillon reste invisible quelle que soit sa visibilité
    Étant donné une actualité en brouillon et publique
    Quand l'espace adhérent demande la liste des actualités
    Alors elle n'y figure pas
```

---

## 5. Points d'Attention

**L'espace adhérent n'a plus qu'un écran d'actualités, filtrable par rubrique.** Les positions du filtre sont déduites des catégories réellement portées par les actualités affichées : toute position proposée ramène donc au moins un résultat, et une catégorie du CMS qui ne classe rien n'apparaît pas. Une actualité sans catégorie n'apparaît sous aucun filtre, mais « Tout » est la position par défaut — elle ne devient jamais introuvable. Un slug inconnu retombe sur « Tout » plutôt que sur un écran vide.

**Le cache du site public est indexé sur la version de contenu.** Rendre publique une actualité qui ne l'était pas ne la fait apparaître qu'à la publication suivante, qui incrémente cette version.
