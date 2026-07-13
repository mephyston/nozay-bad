# AstroJS Development Standards

Standards et bonnes pratiques pour le développement de sites AstroJS modernes, content-driven, avec TypeScript, Content Layer API, Islands Architecture, et performance optimale. Inspiré du guide https://github.com/github/awesome-copilot/blob/main/instructions/astro.instructions.md. À appliquer pour garantir la qualité, la maintenabilité et la scalabilité des projets Astro.

## Rules

* Adopter l’Islands Architecture : rendu serveur par défaut, hydratation sélective.
* Organiser le contenu avec Content Collections et Content Layer API.
* Structurer le projet par fonctionnalité ou type de contenu.
* Utiliser TypeScript et générer les types avec `astro sync`.
* Utiliser les composants .astro pour le contenu statique, importer des composants framework seulement pour l’interactivité.
* Utiliser les directives client (`client:load`, `client:idle`, etc.) uniquement si nécessaire.
* Utiliser le composant <ClientRouter /> pour les transitions de vue SPA-like.
* Optimiser les images avec le composant <Image /> et formats modernes.
* Gérer le SEO avec les balises meta, Open Graph, et JSON-LD.
* Préférer le rendu statique (SSG) et n’activer SSR que si nécessaire.
