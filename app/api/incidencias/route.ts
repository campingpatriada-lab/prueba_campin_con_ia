import { NextResponse } from "next/server";
import { buscarIncidenciasPorPatenteServicio, crearIncidenciaServicio } from "@/lib/services/incidencia.service";
import { validarAutenticado } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const patente = searchParams.get("patente");

    if (!patente) {
      return NextResponse.json(
        { success: false, message: "Patente requerida" },
        { status: 400 }
      );
    }

    const incidencias = await buscarIncidenciasPorPatenteServicio(patente);

    return NextResponse.json({ success: true, incidencias });
  } catch (error: any) {
    console.error("Error en GET /api/incidencias:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Error interno" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const sesion = await validarAutenticado();
    const body = await request.json();

    const { patente, descripcion, id_estadia } = body;

    if (!patente || !descripcion || !id_estadia) {
      return NextResponse.json(
        { success: false, message: "Patente, descripcion e id_estadia son requeridos" },
        { status: 400 }
      );
    }

    const id = await crearIncidenciaServicio({
      patente,
      descripcion,
      id_empleado: sesion.id_empleado,
      id_estadia: Number(id_estadia),
    });

    return NextResponse.json({ success: true, id_incidencia: id });
  } catch (error: any) {
    console.error("Error en POST /api/incidencias:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Error interno" },
      { status: 500 }
    );
  }
}
