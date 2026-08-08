# Domaine Métier : Annonces

Le domaine **Annonces** porte les communications écrites du club : un titre, un texte mis en forme, et un cycle de vie brouillon → publiée. Les annonces publiées s'affichent sur l'accueil de l'espace adhérent (les 3 dernières) et sur la page d'historique `/annonces`.

Il ne porte **pas** la diffusion. Prévenir les adhérents relève du domaine [Notifications](../notifications/README.md), que ce domaine appelle en sortie — jamais l'inverse. C'est la distinction structurante : une annonce est un **contenu durable**, une notification est un **événement éphémère**. Un adhérent qui n'a pas activé les notifications, ou qui a balayé la notification, retrouve l'information ; c'est précisément ce que l'écran Notifications seul ne permettait pas, son historique technique étant purgé à 90 jours.

Aucune dépendance à `members` : le ciblage « tous les abonnés » est résolu à l'intérieur du contexte notifications, qui reste un contexte feuille.

---

## Dictionnaire de Données & Glossaire Métier

| Terme Métier | Définition & Contexte | Type / Exemple |
|---|---|---|
| **Annonce** | Communication écrite du bureau, conservée sans limite de durée. | `Aggregate` (`title`, `bodyHtml`, `status`) |
| **Brouillon** | Annonce rédigée mais invisible des adhérents. Statut par défaut à la création. | `status = 'draft'` |
| **Publiée** | Annonce visible dans l'espace adhérent. | `status = 'published'` |
| **Date de publication** | Date du premier passage à « publiée ». Porte l'ordre d'affichage, et **ne change plus ensuite**. | `published_at` (nullable) |
| **Diffusion** | Envoi unique de l'annonce en notification push à tous les abonnés. | `notified_at` (nullable) |
| **Texte riche restreint** | HTML limité à `p, br, strong, em, u, a, ul, ol, li`. Tout le reste est retiré à l'écriture. | `body_html` |
| **Rédacteur** | Adresse du compte d'administration ayant créé l'annonce. Information, jamais un droit. | `author_email` |

---

## Règles Fonctionnelles du Domaine

- [RF-ANN-001 : Cycle de vie d'une annonce](./rules/RF-ANN-001-cycle-de-vie-d-une-annonce.md)
- [RF-ANN-002 : Diffusion unique aux adhérents](./rules/RF-ANN-002-diffusion-unique.md)
- [RF-ANN-003 : Texte riche restreint](./rules/RF-ANN-003-texte-riche-restreint.md)

---

## Où vit quoi

| Sujet | Chemin |
|---|---|
| Table et types | `libs/domains/announcements/shared/schema.ts` |
| Assainissement du texte riche | `libs/domains/announcements/shared/rich-text.ts` |
| Primitives d'échappement | `libs/domains/announcements/shared/html-entities.ts` |
| Tranches (lecture, création, modification, suppression, diffusion) | `libs/domains/announcements/<tranche>/` |
| Composants d'administration | `libs/domains/announcements/list-announcements/ui/` |
| Éditeur de texte riche (design system) | `libs/shared/ui/src/components/patterns/RichTextEditor.svelte` |
| Écran d'administration | `apps/admin/src/pages/admin/announcements.astro` |
| Historique adhérent | `apps/storefront/src/pages/annonces.astro` |
| Lecture côté storefront | `apps/storefront/src/lib/announcements.ts` |
| Permissions et rôles | `libs/domains/iam/shared/{permissions,catalog,roles}.ts` |
| Table de routes | `apps/api/src/authz/route-permissions.ts` |

---

## Contraintes techniques structurantes

### L'API assainit, l'éditeur ne fait que suggérer

Le texte arrive d'un `contenteditable` du navigateur : une source qui n'est jamais digne de foi, quel que soit le soin apporté à l'interface. `sanitizeRichText` s'exécute donc dans le handler, à l'écriture, et réduit le contenu à une liste blanche de balises. L'éditeur applique le même traitement au collage, mais pour le confort du rédacteur — pas comme contrôle de sécurité.

L'analyse se fait par balayage de chaîne et non via `DOMParser` : le code tourne dans un Worker Cloudflare, qui n'a pas de DOM. Le saut des sous-arbres dangereux (`script`, `style`, `svg`…) a lieu **pendant** ce balayage, et non par un remplacement préalable : un `<script>` apparaissant dans une valeur d'attribut (`<a href="data:text/html,<script>">`) tronquerait sinon tout le reste du document, là où un navigateur lit simplement un attribut contenant du texte.

C'est aussi la raison pour laquelle `AnnouncementCard.svelte` peut utiliser `{@html}` : c'est le seul endroit de l'application où du HTML rédigé est réinjecté, et son contenu a été réduit avant d'atteindre la base.

### `document.execCommand`, déprécié mais retenu

L'éditeur pilote la mise en forme par `document.execCommand`. L'API est officiellement dépréciée, mais reste le seul chemin universellement supporté sans dépendance : les alternatives (ProseMirror, Tiptap) pèsent plus lourd que tout le reste de l'écran, pour six boutons. Le balisage de présentation qu'elle émet encore (`<b>`, `<i>`, `<div>`) est ramené au balisage sémantique par l'assainisseur.

### Rédiger et diffuser sont deux droits

`announcements:posts:write` permet de rédiger et publier. Faire sonner tous les téléphones du club relève de `notifications:messages:send`, le même droit que l'envoi d'une notification depuis l'écran Notifications. Les deux actes passent donc par deux routes distinctes (`POST /announcements` et `POST /announcements/:id/notify`), la table de routes de l'API restant l'unique autorité.

Conséquence assumée : l'enregistrement et la diffusion ne sont pas atomiques. La diffusion est idempotente (`notified_at`) et reste rejouable depuis la liste ; en cas d'échec du second appel, le texte rédigé n'est jamais perdu.

### Le storefront ne peut pas lire un brouillon

`GET /announcements` est ouverte au storefront (`service: true`), qui appelle l'API sans identité ni permission. La route force donc `status = 'published'` dès que l'appelant est `storefront`, quelle que soit la requête reçue. La contrainte est posée côté API et non côté appelant : l'oubli d'un `?status=published` dans une page ne doit rien pouvoir divulguer.

### La date de publication ne se réécrit pas

`published_at` est posée au premier passage à « publiée » et ne bouge plus. Repasser une annonce en brouillon puis la republier ne la fait donc pas remonter en tête de l'accueil — sans quoi une correction de faute de frappe suffirait à repousser les autres annonces hors des trois dernières.
