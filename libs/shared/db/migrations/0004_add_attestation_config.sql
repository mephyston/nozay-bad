CREATE TABLE `attestation_config` (
	`id` integer PRIMARY KEY NOT NULL,
	`signatory_name` text DEFAULT 'Robert THAI' NOT NULL,
	`signatory_email` text DEFAULT 'president@nozaybad.fr' NOT NULL,
	`website_url` text DEFAULT 'www.nozaybad.fr' NOT NULL,
	`signature_base64` text,
	`updated_at` integer NOT NULL
);
