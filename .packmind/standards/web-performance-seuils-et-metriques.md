# Web Performance - Seuils et Métriques

Ce standard définit les seuils de performance (limites de poids, temps de chargement), les métriques essentielles (Core Web Vitals) et les méthodes de test pour garantir des temps de chargement acceptables et une expérience utilisateur optimale. Objectifs : Réduire le temps de chargement, améliorer le référencement SEO (Core Web Vitals = critère de ranking Google depuis 2021), prolonger la durée de vie des équipements (éco-conception), et garantir l'accessibilité sur matériel bas/milieu de gamme.

## Rules

* Limiter le JavaScript total à 465 Ko sur mobile (médiane HTTPArchive 2021) et configurer des alertes CI/CD si les seuils sont dépassés
* Limiter les images totales à 870 Ko sur mobile en utilisant des formats modernes (WebP, AVIF) et le lazy-loading
* Limiter le CSS total à 68 Ko sur mobile en chargeant les styles critiques inline et en différant le CSS non-critique
* Limiter les fonts à 108 Ko en utilisant le subsetting (seulement les caractères nécessaires) et font-display: swap
* Mesurer le LCP (Largest Contentful Paint) et viser moins de 2,5 secondes pour 75% des utilisateurs en optimisant l'image hero avec preload et fetchpriority
* Ajouter le header Timing-Allow-Origin sur les images cross-origin pour mesurer le LCP correctement
* Mesurer le CLS (Cumulative Layout Shift) et viser moins de 0,1 pour 75% des utilisateurs en réservant l'espace pour les contenus dynamiques
* Utiliser transform pour les animations CSS car ignoré par le calcul CLS, et éviter les animations sur width, height, top, left
* Mesurer l'INP (Interaction to Next Paint) et viser moins de 200ms pour 75% des utilisateurs en optimisant les callbacks d'événements
* Ajouter la balise meta viewport pour éviter les INP élevés sur mobile (souvent oubliée)
* Mesurer le TTFB (Time To First Byte) et viser moins de 500ms pour 80% des pages en optimisant le serveur et le cache
* Tester sur matériel milieu de gamme (Motorola G4 ou équivalent ~200€) avec connexion 4G simulée (latence 40-50ms, débit 30-50 Mb/s)
* Le contenu à indexer DOIT être dans le HTML serveur (pas uniquement généré par JavaScript) et respecter le principe 1 URL = 1 page pour le SEO
* Minifier et compresser toutes les ressources avec Gzip ou Brotli côté serveur
* Servir des images responsive avec srcset et sizes adaptées au viewport et limiter le DPR à 2x maximum
* Implémenter des Custom Metrics avec performance.mark() et performance.measure() pour mesurer les événements métier critiques
* Définir des objectifs chiffrés par métrique et les documenter dans les spécifications du projet
