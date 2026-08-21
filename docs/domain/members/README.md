# Domaine Métier : Adhérents (Members)

Le référentiel des licenciés du club, alimenté par l'import Poona, et les attributs que le bureau gère à la main par-dessus : autorisation de note de frais, fonctions au club, portrait.

Deux grains, deux tables : **`persons`** (la personne, une ligne par licence) et **`memberships`** (l'adhésion, une ligne par personne et par saison). Voir [ADR-0006](../../architecture/ADR-0006-personne-et-adhesion.md).

---

## Dictionnaire de Données & Glossaire Métier

| Terme | Définition | Représentation |
|---|---|---|
| **Personne** | Le licencié, tel qu'il traverse les saisons : identité, coordonnées (en « dernier connu »), portrait. Une ligne par licence. | `persons` (`licence` unique) |
| **Adhésion** | Le dossier d'une saison : tarif, statut, montants, règlement, autorisation de notes de frais. L'identifiant est celui que stockent commandes, notes de frais, écritures, chèques et inscriptions. | `memberships` (`person_id`, `season_id`, unique) |
| **Fonction au club** | Mandat tenu par un adhérent pour une saison : Président, Vice-président, Secrétaire, Trésorier, Trésorier adjoint, Membre du comité d'administration, Entraîneur. **Une fonction au plus par adhérent** (pas de cumul). Décidée en assemblée générale, gérée depuis la page « Dirigeants » ou la fiche adhérent. | `member_club_functions` (`season_id`, `licence` unique, `function`) |
| **Fonction à titulaire unique** | Président, secrétaire, trésorier et trésorier adjoint n'ont qu'un titulaire par saison (statuts). Les autres fonctions admettent plusieurs titulaires. | Index partiel `member_club_functions_single_holder_idx` |
| **Fonctions indispensables** | Président et trésorier : tant qu'ils ne sont pas désignés sur la saison en cours, le menu « Dirigeants » signale une action à réaliser. | `REQUIRED_FUNCTIONS`, `GET /members/club-functions/status` |
| **Portrait** | Photo carrée déposée par l'adhérent depuis sa fiche, ou par le bureau depuis l'administration. Deux tailles (512 et 128), déposées dans R2 sous le préfixe **privé** `member-photos/`. Colonnes de `persons` : un adhérent qui revient après une saison blanche retrouve son portrait. | `POST/GET/DELETE /members/:licence/photo` |
| **Emails de contact** | Adresses joignables d'un dossier : celle de l'adhérent et celles de ses représentants légaux (un mineur n'a pas d'email — le compte de l'espace adhérent est celui du parent). | `getContactEmailsForMember(s)` |

---

## Règles Fonctionnelles du Domaine

- [RF-MEM-001 : La fonction au club désigne qui gère, pas qui accède](./rules/RF-MEM-001-fonction-au-club.md)

---

## Contraintes techniques structurantes

### L'import Poona écrase l'adhésion, il complète la personne

`import-members-csv` dépose en deux temps : les personnes, puis leurs adhésions. Les deux upserts n'ont pas la même règle.

L'**adhésion** est réécrite : c'est l'état d'une saison, et Poona en est la source. Deux exceptions explicites : `payment_date` (protégée par un `coalesce` — l'export la laisse vide en pratique, et l'effacer ferait retomber l'attestation sur le 1er septembre sans bruit) et `expense_authorized`, décision du bureau qu'un ré-import ne doit pas révoquer.

La **personne** est complétée : l'identité fait foi (c'est la fédération qui la tient), mais les coordonnées passent par un `coalesce`. Sans cela, ré-importer une saison ancienne dont l'export ne portait pas encore les coordonnées effacerait celles qu'on connaît aujourd'hui.

Toute nouvelle donnée saisie à la main se pose donc sur `persons` si elle dure, sur `memberships` si elle vaut pour une saison — et dans ce dernier cas, hors du `set` de l'upsert.

### La fonction au club n'est pas un rôle IAM

Comme la capitainerie côté teams : la fonction dit **qui fait tourner le club** (et qui recevoir telle notification de gestion), pas qui a accès au back-office. Les droits d'accès restent portés par le domaine `iam`. Un président sans compte d'administration est un cas normal.

### Le portrait est privé, et le préfixe R2 en est la garantie

Les octets vivent dans le bucket `MEDIA`, le même que la médiathèque du site, mais sous le préfixe `member-photos/`. La seule route qui sert ce bucket au public — `/media/[...key]` du site — n'accepte que les clés `media/<empreinte>/<fichier>` (`isSafeMediaKey`) : un portrait n'y est donc joignable par personne. Les deux applications passent par un relais qui exige une session (`/api/adherents/photo/:licence` côté espace adhérent, `/admin/api/member-photo` côté administration), et aucune ligne `cms_media` n'est créée — les portraits n'apparaissent pas dans la médiathèque.

L'adresse d'affichage porte `?v=<photo_updated_at>` : un portrait remplacé change d'URL, ce qui dispense d'invalider quoi que ce soit.

### Rétention des portraits

Un portrait est conservé tant que la licence adhère. Il se retire à la demande, depuis la fiche — par l'adhérent lui-même dans l'espace adhérent, par le bureau dans l'administration — et la suppression efface aussi les objets R2, contrairement à la médiathèque qui conserve les siens.

**Aucune purge automatique n'existe** : la ligne `member_profiles` et ses objets survivent à une licence qui ne se réinscrit pas. C'est le revers assumé du rattachement à la licence, et le point à reprendre si le club veut tenir une durée de conservation stricte.

### Compter des personnes ou des adhésions

La distinction est désormais explicite, et il faut la tenir : `get-member-stats` compte les **adhérents** d'une saison quand on lui en donne une, et les **personnes connues du club** sinon. Le tableau de bord (`shared/dashboard.ts`), lui, compte des adhésions — ses montants et son état de règlement appartiennent à l'adhésion — et son delta avec la saison précédente compare deux effectifs annuels, pas deux ensembles de personnes.

Avant la séparation, les deux se confondaient : une personne inscrite trois saisons pesait trois fois dans l'effectif et trois fois son âge dans la moyenne dès que la saison n'était pas filtrée.
