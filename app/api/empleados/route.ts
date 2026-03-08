import { NextResponse } from "next/server"
import { validarAdmin, validarAutenticado } from "@/lib/auth"
import { obtenerEmpleados } from "@/lib/repositories/empleado.repository"
import {
  crearEmpleadoService,
  editarEmpleadoService,
  darDeBajaEmpleadoService,
  toggleActivoEmpleadoService,
} from "@/lib/services/empleado.service"

// GET: Listar empleados (solo ADMIN)
export async function GET() {
  try {
    await validarAdmin()

    const empleados = await obtenerEmpleados()

    // No devolver password_hash al frontend
    const limpios = empleados.map(({ password_hash, ...rest }) => rest)

    return NextResponse.json({ success: true, empleados: limpios })
  } catch (error: any) {
    const status = error.message.includes("No autenticado") || error.message.includes("Acceso denegado")
      ? 403
      : 500
    return NextResponse.json(
      { success: false, message: error.message },
      { status }
    )
  }
}

// POST: Crear empleado (solo ADMIN)
export async function POST(request: Request) {
  try {
    await validarAdmin()

    const { nombre, password, rol } = await request.json()

    const empleado = await crearEmpleadoService(nombre, password, rol)

    return NextResponse.json({ success: true, empleado })
  } catch (error: any) {
    const status = error.message.includes("No autenticado") || error.message.includes("Acceso denegado")
      ? 403
      : 400
    return NextResponse.json(
      { success: false, message: error.message },
      { status }
    )
  }
}

// PUT: Editar empleado
// ADMIN puede editar cualquier empleado (nombre, password, rol)
// EMPLEADO solo puede editar su propio nombre y password
export async function PUT(request: Request) {
  try {
    const sesion = await validarAutenticado()
    const { id_empleado, nombre, password, rol } = await request.json()

    if (!id_empleado) {
      return NextResponse.json(
        { success: false, message: "ID de empleado requerido" },
        { status: 400 }
      )
    }

    // Si es EMPLEADO, solo puede editarse a si mismo y no puede cambiar rol
    if (sesion.rol === "EMPLEADO") {
      if (id_empleado !== sesion.id_empleado) {
        return NextResponse.json(
          { success: false, message: "Solo puede editar sus propios datos" },
          { status: 403 }
        )
      }
      // EMPLEADO no puede cambiar su rol
      await editarEmpleadoService(id_empleado, nombre, password, undefined)
    } else {
      // ADMIN puede editar todo
      await editarEmpleadoService(id_empleado, nombre, password, rol)
    }

    return NextResponse.json({ success: true, message: "Empleado editado correctamente" })
  } catch (error: any) {
    const status = error.message.includes("No autenticado") || error.message.includes("Acceso denegado")
      ? 403
      : 400
    return NextResponse.json(
      { success: false, message: error.message },
      { status }
    )
  }
}

// PATCH: Toggle activo/inactivo (solo ADMIN)
export async function PATCH(request: Request) {
  try {
    await validarAdmin()

    const { id_empleado } = await request.json()

    if (!id_empleado) {
      return NextResponse.json(
        { success: false, message: "ID de empleado requerido" },
        { status: 400 }
      )
    }

    await toggleActivoEmpleadoService(id_empleado)

    return NextResponse.json({ success: true, message: "Estado del empleado actualizado" })
  } catch (error: any) {
    const status = error.message.includes("No autenticado") || error.message.includes("Acceso denegado")
      ? 403
      : 400
    return NextResponse.json(
      { success: false, message: error.message },
      { status }
    )
  }
}

// DELETE: Dar de baja empleado (solo ADMIN)
export async function DELETE(request: Request) {
  try {
    await validarAdmin()

    const { nombre } = await request.json()

    if (!nombre) {
      return NextResponse.json(
        { success: false, message: "Nombre de empleado requerido" },
        { status: 400 }
      )
    }

    await darDeBajaEmpleadoService(nombre)

    return NextResponse.json({ success: true, message: "Empleado dado de baja correctamente" })
  } catch (error: any) {
    const status = error.message.includes("No autenticado") || error.message.includes("Acceso denegado")
      ? 403
      : 400
    return NextResponse.json(
      { success: false, message: error.message },
      { status }
    )
  }
}
