# RF-TEA-012 : Les rencontres de toutes les équipes, pour tout le club

## 1. Description et Objectif Métier

Les adhérents ne voyaient que les rencontres de leurs propres équipes. Certains veulent savoir quand et où jouent les autres, pour venir les encourager. L'espace adhérent les annonce donc sur l'accueil le week-end, les liste dans une vue du calendrier, les propose en abonnement d'agenda, et le club les annonce par notification le matin d'un jour de match.

---

## 2. Domaine Fonctionnel

- **Domaine** : teams (lecture), composée dans `apps/api` avec les notifications et l'agenda
- **Agrégat / Entité clé** : `team_fixtures`, `championship_days`
- **Statut** : Validé

---

## 3. Définition de la Règle Métier

**Ce qui se montre.** Pour chaque rencontre : l'équipe, le championnat, la journée, la date (heure comprise si le capitaine l'a saisie), l'adversaire et le gymnase. **Jamais la composition** : qui joue ne regarde que l'équipe (RF-TEA-011).

**Seulement ce qui est publié.** Un championnat dont les effectifs ne sont pas publiés n'a pas d'équipe pour les adhérents : ses rencontres n'apparaissent pas. Une équipe au repos ne joue pas et n'apparaît pas.

**La date.** Mêmes règles que pour les rencontres de l'adhérent : la date du capitaine fait foi, puis le jour commun fixé par le comité ; à défaut, seule la semaine est connue et la rencontre s'affiche « semaine du … ».

**Accueil.** Le vendredi, le samedi et le dimanche, une bande qui défile à l'horizontale montre les rencontres **datées** du week-end, du jour jusqu'au dimanche ; les autres jours, celles du jour. Elle disparaît quand il n'y en a pas. Chaque vignette mène à la journée de l'équipe.

**Calendrier.** La vue « Interclubs » liste toutes les rencontres à venir, datées ou non. Un seul champ « Équipe » la filtre ; le choix est dans l'adresse et retenu sur l'appareil. Chaque équipe a sa couleur, toujours accompagnée de son nom. Les rencontres des équipes de l'adhérent gardent la carte pleine et le badge « Mon équipe ». La vue « Tout » ne montre toujours que les rencontres de l'adhérent.

**Notification « Rencontres du club ».** Le matin d'un jour de match, avec les anniversaires, un seul message annonce les rencontres **datées** du jour, trois au plus dans le corps. Elle part si le club tient la rubrique Interclubs, à tous ceux qui ont activé les notifications ; la catégorie est active par défaut et chacun s'en désabonne. Un joueur y lit aussi la ligne de sa propre équipe.

**Abonnement d'agenda commun.** Une adresse unique, sans jeton, donne les rencontres datées de toutes les équipes. Elle ne porte rien de plus que la vue « Interclubs » et peut donc se partager. Elle se met à jour sous une heure.

---

## 4. Scénarios d'Acceptation (Gherkin)

```gherkin
# language: fr

Fonctionnalité: Les rencontres de toutes les équipes du club

  Scénario: Le week-end s'annonce dès le vendredi
    Étant donné une rencontre de l'équipe 2 le samedi à 20 h
    Quand un adhérent ouvre l'accueil le vendredi
    Alors la bande « Ce week-end, nos équipes jouent » montre l'équipe 2, samedi à 20 h

  Scénario: Une rencontre sans date ne s'annonce pas sur l'accueil
    Étant donné une rencontre dont seule la semaine est connue
    Quand un adhérent ouvre l'accueil pendant cette semaine
    Alors elle n'apparaît pas dans la bande
    Mais elle figure dans la vue « Interclubs », « semaine du … »

  Scénario: Filtrer par équipe
    Étant donné la vue « Interclubs » du calendrier
    Quand l'adhérent choisit l'équipe 3
    Alors seules les rencontres de l'équipe 3 restent
    Et l'équipe 3 est de nouveau choisie à sa prochaine visite

  Scénario: Ni composition ni championnat non publié
    Étant donné un championnat dont les effectifs ne sont pas publiés
    Quand un adhérent ouvre la vue « Interclubs »
    Alors ses rencontres n'apparaissent pas
    Et aucune rencontre n'affiche de joueur

  Scénario: L'annonce du matin
    Étant donné quatre rencontres datées d'aujourd'hui
    Quand passe l'envoi du matin
    Alors un seul message « 4 équipes du club jouent aujourd'hui » part, qui en nomme trois
    Et un adhérent qui a décoché « Rencontres du club » ne le reçoit pas
```
