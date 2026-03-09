import { NextResponse } from "next/server";
import { validarAutenticado } from "@/lib/auth";
import { listarFogonesDisponibles, validarNumeroFogon } from "@/lib/services/fogon.service";
import { obtenerFogonPorNumero } from "@/lib/repositories/fogon.repository";

export async function GET() {
  try {
    await validarAutenticado();
    const disponibles = await listarFogonesDisponibles();
    return NextResponse.json({ success: true, disponibles });
  } catch (error: any) {
    const status = error.message.includes("No autenticado") ? 403 : 500;
    return NextResponse.json({ success: false, message: error.message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    await validarAutenticado();
    const { numero } = await request.json();
    const n = Number(numero);
    if (!n || Number.isNaN(n)) {
      return NextResponse.json({ success: false, message: "Numero de fogon invalido" }, { status: 400 });
    }
    const info = await validarNumeroFogon(n);
    const fogon = await obtenerFogonPorNumero(n);
    return NextResponse.json({ success: true, ...info, id_fogon: fogon?.id_fogon ?? null });
  } catch (error: any) {
    const status = error.message.includes("No autenticado") ? 403 : 500;
    return NextResponse.json({ success: false, message: error.message }, { status });
  }
}
