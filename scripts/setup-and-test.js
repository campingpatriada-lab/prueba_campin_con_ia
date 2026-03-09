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

console.log("=== SETUP + TEST Turso DB ===\n");
console.log("URL:", url ? url.substring(0, 40) + "..." : "NO DEFINIDA");
console.log("TOKEN:", token ? "OK (presente)" : "NO DEFINIDO");

if (!url || !token) {
  console.error("\nERROR: Faltan variables de entorno URL_TURSO_DB y/o TOKEN_TURSO_DB");
  process.exit(1);
}

const client = createClient({ url, authToken: token });

async function main() {
  // PASO 1: Crear tablas
  console.log("\n--- PASO 1: Creando tablas ---");

  await client.execute(`
    CREATE TABLE IF NOT EXISTS app_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log("  app_config: OK");

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
  console.log("  empleado: OK");

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
      FOREIGN KEY (id_empleado) REFERENCES empleado(id_empleado) ON DELETE RESTRICT
    )
  `);
  console.log("  estadia: OK");

  await client.execute(`
    CREATE TABLE IF NOT EXISTS ingreso (
      id_ingreso INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha DATE NOT NULL,
      monto REAL NOT NULL,
      concepto TEXT NOT NULL,
      tipo_ingreso TEXT,
      id_empleado INTEGER NOT NULL,
      id_estadia INTEGER,
      FOREIGN KEY (id_empleado) REFERENCES empleado(id_empleado) ON DELETE RESTRICT,
      FOREIGN KEY (id_estadia) REFERENCES estadia(id_estadia) ON DELETE SET NULL
    )
  `);
  console.log("  ingreso: OK");

  await client.execute(`
    CREATE TABLE IF NOT EXISTS fogon (
      id_fogon INTEGER PRIMARY KEY,
      numero_fogon INTEGER,
      estado INTEGER DEFAULT 0
    )
  `);
  console.log("  fogon: OK");

  await client.execute(`
    CREATE TABLE IF NOT EXISTS servicios (
      id_servicio INTEGER PRIMARY KEY,
      nombre_servicio TEXT
    )
  `);
  console.log("  servicios: OK");

  await client.execute(`
    CREATE TABLE IF NOT EXISTS servicios_fogones (
      id_servicio_fogones INTEGER PRIMARY KEY,
      id_fogon INTEGER,
      id_servicio INTEGER
    )
  `);
  console.log("  servicios_fogones: OK");

  await client.execute(`
    INSERT INTO servicios (nombre_servicio) VALUES
    ('agua'),
    ('luz'),
    ('parrilla'),
    ('internet')
  `);
  console.log("  Seed servicios: OK");

  const info = await client.execute(`PRAGMA table_info(estadia)`);
  const hasIdFogon = info.rows.some((r) => r.name === "id_fogon");
  if (!hasIdFogon) {
    await client.execute(`PRAGMA foreign_keys = ON`);
    await client.execute(`ALTER TABLE estadia ADD COLUMN id_fogon INTEGER REFERENCES fogon(id_fogon)`);
    console.log("  estadia: columna id_fogon agregada");
  } else {
    console.log("  estadia: columna id_fogon ya existe");
  }


  const existing = await client.execute({
    sql: "SELECT id_empleado, nombre, rol FROM empleado WHERE nombre = ?",
    args: ["facundo"],
  });

  if (existing.rows.length > 0) {
    console.log("  Admin ya existe:", JSON.stringify(existing.rows[0]));
  } else {
    const hash = hashSync("159357", 10);
    await client.execute({
      sql: "INSERT INTO empleado (nombre, password_hash, activo, rol) VALUES (?, ?, 1, 'ADMIN')",
      args: ["facundo", hash],
    });
    console.log("  Admin 'facundo' creado con password '159357'");
  }

  // PASO 3: Verificacion
  console.log("\n--- PASO 3: Verificacion ---");

  const tables = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
  );
  console.log("  Tablas:", tables.rows.map((r) => r.name).join(", "));

  const countEmpleado = await client.execute("SELECT COUNT(*) as c FROM empleado");
  const countEstadia = await client.execute("SELECT COUNT(*) as c FROM estadia");
  const countIngreso = await client.execute("SELECT COUNT(*) as c FROM ingreso");

  console.log("  empleado:", countEmpleado.rows[0].c, "registros");
  console.log("  estadia:", countEstadia.rows[0].c, "registros");
  console.log("  ingreso:", countIngreso.rows[0].c, "registros");

  // Mostrar admin
  const admin = await client.execute("SELECT id_empleado, nombre, rol, activo FROM empleado");
  console.log("\n  Empleados:");
  for (const row of admin.rows) {
    console.log("    -", JSON.stringify(row));
  }

  console.log("\n=== TODO OK ===");
}

main().catch((err) => {
  console.error("\nERROR FATAL:", err.message);
  process.exit(1);
});
