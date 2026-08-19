# RF-CMS-002 : Diffusion unique aux adhérents

## 1. Description et Objectif Métier

Publier une actualité ne prévient personne : elle attend d'être lue. Le bureau peut vouloir en plus **faire sonner les téléphones** du club. C'est un acte lourd — il atteint tous les adhérents abonnés, immédiatement, et ne se rattrape pas. Cette règle en encadre le déclenchement, le droit requis, et garantit qu'il n'a lieu qu'une fois.

Elle reprend, sans changement de fond, la règle qui portait sur les annonces avant leur absorption par les actualités.

---

## 2. Domaine Fonctionnel

- **Domaine** : cms
- **Agrégat / Entité clé** : Actualité (`cms_posts.notified_at`)
- **Statut** : Validé

---

## 3. Définition de la Règle Métier

**Rédiger et diffuser sont deux droits distincts.** `cms:posts:write` permet de rédiger et publier ; la diffusion exige `notifications:messages:send`, le même droit que l'envoi depuis l'écran Notifications. Un rédacteur sans ce droit ne voit pas l'action, et un appel forgé est refusé par l'API.

**Seule une actualité publiée peut être diffusée.** Diffuser un brouillon enverrait les adhérents vers un écran où ils ne trouveraient rien.

**Seule une actualité réservée peut être diffusée.** Une actualité publique vit sur le site, où elle se lit sans compte : la pousser sur les téléphones du club en ferait une alerte pour une information de vitrine. C'est la seule règle véritablement nouvelle par rapport aux annonces, dont toutes étaient par nature réservées.

**Une actualité n'est diffusée qu'une fois.** L'horodatage `notified_at` en fait foi : une seconde demande est refusée, et l'action disparaît de l'interface. Sans cette garde, chaque enregistrement du formulaire renotifierait tout le club — le cas se produirait dès la première correction de faute de frappe.

**La diffusion est un acte séparé de l'enregistrement.** Les deux appels restent indépendants : si la diffusion échoue, le texte rédigé est conservé et l'action reste rejouable depuis la liste.

**Le contenu part en texte brut**, tronqué à 300 caractères — une notification n'affiche pas de balisage. Le chapô fait autorité quand il existe : c'est la phrase que la rédaction a choisie pour résumer. À défaut, le corps réduit en texte. La notification renvoie vers `/actualites`, dans l'espace adhérent, seul endroit où une actualité réservée reste lisible en entier une fois la notification balayée.

**Aucun abonné n'est pas une erreur.** L'actualité est alors marquée comme diffusée sans qu'aucun envoi ne parte.

**La catégorie de notification reste `announcement`.** Les adhérents s'y sont désabonnés ou non ; changer l'identifiant réinitialiserait silencieusement leurs préférences. Seul le libellé a suivi le vocabulaire.

---

## 4. Critères d'Acceptation

```gherkin
Fonctionnalité: Diffusion d'une actualité aux adhérents

  Scénario: Diffusion nominale
    Étant donné une actualité publiée, réservée et jamais diffusée
    Et un administrateur porteur de "notifications:messages:send"
    Quand il demande la diffusion
    Alors une notification est mise en file pour chaque appareil abonné
    Et l'actualité porte une date de diffusion

  Scénario: Deuxième demande refusée
    Étant donné une actualité déjà diffusée
    Quand un administrateur demande à nouveau la diffusion
    Alors la demande est refusée
    Et aucune notification n'est mise en file

  Scénario: Une actualité publique n'est pas diffusable
    Étant donné une actualité publiée et publique
    Quand un administrateur demande la diffusion
    Alors la demande est refusée

  Scénario: Un brouillon n'est pas diffusable
    Étant donné une actualité en brouillon et réservée
    Quand un administrateur demande la diffusion
    Alors la demande est refusée

  Scénario: Rédiger ne donne pas le droit de diffuser
    Étant donné un administrateur porteur de "cms:posts:write" seul
    Quand il demande la diffusion d'une actualité réservée et publiée
    Alors la demande est refusée

  Scénario: Aucun abonné
    Étant donné une actualité publiée et réservée, et aucun appareil abonné
    Quand un administrateur demande la diffusion
    Alors aucune notification n'est mise en file
    Et l'actualité est tout de même marquée comme diffusée
```

---

## 5. Points d'Attention

**L'ordre des opérations protège le rédacteur.** L'actualité n'est marquée diffusée qu'**après** la mise en file : si celle-ci échoue, la diffusion reste possible. L'inverse aurait rendu l'actualité indiffusable après un échec réseau.

**La confirmation est délibérément explicite.** L'API refuse un second envoi, mais un adhérent réveillé pour rien ne se dé-réveille pas : l'écran nomme l'acte et son caractère définitif avant de l'exécuter.
