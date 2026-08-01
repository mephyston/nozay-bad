---
title: "Gestion des Saisons"
description: "Créer, activer, clôturer et approuver les saisons."
category: "admin"
order: 9
---

La plateforme fonctionne par **Saisons** (ex: 2024-2025, 2025-2026). Chaque saison isole la comptabilité et les inscriptions.

## Cycle de vie d'une saison

1. **Création** : Vous définissez un code (ex: "24-25"), un nom, une date de début et de fin.
2. **Saison Active** : Une seule saison peut être marquée comme *Active*. C'est la saison par défaut sur laquelle arrivent les membres lors de leur connexion.
3. **Clôture** : Lorsque l'année est terminée, la saison est clôturée (`closedAt`). Plus aucune écriture comptable ne peut être ajoutée.
4. **Approbation** : Après l'Assemblée Générale, les comptes sont approuvés (`approvedAt`), figeant définitivement l'historique.
