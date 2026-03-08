import { NextResponse } from "next/server"
import { validarAutenticado } from "@/lib/auth"
import {
  obtenerEstadiasActivasServicio,
  crearEstadiaConAbonoServicio,
  cerrarEstadiaServicio,
  editarEstadiaServicio,
  buscarPorPatenteServicio,
  buscarPorDniServicio,
} from "@/lib/services/estadia.service"

// GET: Obtener estadias activas
export async function GET() {
  try {
    await validarAutenticado()

    const estadias = await obtenerEstadiasActivasServicio()
    return NextResponse.json({ success: true, estadias })
  } catch (error: any) {
    const status = error.message.includes("No autenticado") ? 403 : 500
    return NextResponse.json(
      { success: false, message: error.message },
      { status }
    )
  }
}

// POST: Crear nueva estadia con abono automatico
export async function POST(request: Request) {
  try {
    const sesion = await validarAutenticado()
    const body = await request.json()

    const estadia = await crearEstadiaConAbonoServicio(
      {
        patente: body.patente || null,
        cantidad_personas: body.cantidad_personas || body.cantidadPersonas,
        fecha_entrada: body.fecha_entrada || body.fechaEntrada,
        fecha_salida: body.fecha_salida || body.fechaSalida || null,
        nombre_responsable: body.nombre_responsable || body.nombre || null,
        dni_responsable: body.dni_responsable || body.dni || null,
        tipo_estadia: body.tipo_estadia || body.tipoEstadia || null,
        observaciones: body.observaciones || null,
        id_empleado: sesion.id_empleado,
      },
      body.abono ? Number(body.abono) : undefined,
      body.tipoIngreso || body.tipo_ingreso || undefined
    )

    return NextResponse.json({
      success: true,
      mensaje: "Estadia creada exitosamente",
      estadia,
    })
  } catch (error: any) {
    const status = error.message.includes("No autenticado") ? 403 : 400
    return NextResponse.json(
      { success: false, message: error.message, mensaje: error.message },
      { status }
    )
  }
}

// PUT: Editar o cerrar estadia
export async function PUT(request: Request) {
  try {
    await validarAutenticado()
    const body = await request.json()

    // Si viene accion = "cerrar", cerrar la estadia
    if (body.accion === "cerrar") {
      const resultado = await cerrarEstadiaServicio(
        body.id_estadia,
        body.fecha_salida || new Date().toISOString().split("T")[0]
      )
      return NextResponse.json({ success: true, ...resultado })
    }

    // De lo contrario, editar (body.datos puede incluir estado, tipo_estadia, etc.)
    const editada = await editarEstadiaServicio(body.id_estadia, body.datos)
    return NextResponse.json({ success: true, estadia: editada })
  } catch (error: any) {
    const status = error.message.includes("No autenticado") ? 403 : 400
    return NextResponse.json(
      { success: false, message: error.message },
      { status }
    )
  }
}
