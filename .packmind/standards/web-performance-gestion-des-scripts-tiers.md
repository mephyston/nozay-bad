# Web Performance - Gestion des Scripts Tiers

Ce standard définit les stratégies pour intégrer des scripts tiers (analytics, publicités, chatbots, widgets sociaux) sans dégrader la performance. Couvre la prévention des SPOF (Single Point of Failure), le chargement asynchrone, l'utilisation de facades, le Consent Mode pour RGPD, et le monitoring de l'impact performance des scripts tiers.

## Rules

* Charger tous les scripts tiers en asynchrone (async ou defer) pour éviter le blocage du rendu
* Utiliser des facades (façades) pour les widgets lourds (YouTube, Google Maps, chatbots) et charger le vrai widget au clic
* Implémenter le Google Consent Mode v2 pour différer le chargement des scripts analytics/ads selon le consentement RGPD
* Utiliser dns-prefetch et preconnect pour réduire la latence des domaines tiers
* Monitorer l'impact des scripts tiers avec Request Blocking dans Chrome DevTools et mesurer le gain
* Limiter le nombre de scripts tiers à maximum 3-5 essentiels et évaluer le ROI de chacun
* Charger les scripts tiers après l'événement load ou lors de l'interaction utilisateur pour préserver le TTI
* Utiliser Partytown pour exécuter les scripts tiers dans un Web Worker et libérer le thread principal
* Configurer des Resource Hints (prefetch, dns-prefetch) uniquement pour les domaines tiers réellement utilisés
* Implémenter un timeout sur les scripts tiers pour éviter les blocages si le service est indisponible
