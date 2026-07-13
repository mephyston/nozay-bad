# Web Performance - Optimisation des Fonts

Ce standard définit les techniques d'optimisation des polices Web pour réduire leur poids, éviter le FOIT (Flash of Invisible Text) et le FOUT (Flash of Unstyled Text), et améliorer les Core Web Vitals. Couvre le subsetting, font-display, les variable fonts, le preload, et les stratégies de fallback.

## Rules

* Utiliser font-display: swap pour afficher le texte immédiatement avec une police de fallback
* Limiter le nombre de poids et variantes de police (maximum 2-3 poids par police)
* Utiliser le subsetting pour ne charger que les caractères utilisés (latin-ext, glyphes spécifiques)
* Utiliser WOFF2 comme format unique (support universel depuis 2016, meilleur taux de compression)
* Utiliser les variable fonts pour remplacer plusieurs poids par un seul fichier
* * Précharger les polices critiques avec <link rel="preload"> et attribut crossorigin
* Définir une font-stack de fallback similaire à la police custom pour réduire le CLS
* Auto-héberger les Google Fonts au lieu d'utiliser le CDN Google pour réduire les requêtes DNS
* Utiliser unicode-range pour charger uniquement les subsets nécessaires selon la langue
* Monitorer le chargement des polices avec document.fonts.ready pour déclencher des animations après le swap
* Utiliser les Cloudflare 103 Early Hints via des headers HTTP Link (nopush) pour paralléliser le chargement des polices avec la génération du HTML
