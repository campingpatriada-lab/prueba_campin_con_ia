import { NextResponse } from "next/server"
import { getSharedUrl, initConfigTable } from "@/lib/turso-db"
import { validarAutenticado } from "@/lib/auth"
import { buscarPorPatenteServicio } from "@/lib/services/estadia.service"
import jwt from "jsonwebtoken"
import { GuardarFotoServicio } from "./guardarFoto"

const jwt_secreta = process.env.JWT_SECRET || ""

const loginPrueba = {
  usuario: "Admin",
  id: 20,
}

const JWT_TEMPORAL = jwt_secreta ? jwt.sign(loginPrueba, jwt_secreta) : ""

export async function POST(request: Request) {
  let publicId: string | null = null

  try {
    await validarAutenticado()

    if (!jwt_secreta) {
      return NextResponse.json(
        { exito: false, mensaje: "JWT_SECRET no configurado" },
        { status: 500 }
      )
    }

    // 1. FormData
    const formData = await request.formData()
    const imagen = formData.get("imagen")

    if (!imagen || !(imagen instanceof File)) {
      return NextResponse.json(
        { exito: false, mensaje: "No se envio ninguna imagen" },
        { status: 400 }
      )
    }

    const tiposPermitidos = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "image/webp",
      "image/heic",
    ]

    if (!tiposPermitidos.includes(imagen.type)) {
      return NextResponse.json(
        {
          exito: false,
          mensaje: "Formato de imagen no soportado",
          tipo: imagen.type,
        },
        { status: 400 }
      )
    }

    // 2. Config DB
    await initConfigTable()
    const apiUrl = await getSharedUrl()

    if (!apiUrl) {
      return NextResponse.json(
        { exito: false, mensaje: "URL del servidor no configurada" },
        { status: 404 }
      )
    }

    // 3. Guardar imagen temporalmente en el servidor
    const arrayBuffer = await imagen.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const resultadoLocal =
      await GuardarFotoServicio.guardarImagenBuffer(buffer, request)

    const urlImagen = resultadoLocal.secure_url
    publicId = resultadoLocal.public_id

    console.log("Enviando URL a API Escritorio:", urlImagen);

    // 4. Detectar patente (API ESCRITORIO)
    const resApiEscritorio = await fetch(
      `${apiUrl}/detectarPatenteEnFoto`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlImagen }),
      }
    )

    // Error tecnico (HTTP)
    if (!resApiEscritorio.ok) {
      const errorJson = await resApiEscritorio.json()

      return NextResponse.json(
        {
          exito: false,
          origen: "api-escritorio",
          mensaje:
            errorJson.mensaje ??
            "La API de deteccion fallo - no se pudo detectar la patente",
          httpStatus: resApiEscritorio.status,
          data: null,
        },
        { status: resApiEscritorio.status }
      )
    }

    // JSON valido
    const resApiEsc = await resApiEscritorio.json()

    // Resultado logico (no se detecto patente)
    if (!resApiEsc.exito) {
      return NextResponse.json(
        {
          exito: false,
          origen: "api-escritorio",
          mensaje: resApiEsc.mensaje ?? "No se detecto ninguna patente",
          httpStatus: resApiEscritorio.status,
          data: null,
          patente: null,
        },
        { status: 200 }
      )
    }

    // Patente detectada - buscar en Turso DB
    const patenteDetectada = resApiEsc.patente || resApiEsc.data?.patente || null

    if (patenteDetectada) {
      try {
        const estadias = await buscarPorPatenteServicio(patenteDetectada)
        const estadia = estadias[0]
        return NextResponse.json({
          exito: true,
          mensaje: "Patente encontrada en el sistema",
          patente: patenteDetectada,
          data: estadia,
        })
      } catch {
        return NextResponse.json({
          exito: false,
          mensaje: `Patente ${patenteDetectada} detectada pero no tiene estadia activa`,
          patente: patenteDetectada,
          data: null,
        })
      }
    }

    // Wrapper final para respuestas sin patente clara
    return NextResponse.json(
      {
        exito: resApiEsc.exito,
        origen: "api-escritorio",
        httpStatus: resApiEscritorio.status,
        data: resApiEsc.data ?? null,
        respuesta: resApiEsc,
        patente: null,
      },
      { status: resApiEscritorio.status }
    )
  } catch (err) {
    return NextResponse.json(
      {
        exito: false,
        origen: "scanner-image",
        mensaje: "Error interno del servidor",
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    )
  } finally {
    // 5️⃣ Eliminar imagen temporal del servidor SIEMPRE
    if (publicId) {
      try {
        await GuardarFotoServicio.eliminarImagen(publicId)
      } catch (e) {
        console.error("Error eliminando foto temporal:", e)
      }
    }
  }
}
