import fs from "fs";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";

// Carpeta donde se guardarán las fotos temporalmente
const TEMP_DIR = path.join(process.cwd(), "public", "temp");

export interface GuardarFotoResponse {
  secure_url: string;
  public_id: string; // En este caso será el nombre del archivo
}

export class GuardarFotoServicio {
  /**
   * Guarda una imagen en el servidor local de forma temporal.
   * Incluye optimización y corrección de orientación para celulares.
   */
  static async guardarImagenBuffer(buffer: Buffer, request: Request): Promise<GuardarFotoResponse> {
    try {
      // 1. Asegurar que la carpeta temporal exista
      if (!fs.existsSync(TEMP_DIR)) {
        fs.mkdirSync(TEMP_DIR, { recursive: true });
      }

      // 2. Optimizar imagen para celulares (orientación EXIF, tamaño y formato)
      const optimizedBuffer = await sharp(buffer)
        .rotate() // Muy importante para celulares: corrige la orientación según los metadatos EXIF
        .resize({ width: 1200, withoutEnlargement: true }) // Tamaño máximo razonable
        .jpeg({ quality: 75 }) // Formato estándar compatible
        .toBuffer();

      // 3. Generar nombre único
      const fileName = `${crypto.randomBytes(16).toString("hex")}.jpg`;
      const filePath = path.join(TEMP_DIR, fileName);

      // 4. Guardar archivo
      fs.writeFileSync(filePath, optimizedBuffer);

      // 5. Construir URL pública (detectando el protocolo real del request)
      const host = request.headers.get("host");
      const urlObj = new URL(request.url);
      const protocol = urlObj.protocol; // "http:" o "https:"
      
      // Construimos la URL quitando los dos puntos del protocolo
      const secure_url = `${protocol}//${host}/temp/${fileName}`;

      return {
        secure_url,
        public_id: fileName, // Guardamos el nombre para poder eliminarlo después
      };
    } catch (error: any) {
      console.error("Error al guardar foto localmente:", error.message);
      throw new Error("No se pudo guardar la imagen en el servidor");
    }
  }

  /**
   * Elimina la imagen temporal del servidor.
   */
  static async eliminarImagen(fileName: string): Promise<void> {
    try {
      const filePath = path.join(TEMP_DIR, fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error: any) {
      console.error("Error al eliminar foto temporal:", error.message);
      // No lanzamos error para no interrumpir el flujo si falla el borrado
    }
  }
}
