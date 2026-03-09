import { NextResponse } from "next/server"
import { validarAutenticado } from "@/lib/auth"
import {
  obtenerEstadiasActivasServicio,
  crearEstadiaConAbonoServicio,
} from "@/lib/services/estadia.service"
import { idFogonPorNumero } from "@/lib/services/fogon.service"

// GET: Obtener estadias activas (reemplaza la API externa)
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

// POST: Crear nueva reserva/estadia con abono automatico
export async function POST(request: Request) {
  try {
    const sesion = await validarAutenticado()
    const body = await request.json()

    // Soportar multiples pagos o un unico abono (backward compatible)
    let pagos: { tipo: string; monto: number }[] | undefined
    if (Array.isArray(body.pagos) && body.pagos.length > 0) {
      pagos = body.pagos.map((p: any) => ({
        tipo: p.tipo || "efectivo",
        monto: Number(p.monto),
      }))
    } else if (body.abono && Number(body.abono) > 0) {
      pagos = [{ tipo: body.tipoIngreso || body.tipo_ingreso || "efectivo", monto: Number(body.abono) }]
    }

    const estadia = await crearEstadiaConAbonoServicio(
      {
        patente: body.patente || null,
        cantidad_personas: body.cantidadPersonas || body.cantidad_personas,
        fecha_entrada: body.fechaEntrada || body.fecha_entrada,
        fecha_salida: body.fechaSalida || body.fecha_salida || null,
        nombre_responsable: body.nombre || body.nombre_responsable || null,
        dni_responsable: body.dni || body.dni_responsable || null,
        tipo_estadia: body.tipoEstadia || body.tipo_estadia || null,
        cantidad_menores: body.cantidadMenores != null ? Number(body.cantidadMenores) : (body.cantidad_menores != null ? Number(body.cantidad_menores) : null),
        observaciones: body.observaciones || null,
        id_fogon: (body.numero_fogon != null ? await idFogonPorNumero(Number(body.numero_fogon)) : null),
        id_empleado: sesion.id_empleado,
      },
      pagos
    )

    return NextResponse.json({
      success: true,
      mensaje: "Reserva creada exitosamente",
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
