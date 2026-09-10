# RF-SCH-008 : Sélection des retenus et annonce

## 1. Description et Objectif Métier

L'entraîneur choisissait de mémoire, en essayant de ne pas oublier qui avait déjà eu sa séance, et en privilégiant les jeunes — l'avenir du club. Cette règle décrit **ce qui l'aide à choisir**, ce que sa sélection doit respecter, et ce que l'annonce déclenche.

---

## 2. Domaine Fonctionnel

- **Domaine** : schedules (règles pures) — composition des notifications dans `apps/api`
- **Agrégat / Entité clé** : Candidature (`indiv_requests.selected_slot`), Soirée (`status`, `announced_at`)
- **Statut** : Validé

---

## 3. Définition de la Règle Métier

**L'ordre de priorité** : d'abord ceux qui ont été **le moins souvent retenus cette saison**, puis **les plus jeunes**, puis l'ordre des demandes. Un âge inconnu passe après les âges connus. L'âge se compte au jour de la soirée.

**« Retenu cette saison »** ne compte que sur les soirées **annoncées** de la saison de la soirée. Une sélection non annoncée n'a pas eu lieu ; une soirée annulée après annonce ne compte plus non plus. Les statistiques se tiennent **par licence**, qui suit la personne d'une saison à l'autre là où une adhésion ne vit qu'un an.

**La proposition automatique** parcourt les candidats dans cet ordre : celui qui a une préférence prend son créneau s'il reste une place, sinon il est **sauté** — la proposition ne contredit jamais un souhait, c'est à l'entraîneur de le faire en connaissance de cause. Les indifférents comblent le premier créneau libre.

**La sélection est remplacée en bloc**, atomiquement. Trois vérifications : chaque candidature appartient à la soirée, le créneau existe, le créneau a encore de la place. La préférence du candidat **n'est pas** un refus. Une soirée annoncée reste modifiable ; seule une soirée annulée est fermée.

**L'annonce** exige au moins un retenu. Elle passe la soirée à `announced`, ferme les candidatures, et **prévient chacun** : un message par créneau retenu, avec son horaire, et un message aux non-retenus. Les adresses sont celles du dossier, parents compris. Le domaine ne notifie personne lui-même : l'annonce n'existe que **composée** dans l'application, sans route propre dans le domaine — une annonce sans notification est impossible par construction.

**Ré-annoncer est permis.** Après un retrait, l'entraîneur re-sélectionne et ré-annonce : tous les candidats reçoivent une **mise à jour**, et chaque annonce est un message distinct, versionné par son horodatage.

**Le texte de l'annonce** — une ligne par créneau, « personne » quand il reste vide — se copie tel quel pour le groupe WhatsApp, et dit la même chose que l'espace adhérent.

**L'âge et le classement ne sont pas du domaine.** L'administration les joint par licence depuis le fichier des adhérents et les classements interclubs, chacun sous son propre droit ; sans le droit, l'écran affiche « âge inconnu » plutôt que de refuser.

---

## 4. Scénarios d'Acceptation (Gherkin)

```gherkin
# language: fr

Fonctionnalité: Sélection et annonce

  Scénario: L'équité passe avant la jeunesse
    Étant donné un candidat de 15 ans retenu deux fois cette saison
    Et un candidat de 40 ans jamais retenu
    Quand l'entraîneur lit les candidats classés
    Alors le candidat de 40 ans passe devant

  Scénario: À égalité, les plus jeunes d'abord
    Étant donné deux candidats jamais retenus, de 16 et 40 ans
    Alors celui de 16 ans passe devant

  Scénario: La proposition respecte les préférences sans les forcer
    Étant donné deux créneaux de deux places et trois candidats qui souhaitent le créneau 1
    Quand l'entraîneur demande une proposition
    Alors deux d'entre eux sont proposés sur le créneau 1 et le troisième n'est pas placé

  Scénario: Un créneau plein refuse une troisième personne
    Quand l'entraîneur enregistre trois retenus sur un créneau de deux places
    Alors l'opération est refusée

  Scénario: L'annonce prévient chacun
    Étant donné une soirée avec deux retenus sur des créneaux différents et un non-retenu
    Quand l'entraîneur annonce
    Alors la soirée est annoncée
    Et deux messages partent aux retenus, un par créneau, avec l'horaire
    Et un message part au non-retenu

  Scénario: Annoncer sans retenu est refusé
    Étant donné une soirée sans sélection
    Quand l'entraîneur annonce
    Alors l'opération est refusée et rien ne part

  Scénario: Une soirée annulée après annonce ne compte plus
    Étant donné un candidat retenu sur une soirée annoncée puis annulée
    Quand l'entraîneur lit ses statistiques sur une soirée suivante
    Alors cette sélection n'est pas comptée
```
