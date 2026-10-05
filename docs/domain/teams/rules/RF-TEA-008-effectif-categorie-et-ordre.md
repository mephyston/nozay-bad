# RF-TEA-008 : L'effectif respecte la catégorie du championnat, et se lit du plus fort au plus faible

## 1. Description et Objectif Métier

Une équipe d'interclubs vétérans n'aligne que des vétérans. Tant que l'effectif acceptait n'importe quel adhérent, le bureau pouvait y inscrire un senior, que le capitaine retrouvait ensuite dans ses sélecteurs puis voyait refusé à la composition. La catégorie se contrôle désormais dès l'effectif.

L'effectif et les sélecteurs de composition se lisent aussi dans l'ordre où le capitaine pense ses joueurs : du plus fort au plus faible.

---

## 2. Domaine Fonctionnel

- **Domaine** : teams
- **Agrégat / Entité clé** : `team_roster`, `club_teams` (`championship`), composition (`lineup_slots`)
- **Statut** : Validé

---

## 3. Définition de la Règle Métier

### Catégorie d'âge de l'effectif

- Le championnat fixe les catégories admises (`CHAMPIONSHIP_RULES[…].categories`) : `veteran` seul pour l'ICD vétérans ; vétéran à minime pour l'ICD mixte et masculin ; aucune restriction (`null`) pour l'ICR seniors.
- La catégorie d'un adhérent se calcule sur **la date de naissance de son adhésion**, selon la règle FFBaD : l'âge atteint au 31 décembre de l'année de début de saison (`ageCategoryOf`, domaine members). Vétéran = 35 ans et plus. La catégorie Poona n'est pas utilisée ici : elle ne couvre que les licences déjà présentes dans un import de classements, alors que l'effectif se compose souvent avant.
- **Écran (admin)** : l'ajout à l'effectif ne propose pas les adhérents hors catégorie. Un joueur déjà inscrit et hors catégorie porte le badge « Hors catégorie ».
- **API** : `PUT /teams/:id/roster` écarte les licences hors catégorie et les renvoie dans `outOfCategory`, comme il écarte les licences inconnues (`rejected`). L'enregistrement n'échoue pas : l'écran affiche combien de joueurs ont été retirés.
- Une date de naissance illisible n'écarte personne.

### Ordre d'affichage

- **Effectif dans l'espace adhérent** : trié par moyenne ELO décroissante. La moyenne porte sur les cotes CPPH des tableaux classés seulement (la même que dans l'annuaire du club). Les joueurs sans cote viennent en dernier, puis le nom départage.
- **Effectif dans l'admin** : inchangé. Les joueurs non éligibles viennent d'abord, parce que c'est ce que le bureau doit traiter.
- **Sélecteurs de composition** (SH1, SH2, DD, MX…) : triés par classement décroissant **dans la discipline du tableau** : simple pour SH/SD, double pour DH/DD, mixte pour MX. NC passe avant un non-compétiteur, la cote CPPH départage à classement égal, puis le nom.

---

## 4. Scénarios d'Acceptation (Gherkin)

```gherkin
# language: fr

Fonctionnalité: Effectif d'une équipe d'interclubs

  Scénario: Une équipe vétérans n'enrôle que des vétérans
    Étant donné une équipe de l'ICD vétérans sur la saison 2026-2027
    Et un adhérent né en 1991 et un adhérent né en 1992
    Quand le bureau enregistre l'effectif avec les deux
    Alors seul l'adhérent né en 1991 entre dans l'effectif
    Et l'adhérent né en 1992 est signalé comme hors catégorie

  Scénario: L'écran ne propose pas un senior à une équipe vétérans
    Étant donné une équipe de l'ICD vétérans
    Quand le bureau ouvre la feuille d'effectif
    Alors les adhérents de moins de 35 ans au 31 décembre ne figurent pas dans « Ajouter un joueur »

  Scénario: Le régional n'écarte aucune catégorie
    Étant donné une équipe de l'ICR seniors
    Quand le bureau y inscrit un vétéran et un senior
    Alors les deux entrent dans l'effectif

  Scénario: L'effectif se lit du plus fort au plus faible côté adhérent
    Étant donné un effectif dont un joueur a 1 500 points de moyenne ELO, un autre 800 et un troisième aucune cote
    Quand un adhérent consulte l'équipe
    Alors l'effectif s'affiche dans l'ordre 1 500, 800, puis le joueur sans cote

  Scénario: Le sélecteur d'un simple suit le classement en simple
    Étant donné un joueur R4 en simple et D8 en double, et un joueur D9 en simple et R5 en double
    Quand le capitaine ouvre le sélecteur de SH1
    Alors le joueur R4 en simple est proposé en premier
    Et dans le sélecteur du DH, c'est le joueur R5 en double qui vient en premier

  Scénario: Un NC passe devant un non-compétiteur
    Étant donné un joueur NC en simple et un adhérent sans aucun classement
    Quand le capitaine ouvre le sélecteur d'un simple
    Alors le joueur NC est proposé avant l'adhérent sans classement
```
