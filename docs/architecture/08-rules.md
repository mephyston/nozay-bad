# Checklist avant chaque PR

- [ ] Aucun comportement fonctionnel modifié, sauf si la PR l'annonce explicitement
- [ ] Tests verts (existants + nouveaux tests colocalisés)
- [ ] Aucun import circulaire
- [ ] Aucune logique métier dans `route.ts`
- [ ] Aucune requête SQL / import `drizzle-orm` hors `repository.ts`
- [ ] Aucun helper générique ajouté dans `libs/shared`
- [ ] `libs/shared` ne contient que du technique (pas de règle métier, pas de table, pas de catalogue de valeurs)
- [ ] Aucun fichier de plus de 200 lignes dans un domaine (hors `shared/` si agrégat volumineux justifié)
- [ ] Aucun import direct d'une table d'un autre domaine (uniquement son `index.ts` public)
- [ ] Aucune redéfinition d'un schéma de table existant ailleurs
- [ ] Aucun import entre deux slices d'un même domaine (`create` n'importe pas `delete`)
- [ ] Toute écriture touchant plusieurs tables est dans un `db.transaction()`
- [ ] Le déploiement reste inchangé (toujours un seul Worker par app, aucun appel réseau introduit entre domaines)
- [ ] Toute variable lue via c.env, import.meta.env ou un binding est déclarée dans le wrangler.json correspondant (prod ET staging) et documentée dans .env.example.
- [ ] Contrôle d'intégrité du schéma valide (`node scripts/check-schema-integrity.js`)
- [ ] Aucune dérive de schéma Drizzle vs migrations SQL (`drizzle-kit generate` sans diff)
- [ ] Aucune suppression de contrainte (FK, UNIQUE, CHECK) sans dérogation explicite `[allow-constraint-loss]`
- [ ] Aucune duplication de déclaration de table physique dans les `schema.ts`
- [ ] Alignement des données de référence (`0001_seed_reference_data.sql`) avec les codes métiers applicatifs


## Garde-fous automatiques à mettre en place (une fois, avant la migration)

1. **ESLint — étendre `eslint.config.js`** (les `depConstraints` Nx existants
   sont corrects et à garder tels quels) avec des règles locales
   `no-restricted-imports` :
   - dans `**/route.ts` : interdire `drizzle-orm`, les fichiers `*-data-access`/`schema`
   - dans `**/handler.ts` : interdire `hono`
   - entre dossiers de cas d'usage d'un même domaine : interdire les imports croisés
2. **ADR** (`docs/architecture/ADR-0001-modular-monolith-vsa.md`) expliquant
   le choix Modular Monolith + VSA + DDD léger + Hexagonal léger, pourquoi, et
   les alternatives écartées (Clean Architecture complète jugée trop lourde
   pour la taille du projet, microservices écartés pour rester compatible
   avec le plan Cloudflare Free — cf. discussion `docs/architecture/00-vision.md`).
3. **CONTRIBUTING.md** : comment créer un nouveau cas d'usage (où créer le
   dossier, quels fichiers sont obligatoires, où placer l'UI, quand un ajout à
   `shared/` est légitime).
4. **Template de PR** avec la checklist ci-dessus en cases à cocher.
