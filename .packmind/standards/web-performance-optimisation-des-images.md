# Web Performance - Optimisation des Images

Ce standard définit les techniques d'optimisation des images pour réduire leur poids, améliorer le LCP et économiser la bande passante. Couvre les formats modernes (WebP, AVIF), le lazy-loading, les images responsive, la compression, le dimensionnement correct, et les stratégies de preload pour les images critiques.

## Rules

* Utiliser les formats modernes WebP et AVIF avec fallback JPEG/PNG pour réduire le poids de 30-50%
* Ajouter loading="lazy" sur toutes les images non-critiques (pas dans le viewport initial)
* Spécifier width et height sur toutes les images pour éviter le CLS
* Utiliser srcset et sizes pour servir des images adaptées à la résolution de l'écran
* Compresser toutes les images avec des outils comme sharp, imagemin, ou squoosh à un niveau de qualité 85-90
* Limiter la résolution maximale à 2x (Retina) et ne pas servir 3x ou 4x qui sont imperceptibles
* Utiliser fetchpriority="high" sur l'image LCP (souvent le hero) pour accélérer son chargement
* Implémenter un placeholder LQIP (Low Quality Image Placeholder) ou blur-hash pour améliorer la perception du chargement
* Utiliser le format SVG pour les logos, icônes et illustrations simples au lieu de PNG/JPEG
* Optimiser les SVG avec SVGO pour supprimer les métadonnées et simplifier les paths
* Prioriser le format AVIF sur le WebP pour une meilleure compression à qualité égale (configuration Astro 6)
* Utiliser Cloudflare Images (via adapter) pour déléguer les transformations et optimisations à l'Edge
