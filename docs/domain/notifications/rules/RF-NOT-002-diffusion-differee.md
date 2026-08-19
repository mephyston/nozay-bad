# RF-NOT-002 : Diffusion différée et fiabilisée des notifications

## 1. Description et Objectif Métier

Une notification est mise en file d'attente au moment où elle est décidée, puis envoyée en arrière-plan. L'émetteur — administrateur, événement métier ou rappel programmé — obtient immédiatement une réponse, et une notification qui échoue pour une raison passagère finit tout de même par arriver.

---

## 2. Domaine Fonctionnel

- **Domaine** : notifications
- **Agrégat / Entité clé** : Message (`push_messages`) et ses Livraisons (`push_deliveries`)
- **Statut** : Validé

---

## 3. Définition de la Règle Métier

**Émission sans appel réseau.** Décider d'une notification n'écrit que des lignes en base : un message, et une livraison par appareil ciblé. Un Worker du plan gratuit est plafonné à 50 sous-requêtes par invocation ; une diffusion à l'ensemble du club dépasserait ce seuil et échouerait en cours de route.

**Drain par lots.** Un Cron Trigger passe chaque minute et traite au plus 40 livraisons en attente. Le reliquat est repris au passage suivant. L'administration déclenche en plus un drain immédiat après un envoi manuel, pour ne pas attendre la minute suivante.

**Réessais bornés.** Une erreur temporaire (5xx, réseau) laisse la livraison en attente pour un nouvel essai. Après 3 tentatives infructueuses elle passe en échec définitif : une file qui boucle indéfiniment finirait par masquer les envois récents.

**Ciblages.** `all` vise tous les appareils abonnés. `unpaid` vise les foyers dont la cotisation de la saison active n'est pas soldée — en incluant les emails des représentants légaux, puisqu'un adhérent mineur n'a pas d'adresse au dossier. `emails` vise une liste explicite, utilisée par les événements métier. L'historique conserve l'intention de ciblage, pas sa résolution en liste d'emails.

**Traçabilité.** Un message est enregistré même s'il n'a touché aucun appareil : l'émetteur doit pouvoir constater que personne n'était abonné dans la cible. L'historique est purgé au-delà de 90 jours.

**Événements métier non bloquants.** La notification déclenchée par la validation d'une note de frais ou d'une commande ne peut pas faire échouer l'opération métier : toute erreur est journalisée et absorbée.

**Rappels programmés.** Ils sont désactivés par défaut et protégés par une garde anti-doublon : un rappel de même origine déjà émis dans les 6 derniers jours n'est pas réémis, un Cron Trigger pouvant être invoqué plusieurs fois pour la même échéance.

**Droit d'émission.** Consulter l'historique demande `notifications:read` ; émettre demande `notifications:*`. Le droit d'envoi n'est jamais accordé implicitement : une diffusion part sur tous les téléphones du club et ne peut pas être rappelée.

---

## 4. Scénarios d'Acceptation (Gherkin)

```gherkin
# language: fr

Fonctionnalité: Diffusion différée et fiabilisée des notifications

  Scénario: Annonce du club à tous les abonnés
    Étant donné 3 appareils abonnés répartis sur 2 comptes adhérents
    Quand un administrateur envoie l'actualité "Tournoi interne samedi" à tous les abonnés
    Alors 3 livraisons sont mises en file d'attente
    Et l'envoi effectif est réalisé en arrière-plan

  Scénario: Diffusion dépassant la taille d'un lot
    Étant donné 45 livraisons en attente
    Quand le cron draine la file
    Alors 40 notifications sont envoyées
    Et 5 livraisons restent en attente pour le passage suivant

  Scénario: Échec temporaire du service de push
    Étant donné une livraison en attente
    Quand le service de push répond 503
    Alors la livraison reste en attente avec une tentative comptabilisée
    Et l'abonnement n'est pas supprimé

  Scénario: Abandon après trois échecs
    Étant donné une livraison ayant déjà échoué deux fois
    Quand une troisième tentative échoue
    Alors la livraison passe en échec définitif
    Et elle n'est plus reprise par le cron

  Scénario: Rappel de cotisation ciblant les foyers non soldés
    Étant donné un adhérent mineur non soldé dont le parent "parent@example.com" est abonné
    Et un adhérent soldé également abonné
    Quand le rappel de cotisation est diffusé
    Alors seule une livraison est mise en file, pour le compte du parent
    Et l'historique indique le ciblage "unpaid"

  Scénario: Rappel programmé déclenché deux fois
    Étant donné un rappel de cotisation déjà émis il y a deux jours
    Quand le cron hebdomadaire se déclenche à nouveau
    Alors aucun nouveau message n'est créé

  Scénario: Annonce sans destinataire abonné
    Étant donné qu'aucun adhérent n'a activé les notifications
    Quand un administrateur envoie une actualité
    Alors le message est enregistré dans l'historique
    Et l'administrateur est averti qu'aucun appareil n'a été touché

  Scénario: Note de frais validée
    Étant donné un adhérent dont le foyer est abonné aux notifications
    Quand un administrateur valide sa note de frais de 12,00 €
    Alors une notification "Note de frais validée" est mise en file pour son foyer
    Et la validation de la note de frais aboutit même si la mise en file échoue
```
