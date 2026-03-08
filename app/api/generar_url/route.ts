import { NextResponse } from "next/server"
import { initConfigTable, setSharedUrl } from "@/lib/turso-db"

// Token en base64 guardado en variables de entorno (nunca expuesto al cliente)
const TOKEN_VALIDO = process.env.TOKEN_CREAR_URL

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { token, url } = body

    // Validar que se enviaron los campos requeridos
    if (!token || !url) {
      return NextResponse.json(
        { exito: false, mensaje: "Faltan campos requeridos: token y url" },
        { status: 400 }
      )
    }

    // Validar que el token de entorno esté configurado
    if (!TOKEN_VALIDO) {
      return NextResponse.json(
        { exito: false, mensaje: "Token no configurado en el servidor" },
        { status: 500 }
      )
    }

    // Comparar tokens (ambos en base64)
    if (token !== TOKEN_VALIDO) {
      return NextResponse.json(
        { exito: false, mensaje: "Token inválido" },
        { status: 401 }
      )
    }

    // Inicializar tabla si no existe
    await initConfigTable()

    // Token válido - guardar la URL en Turso DB
    const result = await setSharedUrl(url)

    if (!result.exito) {
      return NextResponse.json(
        { exito: false, mensaje: "Error al guardar la URL en la base de datos", error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      exito: true,
      mensaje: "URL configurada correctamente y guardada en la base de datos",
      url: url
    })

  } catch (error) {
    console.error("Error en generar_url:", error)
    return NextResponse.json(
      { exito: false, mensaje: "Error al procesar la solicitud", error: String(error) },
      { status: 500 }
    )
  }
}
