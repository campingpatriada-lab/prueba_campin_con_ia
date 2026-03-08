import { NextResponse } from "next/server"
import { validarAutenticado } from "@/lib/auth"
import {
  buscarPorPatenteServicio,
  buscarPorDniServicio,
  buscarPorNombreServicio,
} from "@/lib/services/estadia.service"

// POST: Buscar estadia por DNI o patente (reemplaza la API externa)
export async function POST(request: Request) {
  try {
    await validarAutenticado()

    const { tipo, valor } = await request.json()

    if (!tipo || !valor) {
      return NextResponse.json(
        { success: false, message: "Tipo y valor requeridos" },
        { status: 400 }
      )
    }

    let resultados

    if (tipo === "dni") {
      resultados = await buscarPorDniServicio(valor)
    } else if (tipo === "patente") {
      resultados = await buscarPorPatenteServicio(valor)
    } else if (tipo === "nombre") {
      resultados = await buscarPorNombreServicio(valor)
    } else {
      return NextResponse.json(
        { success: false, message: "Tipo de busqueda no valido. Use 'dni', 'patente' o 'nombre'" },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      resultados,
    })
  } catch (error: any) {
    const isNotFound = error.message.includes("no esta registrada") || error.message.includes("no está registrada")
    const isAuth = error.message.includes("No autenticado")

    return NextResponse.json(
      {
        success: false,
        message: error.message,
        mensaje: error.message,
      },
      { status: isAuth ? 403 : isNotFound ? 404 : 500 }
    )
  }
}
