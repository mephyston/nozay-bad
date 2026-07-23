## Description du changement

<!-- Résumé clair et concis des modifications apportées par cette PR -->

## Type de changement

- [ ] Refactorisation (aucun changement fonctionnel)
- [ ] Correction de bug
- [ ] Nouvelle fonctionnalité
- [ ] Documentation / Configuration

---

## Checklist avant fusion (PR)

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
