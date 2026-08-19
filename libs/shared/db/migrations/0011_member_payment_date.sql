-- Date de règlement de la cotisation, telle qu'exportée par Poona (colonne « Date de paiement »).
--
-- Elle sert de date d'émission sur l'attestation CSE. À défaut, l'attestation est datée du
-- 1er septembre de la saison qu'elle couvre : la seule autre date dont on dispose est celle
-- de l'écriture comptable, qui date la saisie du trésorier et non le règlement de l'adhérent.
--
-- Nullable, sans valeur par défaut : dans les deux exports Poona observés (293 lignes, dont
-- 255 marquées payées), la colonne est vide sur toutes les lignes. Le repli du 1er septembre
-- reste donc le cas courant, et cette colonne l'exception.
ALTER TABLE `members` ADD `payment_date` text;
