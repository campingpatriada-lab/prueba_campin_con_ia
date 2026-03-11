// import { v2 as cloudinary, UploadApiResponse } from "cloudinary";

// // Configuración global
// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// // Tipos de error personalizados
// export class ErrorConexionCloudinary extends Error {}
// export class ErrorSubidaImagenFallida extends Error {}
// export class ErrorEliminacionImagenFallida extends Error {}

// // Servicio Cloudinary
// export class CloudinaryServicio {
//   static optimizar = {
//     folder: "camping", // Carpeta para organizar las imágenes
//     transformation: [
//       { width: 1000, crop: "scale" },
//       { quality: "auto" },
//       { fetch_format: "auto" },
//     ],
//   };

//   // Prueba de conexión
//   static async pruebaConexion(): Promise<any> {
//     try {
//       const resultado = await cloudinary.api.root_folders();
//       return resultado;
//     } catch (error: any) {
//       console.error("Error al conectar a Cloudinary:", error.message);
//       throw new ErrorConexionCloudinary(
//         "No se pudo conectar con Cloudinary"
//       );
//     }
//   }

//   // Subir imagen
//   static async subirImagen(urlFoto: string): Promise<UploadApiResponse> {
//     try {
//       const resultado = await cloudinary.uploader.upload(
//         urlFoto,
//         this.optimizar
//       );
//       console.log("Foto subida:", resultado.secure_url);
//       return resultado;
//     } catch (error: any) {
//       console.error("Error al subir imagen:", error.message);
//       throw new ErrorSubidaImagenFallida(
//         "Error al subir la imagen a Cloudinary"
//       );
//     }
//   }

//   // Eliminar imagen
//   static async eliminarImagen(public_id: string): Promise<any> {
//     try {
//       const resultado = await cloudinary.uploader.destroy(public_id);
//       return resultado;
//     } catch (error: any) {
//       console.error("Error al eliminar imagen:", error.message);
//       throw new ErrorEliminacionImagenFallida(
//         "Error al eliminar la imagen"
//       );
//     }
//   }
// }
// import { v2 as cloudinary, UploadApiResponse } from "cloudinary";

// // Configuración global
// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// // Tipos de error personalizados
// export class ErrorConexionCloudinary extends Error {}
// export class ErrorSubidaImagenFallida extends Error {}
// export class ErrorEliminacionImagenFallida extends Error {}

// // Servicio Cloudinary
// export class CloudinaryServicio {
//   static optimizar = {
//     folder: "camping",
//     transformation: [
//       { width: 1000, crop: "scale" },
//       { quality: "auto" },
//       { fetch_format: "auto" },
//     ],
//   };

//   // Prueba de conexión
//   static async pruebaConexion(): Promise<any> {
//     try {
//       return await cloudinary.api.root_folders();
//     } catch (error: any) {
//       console.error("Error al conectar a Cloudinary:", error.message);
//       throw new ErrorConexionCloudinary("No se pudo conectar con Cloudinary");
//     }
//   }

//   // ✅ MÉTODO QUE YA FUNCIONA (PC, galería JPG/PNG)
//   static async subirImagen(urlFoto: string): Promise<UploadApiResponse> {
//     try {
//       const resultado = await cloudinary.uploader.upload(
//         urlFoto,
//         this.optimizar
//       );
//       return resultado;
//     } catch (error: any) {
//       console.error("Error al subir imagen:", error.message);
//       throw new ErrorSubidaImagenFallida(
//         "Error al subir la imagen a Cloudinary"
//       );
//     }
//   }

//   // 🆕 NUEVO MÉTODO (CELULAR / HEIC)
//   static async subirImagenBuffer(
//     buffer: Buffer
//   ): Promise<UploadApiResponse> {
//     return new Promise((resolve, reject) => {
//       const stream = cloudinary.uploader.upload_stream(
//         {
//           folder: "camping",
//           resource_type: "image",
//           transformation: [
//             { angle: "exif" },          // respeta orientación celular
//             { width: 1600, crop: "limit" },
//             { quality: "auto" },
//             { fetch_format: "jpg" },    // fuerza salida compatible
//           ],
//         },
//         (error, result) => {
//           if (error || !result) {
//             console.error("Error al subir imagen (stream):", error);
//             reject(
//               new ErrorSubidaImagenFallida(
//                 "Error al subir la imagen a Cloudinary"
//               )
//             );
//           } else {
//             resolve(result);
//           }
//         }
//       );

//       stream.end(buffer);
//     });
//   }

//   // Eliminar imagen

//   static async eliminarImagen(public_id: string): Promise<any> {
//     try {
//       return await cloudinary.uploader.destroy(public_id);
//     } catch (error: any) {
//       console.error("Error al eliminar imagen:", error.message);
//       throw new ErrorEliminacionImagenFallida(
//         "Error al eliminar la imagen"
//       );
//     }
//   }
// }



import { v2 as cloudinary, UploadApiResponse } from "cloudinary";

// ===============================
// Configuración global Cloudinary
// ===============================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ===============================
// Errores personalizados
// ===============================
export class ErrorConexionCloudinary extends Error { }
export class ErrorSubidaImagenFallida extends Error { }
export class ErrorEliminacionImagenFallida extends Error { }

import sharp from "sharp";

// Función para optimizar buffer antes de subir
async function optimizarBuffer(buffer: Buffer): Promise<Buffer> {
  return await sharp(buffer)
    .rotate()                    // respeta orientación EXIF
    .resize({ width: 1200 })     // ancho máximo
    .jpeg({ quality: 100 })       // comprime a 80% calidad
    .toBuffer();
}


// ===============================
// Servicio Cloudinary
// ===============================
export class CloudinaryServicio {
  // Optimización estándar (PC / JPG / PNG)
  static optimizar = {
    folder: "camping",
    transformation: [
      { width: 1000, crop: "scale" },
      { quality: "auto" },
      { fetch_format: "auto" },
    ],
  };

  // ===============================
  // Prueba de conexión
  // ===============================
  static async pruebaConexion(): Promise<any> {
    try {
      return await cloudinary.api.root_folders();
    } catch (error: any) {
      console.error("Error al conectar a Cloudinary:", error.message);
      throw new ErrorConexionCloudinary(
        "No se pudo conectar con Cloudinary"
      );
    }
  }

  // ===============================
  // Subida clásica (PC, URLs, JPG/PNG)
  // ===============================
  static async subirImagen(
    urlFoto: string
  ): Promise<UploadApiResponse> {
    try {
      const resultado = await cloudinary.uploader.upload(
        urlFoto,
        this.optimizar
      );
      return resultado;
    } catch (error: any) {
      console.error("Error al subir imagen:", error.message);
      throw new ErrorSubidaImagenFallida(
        "Error al subir la imagen a Cloudinary"
      );
    }
  }

  // ===============================
  // Subida desde celular (Buffer / HEIC)
  // ===============================
  static async subirImagenBuffer(
    buffer: Buffer
  ): Promise<UploadApiResponse> {
    const bufferOptimizado = await optimizarBuffer(buffer);
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "camping",
          resource_type: "image",

          // 🔑 CLAVE PARA CELULARES
          format: "jpg",          // fuerza HEIC → JPG
          eager_async: false,     // ⬅️ IMPORTANTÍSIMO
          invalidate: true,

          transformation: [
            { angle: "exif" },                 // orientacion correcta
            { width: 1600, height: 1600, crop: "limit" },
            { quality: "auto:good" },          // buena calidad para OCR
          ],
        },
        (error, result) => {
          if (error || !result) {
            console.error("Cloudinary stream error:", error);
            reject(
              new ErrorSubidaImagenFallida(
                "Error al subir la imagen a Cloudinary"
              )
            );
          } else {
            resolve(result);
          }
        }
      );

      stream.end(bufferOptimizado);
    });
  }


  // ===============================
  // Eliminar imagen
  // ===============================
  static async eliminarImagen(
    public_id: string
  ): Promise<any> {
    try {
      return await cloudinary.uploader.destroy(public_id);
    } catch (error: any) {
      console.error("Error al eliminar imagen:", error.message);
      throw new ErrorEliminacionImagenFallida(
        "Error al eliminar la imagen"
      );
    }
  }
}
