import { createClient } from "@libsql/client";

const tursoClient = createClient({
  url: process.env.URL_TURSO_DB,
  authToken: process.env.TOKEN_TURSO_DB,
});

async function main() {
  console.log("Creando tabla licencia...");

  await tursoClient.execute(`
    CREATE TABLE IF NOT EXISTS licencia (
      estado_licencia TEXT NOT NULL DEFAULT 'false'
    )
  `);

  // Insertar valor inicial si la tabla esta vacia
  const check = await tursoClient.execute("SELECT COUNT(*) as count FROM licencia");
  if (Number(check.rows[0].count) === 0) {
    await tursoClient.execute("INSERT INTO licencia (estado_licencia) VALUES ('false')");
    console.log("Valor inicial insertado: false");
  }

  console.log("Tabla licencia creada exitosamente");
}

main().catch(console.error);
