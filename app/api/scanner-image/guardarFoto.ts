import fs from "fs";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";

const TEMP_DIR = path.join(process.cwd(), "public", "temp");

export interface GuardarFotoResponse {
  secure_url: string;
  public_id: string;
}

export class GuardarFotoServicio {
  static async guardarImagenBuffer(buffer: Buffer, request: Request): Promise<GuardarFotoResponse> {
    try {
      // 1. Asegurar carpeta public/temp
      if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

      // 2. Nombre único corto
      const fileName = `${crypto.randomBytes(8).toString("hex")}.jpg`;
      const filePath = path.join(TEMP_DIR, fileName);

      // 3. Optimizar y rotar (COMPATIBILIDAD CELULARES)
      await sharp(buffer)
        .rotate() // Corrige rotación de celular
        .resize({ width: 1200, withoutEnlargement: true })
        .jpeg({ quality: 75 })
        .toFile(filePath);

      // 4. Generar URL simple basada en el host del navegador
      const host = request.headers.get("host");
      const protocol = host?.includes("localhost") ? "http" : "https";
      const secure_url = `${protocol}://${host}/temp/${fileName}`;

      console.log("URL generada para la API de escritorio:", secure_url);

      return { secure_url, public_id: fileName };
    } catch (error: any) {
      console.error("Error GuardarFotoServicio:", error.message);
      throw new Error("Fallo al guardar imagen");
    }
  }

  static async eliminarImagen(fileName: string): Promise<void> {
    try {
      const filePath = path.join(TEMP_DIR, fileName);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (e) {}
  }
}
