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

function hoy() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function masDias(dias) {
  const d = new Date()
  d.setDate(d.getDate() + dias)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

loadEnv()

const url = process.env.URL_TURSO_DB || process.env.TURSO_DATABASE_URL
const token = process.env.TOKEN_TURSO_DB || process.env.TURSO_AUTH_TOKEN

async function main() {
  const client = createClient({ url, authToken: token })
  const fechaEntrada = hoy()

  for (let numero = 1; numero <= 12; numero++) {
    const fogRes = await client.execute({
      sql: `SELECT id_fogon FROM fogon WHERE numero_fogon = ? LIMIT 1`,
      args: [numero],
    })
    if (fogRes.rows.length === 0) continue
    const idFogon = Number(fogRes.rows[0].id_fogon)

    await client.execute({ sql: `UPDATE fogon SET estado = 1 WHERE id_fogon = ?`, args: [idFogon] })

    const estRes = await client.execute({
      sql: `SELECT id_estadia FROM estadia WHERE id_fogon = ? AND estado = 1 LIMIT 1`,
      args: [idFogon],
    })

    const fechaSalida = masDias(((numero - 1) % 5) + 1) // 1..5 dias

    if (estRes.rows.length === 0) {
      await client.execute({
        sql: `
          INSERT INTO estadia (
            patente, cantidad_personas, cantidad_menores,
            fecha_entrada, fecha_salida,
            nombre_responsable, dni_responsable,
            tipo_estadia, observaciones,
            id_empleado, estado,
            hora_ingreso, id_fogon
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
        `,
        args: [
          `TESTF${numero}`,
          2,
          0,
          fechaEntrada,
          fechaSalida,
          null,
          null,
          "acampe",
          "ocupado por seed",
          1,
          "10:00",
          idFogon,
        ],
      })
    } else {
      await client.execute({
        sql: `UPDATE estadia SET fecha_salida = ? WHERE id_estadia = ?`,
        args: [fechaSalida, Number(estRes.rows[0].id_estadia)],
      })
    }
  }

  const ocupados = await client.execute(`SELECT COUNT(*) AS c FROM fogon WHERE estado = 1`)
  console.log(`Fogones ocupados: ${Number(ocupados.rows[0].c)}`)
}

main().catch((err) => {
  console.error("Error ocupando fogones:", err)
  process.exit(1)
})
