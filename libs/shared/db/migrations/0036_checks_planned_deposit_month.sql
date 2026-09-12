-- Le mois de remise prévu d'un chèque.
--
-- Au moment de composer un bordereau, le trésorier choisit dans le tiroir les chèques
-- à remettre : ceux dont l'émetteur a demandé un encaissement différé (« en novembre »,
-- « après les vacances ») attendent leur tour. Rien ne portait cette consigne, sinon la
-- mémoire — et le tableau, trié par date de saisie, mêlait les chèques à remettre tout
-- de suite et ceux à garder.
--
-- `planned_deposit_month` est une **indication**, pas un rattachement : le mois calendaire
-- (1 à 12) où le chèque devrait partir en banque. Le tableau des chèques en attente se
-- trie dessus, dans l'ordre de l'exercice — de septembre à août — les chèques sans mois
-- en dernier. Le bordereau, lui, ne le lit pas : on remet ce qu'on coche.
--
-- Migration strictement additive : la colonne est nulle par défaut, l'ancien code l'ignore.

ALTER TABLE `checks` ADD `planned_deposit_month` integer;
