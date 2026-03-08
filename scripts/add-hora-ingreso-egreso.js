import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.URL_TURSO_DB,
  authToken: process.env.TOKEN_TURSO_DB,
});

async function main() {
  console.log("[migration] Verificando columnas en tabla 'estadia'...");

  // Verificar columnas existentes
  const info = await client.execute("PRAGMA table_info(estadia)");
  const columnas = info.rows.map((r) => r.name);
  console.log("[migration] Columnas actuales:", columnas);

  // hora_ingreso: TEXT NOT NULL DEFAULT (CURRENT_TIME)
  // Nota: SQLite ALTER TABLE ADD COLUMN no soporta DEFAULT con expresiones.
  // Se usa DEFAULT '00:00' en el ALTER y la app asignara la hora real al crear.
  if (!columnas.includes("hora_ingreso")) {
    await client.execute(
      `ALTER TABLE estadia ADD COLUMN hora_ingreso TEXT NOT NULL DEFAULT '00:00'`
    );
    console.log("[migration] Columna 'hora_ingreso' agregada (TEXT NOT NULL DEFAULT '00:00').");
  } else {
    console.log("[migration] Columna 'hora_ingreso' ya existe, saltando.");
  }

  // hora_egreso: TEXT DEFAULT NULL
  if (!columnas.includes("hora_egreso")) {
    await client.execute(
      `ALTER TABLE estadia ADD COLUMN hora_egreso TEXT DEFAULT NULL`
    );
    console.log("[migration] Columna 'hora_egreso' agregada (TEXT DEFAULT NULL).");
  } else {
    console.log("[migration] Columna 'hora_egreso' ya existe, saltando.");
  }

  // Verificar resultado final
  const infoFinal = await client.execute("PRAGMA table_info(estadia)");
  console.log("[migration] Columnas finales:", infoFinal.rows.map((r) => `${r.name} (${r.type})`));

  console.log("[migration] Migracion completada exitosamente.");
}

main().catch((err) => {
  console.error("[migration] Error:", err);
  process.exit(1);
});
