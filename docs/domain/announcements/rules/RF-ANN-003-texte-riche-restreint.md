# RF-ANN-003 : Texte riche restreint

## 1. Description et Objectif Métier

Une annonce doit pouvoir être mise en forme — mettre une date en gras, énumérer des tarifs, renvoyer vers la boutique — sans demander au bureau d'écrire du HTML ni du Markdown. Le texte rédigé est ensuite réaffiché tel quel dans l'espace adhérent, ce qui en fait le seul contenu de l'application où du balisage saisi par un utilisateur est réinjecté dans une page. Cette règle définit ce qui est conservé, et qui en décide.

---

## 2. Domaine Fonctionnel

- **Domaine** : announcements
- **Agrégat / Entité clé** : Annonce (`announcements.body_html`)
- **Statut** : Validé

---

## 3. Définition de la Règle Métier

**Seules ces balises sont conservées** : `p`, `br`, `strong`, `em`, `u`, `a`, `ul`, `ol`, `li`. Elles couvrent gras, italique, souligné, lien, listes à puces et numérotées.

**L'API fait autorité.** L'assainissement s'exécute dans le handler, à l'écriture. L'éditeur applique le même traitement, mais pour le confort du rédacteur : le contenu vient d'un `contenteditable` du navigateur, donc d'une source qui n'est jamais digne de foi.

**Une balise inconnue est déballée, pas supprimée** : son contenu textuel est conservé. Coller depuis un traitement de texte donne ainsi le texte, débarrassé de ses `<span style>`, plutôt qu'un contenu vide.

**Le contenu des balises dangereuses disparaît avec elles** (`script`, `style`, `iframe`, `noscript`, `template`, `svg`, `math`). Les déballer recracherait leur code en texte visible, ou laisserait passer des fragments réinterprétables.

**Aucun attribut n'est conservé**, sauf `href` sur un lien. Les gestionnaires d'événements (`onclick`, `onmouseover`…) disparaissent donc par construction, sans qu'il soit besoin de les énumérer.

**Un lien n'est accepté que sur liste blanche de schémas** : `https:`, `http:`, `mailto:`, ou un chemin relatif commençant par `/`. Les URL protocole-relatives (`//domaine-tiers`) sont refusées. La valeur est décodée de ses entités et dépouillée de ses caractères de contrôle **avant** d'être jugée : `java&#115;cript:` et un `javascript:` coupé par un saut de ligne sont des `javascript:`. Un lien refusé perd sa balise mais conserve son libellé.

**Un texte que l'assainissement vide de tout contenu visible est refusé** à l'enregistrement : publier un cadre vide ne rend service à personne.

---

## 4. Scénarios d'Acceptation (Gherkin)

```gherkin
# language: fr

Fonctionnalité: Texte riche restreint d'une annonce

  Scénario: La mise en forme autorisée est conservée
    Étant donné un texte contenant du gras, de l'italique, du souligné et une liste à puces
    Quand l'annonce est enregistrée
    Alors la mise en forme est conservée telle quelle

  Scénario: Le balisage dangereux est retiré avec son contenu
    Étant donné un texte contenant « <p>Avant</p><script>alert(1)</script><p>Après</p> »
    Quand l'annonce est enregistrée
    Alors le texte conservé est « <p>Avant</p><p>Après</p> »

  Scénario: Un gestionnaire d'événement est retiré
    Étant donné un texte contenant « <p onclick="alert(1)">Texte</p> »
    Quand l'annonce est enregistrée
    Alors le texte conservé est « <p>Texte</p> »

  Scénario: Une balise inconnue est déballée en gardant son texte
    Étant donné un texte contenant « <span style="color:red">Rouge</span> »
    Quand l'annonce est enregistrée
    Alors le texte conservé est « Rouge »

  Scénario: Un lien à schéma refusé perd son lien mais garde son libellé
    Étant donné un texte contenant un lien vers « javascript:alert(1) » libellé « Cliquez »
    Quand l'annonce est enregistrée
    Alors le texte conservé est « Cliquez »

  Scénario: Un schéma dissimulé par une entité est démasqué
    Étant donné un texte contenant un lien vers « java&#115;cript:alert(1) »
    Quand l'annonce est enregistrée
    Alors le lien est retiré

  Scénario: Un lien légitime est conservé
    Étant donné un texte contenant un lien vers « /boutique »
    Quand l'annonce est enregistrée
    Alors le lien est conservé

  Scénario: Le collage depuis un traitement de texte est ramené au texte
    Étant donné un membre du bureau qui colle du contenu mis en forme depuis un traitement de texte
    Quand le collage a lieu dans l'éditeur
    Alors seul le texte est inséré, sans police ni couleur d'origine
```
