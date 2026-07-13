# Configuration Runtime et Résolution d'URLs

Standard pour gérer la configuration runtime des applications, la résolution intelligente des URLs avec Split Horizon, et l'élimination des valeurs hardcodées. S'applique au backend (TypeBox), frontends (Nuxt/Astro), et libs partagées. Couvre les principes 12-Factor App (Config séparée du code), la validation fail-fast, et les fallbacks strictement limités au développement local.

## Rules

* Centraliser toutes les URLs de développement par défaut dans un fichier de constantes partagé (ex: DEFAULT_DEV_URLS), jamais de strings hardcodées dispersées dans le code.
* Backend: Utiliser TypeBox pour validation stricte des variables d'environnement au démarrage avec fail-fast si config invalide.
* Implémenter Split Horizon URLs: INTERNAL_* pour réseau privé (S2S, Railway), PUBLIC_* pour réseau public (client browser).
* Convention de nommage stricte: PUBLIC_* pour variables exposées au client, INTERNAL_* pour réseau privé, pas de préfixe pour backend uniquement.
* Nuxt: Utiliser runtimeConfig pour permettre injection des variables au lancement Docker sans rebuild.
* Astro: Distinguer variables SSR (INTERNAL_*) et client-side (PUBLIC_*) avec import.meta.env.SSR pour le routing.
* Limiter les fallbacks aux constantes de développement, jamais de fallbacks silencieux en production.
* Exporter les constantes de configuration depuis un package partagé (@metacult/shared-core) accessible par tous les modules.
* Valider le protocole des URLs (http:// ou https://) et ajouter automatiquement si manquant selon le contexte (http en dev, https en prod).
* Documenter toutes les variables d'environnement requises dans .env.example avec exemples dev/staging/prod.
