PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_expenses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`season_id` text NOT NULL,
	`description` text NOT NULL,
	`category` integer NOT NULL,
	`amount` integer NOT NULL,
	`photo_url` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`emitter_name` text NOT NULL,
	`member_id` integer,
	`transaction_id` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_expenses`("id", "season_id", "description", "category", "amount", "photo_url", "status", "emitter_name", "member_id", "transaction_id", "created_at") SELECT "id", "season_id", "description", "category", "amount", "photo_url", "status", "emitter_name", "member_id", "transaction_id", "created_at" FROM `expenses`;--> statement-breakpoint
DROP TABLE `expenses`;--> statement-breakpoint
ALTER TABLE `__new_expenses` RENAME TO `expenses`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`season_id` text NOT NULL,
	`member_id` integer NOT NULL,
	`product_id` integer NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`total_amount` integer NOT NULL,
	`payment_method` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`transaction_id` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_orders`("id", "season_id", "member_id", "product_id", "quantity", "total_amount", "payment_method", "status", "transaction_id", "created_at") SELECT "id", "season_id", "member_id", "product_id", "quantity", "total_amount", "payment_method", "status", "transaction_id", "created_at" FROM `orders`;--> statement-breakpoint
DROP TABLE `orders`;--> statement-breakpoint
ALTER TABLE `__new_orders` RENAME TO `orders`;