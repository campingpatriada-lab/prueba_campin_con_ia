import { createClient } from "@libsql/client";
import { hashSync } from "bcryptjs";

const client = createClient({
  url: process.env.URL_TURSO_DB,
  authToken: process.env.TOKEN_TURSO_DB,
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

  // 5. Seed admin user "facundo" with password "159357"
  console.log("[setup-db] Checking if admin user 'facundo' exists...");
  const existing = await client.execute({
    sql: "SELECT id_empleado FROM empleado WHERE nombre = ?",
    args: ["facundo"],
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
