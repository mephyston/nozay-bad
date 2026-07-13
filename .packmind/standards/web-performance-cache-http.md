# Web Performance - Cache HTTP

Ce standard définit les stratégies de mise en cache HTTP côté navigateur et serveur pour réduire les requêtes réseau, améliorer les temps de chargement et optimiser l'expérience utilisateur. Inclut la gestion du Cache-Control, des stratégies de revalidation, du back/forward cache (bfcache), et des bonnes pratiques pour invalider le cache lors des déploiements.

## Rules

* Utiliser Cache-Control: public, max-age=31536000, immutable pour les assets versionnés (avec hash dans le nom de fichier)
* Utiliser Cache-Control: no-cache pour le HTML (permet revalidation avec ETag) et éviter no-store sauf données sensibles
* Configurer le bfcache (back/forward cache) en évitant les événements unload et en utilisant pagehide/pageshow
* Versionner les assets (hash dans le nom) pour permettre un cache agressif sans risque de fichiers obsolètes
* Utiliser stale-while-revalidate pour servir le cache pendant la mise à jour en arrière-plan
* Configurer les en-têtes Vary pour gérer correctement le cache selon Accept-Encoding et autres critères
* Implémenter un Service Worker avec stratégie de cache (Network First, Cache First, Stale While Revalidate) selon le type de ressource
* Précharger les ressources critiques avec <link rel="preload"> et les mettre en cache immédiatement
* Utiliser must-revalidate pour les contenus sensibles qui ne doivent jamais être servis obsolètes
* Configurer un CDN avec cache géographique et purge automatique lors des déploiements
