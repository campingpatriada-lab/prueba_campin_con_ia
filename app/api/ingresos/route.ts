import { NextResponse } from "next/server"
import { validarAutenticado, validarAdmin } from "@/lib/auth"
import {
  crearIngresoServicio,
  obtenerIngresosConEmpleadoServicio,
  obtenerIngresosConEmpleadoPorFechaServicio,
  obtenerIngresosPorEmpleadoPorDiaServicio,
  eliminarIngresoServicio,
  editarIngresoServicio,
} from "@/lib/services/ingresos.service"
import { fechaHoyArgentina } from "@/lib/utils"

// GET: Obtener ingresos
// ADMIN: todos los ingresos o filtrados por query params
// EMPLEADO: solo sus propios ingresos del dia
export async function GET(request: Request) {
  try {
    const sesion = await validarAutenticado()
    const { searchParams } = new URL(request.url)

    const id_empleado = searchParams.get("id_empleado")
    const fecha = searchParams.get("fecha")
    const modo = searchParams.get("modo") // "todos" o "dia"

    // Si es ADMIN y pide todos (con nombre de empleado)
    if (sesion.rol === "ADMIN" && modo === "todos") {
      const ingresos = await obtenerIngresosConEmpleadoServicio()
      return NextResponse.json({ success: true, ingresos })
    }

    // Si es ADMIN y pide todos por fecha (con nombre de empleado)
    if (sesion.rol === "ADMIN" && modo === "todos_fecha" && fecha) {
      const ingresos = await obtenerIngresosConEmpleadoPorFechaServicio(fecha)
      return NextResponse.json({ success: true, ingresos })
    }

    // Ingresos por empleado por dia
    const empleadoId = sesion.rol === "ADMIN" && id_empleado
      ? Number(id_empleado)
      : sesion.id_empleado

    const fechaHoy = fecha || fechaHoyArgentina()

    const ingresos = await obtenerIngresosPorEmpleadoPorDiaServicio(
      empleadoId,
      fechaHoy
    )

    return NextResponse.json({ success: true, ingresos })
  } catch (error: any) {
    const status = error.message.includes("No autenticado") ? 403 : 500
    return NextResponse.json(
      { success: false, message: error.message },
      { status }
    )
  }
}

// POST: Crear ingreso manual (ADMIN y EMPLEADO)
export async function POST(request: Request) {
  try {
    const sesion = await validarAutenticado()
    const body = await request.json()

    const ingreso = await crearIngresoServicio({
      fecha: body.fecha || fechaHoyArgentina(),
      monto: body.monto,
      concepto: body.concepto,
      tipo_ingreso: body.tipo_ingreso || "manual",
      id_empleado: sesion.id_empleado,
      id_estadia: body.id_estadia || null,
    })

    return NextResponse.json({ success: true, ingreso })
  } catch (error: any) {
    const status = error.message.includes("No autenticado") ? 403 : 400
    return NextResponse.json(
      { success: false, message: error.message },
      { status }
    )
  }
}

// PUT: Editar ingreso (ADMIN y EMPLEADO)
export async function PUT(request: Request) {
  try {
    await validarAutenticado()
    const body = await request.json()
    const { id_ingreso, ...datos } = body

    if (!id_ingreso) {
      return NextResponse.json(
        { success: false, message: "ID de ingreso requerido" },
        { status: 400 }
      )
    }

    await editarIngresoServicio(id_ingreso, datos)

    return NextResponse.json({ success: true, message: "Ingreso editado correctamente" })
  } catch (error: any) {
    const status = error.message.includes("No autenticado") ? 403 : 400
    return NextResponse.json(
      { success: false, message: error.message },
      { status }
    )
  }
}

// DELETE: Eliminar ingreso (ADMIN y EMPLEADO)
export async function DELETE(request: Request) {
  try {
    await validarAutenticado()
    const { id_ingreso } = await request.json()

    if (!id_ingreso) {
      return NextResponse.json(
        { success: false, message: "ID de ingreso requerido" },
        { status: 400 }
      )
    }

    await eliminarIngresoServicio(id_ingreso)

    return NextResponse.json({ success: true, message: "Ingreso eliminado correctamente" })
  } catch (error: any) {
    const status = error.message.includes("No autenticado") ? 403 : 400
    return NextResponse.json(
      { success: false, message: error.message },
      { status }
    )
  }
}
