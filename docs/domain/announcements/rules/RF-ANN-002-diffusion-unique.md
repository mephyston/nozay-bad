# RF-ANN-002 : Diffusion unique aux adhérents

## 1. Description et Objectif Métier

Publier une annonce ne prévient personne : elle attend d'être lue. Le bureau peut vouloir en plus **faire sonner les téléphones** du club. C'est un acte lourd — il atteint tous les adhérents abonnés, immédiatement, et ne se rattrape pas. Cette règle en encadre le déclenchement, le droit requis, et garantit qu'il n'a lieu qu'une fois.

---

## 2. Domaine Fonctionnel

- **Domaine** : announcements
- **Agrégat / Entité clé** : Annonce (`announcements.notified_at`)
- **Statut** : Validé

---

## 3. Définition de la Règle Métier

**Rédiger et diffuser sont deux droits distincts.** `announcements:posts:write` permet de rédiger et publier ; la diffusion exige `notifications:messages:send`, le même droit que l'envoi depuis l'écran Notifications. Un rédacteur sans ce droit ne voit pas la case « Prévenir les adhérents », et un appel forgé est refusé par l'API.

**Seule une annonce publiée peut être diffusée.** Diffuser un brouillon enverrait les adhérents vers une page où ils ne trouveraient rien.

**Une annonce n'est diffusée qu'une fois.** L'horodatage `notified_at` en fait foi : une seconde demande est refusée, et l'action disparaît de l'interface. Sans cette garde, chaque enregistrement du formulaire renotifierait tout le club — le cas se produirait dès la première correction de faute de frappe.

**La diffusion est un acte séparé de l'enregistrement.** La case à cocher du formulaire enchaîne les deux appels par commodité, mais ils restent indépendants : si la diffusion échoue, le texte rédigé est conservé et l'action reste rejouable depuis la liste des annonces.

**Le contenu part en texte brut**, tronqué à 300 caractères sur un mot entier — une notification n'affiche pas de balisage. Elle renvoie vers `/annonces`, seul endroit où l'annonce reste lisible en entier une fois la notification balayée.

**Aucun abonné n'est pas une erreur.** L'annonce est alors marquée comme diffusée sans qu'aucun envoi ne parte.

---

## 4. Scénarios d'Acceptation (Gherkin)

```gherkin
# language: fr

Fonctionnalité: Diffusion d'une annonce aux adhérents

  Scénario: Publier et prévenir en une fois
    Étant donné un membre du bureau détenant le droit d'envoyer une notification
    Et deux adhérents abonnés aux notifications
    Quand il publie une annonce en cochant « Prévenir les adhérents »
    Alors une notification est mise en file pour chaque appareil abonné
    Et son titre est celui de l'annonce
    Et son texte est la version sans mise en forme de l'annonce
    Et elle renvoie vers la page des annonces

  Scénario: Une annonce n'est jamais diffusée deux fois
    Étant donné une annonce déjà diffusée aux adhérents
    Quand un membre du bureau tente de la diffuser à nouveau
    Alors l'opération est refusée
    Et aucune notification supplémentaire n'est mise en file

  Scénario: Modifier une annonce déjà diffusée ne renotifie pas
    Étant donné une annonce publiée et déjà diffusée
    Quand un membre du bureau corrige son texte et enregistre
    Alors aucune notification n'est mise en file
    Et le formulaire indique que l'annonce a déjà été diffusée

  Scénario: Un brouillon ne peut pas être diffusé
    Étant donné une annonce en brouillon
    Quand un membre du bureau tente de la diffuser
    Alors l'opération est refusée

  Scénario: Rédiger ne donne pas le droit de diffuser
    Étant donné un compte détenant le droit de rédiger une annonce mais pas celui d'envoyer une notification
    Quand il ouvre le formulaire d'annonce
    Alors la case « Prévenir les adhérents » n'est pas proposée
    Et une demande de diffusion envoyée directement à l'API est refusée

  Scénario: Diffusion sans aucun abonné
    Étant donné qu'aucun adhérent n'a activé les notifications
    Quand un membre du bureau diffuse une annonce publiée
    Alors aucune notification n'est mise en file
    Et l'annonce est tout de même marquée comme diffusée
```
