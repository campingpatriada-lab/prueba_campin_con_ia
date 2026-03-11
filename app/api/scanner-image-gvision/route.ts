import { NextResponse } from "next/server"
import { validarAutenticado } from "@/lib/auth"
import { buscarPorPatenteServicio } from "@/lib/services/estadia.service"

export const runtime = "nodejs"

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

function normalizarPosiblesConfusiones(token: string): string {
  let t = token.toUpperCase().replace(/[^A-Z0-9]/g, "")
  // Reemplazos comunes de OCR: O↔0, I↔1, B↔8, S↔5, Z↔2
  t = t
    .replace(/Ø/g, "O")
    .replace(/Ñ/g, "N")
    .replace(/Á|À|Â|Ä/g, "A")
    .replace(/É|È|Ê|Ë/g, "E")
    .replace(/Í|Ì|Î|Ï/g, "I")
    .replace(/Ó|Ò|Ô|Ö/g, "O")
    .replace(/Ú|Ù|Û|Ü/g, "U")

  // Para patrones de patente, probamos dos normalizaciones:
  // 1) Letras donde van letras, números donde van números
  // 2) Tal cual el OCR (por si ya está correcto)
  return t
}

function esPatenteValida(token: string): boolean {
  const t = token.toUpperCase()
  const reNuevo = /^[A-Z]{2}[0-9]{3}[A-Z]{2}$/
  const reViejo = /^[A-Z]{3}[0-9]{3}$/
  return reNuevo.test(t) || reViejo.test(t)
}

function puntuarPatenteDesdeBBox(ann: any): number {
  const v = ann?.boundingPoly?.vertices || ann?.boundingPoly?.normalizedVertices || []
  if (!v || v.length === 0) return 0
  const xs = v.map((p: any) => p.x || 0)
  const ys = v.map((p: any) => p.y || 0)
  const width = Math.max(...xs) - Math.min(...xs)
  const height = Math.max(...ys) - Math.min(...ys)
  const area = Math.max(0, width) * Math.max(0, height)
  // Damos más peso a la altura como aproximación del tamaño de fuente
  return area + height * 200
}

function detectarPatenteDesdeAnotaciones(textAnnotations: any[]): string | null {
  if (!Array.isArray(textAnnotations) || textAnnotations.length === 0) return null
  const palabras = textAnnotations.slice(1) // índice 0 es el texto completo
  type Candidato = { token: string; score: number }
  const candidatos: Candidato[] = []

  // Evaluamos ventanas de 1 a 3 palabras para unir tokens que Vision separa
  for (let i = 0; i < palabras.length; i++) {
    for (let w = 1; w <= 3 && i + w <= palabras.length; w++) {
      const slice = palabras.slice(i, i + w)
      const textoCrudo = slice.map((a: any) => a?.description || "").join("")
      const token = normalizarPosiblesConfusiones(textoCrudo)
      if (!token) continue
      // Ajustes típicos: reemplazos que respetan el patrón letra/número
      // Intento 1: probar tal cual
      if (esPatenteValida(token)) {
        const score = Math.max(...slice.map(puntuarPatenteDesdeBBox))
        candidatos.push({ token, score })
        continue
      }
      // Intento 2: mapear posibles confusiones por posición
      // Para nuevo formato AA000AA
      const variantes: string[] = []
      if (token.length === 6 || token.length === 7) {
        // Generamos algunas variantes simples de reemplazo
        variantes.push(
          token
            .replace(/0(?=[A-Z]{2}$)/, "O")
            .replace(/^([A-Z]{2})([A-Z]{3})([A-Z]{1})$/, "$1000$3"),
        )
        variantes.push(
          token.replace(/O(?=[0-9]{3})/g, "0").replace(/I(?=[0-9]{3})/g, "1"),
        )
        variantes.push(
          token.replace(/S(?=[0-9]{3})/g, "5").replace(/Z(?=[0-9]{3})/g, "2"),
        )
      }
      for (const v of variantes) {
        if (esPatenteValida(v)) {
          const score = Math.max(...slice.map(puntuarPatenteDesdeBBox))
          candidatos.push({ token: v, score })
          break
        }
      }
    }
  }

  // Si encontramos candidatos, priorizamos el de mayor score (tamaño de caja)
  if (candidatos.length > 0) {
    candidatos.sort((a, b) => b.score - a.score)
    // Preferimos nuevo formato antes que viejo si el score es similar
    const topScore = candidatos[0].score
    const top = candidatos.filter(c => Math.abs(c.score - topScore) < 50)
    const nuevoPrimero = top.find(c => /^[A-Z]{2}[0-9]{3}[A-Z]{2}$/.test(c.token))
    return (nuevoPrimero || candidatos[0]).token
  }
  return null
}

export async function POST(request: Request) {
  try {
    await validarAutenticado()
    const apiKey =
      process.env.GOOGLE_VISION ||
      process.env.GOOGLE_API_KEY ||
      process.env.VISION_API_KEY ||
      ""
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
    const textAnnotations = json?.responses?.[0]?.textAnnotations || []
    const annotation =
      json?.responses?.[0]?.fullTextAnnotation?.text ||
      (textAnnotations?.[0]?.description || "")

    // 1) Preferimos detección usando BBoxes para evitar “letra chica”
    let patente: string | null =
      detectarPatenteDesdeAnotaciones(textAnnotations) ||
      (annotation ? detectarPatente(String(annotation)) : null)

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
