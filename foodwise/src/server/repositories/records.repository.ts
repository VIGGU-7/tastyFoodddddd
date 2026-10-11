import { randomUUID } from "node:crypto";
import { database } from "../db/database";
import type { RecordPayload, SavedRecord } from "@/shared/contracts";
import type { Food } from "@/features/nutrition/domain/types";

export function readRecords(owner: string): SavedRecord[] {
  const rows = database()
    .prepare(
      "SELECT id,kind,payload,created_at FROM records WHERE owner=? ORDER BY created_at DESC LIMIT 500",
    )
    .all(owner);
  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    payload: JSON.parse(String(row.payload)),
    createdAt: row.created_at,
  })) as SavedRecord[];
}
export function saveRecord<K extends keyof RecordPayload>(
  owner: string,
  kind: K,
  payload: RecordPayload[K],
  key?: string,
) {
  const id = key ? `${kind}:${owner}:${key}` : randomUUID();
  database()
    .prepare(
      `INSERT INTO records(id,owner,kind,payload,created_at) VALUES(?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,created_at=excluded.created_at WHERE records.owner=excluded.owner`,
    )
    .run(id, owner, kind, JSON.stringify(payload), Date.now());
  return id;
}
export function deleteRecords(owner: string) {
  database().prepare("DELETE FROM records WHERE owner=?").run(owner);
}
export function cachedProduct(barcode: string): Food | null {
  const row = database()
    .prepare("SELECT payload,cached_at FROM product_cache WHERE barcode=?")
    .get(barcode);
  return row && Date.now() - Number(row.cached_at) < 86400000
    ? (JSON.parse(String(row.payload)) as Food)
    : null;
}
export function cacheProduct(barcode: string, food: Food) {
  database()
    .prepare(
      "INSERT INTO product_cache VALUES(?,?,?) ON CONFLICT(barcode) DO UPDATE SET payload=excluded.payload,cached_at=excluded.cached_at",
    )
    .run(barcode, JSON.stringify(food), Date.now());
}
