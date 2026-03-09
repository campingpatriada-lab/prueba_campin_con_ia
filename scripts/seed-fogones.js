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

async function ensureServicio(client, nombre) {
  const res = await client.execute({
    sql: `SELECT id_servicio FROM servicios WHERE nombre_servicio = ? LIMIT 1`,
    args: [nombre],
  })
  if (res.rows.length > 0) return Number(res.rows[0].id_servicio)
  const ins = await client.execute({
    sql: `INSERT INTO servicios (nombre_servicio) VALUES (?)`,
    args: [nombre],
  })
  return Number(ins.lastInsertRowid)
}

async function upsertFogon(client, numero) {
  const res = await client.execute({
    sql: `SELECT id_fogon FROM fogon WHERE numero_fogon = ? LIMIT 1`,
    args: [numero],
  })
  if (res.rows.length > 0) return Number(res.rows[0].id_fogon)
  const ins = await client.execute({
    sql: `INSERT INTO fogon (numero_fogon, estado) VALUES (?, 0)`,
    args: [numero],
  })
  return Number(ins.lastInsertRowid)
}

async function main() {
  const client = createClient({ url, authToken: token })
  const serviciosBase = ["agua", "luz", "parrilla", "internet"]
  const servicioIds = {}
  for (const nombre of serviciosBase) {
    servicioIds[nombre] = await ensureServicio(client, nombre)
  }

  const combos = [
    ["agua", "parrilla"],
    ["luz", "internet"],
    ["agua", "luz"],
    ["parrilla", "internet"],
    ["agua", "internet"],
    ["luz", "parrilla"],
  ]

  for (let numero = 1; numero <= 20; numero++) {
    const idFogon = await upsertFogon(client, numero)
    await client.execute({ sql: `DELETE FROM servicios_fogones WHERE id_fogon = ?`, args: [idFogon] })
    const combo = combos[(numero - 1) % combos.length]
    for (const nombre of combo) {
      const idServicio = servicioIds[nombre]
      await client.execute({
        sql: `INSERT INTO servicios_fogones (id_fogon, id_servicio) VALUES (?, ?)`,
        args: [idFogon, idServicio],
      })
    }
  }

  const countFogon = await client.execute(`SELECT COUNT(*) AS c FROM fogon`)
  const countSF = await client.execute(`SELECT COUNT(*) AS c FROM servicios_fogones`)
  console.log(`Fogones: ${Number(countFogon.rows[0].c)} | servicios_fogones: ${Number(countSF.rows[0].c)}`)
}

main().catch((err) => {
  console.error("Error seed fogones:", err)
  process.exit(1)
})
