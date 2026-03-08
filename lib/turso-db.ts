import { createClient } from "@libsql/client"

// Cliente de Turso para la base de datos compartida
export const tursoClient = createClient({
  url: process.env.URL_TURSO_DB!,
  authToken: process.env.TOKEN_TURSO_DB!,
})

// Nombre de la tabla para la configuracion
const CONFIG_TABLE = "app_config"
const URL_KEY = "scanner_url"

// Inicializar la tabla si no existe
export async function initConfigTable() {
  try {
    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS ${CONFIG_TABLE} (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `)
    return { exito: true }
  } catch (error) {
    console.error("Error creando tabla de configuracion:", error)
    return { exito: false, error: String(error) }
  }
}

// Obtener la URL compartida desde la base de datos
export async function getSharedUrl(): Promise<string | null> {
  try {
    const result = await tursoClient.execute({
      sql: `SELECT value FROM ${CONFIG_TABLE} WHERE key = ?`,
      args: [URL_KEY],
    })

    if (result.rows.length > 0) {
      return result.rows[0].value as string
    }
    return null
  } catch (error) {
    console.error("Error obteniendo URL compartida:", error)
    return null
  }
}

// Guardar la URL compartida en la base de datos
export async function setSharedUrl(url: string): Promise<{ exito: boolean; error?: string }> {
  try {
    // Usar UPSERT (INSERT OR REPLACE)
    await tursoClient.execute({
      sql: `INSERT OR REPLACE INTO ${CONFIG_TABLE} (key, value, updated_at) VALUES (?, ?, datetime('now'))`,
      args: [URL_KEY, url],
    })
    return { exito: true }
  } catch (error) {
    console.error("Error guardando URL compartida:", error)
    return { exito: false, error: String(error) }
  }
}

// export class Consutlas{

//   static async buscarUsuario(nombre:string):Promise<{exito:boolean,error?:string,dato?:any}>{
//     try{
//       const usuario= await tursoClient.execute({
//         sql:`SELECT 
//               id_empleado,
//               nombre,
//               password_hash,
//               activo
//             FROM empleado
//             WHERE nombre=?`,
//         args:[nombre]
//       })
//       return {exito:true,dato:usuario};
//     }catch(err){
//       return {exito:false,error:"problemas al buscar un usuario"}
//     }
//   }



// }
