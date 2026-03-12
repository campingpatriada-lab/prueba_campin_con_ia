/**
 * Optimiza una imagen en el cliente: redimensiona y comprime como JPEG.
 * Reduce imagenes de celular (5-10MB HEIC) a ~100-300KB para upload rapido.
 *
 * Usa createObjectURL (mas rapido que readAsDataURL) y limpia recursos automaticamente.
 */
export function optimizarImagen(
  file: File,
  maxDimension = 800,
  quality = 0.5
): Promise<File> {
  return new Promise((resolve, reject) => {
    // createObjectURL es ~10x mas rapido que readAsDataURL para archivos grandes
    const url = URL.createObjectURL(file)
    const img = new window.Image()
    img.crossOrigin = "anonymous"

    img.onload = () => {
      // Liberar memoria del blob URL inmediatamente
      URL.revokeObjectURL(url)

      let { width, height } = img

      // Solo redimensionar si excede maxDimension
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width)
          width = maxDimension
        } else {
          width = Math.round((width * maxDimension) / height)
          height = maxDimension
        }
      }

      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext("2d")
      if (!ctx) {
        reject(new Error("No se pudo crear el contexto del canvas"))
        return
      }

      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("No se pudo comprimir la imagen"))
            return
          }
          const optimizedFile = new File(
            [blob],
            file.name.replace(/\.[^/.]+$/, ".jpg"),
            { type: "image/jpeg" }
          )
          resolve(optimizedFile)
        },
        "image/jpeg",
        quality
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Error al cargar la imagen"))
    }

    img.src = url
  })
}
