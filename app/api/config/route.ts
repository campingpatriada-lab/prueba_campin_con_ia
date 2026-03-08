import { NextResponse } from "next/server"
import { getSharedUrl, initConfigTable } from "@/lib/turso-db"

export async function GET() {
  try {
    // Inicializar tabla si no existe
    await initConfigTable()

    // Obtener URL desde Turso DB
    const url = await getSharedUrl()

    if (!url) {
      return NextResponse.json(
        { exito: false, mensaje: "URL no configurada. Inicie el servidor primero." },
        { status: 404 }
      )
    }

    return NextResponse.json({
      exito: true,
      url: url
    })
  } catch (error) {
    console.error("Error obteniendo configuracion:", error)
    return NextResponse.json(
      { exito: false, mensaje: "Error al obtener la configuracion", error: String(error) },
      { status: 500 }
    )
  }
}
