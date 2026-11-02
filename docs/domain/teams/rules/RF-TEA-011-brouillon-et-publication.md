# RF-TEA-011 : Brouillon et publication, des effectifs aux compositions

## 1. Description et Objectif Métier

Le coach compose les équipes de la saison par essais, et le capitaine prépare sa composition en plusieurs passes. Jusqu'ici, chaque essai enregistré se lisait aussitôt dans l'espace adhérent : un joueur voyait son équipe changer trois fois dans la soirée, ou se croyait aligné sur un brouillon que le capitaine défaisait le lendemain.

Désormais, rien de ce qui est en préparation ne sort de l'administration ni du staff de l'équipe. Les adhérents ne voient que ce qui a été **publié**, et la publication se retire.

---

## 2. Domaine Fonctionnel

- **Domaine** : teams
- **Agrégat / Entité clé** : `championship_settings.rosters_published_at`, `lineup_slots.status`
- **Statut** : Validé

---

## 3. Définition de la Règle Métier

### Effectifs : publiés par championnat

- La publication vaut pour **un championnat et une saison** : effectifs et capitaines de toutes ses équipes, d'un coup. C'est l'échelle de l'équilibrage (RF-TEA-010).
- Tant qu'un championnat n'est pas publié, l'espace adhérent montre ses équipes (division, poule, calendrier) **sans effectif ni staff**. Les journées ne s'ouvrent pas : personne n'y compose, même le capitaine désigné, et aucun rappel de composition ne part (RF-TEA-006).
- Une fois publiés, les retouches du coach se voient aussitôt. Il peut **retirer** la publication pour refaire des essais.
- Publier ou retirer ne notifie personne.
- La liste des équipes de l'espace adhérent est servie depuis un cache de 5 minutes (`shared-read-cache.ts`), comme toute retouche d'effectif : une publication ou un retrait peut y mettre ce temps à apparaître. Fiche d'équipe, agenda et compositions lisent la base à chaque fois.
- Un nouveau championnat, ou une nouvelle saison, commence non publié. Les championnats déjà engagés au déploiement ont été repris comme publiés.

### Compositions : publiées par le capitaine

- **Brouillon** : visible du capitaine, du vice-capitaine et du bureau seulement. Pour les autres adhérents, la rencontre se lit « pas encore saisie ». Enregistrer un brouillon ne prévient personne.
- **Valider et publier** : la composition devient visible de tous les adhérents. Alignés et non retenus sont prévenus.
- **Retoucher une composition publiée** : elle reste publiée, et l'équipe est prévenue de la modification.
- **Repasser en brouillon** : la composition disparaît pour l'équipe. Ceux qui avaient été prévenus — l'effectif, plus les joueurs alignés hors effectif — apprennent qu'elle est retirée.
- Les contrôles entre équipes (« déjà aligné cette semaine », valeur de l'équipe du dessus) **comptent les brouillons** des autres capitaines. Un capitaine apprend qu'un joueur est pris par telle équipe, jamais le reste de sa composition.

### L'administration voit tout

Le bureau voit effectifs, staff et compositions, publiés ou non : contrôle des journées, fiches d'équipe, recherche. Le filtre ne s'applique qu'à l'espace adhérent, et l'API le déduit de l'appelant (`x-caller`), jamais d'un paramètre.

---

## 4. Scénarios d'Acceptation (Gherkin)

```gherkin
# language: fr

Fonctionnalité: Brouillon et publication

  Scénario: Des effectifs en préparation restent invisibles des adhérents
    Étant donné une équipe de mixte avec son capitaine et son effectif
    Et des effectifs de mixte non publiés
    Quand un joueur de l'effectif ouvre la liste des équipes
    Alors l'équipe apparaît sans capitaine ni effectif
    Et il n'y est pas marqué comme joueur

  Scénario: Le bureau voit tout, publié ou non
    Étant donné des effectifs de mixte non publiés
    Quand le bureau ouvre la liste des équipes
    Alors capitaine et effectif sont affichés

  Scénario: Rien ne se compose avant la publication des effectifs
    Étant donné des effectifs de mixte non publiés
    Quand le capitaine enregistre une composition
    Alors elle est refusée
    Et sa rencontre n'apparaît pas dans l'agenda des joueurs

  Scénario: La publication des effectifs se retire
    Étant donné des effectifs de mixte publiés
    Quand le coach les retire
    Alors les adhérents ne voient plus ni effectif ni capitaine

  Scénario: Un brouillon n'est vu que du staff
    Étant donné une composition enregistrée en brouillon
    Quand un joueur de l'effectif l'ouvre
    Alors il voit une feuille vide
    Et le capitaine, lui, voit son brouillon
    Et personne n'a été prévenu

  Scénario: Une composition publiée qu'on retouche reste publiée
    Étant donné une composition validée
    Quand le capitaine la modifie sans la repasser en brouillon
    Alors elle reste visible de l'équipe
    Et l'équipe est prévenue de la modification

  Scénario: Le retrait prévient ceux qui avaient été prévenus
    Étant donné une composition validée
    Quand le capitaine la repasse en brouillon
    Alors l'équipe ne la voit plus
    Et l'effectif reçoit un message « composition retirée »

  Scénario: Retoucher un brouillon jamais publié ne prévient personne
    Étant donné une composition en brouillon
    Quand le capitaine la repasse en brouillon
    Alors aucun message ne part
```
