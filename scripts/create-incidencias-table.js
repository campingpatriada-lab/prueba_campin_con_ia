import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.URL_TURSO_DB,
  authToken: process.env.TOKEN_TURSO_DB,
});

async function main() {
  console.log("[migration] Creando tabla 'incidencias'...");

  await client.execute(`
    CREATE TABLE IF NOT EXISTS incidencias (
      id_incidencia INTEGER PRIMARY KEY AUTOINCREMENT,
      patente TEXT NOT NULL,
      descripcion TEXT NOT NULL,
      fecha NUMERIC DEFAULT CURRENT_TIMESTAMP,
      id_empleado INTEGER NOT NULL,
      id_estadia INTEGER NOT NULL,
      FOREIGN KEY (id_empleado) REFERENCES empleado(id_empleado),
      FOREIGN KEY (id_estadia) REFERENCES estadia(id_estadia)
    )
  `);

  console.log("[migration] Tabla 'incidencias' creada exitosamente.");

  // Verificar estructura
  const info = await client.execute("PRAGMA table_info(incidencias)");
  console.log("[migration] Columnas de 'incidencias':", info.rows.map(r => r.name));
}

main().catch((err) => {
  console.error("[migration] Error:", err);
  process.exit(1);
});
