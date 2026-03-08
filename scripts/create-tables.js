import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.URL_TURSO_DB,
  authToken: process.env.TOKEN_TURSO_DB,
});

async function main() {
  console.log("[create-tables] Creando tablas en Turso...");

  // 1. Tabla empleado
  console.log("[create-tables] Creando tabla 'empleado'...");
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
  console.log("[create-tables] Tabla 'empleado' OK.");

  // 2. Tabla estadia
  console.log("[create-tables] Creando tabla 'estadia'...");
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
  console.log("[create-tables] Tabla 'estadia' OK.");

  // 3. Tabla ingreso
  console.log("[create-tables] Creando tabla 'ingreso'...");
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
  console.log("[create-tables] Tabla 'ingreso' OK.");

  // Verificar que las tablas existen
  const tables = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
  );
  console.log(
    "[create-tables] Tablas existentes:",
    tables.rows.map((r) => r.name)
  );

  console.log("[create-tables] Migracion completada exitosamente.");
}

main().catch((err) => {
  console.error("[create-tables] Error fatal:", err);
  process.exit(1);
});
