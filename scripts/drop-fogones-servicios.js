import { createClient } from "@libsql/client"
import fs from "fs"
import path from "path"

function loadEnv() {
  try {
    const dotenvPath = path.join(process.cwd(), ".env")
    if (fs.existsSync(dotenvPath)) {
      const content = fs.readFileSync(dotenvPath, "utf8")
      for (const line of content.split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
        if (m) {
          const k = m[1]
          let v = m[2]
          if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
            v = v.slice(1, -1)
          }
          if (!process.env[k]) process.env[k] = v
        }
      }
    }
  } catch {}
}

loadEnv()

const url = process.env.URL_TURSO_DB || process.env.TURSO_DATABASE_URL
const token = process.env.TOKEN_TURSO_DB || process.env.TURSO_AUTH_TOKEN

async function main() {
  const client = createClient({ url, authToken: token })

  await client.execute(`DROP TABLE IF EXISTS fogon_servicios`)
  await client.execute(`DROP TABLE IF EXISTS fogones`)
  await client.execute(`DROP TABLE IF EXISTS servicios`)

  const tablas = await client.execute(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`)
  console.log("Tablas actuales:", tablas.rows.map(r => r.name).join(", "))
}

main().catch(err => {
  console.error("Error:", err)
  process.exit(1)
})
