import { createClient } from "@libsql/client";
import { hashSync } from "bcryptjs";
import fs from "fs";
import path from "path";

function loadEnv() {
  try {
    const dotenvPath = path.join(process.cwd(), ".env");
    if (fs.existsSync(dotenvPath)) {
      const content = fs.readFileSync(dotenvPath, "utf8");
      for (const line of content.split(/\r?\n/)) {
        const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
        if (match) {
          const key = match[1];
          let value = match[2];
          if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          if (!process.env[key]) process.env[key] = value;
        }
      }
    }
  } catch {
    // ignore
  }
}

loadEnv();

const url = process.env.URL_TURSO_DB || process.env.TURSO_DATABASE_URL;
const token = process.env.TOKEN_TURSO_DB || process.env.TURSO_AUTH_TOKEN;

const client = createClient({
  url,
  authToken: token,
});

async function main() {
  console.log("[setup-db] Starting database setup...");

  // 1. app_config table
  console.log("[setup-db] Creating table 'app_config'...");
  await client.execute(`
    CREATE TABLE IF NOT EXISTS app_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log("[setup-db] Table 'app_config' OK.");

  // 2. empleado table
  console.log("[setup-db] Creating table 'empleado'...");
  await client.execute(`
    CREATE TABLE IF NOT EXISTS empleado (
      id_empleado INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      activo INTEGER NOT NULL DEFAULT 1,
      rol TEXT NOT NULL DEFAULT 'EMPLEADO',
      creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log("[setup-db] Table 'empleado' OK.");

  // 3. estadia table
  console.log("[setup-db] Creating table 'estadia'...");
  await client.execute(`
    CREATE TABLE IF NOT EXISTS estadia (
      id_estadia INTEGER PRIMARY KEY AUTOINCREMENT,
      patente TEXT,
      cantidad_personas INTEGER NOT NULL,
      fecha_entrada DATE NOT NULL,
      fecha_salida DATE,
      nombre_responsable TEXT,
      dni_responsable TEXT,
      tipo_estadia TEXT,
      estado INTEGER NOT NULL DEFAULT 1,
      observaciones TEXT,
      id_empleado INTEGER NOT NULL,
      FOREIGN KEY (id_empleado)
        REFERENCES empleado(id_empleado)
        ON DELETE RESTRICT
    )
  `);
  console.log("[setup-db] Table 'estadia' OK.");

  // 4. ingreso table
  console.log("[setup-db] Creating table 'ingreso'...");
  await client.execute(`
    CREATE TABLE IF NOT EXISTS ingreso (
      id_ingreso INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha DATE NOT NULL,
      monto REAL NOT NULL,
      concepto TEXT NOT NULL,
      tipo_ingreso TEXT,
      id_empleado INTEGER NOT NULL,
      id_estadia INTEGER,
      FOREIGN KEY (id_empleado)
        REFERENCES empleado(id_empleado)
        ON DELETE RESTRICT,
      FOREIGN KEY (id_estadia)
        REFERENCES estadia(id_estadia)
        ON DELETE SET NULL
    )
  `);
  console.log("[setup-db] Table 'ingreso' OK.");


  // Verify tables exist
  const tables = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
  );
  console.log(
    "[setup-db] Existing tables:",
    tables.rows.map((r) => r.name)
  );
  console.log("[setup-db] Creating table 'fogon'...");
  await client.execute(`
    CREATE TABLE IF NOT EXISTS fogon (
      id_fogon INTEGER PRIMARY KEY,
      numero_fogon INTEGER,
      estado INTEGER DEFAULT 0
    )
  `);
  console.log("[setup-db] Table 'fogon' OK.");

  console.log("[setup-db] Creating table 'servicios'...");
  await client.execute(`
    CREATE TABLE IF NOT EXISTS servicios (
      id_servicio INTEGER PRIMARY KEY,
      nombre_servicio TEXT
    )
  `);
  console.log("[setup-db] Table 'servicios' OK.");

  console.log("[setup-db] Creating table 'servicios_fogones'...");
  await client.execute(`
    CREATE TABLE IF NOT EXISTS servicios_fogones (
      id_servicio_fogones INTEGER PRIMARY KEY,
      id_fogon INTEGER,
      id_servicio INTEGER
    )
  `);
  console.log("[setup-db] Table 'servicios_fogones' OK.");

  console.log("[setup-db] Seeding 'servicios'...");
  await client.execute(`
    INSERT INTO servicios (nombre_servicio) VALUES
    ('agua'),
    ('luz'),
    ('parrilla'),
    ('internet')
  `);
  console.log("[setup-db] Seed 'servicios' OK.");

  console.log("[setup-db] Checking column 'id_fogon' in 'estadia'...");
  const info = await client.execute(`PRAGMA table_info(estadia)`);
  const hasIdFogon = info.rows.some((r) => r.name === "id_fogon");
  if (!hasIdFogon) {
    await client.execute(`PRAGMA foreign_keys = ON`);
    await client.execute(`ALTER TABLE estadia ADD COLUMN id_fogon INTEGER REFERENCES fogon(id_fogon)`);
    console.log("[setup-db] Column 'id_fogon' added to 'estadia'.");
  } else {
    console.log("[setup-db] Column 'id_fogon' already exists.");
  }


  console.log("[setup-db] Checking if admin user 'facundo' exists...");
  const existing = await client.execute({
    sql: "SELECT id_empleado FROM empleado WHERE nombre = ?",
  });

  if (existing.rows.length > 0) {
    console.log("[setup-db] Admin user 'facundo' already exists, skipping seed.");
  } else {
    console.log("[setup-db] Creating admin user 'facundo'...");
    const hash = hashSync("159357", 10);
    await client.execute({
      sql: "INSERT INTO empleado (nombre, password_hash, activo, rol) VALUES (?, ?, 1, 'ADMIN')",
      args: ["facundo", hash],
    });
    console.log("[setup-db] Admin user 'facundo' created successfully.");
  }

  console.log("[setup-db] Database setup completed successfully.");
}

main().catch((err) => {
  console.error("[setup-db] Fatal error:", err);
  process.exit(1);
});
