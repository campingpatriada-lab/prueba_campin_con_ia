import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Carpeta donde se guardan las fotos temporalmente
const TEMP_DIR = path.join(process.cwd(), "public", "temp");

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    const filePath = path.join(TEMP_DIR, filename);

    console.log("Servicio de imagen temporal - Solicitado:", filename);
    console.log("Servicio de imagen temporal - Ruta completa:", filePath);

    // 1. Validar que el archivo exista
    if (!fs.existsSync(filePath)) {
      console.error("Servicio de imagen temporal - ARCHIVO NO ENCONTRADO:", filePath);
      return new NextResponse("Imagen no encontrada", { status: 404 });
    }

    // 2. Leer el archivo
    const fileBuffer = fs.readFileSync(filePath);
    console.log("Servicio de imagen temporal - Archivo leído con éxito, tamaño:", fileBuffer.length);

    // 3. Devolver la imagen con el Content-Type correcto
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Length": fileBuffer.length.toString(),
        "Cache-Control": "no-store, must-revalidate",
      },
    });
  } catch (error: any) {
    console.error("Error al servir imagen temporal:", error.message);
    return new NextResponse("Error interno del servidor", { status: 500 });
  }
}
