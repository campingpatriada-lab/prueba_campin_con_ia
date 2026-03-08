import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.URL_TURSO_DB,
  authToken: process.env.TOKEN_TURSO_DB,
});

async function main() {
  // Eliminar tabla existente
  await client.execute("DROP TABLE IF EXISTS licencia");
  console.log("Tabla licencia eliminada (si existia)");

  // Crear nueva tabla con 2 campos
  await client.execute(`
    CREATE TABLE licencia (
      licencia TEXT NOT NULL,
      estado TEXT NOT NULL
    )
  `);
  console.log("Tabla licencia creada con campos: licencia, estado");

  // Insertar valor inicial
  await client.execute({
    sql: "INSERT INTO licencia (licencia, estado) VALUES (?, ?)",
    args: ["default", "false"],
  });
  console.log("Valor inicial insertado: licencia='default', estado='false'");
}

main().catch(console.error);
