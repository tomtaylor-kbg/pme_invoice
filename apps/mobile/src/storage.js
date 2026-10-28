import { Platform } from "react-native";
import * as SQLite from "expo-sqlite";

const databasePromise = Platform.OS === "web" ? null : SQLite.openDatabaseAsync("ozotoo-invoice.db");
const initializedDatabase = databasePromise?.then(async (database) => {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS app_storage (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  return database;
});

async function getDatabase() {
  if (!initializedDatabase) throw new Error("SQLite n’est pas disponible sur cette plateforme.");
  return initializedDatabase;
}

export async function getStoredValue(key) {
  if (Platform.OS === "web") return globalThis.localStorage?.getItem(key) || null;
  const database = await getDatabase();
  const row = await database.getFirstAsync("SELECT value FROM app_storage WHERE key = ?", key);
  return row?.value || null;
}

export async function setStoredValue(key, value) {
  if (Platform.OS === "web") return globalThis.localStorage?.setItem(key, value);
  const database = await getDatabase();
  await database.runAsync("INSERT INTO app_storage (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP", key, String(value));
}

export async function deleteStoredValue(key) {
  if (Platform.OS === "web") return globalThis.localStorage?.removeItem(key);
  const database = await getDatabase();
  await database.runAsync("DELETE FROM app_storage WHERE key = ?", key);
}

export async function clearStoredCache() {
  if (Platform.OS === "web") {
    for (let index = 0; index < globalThis.localStorage.length; index += 1) {
      const key = globalThis.localStorage.key(index);
      if (key?.startsWith("cache:")) globalThis.localStorage.removeItem(key);
    }
    return;
  }
  const database = await getDatabase();
  await database.runAsync("DELETE FROM app_storage WHERE key LIKE 'cache:%'");
}
