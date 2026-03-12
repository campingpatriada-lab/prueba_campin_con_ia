import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Carpeta donde se guardan las fotos temporalmente
const TEMP_DIR = path.join(process.cwd(), "public", "temp");

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const filename = params.filename;
    const filePath = path.join(TEMP_DIR, filename);

    // 1. Validar que el archivo exista
    if (!fs.existsSync(filePath)) {
      return new NextResponse("Imagen no encontrada", { status: 404 });
    }

    // 2. Leer el archivo
    const fileBuffer = fs.readFileSync(filePath);

    // 3. Devolver la imagen con el Content-Type correcto
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error: any) {
    console.error("Error al servir imagen temporal:", error.message);
    return new NextResponse("Error interno del servidor", { status: 500 });
  }
}
