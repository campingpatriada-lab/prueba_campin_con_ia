import { NextResponse } from "next/server";
import { validarAutenticado } from "@/lib/auth";
import { obtenerFogonesConServicios } from "@/lib/repositories/fogon.repository";

export async function GET() {
  try {
    await validarAutenticado();
    const fogones = await obtenerFogonesConServicios();
    return NextResponse.json({ success: true, fogones });
  } catch (error: any) {
    const status = error.message.includes("No autenticado") ? 403 : 500;
    return NextResponse.json({ success: false, message: error.message }, { status });
  }
}
