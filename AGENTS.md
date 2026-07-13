<!-- start: Packmind standards -->
# Packmind Standards

Before starting your work, make sure to review the coding standards relevant to your current task.

Always consult the sections that apply to the technology, framework, or type of contribution you are working on.

All rules and guidelines defined in these standards are mandatory and must be followed consistently.

Failure to follow these standards may lead to inconsistencies, errors, or rework. Treat them as the source of truth for how code should be written, structured, and maintained.

# Standard: AstroJS Development Standards

Standards et bonnes pratiques pour le développement de sites AstroJS modernes, content-driven, avec TypeScript, Content Layer API, Islands Architecture, et performance optimale. Inspiré du guide https... :
* Adopter l’Islands Architecture : rendu serveur par défaut, hydratation sélective.
* Gérer le SEO avec les balises meta, Open Graph, et JSON-LD.
* Optimiser les images avec le composant <Image /> et formats modernes.
* Organiser le contenu avec Content Collections et Content Layer API.
* Préférer le rendu statique (SSG) et n’activer SSR que si nécessaire.
* Structurer le projet par fonctionnalité ou type de contenu.
* Utiliser le composant <ClientRouter /> pour les transitions de vue SPA-like.
* Utiliser les composants .astro pour le contenu statique, importer des composants framework seulement pour l’interactivité.
* Utiliser les directives client (`client:load`, `client:idle`, etc.) uniquement si nécessaire.
* Utiliser TypeScript et générer les types avec `astro sync`.

Full standard is available here for further request: [AstroJS Development Standards](.packmind/standards/astrojs-development-standards.md)

# Standard: Configuration Runtime et Résolution d'URLs

Standard pour gérer la configuration runtime des applications, la résolution intelligente des URLs avec Split Horizon, et l'élimination des valeurs hardcodées. S'applique au backend (TypeBox), fronten... :
* Astro: Distinguer variables SSR (INTERNAL_*) et client-side (PUBLIC_*) avec import.meta.env.SSR pour le routing.
* Backend: Utiliser TypeBox pour validation stricte des variables d'environnement au démarrage avec fail-fast si config invalide.
* Centraliser toutes les URLs de développement par défaut dans un fichier de constantes partagé (ex: DEFAULT_DEV_URLS), jamais de strings hardcodées dispersées dans le code.
* Convention de nommage stricte: PUBLIC_* pour variables exposées au client, INTERNAL_* pour réseau privé, pas de préfixe pour backend uniquement.
* Documenter toutes les variables d'environnement requises dans .env.example avec exemples dev/staging/prod.
* Exporter les constantes de configuration depuis un package partagé (@metacult/shared-core) accessible par tous les modules.
* Implémenter Split Horizon URLs: INTERNAL_* pour réseau privé (S2S, Railway), PUBLIC_* pour réseau public (client browser).
* Limiter les fallbacks aux constantes de développement, jamais de fallbacks silencieux en production.
* Nuxt: Utiliser runtimeConfig pour permettre injection des variables au lancement Docker sans rebuild.
* Valider le protocole des URLs (http:// ou https://) et ajouter automatiquement si manquant selon le contexte (http en dev, https en prod).

Full standard is available here for further request: [Configuration Runtime et Résolution d'URLs](.packmind/standards/configuration-runtime-et-resolution-durls.md)

# Standard: Documentation Fonctionnelle et Métier (DDD)

Standards et bonnes pratiques pour maintenir la documentation fonctionnelle et métier à jour dans le répertoire `docs/domain` en suivant les principes du Domain-Driven Design (DDD). :
* Ajouter des tests d'acceptation : Fournir des scénarios rédigés au format Gherkin (`Etant donné / Quand / Alors`) pour chaque règle fonctionnelle afin de documenter le comportement attendu.
* Documenter les règles fonctionnelles : Créer ou modifier les règles individuelles sous le format `docs/domain/[domaine]/rules/RF-[DOM]-[XXX]-[nom].md` en suivant le gabarit de `docs/domain/rules/RF-000-template.md`.
* Mettre à jour le glossaire : Mettre à jour le dictionnaire de données dans le fichier `docs/domain/[domaine]/README.md` dès que de nouveaux termes ou notions techniques/métier sont introduits.

Full standard is available here for further request: [Documentation Fonctionnelle et Métier (DDD)](.packmind/standards/documentation-fonctionnelle-et-metier-ddd.md)

# Standard: Hono & Cloudflare Workers Development Standards

Standards et bonnes pratiques pour concevoir des APIs Hono légères et performantes déployées sur Cloudflare Workers et intégrées avec les services de stockage (D1, Vectorize) et d'événements (Cloudfla... :
* Authentifier les APIs d'écriture (PUT, POST, DELETE) avec une clé d'API secrète partagée (`CATALOG_API_KEY`) définie dans les secrets ou `.dev.vars` locaux.
* Capturer et journaliser proprement les erreurs à l'aide d'un middleware global Hono `app.onError()`.
* Configurer les variables d'environnement locales de développement dans un fichier `.dev.vars` à la racine de chaque Worker (ne jamais committer de secrets).
* Déclarer les schémas de validation des requêtes (headers, query parameters, body) avec TypeBox pour un typage strict et une validation automatique à l'entrée.
* Publier les traitements asynchrones ou lourds (comme le scraping à la demande) sur Cloudflare Queues (`metacult-events`) pour décharger les requêtes utilisateur.
* Structurer les interactions D1 avec du SQL paramétré ou des ORM légers sécurisés contre les injections SQL.
* Utiliser les Service Bindings (liaisons de services privées) pour faire communiquer les microservices entre eux à latence réseau nulle.

Full standard is available here for further request: [Hono & Cloudflare Workers Development Standards](.packmind/standards/hono-cloudflare-workers-development-standards.md)

# Standard: NX Monorepo Architecture Standards

Ce standard définit l'architecture et les pratiques pour organiser un monorepo NX avec isolation des modules, boundaries enforcement, build optimization et structure en apps/libs. Il couvre l'organisa... :
* Activer le cache NX avec cache: true dans targetDefaults pour optimiser les rebuilds.
* Appliquer le tag system NX pour enforcer les boundaries entre modules.
* Chaque Bounded Context expose un barrel file (index.ts) strict avec API publique uniquement.
* Configurer paths dans tsconfig.base.json pour import aliases clairs et lisibles.
* Configurer project.json avec tags pour chaque lib/app selon son scope et type.
* Documenter l'architecture du monorepo dans AGENTS.md ou ARCHITECTURE.md à la racine.
* Éviter les import circulaires en analysant régulièrement avec nx graph pour détecter les cycles.
* Limiter les dépendances cross-layer avec @nx/enforce-module-boundaries dans eslint config.
* Organiser le monorepo en apps/ (applications déployables) et libs/ (modules réutilisables).
* Organiser les libs backend en Bounded Contexts (DDD) isolés et autonomes.
* Préférer bunx nx run-many -t build pour build parallèle de plusieurs projets.
* Structurer libs/ par couche technique : backend/, shared/, frontend/ pour séparation des responsabilités.
* Utiliser implicitDependencies pour forcer rebuild si fichier racine modifié.
* Utiliser nx affected en CI/CD pour build uniquement les projets modifiés depuis la branche de base.
* Utiliser nx.json pour définir les targetDefaults globaux applicables à tous les projets.

Full standard is available here for further request: [NX Monorepo Architecture Standards](.packmind/standards/nx-monorepo-architecture-standards.md)

# Standard: Vertical Slice Architecture (VSA) Standards

Standards et bonnes pratiques pour organiser le code par tranches verticales (cohérence fonctionnelle) plutôt que par couches techniques (contrôleurs, services, dépôts). :
* Maintenir un couplage faible entre les domaines : un domaine (ex : `search`) ne doit pas accéder directement aux tables de base de données ou au stockage d'un autre domaine (ex : `catalog`). Utiliser des interfaces d'API publiques ou des événements pour communiquer.
* Masquer l'implémentation interne : exposer uniquement les types et les fonctions nécessaires via un fichier d'index public (barrel file `index.ts`) au niveau de la racine de la bibliothèque ou du module.
* Préférer l'injection de dépendances par constructeur (Constructor Injection) et l'utilisation de Factory Functions pour instancier les routes et injecter les liaisons de bases de données ou de services.
* Rédiger des règles fonctionnelles (RF) claires sous `docs/domain/[domaine]/rules/` en parallèle de l'écriture du code de la tranche verticale.
* Regrouper le code par fonctionnalité (Feature Slice) : placer les modèles de base de données, les schémas de validation, les routes Hono, et les composants UI associés au même endroit ou sous le même domaine fonctionnel.

Full standard is available here for further request: [Vertical Slice Architecture (VSA) Standards](.packmind/standards/vertical-slice-architecture-vsa-standards.md)

# Standard: Web Performance - Cache HTTP

Ce standard définit les stratégies de mise en cache HTTP côté navigateur et serveur pour réduire les requêtes réseau, améliorer les temps de chargement et optimiser l'expérience utilisateur. Inclut la... :
* Configurer le bfcache (back/forward cache) en évitant les événements unload et en utilisant pagehide/pageshow
* Configurer les en-têtes Vary pour gérer correctement le cache selon Accept-Encoding et autres critères
* Configurer un CDN avec cache géographique et purge automatique lors des déploiements
* Implémenter un Service Worker avec stratégie de cache (Network First, Cache First, Stale While Revalidate) selon le type de ressource
* Précharger les ressources critiques avec <link rel="preload"> et les mettre en cache immédiatement
* Utiliser Cache-Control: no-cache pour le HTML (permet revalidation avec ETag) et éviter no-store sauf données sensibles
* Utiliser Cache-Control: public, max-age=31536000, immutable pour les assets versionnés (avec hash dans le nom de fichier)
* Utiliser must-revalidate pour les contenus sensibles qui ne doivent jamais être servis obsolètes
* Utiliser stale-while-revalidate pour servir le cache pendant la mise à jour en arrière-plan
* Versionner les assets (hash dans le nom) pour permettre un cache agressif sans risque de fichiers obsolètes

Full standard is available here for further request: [Web Performance - Cache HTTP](.packmind/standards/web-performance-cache-http.md)

# Standard: Web Performance - Chargement JavaScript

Ce standard définit les stratégies de chargement JavaScript pour optimiser le parsing, l'exécution et réduire le temps de blocage du rendu. Couvre les attributs defer/async, le code splitting, le lazy... :
* Activer le tree-shaking en utilisant des imports nommés et en évitant les imports par défaut de grosses librairies
* Éliminer le JavaScript mort avec des outils d'analyse de coverage (Chrome DevTools Coverage)
* Implémenter le code splitting pour charger uniquement le JavaScript nécessaire à chaque page
* Lazy-load les composants non visibles initialement avec Intersection Observer
* Précharger les modules dynamiques avec <link rel="modulepreload"> pour réduire la latence
* Utiliser async uniquement pour les scripts indépendants (analytics, publicités) qui n'ont pas de dépendances
* Utiliser defer pour les scripts non-critiques afin de ne pas bloquer le parsing HTML
* Utiliser requestIdleCallback pour exécuter le JavaScript non-critique pendant les périodes d'inactivité
* Utiliser type="module" avec import maps pour charger les modules ES6 natifs et réduire le bundle
* Utiliser Web Workers pour déléguer les calculs lourds hors du thread principal

Full standard is available here for further request: [Web Performance - Chargement JavaScript](.packmind/standards/web-performance-chargement-javascript.md)

# Standard: Web Performance - Gestion des Scripts Tiers

Ce standard définit les stratégies pour intégrer des scripts tiers (analytics, publicités, chatbots, widgets sociaux) sans dégrader la performance. Couvre la prévention des SPOF (Single Point of Failu... :
* Charger les scripts tiers après l'événement load ou lors de l'interaction utilisateur pour préserver le TTI
* Charger tous les scripts tiers en asynchrone (async ou defer) pour éviter le blocage du rendu
* Configurer des Resource Hints (prefetch, dns-prefetch) uniquement pour les domaines tiers réellement utilisés
* Implémenter le Google Consent Mode v2 pour différer le chargement des scripts analytics/ads selon le consentement RGPD
* Implémenter un timeout sur les scripts tiers pour éviter les blocages si le service est indisponible
* Limiter le nombre de scripts tiers à maximum 3-5 essentiels et évaluer le ROI de chacun
* Monitorer l'impact des scripts tiers avec Request Blocking dans Chrome DevTools et mesurer le gain
* Utiliser des facades (façades) pour les widgets lourds (YouTube, Google Maps, chatbots) et charger le vrai widget au clic
* Utiliser dns-prefetch et preconnect pour réduire la latence des domaines tiers
* Utiliser Partytown pour exécuter les scripts tiers dans un Web Worker et libérer le thread principal

Full standard is available here for further request: [Web Performance - Gestion des Scripts Tiers](.packmind/standards/web-performance-gestion-des-scripts-tiers.md)

# Standard: Web Performance - Optimisation des Fonts

Ce standard définit les techniques d'optimisation des polices Web pour réduire leur poids, éviter le FOIT (Flash of Invisible Text) et le FOUT (Flash of Unstyled Text), et améliorer les Core Web Vital... :
* * Précharger les polices critiques avec <link rel="preload"> et attribut crossorigin
* Auto-héberger les Google Fonts au lieu d'utiliser le CDN Google pour réduire les requêtes DNS
* Définir une font-stack de fallback similaire à la police custom pour réduire le CLS
* Limiter le nombre de poids et variantes de police (maximum 2-3 poids par police)
* Monitorer le chargement des polices avec document.fonts.ready pour déclencher des animations après le swap
* Utiliser font-display: swap pour afficher le texte immédiatement avec une police de fallback
* Utiliser le subsetting pour ne charger que les caractères utilisés (latin-ext, glyphes spécifiques)
* Utiliser les Cloudflare 103 Early Hints via des headers HTTP Link (nopush) pour paralléliser le chargement des polices avec la génération du HTML
* Utiliser les variable fonts pour remplacer plusieurs poids par un seul fichier
* Utiliser unicode-range pour charger uniquement les subsets nécessaires selon la langue
* Utiliser WOFF2 comme format unique (support universel depuis 2016, meilleur taux de compression)

Full standard is available here for further request: [Web Performance - Optimisation des Fonts](.packmind/standards/web-performance-optimisation-des-fonts.md)

# Standard: Web Performance - Optimisation des Images

Ce standard définit les techniques d'optimisation des images pour réduire leur poids, améliorer le LCP et économiser la bande passante. Couvre les formats modernes (WebP, AVIF), le lazy-loading, les i... :
* Ajouter loading="lazy" sur toutes les images non-critiques (pas dans le viewport initial)
* Compresser toutes les images avec des outils comme sharp, imagemin, ou squoosh à un niveau de qualité 85-90
* Implémenter un placeholder LQIP (Low Quality Image Placeholder) ou blur-hash pour améliorer la perception du chargement
* Limiter la résolution maximale à 2x (Retina) et ne pas servir 3x ou 4x qui sont imperceptibles
* Optimiser les SVG avec SVGO pour supprimer les métadonnées et simplifier les paths
* Prioriser le format AVIF sur le WebP pour une meilleure compression à qualité égale (configuration Astro 6)
* Spécifier width et height sur toutes les images pour éviter le CLS
* Utiliser Cloudflare Images (via adapter) pour déléguer les transformations et optimisations à l'Edge
* Utiliser fetchpriority="high" sur l'image LCP (souvent le hero) pour accélérer son chargement
* Utiliser le format SVG pour les logos, icônes et illustrations simples au lieu de PNG/JPEG
* Utiliser les formats modernes WebP et AVIF avec fallback JPEG/PNG pour réduire le poids de 30-50%
* Utiliser srcset et sizes pour servir des images adaptées à la résolution de l'écran

Full standard is available here for further request: [Web Performance - Optimisation des Images](.packmind/standards/web-performance-optimisation-des-images.md)

# Standard: Web Performance - Seuils et Métriques

Ce standard définit les seuils de performance (limites de poids, temps de chargement), les métriques essentielles (Core Web Vitals) et les méthodes de test pour garantir des temps de chargement accept... :
* Ajouter la balise meta viewport pour éviter les INP élevés sur mobile (souvent oubliée)
* Ajouter le header Timing-Allow-Origin sur les images cross-origin pour mesurer le LCP correctement
* Définir des objectifs chiffrés par métrique et les documenter dans les spécifications du projet
* Implémenter des Custom Metrics avec performance.mark() et performance.measure() pour mesurer les événements métier critiques
* Le contenu à indexer DOIT être dans le HTML serveur (pas uniquement généré par JavaScript) et respecter le principe 1 URL = 1 page pour le SEO
* Limiter le CSS total à 68 Ko sur mobile en chargeant les styles critiques inline et en différant le CSS non-critique
* Limiter le JavaScript total à 465 Ko sur mobile (médiane HTTPArchive 2021) et configurer des alertes CI/CD si les seuils sont dépassés
* Limiter les fonts à 108 Ko en utilisant le subsetting (seulement les caractères nécessaires) et font-display: swap
* Limiter les images totales à 870 Ko sur mobile en utilisant des formats modernes (WebP, AVIF) et le lazy-loading
* Mesurer l'INP (Interaction to Next Paint) et viser moins de 200ms pour 75% des utilisateurs en optimisant les callbacks d'événements
* Mesurer le CLS (Cumulative Layout Shift) et viser moins de 0,1 pour 75% des utilisateurs en réservant l'espace pour les contenus dynamiques
* Mesurer le LCP (Largest Contentful Paint) et viser moins de 2,5 secondes pour 75% des utilisateurs en optimisant l'image hero avec preload et fetchpriority
* Mesurer le TTFB (Time To First Byte) et viser moins de 500ms pour 80% des pages en optimisant le serveur et le cache
* Minifier et compresser toutes les ressources avec Gzip ou Brotli côté serveur
* Servir des images responsive avec srcset et sizes adaptées au viewport et limiter le DPR à 2x maximum
* Tester sur matériel milieu de gamme (Motorola G4 ou équivalent ~200€) avec connexion 4G simulée (latence 40-50ms, débit 30-50 Mb/s)
* Utiliser transform pour les animations CSS car ignoré par le calcul CLS, et éviter les animations sur width, height, top, left

Full standard is available here for further request: [Web Performance - Seuils et Métriques](.packmind/standards/web-performance-seuils-et-metriques.md)
<!-- end: Packmind standards -->