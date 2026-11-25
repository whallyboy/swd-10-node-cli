import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = join(fileURLToPath(import.meta.url), "..", "..");
const DATA_DIR = join(__dirname, "data");
const EXPENSES_FILE = join(DATA_DIR, "expenses.json");
const SETTINGS_FILE = join(DATA_DIR, "settings.json");

async function ensureDataFile() {
  try {
    await mkdir(DATA_DIR, { recursive: true });
  } catch {}
  try {
    await readFile(EXPENSES_FILE, "utf8");
  } catch {
    await writeFile(EXPENSES_FILE, "[]", "utf8");
  }
  try {
    await readFile(SETTINGS_FILE, "utf8");
  } catch {
    await writeFile(SETTINGS_FILE, JSON.stringify({ budget: null }, null, 2), "utf8");
  }
}

export async function loadExpenses() {
  await ensureDataFile();
  const content = await readFile(EXPENSES_FILE, "utf8");
  try {
    return JSON.parse(content);
  } catch {
    return [];
  }
}

export async function saveExpenses(expenses) {
  await ensureDataFile();
  await writeFile(EXPENSES_FILE, JSON.stringify(expenses, null, 2), "utf8");
}

export async function loadSettings() {
  await ensureDataFile();
  const content = await readFile(SETTINGS_FILE, "utf8");
  try {
    return JSON.parse(content);
  } catch {
    return { budget: null };
  }
}

export async function saveSettings(settings) {
  await ensureDataFile();
  await writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf8");
}