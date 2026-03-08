import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { validarEmpleado } from "@/lib/services/empleado.service"
import { generarToken, verificarToken, getCookieMaxAge } from "@/lib/auth"

// POST: Login con usuario y password
export async function POST(request: Request) {
  try {
    const { nombre, password } = await request.json()

    if (!nombre || !password) {
      return NextResponse.json(
        { success: false, message: "Faltan datos: nombre y password requeridos" },
        { status: 400 }
      )
    }

    // Validar empleado contra la BD
    const empleado = await validarEmpleado(nombre, password)

    // Generar JWT
    const token = generarToken({
      id_empleado: empleado.id_empleado,
      nombre: empleado.nombre,
      rol: empleado.rol,
    })

    // Setear cookie segura
    const cookieStore = await cookies()
    cookieStore.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: getCookieMaxAge(empleado.rol),
    })

    return NextResponse.json({
      success: true,
      message: "Acceso autorizado",
      empleado: {
        id_empleado: empleado.id_empleado,
        nombre: empleado.nombre,
        rol: empleado.rol,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Error en la autenticacion",
      },
      { status: 401 }
    )
  }
}

// GET: Verificar sesion activa
export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("session")?.value

    if (!token) {
      return NextResponse.json(
        { success: false, message: "No hay sesion activa" },
        { status: 401 }
      )
    }

    const payload = verificarToken(token)

    if (!payload) {
      // Limpiar cookie invalida
      cookieStore.delete("session")
      return NextResponse.json(
        { success: false, message: "Sesion expirada o invalida" },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      empleado: {
        id_empleado: payload.id_empleado,
        nombre: payload.nombre,
        rol: payload.rol,
      },
    })
  } catch {
    return NextResponse.json(
      { success: false, message: "Error al verificar sesion" },
      { status: 500 }
    )
  }
}

// DELETE: Logout - limpiar cookie
export async function DELETE() {
  try {
    const cookieStore = await cookies()
    cookieStore.delete("session")

    return NextResponse.json({
      success: true,
      message: "Sesion cerrada correctamente",
    })
  } catch {
    return NextResponse.json(
      { success: false, message: "Error al cerrar sesion" },
      { status: 500 }
    )
  }
}
