import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
export const records = sqliteTable(
  "records",
  {
    id: text("id").primaryKey(),
    owner: text("owner").notNull(),
    kind: text("kind").notNull(),
    payload: text("payload").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    index("records_owner_kind_created").on(
      table.owner,
      table.kind,
      table.createdAt,
    ),
  ],
);
export const productCache = sqliteTable("product_cache", {
  barcode: text("barcode").primaryKey(),
  payload: text("payload").notNull(),
  cachedAt: integer("cached_at").notNull(),
});
