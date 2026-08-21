# Domaine Métier : Adhérents (Members)

Le référentiel des adhérents du club, alimenté par l'import Poona (une ligne par licence **et par saison**), et les attributs que le bureau gère à la main par-dessus : autorisation de note de frais, et désormais **fonctions au club**.

---

## Dictionnaire de Données & Glossaire Métier

| Terme | Définition | Représentation |
|---|---|---|
| **Adhérent** | Un dossier de licence pour une saison. L'identifiant technique change à chaque renouvellement ; la **licence** est la clé naturelle stable. | `members` (`licence`, `season_id`, unique) |
| **Fonction au club** | Mandat tenu par un adhérent pour une saison : Président, Vice-président, Secrétaire, Trésorier, Trésorier adjoint, Membre du comité d'administration, Entraîneur. **Une fonction au plus par adhérent** (pas de cumul). Décidée en assemblée générale, gérée depuis la page « Dirigeants » ou la fiche adhérent. | `member_club_functions` (`season_id`, `licence` unique, `function`) |
| **Fonction à titulaire unique** | Président, secrétaire, trésorier et trésorier adjoint n'ont qu'un titulaire par saison (statuts). Les autres fonctions admettent plusieurs titulaires. | Index partiel `member_club_functions_single_holder_idx` |
| **Fonctions indispensables** | Président et trésorier : tant qu'ils ne sont pas désignés sur la saison en cours, le menu « Dirigeants » signale une action à réaliser. | `REQUIRED_FUNCTIONS`, `GET /members/club-functions/status` |
| **Profil d'adhérent** | Ce que la personne porte en propre, indépendamment de son adhésion de l'année : sa **photo de profil** aujourd'hui. Rattaché à la licence, sans saison — un adhérent qui revient après une saison blanche retrouve son portrait. | `member_profiles` (`licence` unique, `photo_key`, `photo_updated_at`) |
| **Portrait** | Photo carrée déposée par l'adhérent depuis sa fiche, ou par le bureau depuis l'administration. Deux tailles (512 et 128), déposées dans R2 sous le préfixe **privé** `member-photos/`. | `POST/GET/DELETE /members/:licence/photo` |
| **Emails de contact** | Adresses joignables d'un dossier : celle de l'adhérent et celles de ses représentants légaux (un mineur n'a pas d'email — le compte de l'espace adhérent est celui du parent). | `getContactEmailsForMember(s)` |

---

## Règles Fonctionnelles du Domaine

- [RF-MEM-001 : La fonction au club désigne qui gère, pas qui accède](./rules/RF-MEM-001-fonction-au-club.md)

---

## Contraintes techniques structurantes

### L'import Poona écrase, les attributs manuels vivent à côté

`import-members-csv` réécrit presque toutes les colonnes de `members` à chaque ré-import (`onConflictDoUpdate`). Tout attribut saisi à la main doit donc vivre **hors** de la table — dans une table annexe rattachée par licence — ou être explicitement exclu du `set` de l'upsert (cas de `payment_date`). Une colonne manuelle ajoutée à `members` sans y penser serait perdue au ré-import suivant, en silence.

### La fonction au club n'est pas un rôle IAM

Comme la capitainerie côté teams : la fonction dit **qui fait tourner le club** (et qui recevoir telle notification de gestion), pas qui a accès au back-office. Les droits d'accès restent portés par le domaine `iam`. Un président sans compte d'administration est un cas normal.

### Le portrait est privé, et le préfixe R2 en est la garantie

Les octets vivent dans le bucket `MEDIA`, le même que la médiathèque du site, mais sous le préfixe `member-photos/`. La seule route qui sert ce bucket au public — `/media/[...key]` du site — n'accepte que les clés `media/<empreinte>/<fichier>` (`isSafeMediaKey`) : un portrait n'y est donc joignable par personne. Les deux applications passent par un relais qui exige une session (`/api/adherents/photo/:licence` côté espace adhérent, `/admin/api/member-photo` côté administration), et aucune ligne `cms_media` n'est créée — les portraits n'apparaissent pas dans la médiathèque.

L'adresse d'affichage porte `?v=<photo_updated_at>` : un portrait remplacé change d'URL, ce qui dispense d'invalider quoi que ce soit.

### Rétention des portraits

Un portrait est conservé tant que la licence adhère. Il se retire à la demande, depuis la fiche — par l'adhérent lui-même dans l'espace adhérent, par le bureau dans l'administration — et la suppression efface aussi les objets R2, contrairement à la médiathèque qui conserve les siens.

**Aucune purge automatique n'existe** : la ligne `member_profiles` et ses objets survivent à une licence qui ne se réinscrit pas. C'est le revers assumé du rattachement à la licence, et le point à reprendre si le club veut tenir une durée de conservation stricte.

### À trancher : `members` mélange la personne et l'adhésion

`members` porte aujourd'hui deux grains à la fois — l'identité (licence, nom, prénom, sexe, date de naissance, invariants) et l'adhésion de la saison (type, statut, montants, `paid`, `expense_authorized`, coordonnées telles que Poona les connaissait cette année-là). D'où une ligne dupliquée par adhérent et par saison, et l'écrasement annuel par l'import.

`member_profiles` est la première brique du grain « personne ». La suite naturelle serait d'y remonter l'identité et de renommer `members` en `memberships`. Le coût est contenu — `membersTable` n'est référencée que dans les tranches de ce domaine, plus `apps/api/src/ai-knowledge.ts`, tout le reste passant par `shared/queries.ts` — mais c'est un chantier à part, en expand/contract. Deux points à assumer le jour venu : les coordonnées ne doivent **pas** remonter (elles valent comme instantané de l'adhésion), et l'attestation CSE réimprimerait alors le nom courant plutôt que celui de la saison concernée.
