# RF-NOT-001 : Abonnement d'un appareil aux notifications

## 1. Description et Objectif Métier

Un adhérent connecté peut autoriser le club à lui envoyer des notifications sur l'appareil qu'il utilise. L'autorisation est donnée appareil par appareil, depuis « Mon compte », et reste révocable à tout moment. Elle permet de prévenir l'adhérent d'une actualité du club ou de l'avancement de ses demandes sans passer par l'email.

---

## 2. Domaine Fonctionnel

- **Domaine** : notifications
- **Agrégat / Entité clé** : Abonnement (`push_subscriptions`)
- **Statut** : Validé

---

## 3. Définition de la Règle Métier

**Identité du compte.** Un abonnement est rattaché à l'**email du foyer**, celui qui porte la session OTP, et non à `members.id`. Les identifiants d'adhérent sont recréés à chaque import de licences : un abonnement lié à un `members.id` serait orphelin dès le changement de saison. L'email est normalisé en minuscules et provient exclusivement de la session signée, jamais du corps de la requête envoyée par le navigateur.

**Unicité par appareil.** L'`endpoint` fourni par le service de push identifie l'appareil. S'il est déjà connu, l'abonnement est réaffecté au compte actuellement connecté plutôt que dupliqué : sur une tablette familiale, les notifications suivent la personne effectivement connectée.

**Périmètre du désabonnement.** La suppression n'agit que sur le couple (endpoint, email). Un compte ne peut pas désabonner l'appareil d'un autre foyer, même en connaissant son endpoint.

**Contrainte iOS.** Safari n'expose l'API de notifications que lorsque l'application a été installée sur l'écran d'accueil. Tant que ce n'est pas le cas, l'écran « Mon compte » affiche la marche à suivre au lieu d'un bouton d'activation qui échouerait.

**Révocation par le service de push.** Lorsqu'un envoi reçoit un 404 ou un 410, l'abonnement est définitivement invalide (application désinstallée, autorisation retirée) : il est supprimé au lieu d'être réessayé.

**Validation de l'endpoint.** Seules les URL `https` de 1 024 caractères au plus sont acceptées : c'est le Worker qui contactera cette adresse.

---

## 4. Scénarios d'Acceptation (Gherkin)

```gherkin
# language: fr

Fonctionnalité: Abonnement d'un appareil aux notifications

  Scénario: Activation depuis un appareil compatible
    Étant donné un adhérent connecté avec l'email "jean.dupont@example.com"
    Et un appareil dont le navigateur autorise les notifications
    Quand l'adhérent active les notifications depuis "Mon compte"
    Alors un abonnement est enregistré pour le compte "jean.dupont@example.com"
    Et l'écran indique que cet appareil reçoit les actualités du club

  Scénario: Appareil déjà abonné par un autre membre du foyer
    Étant donné une tablette déjà abonnée pour le compte "parent1@example.com"
    Quand "parent2@example.com" se connecte sur cette tablette et active les notifications
    Alors l'abonnement existant est réaffecté au compte "parent2@example.com"
    Et il n'existe qu'un seul abonnement pour cet appareil

  Scénario: iPhone dont l'application n'est pas installée
    Étant donné un adhérent connecté depuis Safari sur iPhone, hors écran d'accueil
    Quand il consulte "Mon compte"
    Alors aucun bouton d'activation ne lui est proposé
    Et la marche à suivre pour installer l'application lui est affichée

  Scénario: Tentative de désabonnement d'un appareil tiers
    Étant donné un appareil abonné pour le compte "jean@example.com"
    Quand le compte "intrus@example.com" demande le désabonnement de cet endpoint
    Alors aucun abonnement n'est supprimé

  Scénario: Autorisation retirée depuis les réglages du navigateur
    Étant donné un appareil abonné dont l'utilisateur a désinstallé l'application
    Quand le club lui envoie une notification et que le service de push répond 410
    Alors l'abonnement est supprimé
    Et les envois qui lui étaient destinés ne sont plus réessayés
```
