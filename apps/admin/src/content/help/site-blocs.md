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
| Poser deux ou trois contenus côte à côte | **Colonnes** |
| Ouvrir la page par une grande accroche | **Accroche** |
| Proposer des raccourcis ou afficher des partenaires | **Grille de liens** |
| Ouvrir par un grand bandeau d'images qui défilent | **Carrousel** |
| Montrer plusieurs photos | **Galerie** |
| Mettre un PDF en téléchargement | **Document** |
| Afficher les horaires d'entraînement | **Créneaux** |
| Montrer les prochaines séances de jeu libre, leurs inscrits et leur ouvreur | **Jeu libre** |
| Reprendre les dernières actualités | **Actualités** |
| Intégrer une vidéo ou un agenda extérieur | **Intégration** |
| Présenter le bureau ou les encadrants | **Personnes** *(pas encore affiché)* |

> [!WARNING]
> Le bloc **Personnes** peut être ajouté et enregistré, mais **ne produit encore rien sur le site public** : son rendu n'est pas écrit. Ne l'utilisez pas sur une page en ligne, vous obtiendriez un trou dans la mise en page. En attendant, présentez le bureau avec un bloc **Texte**.

---

## Texte

Le bloc de base : des paragraphes, des listes et des liens. C'est celui qui porte la prose d'une page.

**La barre d'outils** propose, dans l'ordre : **titre de section**, **sous-titre**, puis **gras**, *italique*, souligné, liste à puces, liste numérotée, insérer un lien, retirer un lien.

### Les titres à l'intérieur d'un texte

Deux niveaux sont disponibles, et c'est volontaire :

- **Titre de section** — le niveau le plus fort dont vous disposez. Il découpe la page en grandes parties.
- **Sous-titre** — un cran en dessous, pour subdiviser une section.

Placez le curseur dans la ligne à transformer et cliquez le bouton ; le bouton reste enfoncé tant que le curseur est dans un titre. **Recliquer dessus rend la ligne à un paragraphe ordinaire** — c'est ainsi qu'on défait un titre posé par mégarde.

> [!NOTE]
> Il n'y a pas de troisième niveau plus fort, et il n'y en aura pas : le **titre de la page** occupe déjà ce rang. Deux grands titres concurrents sur une même page brouillent la lecture, et les moteurs de recherche comme les lecteurs d'écran s'appuient sur cette hiérarchie pour comprendre la structure. C'est aussi pourquoi l'éditeur ne propose pas de « taille de police » libre : ce qui compte n'est pas qu'un texte soit gros, c'est qu'il soit **un titre**.

Pour un lien, sélectionnez d'abord le texte à transformer, puis cliquez sur l'icône de chaîne. Les adresses acceptées commencent par `https://`, `http://`, `mailto:` ou `/` (une page du site, par exemple `/inscription/`).

> [!TIP]
> Vous pouvez coller depuis un traitement de texte ou un courriel : **seul le texte est repris**, sans les polices ni les couleurs d'origine. Vous remettez ensuite la mise en forme voulue avec la barre d'outils. C'est ce qui évite les pages bariolées de l'ancien site.

Quelques points à connaître :

- Le **titre de la page** est déjà affiché au-dessus : ne le répétez pas dans le texte.
- Un bloc **Texte vide est refusé** à l'enregistrement. Il occuperait une place dans la page sans que personne comprenne pourquoi elle « saute ».
- Les tableaux et les images à l'intérieur d'un texte sont **conservés** lorsqu'ils existent — c'est le cas des pages reprises de WordPress — mais la barre d'outils ne permet pas d'en créer. Pour des photos, utilisez un bloc **Galerie** ; pour un PDF, un bloc **Document**.
- Les images d'un texte doivent pointer la [médiathèque](/admin/help/site-mediatheque). Une image hébergée ailleurs est retirée à l'enregistrement — c'est ce qui écarte d'un geste les pixels de suivi et les images qui disparaissent le jour où le site voisin ferme.

---

## Colonnes

Deux ou trois contenus **côte à côte** sur ordinateur, **empilés** sur téléphone. C'est le bloc qui remplace les tableaux de mise en page de l'ancien site, dont les colonnes restaient côte à côte jusque sur un écran de téléphone — et rendaient ces pages illisibles.

| Réglage | Ce qu'il fait |
|---|---|
| **Titre** | Facultatif, affiché au-dessus de l'ensemble des colonnes |
| **Largeur des colonnes** | À **deux colonnes seulement** : égales, première large, ou dernière large. Une colonne large occupe les deux tiers, l'autre le tiers restant |
| **Contenu de la colonne** | Texte, ou l'un des blocs listés ci-dessous |
| **Ajouter / Retirer une colonne** | Deux au minimum, trois au maximum |

### Ce qu'une colonne peut contenir

- **Texte** — une image facultative *au-dessus*, puis des paragraphes. C'est le choix par défaut.
- **Actualités**, **Agenda**, **Créneaux**, **Jeu libre**, **Galerie**, **Document**, **Grille de liens** — le bloc s'y règle exactement comme au premier niveau.

Les autres blocs ne sont pas proposés : **Accroche** et **Carrousel** ont besoin de toute la largeur de la page, et un bloc **Colonnes** ne s'imbrique pas dans un autre.

### La disposition de la page d'accueil

Pour afficher les actualités sur deux tiers de la page et l'agenda sur le dernier tiers :

1. Ajoutez un bloc **Colonnes** — il arrive avec deux colonnes de texte.
2. **Largeur des colonnes** : « Première colonne large (deux tiers) ».
3. **Colonne 1**, contenu : « Actualités ». Réglez le nombre et la catégorie.
4. **Colonne 2**, contenu : « Agenda ». Réglez le nombre et les catégories.

Sur téléphone, les actualités s'affichent d'abord, l'agenda en dessous.

> [!NOTE]
> Changer le contenu d'une colonne **efface ce qu'elle contenait**. Le texte remplacé reste consultable dans l'historique des révisions de la page.

**Bon à savoir**

- Trois colonnes sont toujours **de largeur égale** : le réglage disparaît dès qu'on ajoute la troisième.
- Une colonne de texte **vide est refusée** à l'enregistrement, comme un bloc **Texte** vide : elle occuperait sa part de la grille et décalerait ses voisines. Une image seule suffit à la remplir.
- Les blocs **Actualités**, **Agenda** et **Créneaux** posés dans une colonne se tiennent à jour tout seuls, exactement comme ailleurs : ils affichent ce qui vient, pas la liste du jour où la page a été composée.

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

## Carrousel

Un **bandeau pleine largeur** : une grande image à la fois, avec un titre, une phrase et un bouton posés **devant** elle, en bas à gauche. Les diapositives se succèdent toutes seules, en fondu enchaîné.

| Champ | Détail |
|---|---|
| **Titre de section** | Facultatif, affiché au-dessus du bandeau |
| **Diapositives** | Douze au maximum, chacune avec une image, un titre, une description et un bouton |

Pour chaque diapositive :

| Champ | Détail |
|---|---|
| **Image** | **Obligatoire**, choisie dans la médiathèque |
| **Titre de la diapositive** | **Obligatoire**, 120 caractères au maximum |
| **Description courte** | Facultative, 240 caractères |
| **Libellé du bouton** + **cible** | Facultatifs, mais l'un ne va pas sans l'autre |

Les commandes **↑**, **↓** et la corbeille, en haut de chaque diapositive, servent à la déplacer dans le bandeau ou à la retirer. L'ordre affiché ici est celui que verra le visiteur.

La cible du bouton se choisit comme dans une **Grille de liens** : une page du site, ou une adresse extérieure. Un bouton dont il manque le libellé ou l'adresse **disparaît à l'enregistrement**, mais la diapositive reste — son image, son titre et sa description valent d'être lus sans lui.

> [!TIP]
> **Ne recadrez pas vos images avant de les déposer.** Le carrousel s'en charge : quelle que soit la forme de l'image d'origine — large, verticale, carrée — toutes les diapositives sortent à la même bande. Deux conseils cependant : un sujet **au centre**, c'est ce que le recadrage conserve ; et une image **pas trop chargée en bas à gauche**, puisque c'est là que se posent le titre et le bouton.

### Ce que voit le visiteur

Le bandeau occupe toute la largeur de la page, sur une hauteur fixe — environ 420 pixels sur téléphone, 520 sur ordinateur. Un voile sombre est appliqué en bas de l'image : sans lui, un titre blanc deviendrait illisible sur une photo claire.

Chaque diapositive reste affichée **six secondes**, puis cède la place à la suivante en fondu. Le défilement **s'arrête dès que la souris survole le bandeau**, et reprend quand elle en sort : c'est ce qui permet de lire tranquillement et de cliquer le bouton. Il s'arrête de même quand on l'atteint au clavier.

En bas du bandeau, deux commandes que vous n'avez rien à régler — elles apparaissent toutes seules :

- Les **pastilles**, à gauche, disent combien il y a de diapositives et laquelle est affichée. On clique l'une d'elles pour y aller directement.
- Le **bouton de pause**, à droite. Contrairement au survol, il arrête durablement : le visiteur qui a besoin de temps le pose, lit, puis relance d'un second clic.

Pour un visiteur qui a demandé à son appareil de limiter les animations, plus rien ne défile tout seul et le fondu disparaît — les pastilles restent, ce sont elles qui lui servent à parcourir les diapositives. Le bouton de pause s'efface alors, n'ayant plus rien à arrêter.

> [!TIP]
> Une seule diapositive est parfaitement valable : vous obtenez une grande image de tête, sans rien qui bouge. Ni pastilles ni bouton de pause ne s'affichent, puisqu'il n'y a rien à parcourir.

> [!NOTE]
> **Carrousel ou Grille de liens ?** Le carrousel quand l'**image** est le sujet et qu'elle mérite toute la largeur — les temps forts de la saison, une accroche en tête de page. La grille quand ce sont les **liens** qui comptent : raccourcis de la page d'accueil, rangée de logos. Une information que tout le monde doit voir n'a pas sa place au-delà de la première diapositive : beaucoup de visiteurs ne verront jamais les suivantes.

---

## Galerie

Plusieurs images de la médiathèque, affichées en grille régulière.

| Champ | Détail |
|---|---|
| **Titre de section** | Facultatif : « Le tournoi 2026 en images » |
| **Images par rangée** | 1, 2, 3 ou 4. **C'est ce réglage qui décide de la taille des images** |
| **Images** | Ajoutées une à une depuis la médiathèque, soixante au maximum |

Le nombre par rangée est le seul réglage de taille, et c'est voulu : une image à qui l'on donnerait « 75 % » rétrécirait *à l'intérieur* de sa case sans réduire la case, laissant un blanc autour d'elle. Quatre par rangée pour des vignettes, une seule pour une image pleine largeur. Sur téléphone, jamais plus de deux — au-delà on ne verrait plus rien.

> [!NOTE]
> **Toutes les cases font la même taille**, quelle que soit la forme des images d'origine. C'est ce qui évite qu'une seule image verticale n'étire toute sa rangée et ne fasse paraître ses voisines démesurées — le défaut que corrige ce réglage.
>
> En revanche, **aucune image n'est rognée** : la case impose sa place, jamais son cadrage. Une image plus verticale ou plus large que sa case s'y pose entière, avec une bande neutre de part et d'autre. Vos affiches et vos logos gardent donc leur haut et leur bas. Les photos prises au téléphone, en 4/3, remplissent la case sans aucune bande.

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

## Jeu libre

Les prochaines séances de jeu libre, avec **qui s'y est inscrit** et **qui ouvre le gymnase**.

| Champ | Détail |
|---|---|
| **Titre de section** | Facultatif : « Jeu libre », « Venez jouer ce week-end » |
| **Nombre affiché** | De 2 à 12 séances, à partir d'aujourd'hui |
| **Afficher le bouton « S'inscrire »** | Coché par défaut. Mène au calendrier de l'espace adhérent, filtré sur le jeu libre |

> [!IMPORTANT]
> Comme le bloc **Créneaux**, celui-ci **n'enregistre aucune séance**. Il affiche celles tenues dans [Jeu libre](/admin/help/creneaux) : ouvrir, annuler ou désigner les ouvreurs se fait là-bas, et toutes les pages suivent.

Pour chaque séance, le visiteur voit la date, l'horaire et le gymnase, puis :

- **l'ouvreur** — « Ouvreur : Robert M. » dès qu'un bénévole s'est engagé, et sinon **« On cherche toujours un ouvreur »** ;
- **le nombre de joueurs**, invités compris, et ce qu'il manque pour atteindre le seuil d'ouverture ;
- **les inscrits**, sous la forme « Camille D. », suivis de « + 2 invités » quand il y en a.

> [!NOTE]
> Le site public est lu par tout le monde et indexé par les moteurs de recherche. C'est pourquoi les inscrits n'y apparaissent que par leur **prénom et l'initiale de leur nom**, et que les **invités ne sont jamais nommés** : ce ne sont pas des adhérents. La liste complète reste réservée à l'espace adhérent et à l'administration. Les consignes de séance (« clé chez Robert ») et le motif d'une annulation ne sont pas affichés non plus : une séance annulée apparaît simplement barrée, « Séance annulée ».

Le bouton **« S'inscrire au jeu libre »** ouvre le calendrier de l'espace adhérent, déjà filtré sur le jeu libre. Un visiteur non connecté passe d'abord par la connexion, puis arrive directement sur ce calendrier : c'est là, et seulement là, qu'on s'inscrit et qu'on annonce ses invités.

Une inscription ou l'engagement d'un ouvreur apparaît sur le site **en moins d'une minute**, sans republier la page. S'il n'y a aucune séance à venir, le bloc affiche « Aucune séance de jeu libre de prévue pour le moment. »

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

## Intégration

Insère une vidéo YouTube, une feuille de calcul ou un agenda Google dans la page.

| Champ | Détail |
|---|---|
| **Service** | YouTube, Google Sheets ou Google Agenda |
| **Identifiant** | L'identifiant de la ressource, **pas son adresse** : dans `youtu.be/T4_qiRVEXcI`, c'est `T4_qiRVEXcI` |
| **Titre** | Obligatoire : un cadre sans titre est incompréhensible pour un lecteur d'écran |
| **Format du cadre** | 16/9 pour une vidéo, 4/3 pour un cadre plus haut, ou une hauteur fixe en pixels |

On n'enregistre jamais une adresse complète, mais un service pris dans une liste fermée et un identifiant. C'est ce qui empêche qu'un écran d'administration devienne un moyen d'insérer n'importe quel contenu extérieur dans le site.

La forme attendue dépend du service : un **jeton** pour YouTube et Sheets (lettres, chiffres, tirets et soulignés, huit caractères au minimum), une **adresse** pour Google Agenda — `monclub@gmail.com`, ou `…@group.calendar.google.com` pour un agenda partagé. Dans les deux cas, coller l'adresse d'intégration complète est refusé, avec un message qui le dit.

**Choisir le format.** Le 16/9 convient à une vidéo. Un **agenda mensuel** ou une grande feuille de calcul y seraient illisibles : prenez une **hauteur fixe**, environ 600 pixels pour un agenda. Le cadre réserve sa place avant de charger, quel que soit le choix — sans quoi le reste de la page sauterait à l'arrivée du contenu.

> [!NOTE]
> La vidéo est servie par **youtube-nocookie.com** : YouTube ne dépose aucun traceur tant que le visiteur n'a pas lancé la lecture. C'est aussi pourquoi la vignette met parfois un instant de plus à apparaître.

> [!TIP]
> Pour une feuille de calcul ou un agenda, vérifiez d'abord qu'ils sont **partagés publiquement** (« Tout utilisateur disposant du lien »). Sinon le cadre s'affiche, mais le visiteur y voit une demande de connexion à Google.

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
