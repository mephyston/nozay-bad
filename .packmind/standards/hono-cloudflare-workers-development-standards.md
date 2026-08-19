# Hono & Cloudflare Workers Development Standards

Standards et bonnes pratiques pour concevoir des APIs Hono légères et performantes déployées sur Cloudflare Workers et intégrées avec les services de stockage (D1, Vectorize) et d'événements (Cloudflare Queues).

## Rules

* Utiliser les Service Bindings (liaisons de services privées) pour faire communiquer les microservices entre eux à latence réseau nulle.
* Authentifier les APIs avec une clé d'API secrète partagée (`INTERNAL_API_KEY`) définie dans les secrets ou l'environnement du Worker.
* Configurer les variables d'environnement locales de développement dans un fichier `.dev.vars` à la racine de chaque Worker (ne jamais committer de secrets).
* Déclarer les schémas de validation des requêtes (headers, query parameters, body) avec TypeBox pour un typage strict et une validation automatique à l'entrée.
* Structurer les interactions D1 avec du SQL paramétré ou des ORM légers sécurisés contre les injections SQL.
* Publier les traitements asynchrones ou lourds (comme le scraping à la demande) sur Cloudflare Queues (`metacult-events`) pour décharger les requêtes utilisateur.
* Capturer et journaliser proprement les erreurs à l'aide d'un middleware global Hono `app.onError()`.
