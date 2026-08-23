# Domaine Métier : Créneaux et Jeu libre (Schedules)

Le domaine **Créneaux** porte les **faits d'occupation des gymnases** : la grille hebdomadaire de la saison, les gymnases eux-mêmes, et — depuis août 2026 — les **séances de jeu libre** auxquelles les adhérents s'inscrivent.

Sa raison d'être est écrite dans son schéma : *un créneau change quand la mairie réattribue un gymnase, pas quand quelqu'un modifie une page*. Ce sont des faits du club, que le site et l'espace adhérent se contentent d'afficher.

Il ne faut pas le confondre avec deux voisins :

- l'**Agenda** (`events`) porte les rendez-vous **annoncés** du club — compétitions, stages, animations. Un événement existe même sans inscrit ; une séance de jeu libre n'existe que si assez de monde s'inscrit et qu'un bénévole vient ouvrir ;
- le **CMS** publie les pages du site. Le bloc `schedule` d'une page ne porte **qu'une requête**, jamais des lignes.

Le domaine est **feuille** : il ne dépend d'aucun autre. Il ne connaît donc pas les adhérents — il enregistre l'identité qu'on lui présente, et c'est l'application appelante qui garantit qu'elle vient d'une session authentifiée. C'est aussi ce qui permet au refus « vous n'êtes pas ouvreur » d'être rendu **par le handler** plutôt que par un écran contournable.

---

## Dictionnaire de Données & Glossaire Métier

| Terme Métier | Définition & Contexte | Type / Exemple |
|---|---|---|
| **Gymnase** | Salle où le club joue, avec son adresse. Sert aussi aux données structurées du site. | `Entity` (`venues`) |
| **Créneau** | Horaire **hebdomadaire** de la saison, qui revient chaque semaine. Ne porte aucune date. | `Aggregate` (`schedule_slots`) |
| **Public** | Groupe visé par un créneau : minibad, jeunes, adultes loisirs… dont **jeu libre**. | `audience` |
| **Séance de jeu libre** | **Occurrence datée** : « le samedi 21 mars, de 14 h à 17 h, à Pierre-Dupuis ». Créée à la main, ou générée depuis un créneau récurrent. | `Aggregate` (`open_play_sessions`) |
| **Seuil d'ouverture** | Nombre de **joueurs** — pas de licences — en dessous duquel le club ne mobilise pas de bénévole. Porté par la séance, et figé au moment de la décision. | `min_players` (défaut `4`) |
| **Joueurs attendus** | Inscrits **et** invités. Le seul chiffre qui décide de l'ouverture. | `playerCount` |
| **À pourvoir** | Le seuil est atteint et personne ne s'est déclaré ouvreur. **État dérivé**, jamais stocké. | `needsOpener` |
| **Ouvreur** | Détenteur de badge désigné par le bureau, qui s'engage à ouvrir le gymnase. | `Entity` (`open_play_openers`) |
| **Séance confirmée** | Un ouvreur s'est engagé. Équivaut exactement à « `opener_licence` n'est pas nul ». | `status = 'confirmed'` |
| **Séance annulée** | Retirée du jeu, **avec son motif** — que l'adhérent inscrit doit pouvoir lire. Reste visible, barrée. | `status = 'cancelled'` |
| **Inscription** | Engagement d'un adhérent à venir, avec les personnes qu'il amène. | `Entity` (`open_play_registrations`) |
| **Invité** | Personne **nommée** qu'un adhérent amène. N'existe que rattachée à son hôte, et compte dans le seuil. | `Entity` (`open_play_guests`) |
| **Liste d'appel** | La liste nominative des inscrits et de leurs invités. Lecture réservée à l'administration. | `schedules:registrations:read` |

---

## Ce que le domaine ne fait pas

- **Il ne connaît pas les adhérents.** `member_id` désigne une *adhésion* (`memberships.id`), sans clé étrangère, conformément à l'[ADR-0006](../../architecture/ADR-0006-personne-et-adhesion.md) ; l'ouvreur est désigné par sa **licence**, clé naturelle stable. Prénom et nom sont **recopiés** là où ils constituent une trace (qui s'était inscrit, qui a ouvert), et **jamais** dans la liste courante des ouvreurs, où ils divergeraient.
- **Il ne notifie personne.** Le domaine est feuille : la composition avec `members` et `notifications` se fait dans `apps/api`.
- **Il ne plafonne pas les places.** Il n'y a qu'un seuil bas. Une jauge imposerait une course à l'inscription, une liste d'attente et un repêchage, pour un problème que le club n'a pas.

---

## Règles Fonctionnelles

| Règle | Objet |
|---|---|
| [RF-SCH-001](./rules/RF-SCH-001-seances-de-jeu-libre.md) | Ouverture d'une séance de jeu libre |
| [RF-SCH-002](./rules/RF-SCH-002-inscription-a-une-seance.md) | Inscription d'un adhérent |
| [RF-SCH-003](./rules/RF-SCH-003-invites-nommes.md) | Invités nommés |
| [RF-SCH-004](./rules/RF-SCH-004-benevole-ouvreur.md) | Ouvreurs désignés et confirmation d'une séance |
| [RF-SCH-005](./rules/RF-SCH-005-alerte-des-ouvreurs.md) | Alerte « créneau à pourvoir » |
