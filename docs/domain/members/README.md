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
