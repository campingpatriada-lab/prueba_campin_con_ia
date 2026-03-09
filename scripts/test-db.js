import { createClient } from "@libsql/client";
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

console.log("=== Test de conexion a Turso DB ===\n");
console.log("URL_TURSO_DB:", url ? `${url.substring(0, 30)}...` : "NO DEFINIDA");
console.log("TOKEN_TURSO_DB:", token ? "OK (presente)" : "NO DEFINIDO");

if (!url || !token) {
  console.error("\nFaltan variables de entorno. Abortando.");
  process.exit(1);
}

const client = createClient({ url, authToken: token });

async function test() {
  try {
    // 1. Ping basico
    const ping = await client.execute("SELECT 1 AS ok");
    console.log("\n1) Ping basico:", ping.rows[0].ok === 1 ? "CONEXION OK" : "FALLO");

    // 2. Listar tablas
    const tablas = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    );
    console.log("\n2) Tablas encontradas:");
    tablas.rows.forEach((r) => console.log("   -", r.name));

    // 3. Contar registros por tabla
    const tablasEsperadas = ["app_config", "empleado", "estadia", "ingreso", "fogon", "servicios", "servicios_fogones"];
    console.log("\n3) Conteo de registros:");
    for (const tabla of tablasEsperadas) {
      try {
        const count = await client.execute(`SELECT COUNT(*) AS total FROM ${tabla}`);
        console.log(`   - ${tabla}: ${count.rows[0].total} registros`);
      } catch {
        console.log(`   - ${tabla}: NO EXISTE`);
      }
    }

    // 4. Verificar admin
    const admin = await client.execute({
      sql: "SELECT id_empleado, nombre, rol, activo FROM empleado WHERE rol = ?",
      args: ["ADMIN"],
    });
    console.log("\n4) Usuarios ADMIN:");
    if (admin.rows.length === 0) {
      console.log("   Ninguno encontrado (ejecuta scripts/setup-db.js primero)");
    } else {
      admin.rows.forEach((r) =>
        console.log(`   - id:${r.id_empleado} nombre:${r.nombre} rol:${r.rol} activo:${r.activo}`)
      );
    }

    // 5. Verificar schema de cada tabla
    console.log("\n5) Schema de tablas:");
    for (const tabla of tablasEsperadas) {
      try {
        const info = await client.execute(`PRAGMA table_info(${tabla})`);
        const cols = info.rows.map((r) => `${r.name}(${r.type})`).join(", ");
        console.log(`   - ${tabla}: ${cols}`);
      } catch {
        console.log(`   - ${tabla}: NO EXISTE`);
      }
    }

    console.log("\n=== Test completado con exito ===");
  } catch (error) {
    console.error("\nERROR en test:", error);
    process.exit(1);
  }
}

test();
