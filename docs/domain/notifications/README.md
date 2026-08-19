# Domaine Métier : Notifications (Push)

Le domaine **Notifications** gère l'envoi de notifications push aux adhérents sur leur téléphone : actualités du club diffusées depuis l'administration, retours automatiques sur leurs demandes (note de frais, commande boutique) et rappels programmés.

Il porte la **diffusion**, jamais le contenu durable : une notification est un événement éphémère, dont l'historique est purgé à 90 jours. Les communications écrites du club, elles, vivent dans le domaine [CMS](../cms/README.md), qui appelle celui-ci en sortie pour prévenir les adhérents d'une publication.

Il ne dépend d'aucun autre domaine. Les ciblages qui reposent sur des données adhérents — « cotisation non soldée », « les contacts de tel adhérent » — sont résolus par l'appelant, qui transmet une liste d'emails. Cette contrainte évite le cycle `members → accounting → expenses → notifications`.

---

## Dictionnaire de Données & Glossaire Métier

| Terme Métier | Définition & Contexte | Type / Exemple |
|---|---|---|
| **Abonnement** | Autorisation donnée par un adhérent depuis un appareil précis. Un même compte peut en avoir plusieurs (téléphone, tablette). | `Entity` (`email`, `endpoint`, `p256dh`, `auth`) |
| **Compte** | Identifié par l'**email du foyer**, jamais par `members.id` : les identifiants d'adhérent sont liés à une saison et changent à chaque import de licences. | `string` (email normalisé en minuscules) |
| **Endpoint** | URL fournie par le service de push du navigateur (Apple, Google, Mozilla). Identifie l'appareil de façon unique. | `string` (https) |
| **Message** | Contenu diffusé : titre, corps, page à ouvrir, ciblage. Conservé 90 jours comme historique. | `Aggregate` (`title`, `body`, `url`, `target`, `source`) |
| **Livraison** | Un message destiné à un appareil. Une ligne par couple (message, abonnement). | `Entity` (`status`, `attempts`, `lastError`) |
| **File d'envoi (outbox)** | Ensemble des livraisons `pending`. Drainée par lots par un Cron Trigger. | `push_deliveries` |
| **Ciblage** | `all` (tous les abonnés), `unpaid` (foyers dont la cotisation reste due), `groups` (types d'adhésion), `emails` (liste explicite). | `Enum` |
| **Groupe** | Type d'adhésion issu de l'import Poona (« Loisirs 1 (Lundi) », « Compétiteurs adultes »…). Lu en base, jamais figé dans le code. | `members.type` |
| **Catégorie** | Sujet réglable par l'adhérent : `announcement`, `birthday`, `expense`, `order`, `reminder`, `interclubs`. | `Enum` |
| **Préférence** | Écart au défaut pour une catégorie. L'absence de ligne vaut « activé ». | `push_preferences` |
| **Origine (`source`)** | `admin` pour un envoi manuel, sinon l'événement ou la récurrence déclencheuse (`expense:approved`, `order:rejected`, `reminder:unpaid`, `birthday:daily`, `teams:lineup`, `teams:ranking-reminder:…`, `teams:lineup-reminder:…`, `teams:value-overflow:…`, `teams:day-control`). Sert aussi de clé de dédup (`skipIfSentSince`). | `string` |
| **Registre des notifications automatiques** | Vue déclarative de tout ce qui part sans envoi manuel — récurrences du cron (avec leur drapeau d'activation) et notifications événementielles. Affiché en consultation seule dans l'admin ; il n'existe aucune table de planification, les envois sont câblés dans le code. | `apps/api/src/scheduled-registry.ts`, `GET /notifications/scheduled` |
| **VAPID** | Paire de clés identifiant le serveur auprès des services de push (RFC 8292). Une paire par environnement. | `publicKey` / `privateKey` |

---

## Règles Fonctionnelles du Domaine

- [RF-NOT-001 : Abonnement d'un appareil aux notifications](./rules/RF-NOT-001-abonnement-appareil.md)
- [RF-NOT-002 : Diffusion différée et fiabilisée des notifications](./rules/RF-NOT-002-diffusion-differee.md)
- [RF-NOT-003 : Catégories réglables par l'adhérent](./rules/RF-NOT-003-categories-reglables.md)

---

## Contraintes techniques structurantes

### iOS impose l'installation de la PWA

Safari n'expose `Notification` et `PushManager` que si l'application a été ajoutée à l'écran d'accueil. Un adhérent sur iPhone qui consulte le site dans un onglet classique ne peut pas s'abonner : l'écran « Mon compte » lui affiche la marche à suivre au lieu d'un bouton inopérant. C'est aussi la raison pour laquelle la bannière d'installation est montée dans le storefront.

### Chiffrement `aes128gcm` uniquement

Le contenu est chiffré selon la RFC 8291 (`libs/shared/push`). L'ancien schéma `aesgcm` (draft-04) n'est pas implémenté : le service de push d'Apple, seul chemin vers iOS, ne l'accepte pas. L'implémentation est vérifiée contre le vecteur de test de l'annexe A de la RFC.

### Envoi différé, jamais dans la requête

Un Worker du plan gratuit est plafonné à 50 sous-requêtes par invocation. Une diffusion à tout le club dépasserait ce seuil. L'émission n'écrit donc que des lignes en base ; un Cron Trigger (`* * * * *`) draine la file par lots de 40 et gère les réessais. L'administration déclenche en plus un drain immédiat après un envoi pour ne pas attendre la minute suivante.

---

## Mise en service

Une paire de clés VAPID par environnement. La clé **publique** est versionnée à deux endroits qui doivent rester cohérents ; la clé **privée** n'est jamais versionnée.

| Élément | Emplacement | Nature |
|---|---|---|
| Clé publique (Worker) | `vars.VAPID_PUBLIC_KEY` dans `apps/api/wrangler.json`, par environnement | versionnée |
| Clé publique (client) | `PUBLIC_VAPID_PUBLIC_KEY` dans l'étape « Build Storefront » de `.github/workflows/deploy.yml` | versionnée |
| Clé privée | secret du Worker `nba-api` / `nba-api-staging` | jamais versionnée |

**Si les deux clés publiques divergent, ou si la privée ne correspond pas, les envois sont rejetés par le service de push.**

Pour (re)générer une paire :

```bash
npm run gen:vapid-keys
```

puis poser la clé privée sur le Worker (ajouter `--env staging` pour l'environnement de test) :

```bash
npx wrangler secret put VAPID_PRIVATE_KEY --config apps/api/wrangler.json
```

et reporter la clé publique dans les deux emplacements versionnés ci-dessus.

> Changer les clés d'un environnement déjà en service invalide tous les abonnements existants : chaque appareil devra être réabonné. Une rotation se fait donc en connaissance de cause.

Tant que la clé privée n'est pas posée, le bouton d'activation reste masqué côté adhérent et le drain journalise une erreur de configuration : rien n'est cassé, la fonctionnalité est simplement inactive.

Les envois automatiques sont désactivés par défaut, pour que rien ne parte du seul fait d'un déploiement. Pour les activer, passer à `"true"` dans `apps/api/wrangler.json` :

| Var | Effet | Cron |
|---|---|---|
| `PUSH_REMINDERS_ENABLED` | Relance des cotisations non soldées | lundi 8h UTC |
| `PUSH_BIRTHDAYS_ENABLED` | Annonce des anniversaires du jour | tous les jours 7h UTC |

⚠️ Les expressions cron de `wrangler.json` doivent rester identiques aux constantes de `apps/api/src/scheduled.ts` (`DISPATCH_CRON`, `DAILY_CRON`, `WEEKLY_CRON`) : le handler distingue le déclencheur par `event.cron`. Une divergence rendrait les rappels et la purge silencieusement inopérants, pendant que le drain continuerait de tourner.
