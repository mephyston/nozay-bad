# RF-ANN-001 : Cycle de vie d'une annonce

## 1. Description et Objectif Métier

Le bureau doit pouvoir préparer une communication sans la publier immédiatement — la relire, la faire valider, choisir son moment. Une annonce existe donc d'abord comme **brouillon**, invisible des adhérents, puis devient **publiée**. Cette règle définit ce qui est visible, dans quel ordre, et ce qui se produit lorsqu'une annonce change de statut.

---

## 2. Domaine Fonctionnel

- **Domaine** : announcements
- **Agrégat / Entité clé** : Annonce (`announcements`)
- **Statut** : Validé

---

## 3. Définition de la Règle Métier

**Une annonce naît brouillon.** C'est le défaut à la création : publier doit être un geste délibéré, pas la conséquence d'un enregistrement.

**Un brouillon est invisible des adhérents.** L'espace adhérent ne lit que les annonces publiées, et cette restriction est appliquée par l'API — pas par les pages qui l'appellent. Une page qui oublierait de filtrer ne divulgue donc rien.

**La date de publication est posée une seule fois.** Elle l'est au premier passage à « publiée », et ne change plus, y compris après un retour en brouillon suivi d'une republication. Sans cette règle, corriger une faute de frappe dans une vieille annonce la ferait remonter en tête de l'accueil et repousserait les annonces récentes hors des trois dernières.

**L'ordre d'affichage suit la date de publication**, de la plus récente à la plus ancienne. Les brouillons, qui n'en ont pas, sont départagés par leur date de création dans l'écran d'administration.

**L'accueil montre les 3 dernières annonces publiées**, suivies d'un lien vers l'historique complet. Le bloc disparaît entièrement s'il n'y a aucune annonce, plutôt que d'afficher un cadre vide.

**Une annonce peut être modifiée et supprimée à tout moment.** Rien ne s'y rattache : la suppression est franche, sans archivage.

---

## 4. Scénarios d'Acceptation (Gherkin)

```gherkin
# language: fr

Fonctionnalité: Cycle de vie d'une annonce

  Scénario: Un brouillon n'est pas visible des adhérents
    Étant donné une annonce enregistrée en brouillon
    Quand un adhérent ouvre l'accueil de l'espace adhérent
    Alors l'annonce n'apparaît pas
    Et elle n'apparaît pas non plus dans l'historique des annonces

  Scénario: La publication rend l'annonce visible et la date
    Étant donné une annonce en brouillon
    Quand un membre du bureau la passe au statut « publiée »
    Alors elle reçoit la date du jour comme date de publication
    Et elle apparaît en tête de l'accueil de l'espace adhérent

  Scénario: L'accueil se limite aux trois dernières annonces
    Étant donné quatre annonces publiées à des dates différentes
    Quand un adhérent ouvre l'accueil de l'espace adhérent
    Alors seules les trois plus récentes sont affichées
    Et un lien mène à l'historique complet

  Scénario: Une republication ne fait pas remonter l'annonce
    Étant donné une annonce publiée le 1er août
    Et une autre annonce publiée le 5 août
    Quand la première est repassée en brouillon puis republiée le 20 août
    Alors sa date de publication reste le 1er août
    Et elle reste affichée après celle du 5 août

  Scénario: Une annonce vidée de son contenu est refusée
    Étant donné un texte ne contenant que du balisage non autorisé
    Quand un membre du bureau tente d'enregistrer l'annonce
    Alors l'enregistrement est refusé
    Et le formulaire reste ouvert avec le message « Le texte de l'annonce est vide. »
```
