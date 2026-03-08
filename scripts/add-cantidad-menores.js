import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.URL_TURSO_DB,
  authToken: process.env.TOKEN_TURSO_DB,
});

async function main() {
  console.log("[migration] Agregando columna 'cantidad_menores' a tabla 'estadia'...");

  await client.execute(`
    ALTER TABLE estadia ADD COLUMN cantidad_menores INTEGER DEFAULT 0
  `);

  console.log("[migration] Columna 'cantidad_menores' agregada exitosamente.");

  // Verificar que la columna existe
  const info = await client.execute("PRAGMA table_info(estadia)");
  console.log("[migration] Columnas de 'estadia':", info.rows.map(r => r.name));
}

main().catch((err) => {
  console.error("[migration] Error:", err);
  process.exit(1);
});
