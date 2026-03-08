import { NextResponse } from "next/server"
import { getSharedUrl, initConfigTable } from "@/lib/turso-db"
import { validarAutenticado } from "@/lib/auth"
import { buscarPorPatenteServicio } from "@/lib/services/estadia.service"

// GET: Proxy para /iniciar (escaneo automatico con camara)
// El scanner externo detecta la patente, luego buscamos en Turso
export async function GET() {
  try {
    await validarAutenticado()

    // Inicializar tabla si no existe
    await initConfigTable()

    // Obtener URL del scanner externo desde Turso DB
    const apiUrl = await getSharedUrl()

    if (!apiUrl) {
      return NextResponse.json(
        { exito: false, mensaje: "URL del servidor no configurada" },
        { status: 404 }
      )
    }

    // Hacer la peticion al servidor externo de escaneo
    const res = await fetch(`${apiUrl}/iniciar`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    const data = await res.json()

    // Si el scanner detecto una patente, buscar en nuestra BD
    if (data.patente) {
      try {
        const estadias = await buscarPorPatenteServicio(data.patente)
        const estadia = estadias[0]
        return NextResponse.json({
          exito: true,
          mensaje: "Patente encontrada en el sistema",
          patente: data.patente,
          data: estadia,
          intentos: data.intentos,
          tiempo: data.tiempo,
        })
      } catch {
        // Patente detectada pero no registrada en el sistema
        return NextResponse.json({
          exito: false,
          mensaje: `Patente ${data.patente} detectada pero no tiene estadia activa`,
          patente: data.patente,
          intentos: data.intentos,
          tiempo: data.tiempo,
        })
      }
    }

    // Si no detecto patente, devolver el resultado del scanner
    return NextResponse.json(data, { status: res.status })
  } catch (error: any) {
    const isAuth = error.message?.includes("No autenticado")
    if (isAuth) {
      return NextResponse.json(
        { exito: false, mensaje: "No autenticado" },
        { status: 403 }
      )
    }

    console.error("Error en proxy /iniciar:", error)
    return NextResponse.json(
      {
        exito: false,
        mensaje: "Error al conectar con el servidor de escaneo",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    )
  }
}

// POST: Busqueda manual por patente - busca en Turso directamente
export async function POST(request: Request) {
  try {
    await validarAutenticado()

    const body = await request.json()
    const { patente } = body

    if (!patente) {
      return NextResponse.json(
        { exito: false, mensaje: "Falta parametro patente" },
        { status: 400 }
      )
    }

    const patenteUpper = patente.trim().toUpperCase()

    try {
      const estadias = await buscarPorPatenteServicio(patenteUpper)
      if (estadias.length === 1) {
        const found = estadias[0] as any
        return NextResponse.json({
          exito: true,
          mensaje: "Patente encontrada",
          patente: (found.patente || patenteUpper).toString().toUpperCase(),
          data: found,
        })
      }
      // Multiples coincidencias
      return NextResponse.json({
        exito: true,
        mensaje: `${estadias.length} estadias encontradas`,
        patente: patenteUpper,
        multiple: true,
        resultados: estadias,
      })
    } catch {
      return NextResponse.json({
        exito: false,
        mensaje: "Patente no encontrada",
        patente: patenteUpper,
      })
    }
  } catch (error: any) {
    const isAuth = error.message?.includes("No autenticado")
    if (isAuth) {
      return NextResponse.json(
        { exito: false, mensaje: "No autenticado" },
        { status: 403 }
      )
    }

    console.error("Error en busqueda manual:", error)
    return NextResponse.json(
      {
        exito: false,
        mensaje: "Error al buscar patente",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    )
  }
}
