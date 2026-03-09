import { NextResponse } from "next/server"
import { validarAutenticado } from "@/lib/auth"
import { buscarPorPatenteServicio } from "@/lib/services/estadia.service"

function detectarPatente(texto: string): string | null {
  const upper = texto.toUpperCase()
  const merged = upper.replace(/[^A-Z0-9]/g, " ")
  const tokens = merged.split(/\s+/).filter(Boolean)
  const reNuevo = /^[A-Z]{2}[0-9]{3}[A-Z]{2}$/
  const reViejo = /^[A-Z]{3}[0-9]{3}$/
  for (const t of tokens) {
    if (reNuevo.test(t)) return t
    if (reViejo.test(t)) return t
  }
  const compact = upper.replace(/[^A-Z0-9]/g, "")
  for (let i = 0; i < compact.length; i++) {
    const s7 = compact.slice(i, i + 7)
    const s6 = compact.slice(i, i + 6)
    if (reNuevo.test(s7)) return s7
    if (reViejo.test(s6)) return s6
  }
  return null
}

export async function POST(request: Request) {
  try {
    await validarAutenticado()
    const apiKey = process.env.GOOGLE_VISION || ""
    if (!apiKey) {
      return NextResponse.json({ exito: false, mensaje: "GOOGLE_VISION no configurado" }, { status: 500 })
    }
    const formData = await request.formData()
    const imagen = formData.get("imagen")
    if (!imagen || !(imagen instanceof File)) {
      return NextResponse.json({ exito: false, mensaje: "No se envio ninguna imagen" }, { status: 400 })
    }
    const arrayBuffer = await imagen.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString("base64")
    const body = {
      requests: [
        {
          image: { content: base64 },
          features: [{ type: "TEXT_DETECTION" }],
        },
      ],
    }
    const res = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}))
      return NextResponse.json(
        { exito: false, origen: "google-vision", mensaje: errJson.error?.message || "Error en Vision API" },
        { status: res.status }
      )
    }
    const json = await res.json()
    const annotation =
      json?.responses?.[0]?.fullTextAnnotation?.text ||
      (json?.responses?.[0]?.textAnnotations?.[0]?.description || "")
    const patente = annotation ? detectarPatente(String(annotation)) : null
    if (patente) {
      try {
        const estadias = await buscarPorPatenteServicio(patente)
        const estadia = estadias[0]
        return NextResponse.json({
          exito: true,
          mensaje: "Patente detectada",
          patente,
          data: estadia,
        })
      } catch {
        return NextResponse.json({
          exito: false,
          mensaje: `Patente ${patente} detectada pero sin estadia activa`,
          patente,
          data: null,
        })
      }
    }
    return NextResponse.json({
      exito: false,
      origen: "google-vision",
      mensaje: "No se detecto patente valida",
      patente: null,
      data: null,
    })
  } catch (err) {
    return NextResponse.json(
      { exito: false, mensaje: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
