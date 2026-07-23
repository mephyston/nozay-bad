# Principes

Ces règles sont non négociables et s'appliquent à chaque PR de la migration.

1. **Une responsabilité = un dossier. Un cas d'usage = un dossier.**
   Pas de fichier `routes.ts` ou `helpers.ts` regroupant plusieurs cas d'usage
   (contre-exemple actuel : `libs/features/members/api/src/routes.ts`, 485
   lignes, mélange création, mise à jour, import, saisons...).

2. **Les routes ne contiennent aucune logique métier.**
   Une route valide l'entrée, appelle un handler, retourne la réponse. Rien
   d'autre. Contre-exemple actuel :
   `libs/features/accounting/api/src/routes/invoices.ts`, où la génération du
   numéro de facture (`FAC-${seasonShort}-NBA91-${nextNum}`) est calculée
   directement dans le handler HTTP `POST /`.

3. **Les handlers ne connaissent pas HTTP.**
   Un handler reçoit des données déjà validées et typées, retourne un résultat
   ou lève une erreur de domaine. Il ne touche jamais à `c: Context` (Hono).

4. **Seuls les repositories connaissent Drizzle.**
   Aucun import de `drizzle-orm` ni d'une table (`*Table`) en dehors de
   `repository.ts`. Contre-exemple actuel : quasiment tous les fichiers de
   `libs/features/*/api/src/routes*.ts` importent `drizzle` et manipulent les
   tables directement.

5. **Un domaine ne modifie jamais les tables d'un autre domaine.**
   Toute interaction cross-domaine passe par une fonction exportée du
   `index.ts` public du domaine propriétaire. Violation actuelle à corriger en
   priorité : `libs/features/accounting/api/src/helpers.ts`
   (`reconcileBankTxInternal`) écrit directement dans `membersTable`
   (`amountReceived`, `amountRemaining`, `paid`) — un domaine mute les
   invariants métier d'un autre domaine.

6. **Une seule définition par table.**
   Ne jamais redéfinir un schéma Drizzle existant pour contourner une règle
   Nx. Violation actuelle à corriger en priorité : `seasonsTable` existe en 3
   endroits (`members/data-access/src/schema.ts` — la définition canonique,
   `accounting/data-access/src/schema.ts` — référence FK correcte, et
   `libs/shared/db/src/helpers.ts` — copie locale à supprimer).

7. **`libs/shared/*` reste strictement technique.**
   Types (`Bindings`), gestion d'erreur générique (`AppError`), client DB,
   configuration. Zéro règle métier, zéro table, zéro catalogue de valeurs
   métier. À redescendre dans le domaine propriétaire : `isSeasonClosed()` et
   `normalizeCategory()` (avec sa table de catégories comptables en dur),
   actuellement dans `libs/shared/db/src/helpers.ts`.

8. **Les slices d'un même domaine ne s'importent jamais entre elles.**
   `expenses/create` ne doit jamais importer quoi que ce soit depuis
   `expenses/delete`. Le code partagé entre slices d'un même domaine va dans
   `<domaine>/shared/`.

9. **Toute écriture multi-tables est transactionnelle.**
   `db.transaction(async (tx) => { ... })`, avec `tx` propagé à tous les
   appels de repository/agrégat du handler, y compris cross-domaine.
   Aujourd'hui, seuls 3 fichiers sur toute la codebase utilisent une
   transaction ; `invoices.ts` (`POST /`) par exemple insère la facture puis
   ses lignes sans transaction.

10. **Les apps ne contiennent aucune logique métier.**
    `apps/api` compose des routes exportées par les domaines. `apps/storefront`
    et `apps/admin` importent uniquement des composants `ui`
    (comportement déjà respecté aujourd'hui : `admin` n'importe que
    des libs `*-ui`, jamais `*-api`/`*-data-access` — à préserver).

11. **Aucun fichier de plus de 200 lignes dans un domaine, sauf `shared/`.**
    Seuil d'alerte, pas une limite dure — sert à repérer un cas d'usage encore
    non découpé ou un fichier fourre-tout.

12. **Découpage par capacités métier au-delà de 10 tranches (ADR-0003).** Quand un domaine
    atteint ou dépasse 10 tranches verticales (seuil $N = 10$), ses cas d'usage sont
    regroupés par sous-domaines/capacités métier (ex: `accounting/invoices/`,
    `accounting/seasons/`). En dessous de 10 tranches, le domaine reste à plat sous
    sa racine (`members/`, `expenses/`, `shop/`). La séparation technique `commands/`
    et `queries/` est proscrite au profit d'un découpage métier.

12. **Le déploiement ne change pas pendant la migration.**
    Toujours un Worker par app (`wrangler.json` inchangé). Aucune
    communication réseau entre domaines — uniquement des appels de fonction
    in-process.
