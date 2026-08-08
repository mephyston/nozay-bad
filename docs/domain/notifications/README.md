# Domaine Métier : Notifications (Push)

Le domaine **Notifications** gère l'envoi de notifications push aux adhérents sur leur téléphone : annonces du club diffusées depuis l'administration, retours automatiques sur leurs demandes (note de frais, commande boutique) et rappels programmés.

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
| **Ciblage** | `all` (tous les abonnés), `unpaid` (foyers dont la cotisation reste due), `emails` (liste explicite). | `Enum` |
| **Origine (`source`)** | `admin` pour un envoi manuel, sinon l'événement déclencheur (`expense:approved`, `order:rejected`, `reminder:unpaid`). | `string` |
| **VAPID** | Paire de clés identifiant le serveur auprès des services de push (RFC 8292). Une paire par environnement. | `publicKey` / `privateKey` |

---

## Règles Fonctionnelles du Domaine

- [RF-NOT-001 : Abonnement d'un appareil aux notifications](./rules/RF-NOT-001-abonnement-appareil.md)
- [RF-NOT-002 : Diffusion différée et fiabilisée des notifications](./rules/RF-NOT-002-diffusion-differee.md)

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

Les rappels de cotisation sont désactivés par défaut. Pour les activer, passer la var `PUSH_REMINDERS_ENABLED` à `"true"` dans `apps/api/wrangler.json`.
