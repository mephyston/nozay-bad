import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";

const sqlite = new Database("apps/admin/local.db");
const db = drizzle(sqlite);

const res = sqlite.query("SELECT * FROM season_category_budgets").all();
console.log("Budgets:", res);
const seasons = sqlite.query("SELECT * FROM seasons").all();
console.log("Seasons:", seasons);
