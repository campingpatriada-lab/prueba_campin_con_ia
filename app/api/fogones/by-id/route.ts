import { NextResponse } from "next/server";
import { validarAutenticado } from "@/lib/auth";
import { tursoClient } from "@/lib/turso-db";

export async function GET(request: Request) {
  try {
    await validarAutenticado();
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get("id"));
    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ success: false, message: "id_fogon invalido" }, { status: 400 });
    }
    const res = await tursoClient.execute({
      sql: `
        SELECT 
          f.numero_fogon,
          f.estado,
          GROUP_CONCAT(s.nombre_servicio, ',') AS servicios
        FROM fogon f
        LEFT JOIN servicios_fogones sf ON sf.id_fogon = f.id_fogon
        LEFT JOIN servicios s ON s.id_servicio = sf.id_servicio
        WHERE f.id_fogon = ?
        GROUP BY f.id_fogon
        LIMIT 1
      `,
      args: [id],
    });
    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, message: "Fogon no encontrado" }, { status: 404 });
    }
    const row = res.rows[0];
    const servicios = row.servicios ? String(row.servicios).split(",") : [];
    return NextResponse.json({
      success: true,
      numero_fogon: Number(row.numero_fogon),
      estado: Number(row.estado),
      servicios,
    });
  } catch (error: any) {
    const status = error.message.includes("No autenticado") ? 403 : 500;
    return NextResponse.json({ success: false, message: error.message }, { status });
  }
}
