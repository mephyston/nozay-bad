# RF-EVT-003 : L'agenda du club dans le calendrier personnel

## 1. Description et Objectif Métier

Un adhérent retrouve ses rendez-vous dans le calendrier qu'il consulte déjà (Google Agenda, Apple Calendrier, Outlook), de deux façons : il **ajoute un rendez-vous** précis, ou il **s'abonne** à l'agenda de son profil, qui suit ensuite les changements.

L'objectif est que personne n'ait à recopier une date, et qu'un parent voie côte à côte son agenda et celui de son enfant.

---

## 2. Domaine Fonctionnel

- **Domaine** : composition dans `apps/api` (events, schedules, teams) ; l'abonnement appartient à members (`calendar_feeds`)
- **Agrégat / Entité clé** : Abonnement, rattaché à la Personne
- **Statut** : Validé

---

## 3. Définition de la Règle Métier

**Un flux par profil.** Chaque profil d'un foyer a sa propre adresse et donne un calendrier distinct. Le parent s'abonne une fois par profil. Un rendez-vous du club figure donc dans chacun des deux flux.

**Ce que contient un flux.** Les rendez-vous publiés et à venir du club, les rencontres d'interclubs de l'adhérent, et seulement les séances de jeu libre où il est inscrit. Les soirées d'indiv n'y figurent pas.

**Une rencontre sans date n'y entre pas.** Tant que ni le capitaine ni le calendrier du comité n'ont fixé son jour, la rencontre reste dans l'application et n'est ni dans le flux ni proposée à l'ajout. Une date connue sans heure occupe la journée.

**Le fuseau est celui du club** (`club_settings.timezone`). Un horaire est converti en instant, changement d'heure compris, et chaque agenda l'affiche dans le fuseau de son propriétaire. Une journée entière reste une date et ne se convertit jamais.

**Un rendez-vous sans fin connue dure deux heures** dans le calendrier.

**L'adresse est secrète et ne s'affiche qu'à sa création.** Seule son empreinte est conservée : une perte se répare en créant une nouvelle adresse, qui révoque l'ancienne. Une révocation ou un changement d'agenda s'applique sous une heure, durée du cache.

**Le contenu est minimal.** Ni adresse électronique, ni licence, ni nom d'un autre adhérent : un titre, des horaires, un lieu et, pour une rencontre, l'alignement du profil.

**L'abonnement survit au renouvellement.** Il est rattaché à la personne. Sans adhésion à la saison du jour, ou avec un dossier annulé, le flux reste valide mais vide, et se remplit de nouveau si la personne se réinscrit.

**Une panne ne vide jamais un agenda.** Si une lecture échoue, le flux répond une erreur et le calendrier garde sa dernière version.

**Ajouter un rendez-vous est une copie.** Elle ne suit pas les changements. L'ajout porte sur tout rendez-vous à venir de l'agenda, que l'adhérent y soit inscrit ou non.

**Le club peut éteindre la fonctionnalité** (`calendar_feed`) : boutons et adresses disparaissent, sans que les abonnements soient supprimés.

---

## 4. Scénarios d'Acceptation (Gherkin)

```gherkin
Fonctionnalité: Agenda du club dans le calendrier personnel

  Scénario: Un horaire respecte le fuseau et le changement d'heure
    Étant donné un club réglé sur le fuseau "Europe/Paris"
    Et un rendez-vous le 14 novembre à 9 h
    Quand le flux est généré
    Alors le rendez-vous commence à 08:00 UTC

  Scénario: Une rencontre sans date n'est pas synchronisée
    Étant donné une rencontre dont seule la semaine est connue
    Quand le flux est généré
    Alors la rencontre n'y figure pas
    Et elle reste visible dans l'application, sans bouton d'ajout

  Scénario: Le jeu libre se limite aux séances où l'adhérent est inscrit
    Étant donné deux séances à venir, dont une où l'adhérent est inscrit
    Quand le flux est généré
    Alors seule cette séance y figure

  Scénario: Une nouvelle adresse révoque la précédente
    Étant donné un adhérent abonné
    Quand il crée une nouvelle adresse
    Alors l'ancienne ne répond plus une fois le cache expiré

  Scénario: Un flux par profil
    Étant donné un parent et son enfant abonnés
    Quand l'enfant s'inscrit à une séance
    Alors la séance figure dans le flux de l'enfant et pas dans celui du parent

  Scénario: L'abonnement survit au renouvellement
    Étant donné un adhérent abonné la saison passée et réinscrit
    Quand la nouvelle saison commence
    Alors la même adresse rend ses rendez-vous, sans nouvel abonnement

  Scénario: Fin d'adhésion
    Étant donné un adhérent abonné et non réinscrit
    Quand la saison se termine
    Alors le flux répond, vide
```
