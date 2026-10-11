CREATE TABLE `records` (
 `id` text PRIMARY KEY NOT NULL,
 `owner` text NOT NULL,
 `kind` text NOT NULL,
 `payload` text NOT NULL,
 `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `records_owner_kind_created` ON `records` (`owner`,`kind`,`created_at`);
--> statement-breakpoint
CREATE TABLE `product_cache` (
 `barcode` text PRIMARY KEY NOT NULL,
 `payload` text NOT NULL,
 `cached_at` integer NOT NULL
);
