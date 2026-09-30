-- Le motif d'un refus de commande.
--
-- Refuser une commande ne disait rien à l'adhérent : la notification l'envoyait « se
-- rapprocher du bureau », et le bureau lui-même n'en gardait aucune trace. Le motif,
-- facultatif, est écrit au refus, repris dans la notification et affiché dans « Mes
-- commandes ». Colonne nullable : les refus passés restent sans motif.
ALTER TABLE `orders` ADD `rejection_reason` text;
