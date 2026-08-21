# ADR-0006 : La personne et l'adhésion sont deux choses

- **Statut** : Accepté
- **Date** : 2026-08-21
- **Supersède** : le §3.1 de l'[ADR-0004](./ADR-0004-modele-de-donnees.md), qui décrivait la table `members` comme le modèle cible du domaine.

---

## 1. Contexte

`members` portait deux grains à la fois, sous une seule ligne par **(licence, saison)** :

- **la personne** — licence, nom, prénom, sexe, date de naissance, coordonnées ;
- **l'adhésion de l'année** — tarif, état du dossier, montants, règlement, autorisation de notes de frais.

Trois conséquences, toutes constatées dans le code avant ce changement :

1. **L'identité était recopiée à chaque rentrée**, et réécrite intégralement par l'import Poona (`onConflictDoUpdate`). Toute donnée durable devait donc se réfugier **hors** de la table : `member_club_functions` (0015) puis `member_profiles` (0016) l'expliquent chacune dans leur en-tête. Les deux sont rattachées par `licence`, **sans clé étrangère** — en contradiction directe avec la règle 2.2 de l'ADR-0004 (« toute FK pointe une PK entière »), faute d'une table de personnes à pointer.
2. **`members.id` désignait une adhésion**, pas quelqu'un : il change à chaque renouvellement. Les schémas de `teams` et d'`events` le documentaient déjà comme un piège, et cinq tables le stockent pourtant durablement.
3. **Les compteurs mentaient dès qu'on ne filtrait pas la saison** : `get-member-stats` sans saison comptait une personne inscrite trois ans comme trois adhérents, et pesait trois fois son âge dans la moyenne.

## 2. Décision

Deux tables, deux grains.

| | `persons` | `memberships` (ex-`members`) |
|---|---|---|
| Grain | une ligne **par licence** | une ligne **par (personne, saison)** |
| Porte | licence, nom, prénom, sexe, date de naissance, coordonnées (email, téléphone, parents), portrait | tarif, statut, montants, `paid`, date de règlement, autorisation de notes de frais |
| Clés | `id` PK ; `licence` **UNIQUE** — clé naturelle externe au sens de la règle 2.3 de l'ADR-0004, comme `seasons.code` | `id` PK **conservé à l'identique** ; `person_id` → `persons(id)` ; `UNIQUE(person_id, season_id)` |

`member_profiles` est fusionnée dans `persons` et disparaît.

### Ce qui ne bouge pas, et pourquoi

Les cinq colonnes `member_id` (`orders`, `expenses`, `ledger_entries`, `checks`,
`club_event_registrations`) continuent de désigner **l'adhésion**, avec les mêmes valeurs.
Deux raisons :

- **c'est le sens juste** pour la comptabilité — une cotisation, un achat, un remboursement
  s'imputent à l'exercice où ils ont eu lieu ;
- **la sécurité de la reprise** — aucune de ces colonnes n'a jamais eu de clé étrangère.
  Faire changer de sens aux identifiants sans FK pour les rattraper aurait rattaché des
  écritures comptables à quelqu'un d'autre, en silence.

Leur **nom** reste `member_id` : le renommer imposait deux migrations supplémentaires et la
réécriture des cinq tables (drizzle-kit exige un terminal interactif pour arbitrer un
renommage de colonne), pour un gain de vocabulaire. Un commentaire de schéma dit désormais
ce que la colonne désigne.

`member_club_functions` garde également sa clé `licence` sans FK. La rattacher à
`persons(id)` est la suite naturelle ; elle n'appartient pas à ce changement.

### Coordonnées : la personne, pas l'année

Elles remontent dans `persons`, en « dernier connu ». Mesuré sur la production avant la
bascule, sur 226 personnes : l'email ne diverge **jamais** d'une saison à l'autre, le
téléphone et le contact parental divergent pour **deux** personnes ; tout le reste des
écarts apparents était du vide comblé au fil des exports Poona. Une adresse au dossier sert
à joindre quelqu'un aujourd'hui, pas à savoir qui était joignable en 2024.

Corollaire à l'import : l'adhésion est **écrasée** (Poona en est la source), la personne est
**complétée** (`coalesce`) — un ré-import d'une saison ancienne ne doit pas effacer des
coordonnées connues.

## 3. Conséquences

**Acquis**

- Une seule ligne par licencié : l'identité cesse d'être dupliquée et de diverger.
- Une vraie clé étrangère vers la personne, conforme à la règle 2.2 de l'ADR-0004.
- Les statistiques distinguent enfin **personnes** et **adhésions** ; le tableau de bord
  peut désormais mesurer un taux de renouvellement, ce dont il était incapable.
- Le portrait, le surnom et les préférences d'affichage ont un foyer légitime.

**Coûts assumés**

- La version qui porte ce changement **n'est pas rollbackable** : elle supprime deux tables
  (`rollback-horizon.mjs` classe `DROP TABLE` comme destructif). Choix pris alors que
  l'application n'a pas encore d'utilisateurs — les ~300 lignes de production sont reprises
  par la migration `0018`, la suppression n'intervenant qu'en `0019`, dans le même
  déploiement.
- L'attestation CSE imprime désormais le **nom courant** de la personne, et non celui que
  Poona donnait la saison attestée. Souhaitable dans la quasi-totalité des cas (un nom
  corrigé se corrige partout), à connaître dans les autres.
- Les tests de six domaines semaient un adhérent en une ligne ; ils passent par
  `@nba/members/test-fixtures`, qui pose la personne et son adhésion.

## 4. Ce que la bascule a révélé

Le type `MemberSummary` promettait `season`, `amountDue`, `amountReceived` et
`amountRemaining` — qu'aucune requête n'a jamais renvoyés : les lignes étaient castées
depuis un `select()` complet et portaient `seasonId` et `amount*Cents`. Le mensonge avait un
consommateur : l'analyse bancaire composait son invite au modèle avec
`amountRemaining / 100`, soit **`NaN`** pour chaque candidat proposé. Corrigé avec le type.
