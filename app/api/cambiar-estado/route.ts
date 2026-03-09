import { NextResponse } from "next/server"
import { validarAutenticado } from "@/lib/auth"
import {
  buscarPorPatenteServicio,
  cerrarEstadiaServicio,
} from "@/lib/services/estadia.service"
import { liberarFogonPorId } from "@/lib/repositories/fogon.repository"

// POST: Cerrar estadia por patente (reemplaza la API externa)
export async function POST(request: Request) {
  try {
    await validarAutenticado()

    const { patente } = await request.json()

    if (!patente) {
      return NextResponse.json(
        { exito: false, mensaje: "Falta parametro patente" },
        { status: 400 }
      )
    }

    // Buscar la estadia activa por patente
    const estadias = await buscarPorPatenteServicio(patente)
    const estadia = estadias?.[0]

    if (!estadia) {
      return NextResponse.json(
        { exito: false, mensaje: "No se encontro estadia activa con esa patente" },
        { status: 404 }
      )
    }

    // Cerrar la estadia
    const fechaSalida = new Date().toISOString().split("T")[0]
    await cerrarEstadiaServicio(estadia.id_estadia, fechaSalida)

    // Liberar fogon si corresponde
    if (estadia.id_fogon != null) {
      try {
        await liberarFogonPorId(Number(estadia.id_fogon))
      } catch {}
    }

    return NextResponse.json({
      exito: true,
      cambiado: true,
      mensaje: "Estadia cerrada correctamente",
    })
  } catch (error: any) {
    const isAuth = error.message.includes("No autenticado")
    return NextResponse.json(
      {
        exito: false,
        cambiado: false,
        mensaje: error.message || "Error al cerrar la estadia",
      },
      { status: isAuth ? 403 : 500 }
    )
  }
}
