import { NextResponse } from "next/server"
import { validarAutenticado, validarAdmin } from "@/lib/auth"
import { obtenerEstadiasPorMesServicio } from "@/lib/services/estadia.service"
import { obtenerIngresosPorEmpleadoPorDiaServicio, obtenerIngresosPorMesServicio, obtenerIngresosConEmpleadoServicio } from "@/lib/services/ingresos.service"

// GET: Obtener datos para reportes/Excel
// ?tipo=estadias-mes&anio=2026&mes=2 -> Solo ADMIN
// ?tipo=ingresos-dia&fecha=2026-02-10 -> ADMIN y EMPLEADO (solo sus propios)
export async function GET(request: Request) {
  try {
    const sesion = await validarAutenticado()
    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get("tipo")

    if (tipo === "estadias-mes") {
      // Solo ADMIN puede ver reportes mensuales de estadias
      if (sesion.rol !== "ADMIN") {
        return NextResponse.json(
          { success: false, message: "Acceso denegado: se requiere rol ADMIN" },
          { status: 403 }
        )
      }

      const anio = Number(searchParams.get("anio"))
      const mes = Number(searchParams.get("mes"))

      if (!anio || !mes) {
        return NextResponse.json(
          { success: false, message: "Parametros anio y mes requeridos" },
          { status: 400 }
        )
      }

      const estadias = await obtenerEstadiasPorMesServicio(anio, mes)
      return NextResponse.json({ success: true, estadias })
    }

    if (tipo === "ingresos-mes") {
      if (sesion.rol !== "ADMIN") {
        return NextResponse.json(
          { success: false, message: "Acceso denegado: se requiere rol ADMIN" },
          { status: 403 }
        )
      }

      const anio = Number(searchParams.get("anio"))
      const mes = Number(searchParams.get("mes"))

      if (!anio || !mes) {
        return NextResponse.json(
          { success: false, message: "Parametros anio y mes requeridos" },
          { status: 400 }
        )
      }

      const ingresos = await obtenerIngresosPorMesServicio(anio, mes)
      return NextResponse.json({ success: true, ingresos })
    }

    if (tipo === "ingresos-todos") {
      if (sesion.rol !== "ADMIN") {
        return NextResponse.json(
          { success: false, message: "Acceso denegado: se requiere rol ADMIN" },
          { status: 403 }
        )
      }

      const ingresos = await obtenerIngresosConEmpleadoServicio()
      return NextResponse.json({ success: true, ingresos })
    }

    if (tipo === "ingresos-dia") {
      const fecha = searchParams.get("fecha") || new Date().toISOString().split("T")[0]

      const ingresos = await obtenerIngresosPorEmpleadoPorDiaServicio(
        sesion.id_empleado,
        fecha
      )

      return NextResponse.json({ success: true, ingresos })
    }

    return NextResponse.json(
      { success: false, message: "Tipo de reporte no valido" },
      { status: 400 }
    )
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
