import {
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { promisify } from "node:util";
import { database } from "../db/database";
import type { User } from "@/shared/contracts";
import { HttpError } from "../http/response";
const scrypt = promisify(scryptCallback);
export const SESSION_COOKIE = "foodwise-session";
export const SESSION_DURATION = 60 * 60 * 24 * 7;
export const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${key.toString("hex")}`;
}
export async function verifyPassword(password: string, hash: string) {
  const [salt, expected] = hash.split(":");
  if (!salt || !expected) return false;
  const key = (await scrypt(password, salt, 64)) as Buffer;
  const stored = Buffer.from(expected, "hex");
  return key.length === stored.length && timingSafeEqual(key, stored);
}
export function authThrottle(email: string) {
  const key = tokenHash(email.toLowerCase());
  const db = database();
  db.prepare("DELETE FROM auth_attempts WHERE expires_at < ?").run(Date.now());
  const row = db
    .prepare("SELECT count FROM auth_attempts WHERE key=?")
    .get(key);
  if (Number(row?.count || 0) >= 10)
    throw new HttpError(
      429,
      "Too many attempts. Wait 15 minutes before trying again.",
    );
  db.prepare(
    "INSERT INTO auth_attempts VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1",
  ).run(key, Date.now() + 900000);
}
export async function registerAccount(
  name: string,
  email: string,
  password: string,
): Promise<User> {
  const db = database();
  if (db.prepare("SELECT id FROM users WHERE email=?").get(email))
    throw new HttpError(
      409,
      "An account with this email already exists. Try signing in.",
    );
  const user = { id: randomUUID(), name, email };
  const passwordHash = await hashPassword(password);
  try {
    db.prepare("INSERT INTO users VALUES(?,?,?,?,?)").run(
      user.id,
      email,
      name,
      passwordHash,
      Date.now(),
    );
  } catch {
    throw new HttpError(
      409,
      "This email could not be registered. Try signing in.",
    );
  }
  return user;
}
export async function signInAccount(
  email: string,
  password: string,
): Promise<User> {
  const row = database()
    .prepare("SELECT * FROM users WHERE email=?")
    .get(email);
  // Run scrypt even when the email does not exist.
  const valid = await verifyPassword(
    password,
    String(
      row?.password_hash ||
        "00000000000000000000000000000000:" + "0".repeat(128),
    ),
  );
  if (!row || !valid)
    throw new HttpError(401, "Email or password is incorrect.");
  database()
    .prepare("DELETE FROM auth_attempts WHERE key=?")
    .run(tokenHash(email));
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
  };
}
export function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const db = database();
  db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(Date.now());
  db.prepare("INSERT INTO sessions VALUES(?,?,?)").run(
    tokenHash(token),
    userId,
    Date.now() + SESSION_DURATION * 1000,
  );
  return token;
}
export function sessionUser(token?: string): User | null {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const row = database()
    .prepare(
      `SELECT u.id,u.name,u.email FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?`,
    )
    .get(tokenHash(token), Date.now());
  return row
    ? { id: String(row.id), name: String(row.name), email: String(row.email) }
    : null;
}
export function revokeSession(token: string) {
  database()
    .prepare("DELETE FROM sessions WHERE token_hash=?")
    .run(tokenHash(token));
}
export function deleteAccount(userId: string) {
  database().prepare("DELETE FROM users WHERE id=?").run(userId);
}
