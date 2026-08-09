---
title: "Les blocs de contenu"
description: "Catalogue des blocs disponibles dans une page du site : ce que fait chacun, ses champs et ses limites."
category: "site"
order: 2
---

Une page du site public se compose en empilant des **blocs**. Cet article décrit chacun d'eux : à quoi il sert, ce qu'il demande, et ce que le visiteur voit à l'arrivée. Pour la mécanique de l'éditeur — créer, enregistrer, publier —, voir [Pages du site](/admin/help/site-pages).

## Choisir le bon bloc

| Ce que vous voulez faire | Le bloc |
|---|---|
| Écrire des paragraphes | **Texte** |
| Ouvrir la page par une grande accroche | **Accroche** |
| Proposer des raccourcis ou afficher des partenaires | **Grille de liens** |
| Montrer plusieurs photos | **Galerie** |
| Mettre un PDF en téléchargement | **Document** |
| Afficher les horaires d'entraînement | **Créneaux** |
| Reprendre les dernières actualités | **Actualités** |
| Intégrer une vidéo ou un agenda extérieur | **Intégration** *(pas encore affiché)* |
| Présenter le bureau ou les encadrants | **Personnes** *(pas encore affiché)* |

> [!WARNING]
> Les blocs **Intégration** et **Personnes** peuvent être ajoutés et enregistrés, mais **ne produisent encore rien sur le site public** : leur rendu n'est pas écrit. Ne les utilisez pas sur une page en ligne, vous obtiendriez un trou dans la mise en page. En attendant, présentez le bureau avec un bloc **Texte**.

---

## Texte

Le bloc de base : des paragraphes, des listes et des liens. C'est celui qui porte la prose d'une page.

**La barre d'outils** propose : **gras**, *italique*, souligné, liste à puces, liste numérotée, insérer un lien, retirer un lien.

Pour un lien, sélectionnez d'abord le texte à transformer, puis cliquez sur l'icône de chaîne. Les adresses acceptées commencent par `https://`, `http://`, `mailto:` ou `/` (une page du site, par exemple `/inscription/`).

> [!TIP]
> Vous pouvez coller depuis un traitement de texte ou un courriel : **seul le texte est repris**, sans les polices ni les couleurs d'origine. Vous remettez ensuite la mise en forme voulue avec la barre d'outils. C'est ce qui évite les pages bariolées de l'ancien site.

Quelques points à connaître :

- Le **titre de la page** est déjà affiché au-dessus : ne le répétez pas dans le texte.
- Un bloc **Texte vide est refusé** à l'enregistrement. Il occuperait une place dans la page sans que personne comprenne pourquoi elle « saute ».
- Les titres intermédiaires, les tableaux et les images à l'intérieur d'un texte sont **conservés** lorsqu'ils existent — c'est le cas des pages reprises de WordPress — mais la barre d'outils ne permet pas encore d'en créer. Pour des photos, utilisez un bloc **Galerie** ; pour un PDF, un bloc **Document**.
- Les images d'un texte doivent pointer la [médiathèque](/admin/help/site-mediatheque). Une image hébergée ailleurs est retirée à l'enregistrement — c'est ce qui écarte d'un geste les pixels de suivi et les images qui disparaissent le jour où le site voisin ferme.

---

## Accroche

Le grand bandeau qui ouvre une page : un titre, une phrase, et jusqu'à **quatre boutons**.

| Champ | Détail |
|---|---|
| **Titre** | Obligatoire. 160 caractères au maximum |
| **Sous-titre** | Une phrase, 320 caractères |
| **Boutons** | Un libellé et une adresse par bouton, quatre au maximum |

L'adresse d'un bouton est soit un chemin du site (`/creneaux/`), soit une adresse extérieure complète (`https://…`). Un bouton dont l'adresse n'est pas exploitable **disparaît entièrement** à l'enregistrement : un bouton sans destination n'a pas de sens.

> [!IMPORTANT]
> Placez l'accroche en **premier bloc** de la page. Le titre de l'accroche tient alors lieu de titre principal ; ailleurs dans la page, le titre de la page s'affiche en plus et vous vous retrouvez avec deux grands titres concurrents.

Quatre boutons est un maximum volontaire : au-delà, ce n'est plus une accroche, c'est un menu — utilisez une **Grille de liens**.

---

## Grille de liens

Des cartes cliquables disposées en colonnes. Le même bloc sert deux usages : les raccourcis de la page d'accueil, et une rangée de logos de partenaires.

| Champ | Détail |
|---|---|
| **Titre de section** | Facultatif, affiché au-dessus de la grille |
| **Colonnes** | 2, 3 ou 4. Sur téléphone, tout passe en une seule colonne |
| **Image de fond (bannière)** | Facultative, choisie dans la médiathèque |
| **Boutons** | Jusqu'à 24 entrées, chacune avec un libellé, une cible et une description facultative |

Pour la cible de chaque bouton, choisissez d'abord sa nature :

- **Une page ou actualité du site** — un champ de recherche propose toutes les pages et actualités existantes. C'est la bonne option dans la quasi-totalité des cas : le lien reste juste.
- **Une adresse extérieure** — saisissez l'adresse complète. Elle s'ouvrira dans un nouvel onglet.

> [!NOTE]
> Changer la nature d'un lien **vide l'adresse déjà saisie**. C'est voulu : une adresse extérieure n'est pas un chemin interne, et conserver l'ancienne valeur produirait un lien silencieusement faux.

**Avec une image de fond**, la grille devient une bannière : l'image occupe toute la largeur, un voile sombre est appliqué pour que le texte reste lisible, et les boutons se posent devant. **Sans image**, les cartes s'affichent bordées sur fond neutre — la forme adaptée à des logos ou à une liste de liens.

---

## Galerie

Plusieurs images de la médiathèque, affichées en grille (deux colonnes sur téléphone, trois sur ordinateur).

| Champ | Détail |
|---|---|
| **Titre de section** | Facultatif : « Le tournoi 2026 en images » |
| **Images** | Ajoutées une à une depuis la médiathèque, soixante au maximum |

**Ajouter une image** ouvre la médiathèque filtrée sur les images. Chaque vignette ajoutée porte ses commandes : **↑** et **↓** pour changer sa place dans la grille, **✕** pour la retirer. L'ordre affiché ici est celui que verra le visiteur.

Ajouter deux fois la même image est sans effet : une répétition dans une galerie est toujours une fausse manœuvre.

Si une image a été supprimée de la médiathèque depuis, sa vignette affiche « Image introuvable » avec son numéro — retirez l'entrée. Le site public, lui, l'ignore déjà : une image manquante ne casse jamais la galerie.

---

## Document

Un lien de téléchargement vers un PDF de la médiathèque, présenté en carte cliquable.

| Champ | Détail |
|---|---|
| **Libellé du lien** | Obligatoire. Ce que lit le visiteur : « Télécharger le livret d'accueil » |
| **Document** | Choisi dans la médiathèque, parmi les fichiers qui ne sont pas des images |
| **Description** | Facultative, affichée sous le libellé |

Le bouton **Choisir un document** ouvre la médiathèque filtrée sur les documents. La taille du fichier est affichée à côté du nom une fois le document choisi — un PDF de 8 Mo se télécharge mal en 4G, pensez à l'alléger avant de le déposer.

Si le document venait à être supprimé de la médiathèque, le bloc n'afficherait rien plutôt qu'un lien mort.

---

## Créneaux

Le tableau des horaires d'entraînement, par jour de la semaine.

| Champ | Détail |
|---|---|
| **Titre de section** | Facultatif : « Les créneaux », « Horaires des jeunes » |
| **Publics** | Les groupes à afficher, séparés par des virgules. Vide = tous les créneaux |

> [!IMPORTANT]
> Ce bloc **n'enregistre aucun horaire**. Il affiche ceux tenus à jour dans [Communication → Créneaux](/admin/help/creneaux), pour qu'ils ne soient saisis qu'à un seul endroit. Modifier un horaire là-bas met à jour toutes les pages qui l'affichent.

Le champ **Publics** attend les codes internes des groupes, pas leur libellé :

| À saisir | Groupe affiché |
|---|---|
| `minibad` | Minibad (U9) |
| `poussins` | Poussins (U11) |
| `jeunes` | Jeunes |
| `elite_jeunes` | Élite Jeunes |
| `adultes_loisir` | Adultes loisirs |
| `adultes_competition` | Adultes compétition |
| `jeu_libre` | Jeu libre |

Ainsi, une page « Jeunes » porte `minibad, poussins, jeunes, elite_jeunes`. Un code mal orthographié ne fait pas d'erreur : il ne remonte simplement aucun créneau.

Le visiteur voit un vrai tableau — jour, horaire, groupe, gymnase — lisible par les moteurs de recherche et par un lecteur d'écran, là où l'ancien site enfermait la même information dans une feuille Google invisible. Si aucun créneau ne correspond, le bloc affiche « Les créneaux ne sont pas encore renseignés pour cette saison. »

Les créneaux **masqués** dans l'écran Créneaux n'apparaissent jamais ici.

---

## Actualités

Les dernières actualités du site, en cartes.

| Champ | Détail |
|---|---|
| **Titre de section** | Facultatif : « Actualités du club » |
| **Nombre d'actualités** | 3, 6, 9 ou 12 |
| **Catégorie** | Restreint la liste à une catégorie. « Toutes les catégories » par défaut |
| **Afficher les images de couverture** | Coché par défaut |
| **Afficher le lien « Toutes les actualités »** | Coché par défaut, renvoie vers la page d'archives |

Comme le bloc Créneaux, celui-ci ne fige rien : il interroge les actualités au moment où le visiteur ouvre la page. Une actualité publiée ce matin apparaît d'elle-même sur l'accueil, sans avoir à republier la page.

Seules les actualités **publiées** remontent, de la plus récente à la plus ancienne. S'il n'y en a aucune, le bloc affiche « Aucune actualité pour le moment. »

Choisir une **catégorie** restreint la liste, et fait pointer le lien « Toutes les actualités » vers les archives de cette catégorie. Une page « Jeunes » peut ainsi ne montrer que les actualités des jeunes.

> [!TIP]
> Deux blocs Actualités sur la même page sont possibles — les compétitions d'un côté, la vie du club de l'autre. Donnez un titre de section à chacun, sans quoi le visiteur voit deux grilles sans comprendre ce qui les distingue.

---

## Intégration *(pas encore affiché sur le site)*

Prévu pour insérer une vidéo YouTube, une feuille de calcul ou un agenda Google.

| Champ | Détail |
|---|---|
| **Service** | YouTube, Google Sheets ou Google Agenda |
| **Identifiant** | L'identifiant de la ressource, **pas son adresse** : dans `youtu.be/T4_qiRVEXcI`, c'est `T4_qiRVEXcI` |
| **Titre** | Obligatoire : un cadre sans titre est incompréhensible pour un lecteur d'écran |

On n'enregistre jamais une adresse complète, mais un service pris dans une liste fermée et un identifiant. C'est ce qui empêche qu'un écran d'administration devienne un moyen d'insérer n'importe quel contenu extérieur dans le site.

L'identifiant ne peut contenir que des lettres, des chiffres, des tirets et des soulignés, et compter au moins huit caractères. Une adresse d'agenda Google de la forme `…@gmail.com` est donc refusée en l'état.

Rappel : même correctement rempli, ce bloc **n'affiche rien** sur le site public pour le moment.

---

## Personnes *(pas encore affiché sur le site)*

Prévu pour les cartes de contact : bureau, commissions, encadrants.

| Champ | Détail |
|---|---|
| **Titre de section** | « Le bureau », « Les encadrants » |
| **Nom** et **Fonction** | Une ligne par personne |
| **Adresse électronique** et **Téléphone** | Facultatifs. Une adresse mal formée est effacée à l'enregistrement plutôt que de produire un lien cassé |
| **Responsabilités** | Une par ligne, douze au maximum |

Quarante personnes au maximum par bloc.

> [!CAUTION]
> Publier le téléphone personnel d'un bénévole sur un site public l'expose au démarchage et à la récupération automatisée. Préférez une adresse électronique dédiée à la fonction (`president@…`) plutôt qu'un numéro privé — et demandez son accord à la personne concernée.

Rappel : ce bloc **n'affiche rien** sur le site public pour le moment.

---

## Ce qui est vérifié à l'enregistrement

Tout ce que vous saisissez est contrôlé par le serveur, jamais seulement par le navigateur :

- Les liens dangereux sont refusés — un bouton dont l'adresse ne va nulle part disparaît.
- Le texte riche est nettoyé : scripts, styles et cadres sont retirés ; les images doivent venir de la médiathèque.
- Un bloc refusé fait échouer **tout l'enregistrement**, avec un message indiquant le numéro du bloc en cause. La page n'est jamais enregistrée à moitié.
