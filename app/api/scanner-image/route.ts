import { NextResponse } from "next/server"
import { getSharedUrl, initConfigTable } from "@/lib/turso-db"
import { validarAutenticado } from "@/lib/auth"
import { buscarPorPatenteServicio } from "@/lib/services/estadia.service"
import jwt from "jsonwebtoken"
import { CloudinaryServicio } from "./cloudinary"

const jwt_secreta = process.env.JWT_SECRET || ""

const loginPrueba = {
  usuario: "Admin",
  id: 20,
}

const JWT_TEMPORAL = jwt_secreta ? jwt.sign(loginPrueba, jwt_secreta) : ""

export async function POST(request: Request) {
  let publicId: string | null = null

  try {
    await validarAutenticado()

    if (!jwt_secreta) {
      return NextResponse.json(
        { exito: false, mensaje: "JWT_SECRET no configurado" },
        { status: 500 }
      )
    }

    // 1. FormData
    const formData = await request.formData()
    const imagen = formData.get("imagen")

    if (!imagen || !(imagen instanceof File)) {
      return NextResponse.json(
        { exito: false, mensaje: "No se envio ninguna imagen" },
        { status: 400 }
      )
    }

    const tiposPermitidos = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "image/webp",
      "image/heic",
    ]

    if (!tiposPermitidos.includes(imagen.type)) {
      return NextResponse.json(
        {
          exito: false,
          mensaje: "Formato de imagen no soportado",
          tipo: imagen.type,
        },
        { status: 400 }
      )
    }

    // 2. Config DB
    await initConfigTable()
    const apiUrl = await getSharedUrl()

    if (!apiUrl) {
      return NextResponse.json(
        { exito: false, mensaje: "URL del servidor no configurada" },
        { status: 404 }
      )
    }

    // 3. Subir imagen a Cloudinary
    const arrayBuffer = await imagen.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const resultadoCloud =
      await CloudinaryServicio.subirImagenBuffer(buffer)

    const urlImagen = resultadoCloud.secure_url
    publicId = resultadoCloud.public_id

    // 4. Detectar patente (API ESCRITORIO)
    const resApiEscritorio = await fetch(
      `${apiUrl}/detectarPatenteEnFoto`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlImagen }),
      }
    )

    // Error tecnico (HTTP)
    if (!resApiEscritorio.ok) {
      const errorJson = await resApiEscritorio.json()

      return NextResponse.json(
        {
          exito: false,
          origen: "api-escritorio",
          mensaje:
            errorJson.mensaje ??
            "La API de deteccion fallo - no se pudo detectar la patente",
          httpStatus: resApiEscritorio.status,
          data: null,
        },
        { status: resApiEscritorio.status }
      )
    }

    // JSON valido
    const resApiEsc = await resApiEscritorio.json()

    // Resultado logico (no se detecto patente)
    if (!resApiEsc.exito) {
      return NextResponse.json(
        {
          exito: false,
          origen: "api-escritorio",
          mensaje: resApiEsc.mensaje ?? "No se detecto ninguna patente",
          httpStatus: resApiEscritorio.status,
          data: null,
          patente: null,
        },
        { status: 200 }
      )
    }

    // Patente detectada - buscar en Turso DB
    const patenteDetectada = resApiEsc.patente || resApiEsc.data?.patente || null

    if (patenteDetectada) {
      try {
        const estadias = await buscarPorPatenteServicio(patenteDetectada)
        const estadia = estadias[0]
        return NextResponse.json({
          exito: true,
          mensaje: "Patente encontrada en el sistema",
          patente: patenteDetectada,
          data: estadia,
        })
      } catch {
        return NextResponse.json({
          exito: false,
          mensaje: `Patente ${patenteDetectada} detectada pero no tiene estadia activa`,
          patente: patenteDetectada,
          data: null,
        })
      }
    }

    // Wrapper final para respuestas sin patente clara
    return NextResponse.json(
      {
        exito: resApiEsc.exito,
        origen: "api-escritorio",
        httpStatus: resApiEscritorio.status,
        data: resApiEsc.data ?? null,
        respuesta: resApiEsc,
        patente: null,
      },
      { status: resApiEscritorio.status }
    )
  } catch (err) {
    return NextResponse.json(
      {
        exito: false,
        origen: "scanner-image",
        mensaje: "Error interno del servidor",
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    )
  } finally {
    // 5️⃣ Eliminar imagen de Cloudinary SIEMPRE
    if (publicId) {
      try {
        await CloudinaryServicio.eliminarImagen(publicId)
      } catch (e) {
        console.error("Error eliminando imagen:", e)
      }
    }
  }
}



// import { NextResponse } from "next/server"
// import { getSharedUrl, initConfigTable } from "@/lib/turso-db"
// import jwt from "jsonwebtoken";

// const subirImagenApi = "https://api-fotos-campig.onrender.com/api/subirImagen";
// const eliminarImagen="https://api-fotos-campig.onrender.com/api/eliminarImagen"

// const loginPrueba = {
//   usuario: "Admin",
//   id: 20,
// }

// const jwt_secreta = process.env.JWT_SECRET || ""


// const JWT_TEMPORAL = jwt.sign(loginPrueba, jwt_secreta);

// export async function POST(request: Request) {
//   try {
//     if (jwt_secreta==""){
//         return NextResponse.json(
//         { exito: false, mensaje: "token vacio" },
//         { status: 400 }
//       )

//     }
//     // 1️⃣ FormData
//     const formData = await request.formData()
//     const imagen = formData.get("imagen")

//     if (!imagen || !(imagen instanceof File)) {
//       return NextResponse.json(
//         { exito: false, mensaje: "No se envió ninguna imagen" },
//         { status: 400 }
//       )
//     }

//     // 2️⃣ Config DB
//     await initConfigTable()
//     const apiUrl = await getSharedUrl()

//     if (!apiUrl) {
//       return NextResponse.json(
//         { exito: false, mensaje: "URL del servidor no configurada" },
//         { status: 404 }
//       )
//     }

//     // 3️⃣ Subir imagen
//     const externalFormData = new FormData()
//     externalFormData.append("imagen", imagen)

//     const resApiFoto = await fetch(subirImagenApi, {
//       method: "POST",
//       headers: {
//         Authorization: `Bearer ${JWT_TEMPORAL}`,
//       },
//       body: externalFormData,
//     })

//     if (!resApiFoto.ok) {
//       const text = await resApiFoto.text()
//       return NextResponse.json(
//         { exito: false, mensaje: "Error subiendo imagen", error: text },
//         { status: resApiFoto.status }
//       )
//     }

//     const resApiImagen = await resApiFoto.json()

//     if (!resApiImagen.exito) {
//       return NextResponse.json(
//         { exito: false, mensaje: "No se pudo generar la URL" },
//         { status: 500 }
//       )
//     }

//     // 4️⃣ Detectar patente
//     const resApiEscritorio = await fetch(`${apiUrl}/detectarPatente`, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({
//         url: resApiImagen.datos.url,
//       }),
//     })

//     if (!resApiEscritorio.ok) {
//       const text = await resApiEscritorio.text()
//       return NextResponse.json(
//         { exito: false, mensaje: "Error en detección", error: text },
//         { status: resApiEscritorio.status }
//       )
//     }
//     console.log("ago mas")
//     const resApiEsc = await resApiEscritorio.json()

//     // 5️⃣ RESPUESTA LIMPIA (React-friendly)
//     return NextResponse.json(
//       {
//         exito: true,
//         datos: resApiEsc.patente,
//       },
//       { status: 200 }
//     )

//   } catch (err) {
//     console.error("Error en proxy /recibirImagen:", err)
//     return NextResponse.json(
//       {
//         exito: false,
//         mensaje: "Error interno del servidor",
//         error: err instanceof Error ? err.message : String(err),
//       },
//       { status: 500 }
//     )
//   }
// }





// // //NO BORRAR FUNCIONAL au no :

// // import { NextResponse } from "next/server"
// // import { getSharedUrl, initConfigTable } from "@/lib/turso-db"
// // import jwt from "jsonwebtoken";


// // //url api
// // const subirImagenApi="https://api-fotos-campig.onrender.com/api/subirImagen";
// // const eliminarImagenApi="https://api-fotos-campig.onrender.com/api/eliminarImagen";
// // const loginPrueba={
// //   usuario: "Admin",
// //   id: 20,
// // }


// // async function  pureba(){
// //    const uno=await getSharedUrl();
// //    const dos=await initConfigTable();
// //    console.log(uno,dos);
// // }


// // const jwt_secreta= process.env.JWT_SECRET||"";


// // const JWT_TEMPORAL = jwt.sign(loginPrueba, jwt_secreta, {
// //   expiresIn: "1h",
// // });

// // // Proxy para /recibirImagen (busqueda por foto)
// // export async function POST(request: Request) {
// //   await pureba();
// //   try {
// //     // Obtener el FormData del request
// //     const formData = await request.formData()
// //     const imagen = formData.get("imagen")

// //     if (!imagen || !(imagen instanceof File)) {
// //       return NextResponse.json(
// //         { exito: false, mensaje: "No se envió ninguna imagen" },
// //         { status: 400 }
// //       )
// //     }

// //     // Inicializar tabla si no existe
// //     await initConfigTable()

// //     // Obtener URL desde Turso DB
// //     const apiUrl = await getSharedUrl()

// //     if (!apiUrl) {
// //       return NextResponse.json(
// //         { exito: false, mensaje: "URL del servidor no configurada" },
// //         { status: 404 }
// //       )
// //     }

// //     // Crear nuevo FormData para enviar al servidor externo
// //     const externalFormData = new FormData()
// //     externalFormData.append("imagen", imagen)

// //     // Hacer la peticion al servidor externo sube la foto a cloudinary
// //     const resApiFoto = await fetch(subirImagenApi, {
// //       method: "POST",
// //       headers:{
// //         'Authorization': 'Bearer '+JWT_TEMPORAL
// //       },
// //       body: externalFormData,
// //     })
// //     const resApiImagen= await resApiFoto.json();
// //     if (!resApiImagen.exito){
// //       return NextResponse.json({exito:false,mensaje:"No se pudo subir generar la url"})
// //     }
// //     //mandar imagen a api externa {apiUrl}/detectarPatente
// //     const objParaEnviar={
// //       url:resApiImagen.datos.url
// //     }
// //     const resApiEscritorio= await fetch(`${apiUrl}/detectarPatente`,{
// //       method:"POST",
// //       body:JSON.stringify(objParaEnviar)
// //     });
// //     const resApiEsc=await resApiEscritorio.json();
    
// //     // // Verificar si la respuesta es JSON antes de parsear
// //     // const contentType = resApiEsc.headers.get("content-type")
// //     // if (!contentType || !contentType.includes("application/json")) {
// //     //   // El servidor devolvio algo que no es JSON (ej: error en texto plano)
// //     //   const textResponse = await resApiEsc.text()
// //     //   console.error("[v0] Respuesta no-JSON del servidor:", textResponse)
// //     //   return NextResponse.json(
// //     //     {
// //     //       exito: false,
// //     //       mensaje: "Error del servidor externo",
// //     //       error: textResponse || `HTTP ${resApiEsc.status}`,
// //     //     },
// //     //     { status: resApiEsc.status }
// //     //   )
// //     // }
// //     // Devolver la respuesta del servidor
// //     return NextResponse.json(resApiEsc, { status: resApiEscritorio.status })
// //   } catch (error) {
// //     console.error("Error en proxy /recibirImagen:", error)
// //     return NextResponse.json(
// //       {
// //         exito: false,
// //         mensaje: "Error al conectar con el servidor de escaneo",
// //         // error: error instanceof Error ? error.message : "Error desconocido",
// //         error:error
// //       },
// //       { status: 500 }
// //     )
// //   }
// // }





// // //NO BORRAR FUNCIONAL:
// // import { NextResponse } from "next/server"
// // import { getSharedUrl, initConfigTable } from "@/lib/turso-db"

// // // Proxy para /recibirImagen (busqueda por foto)
// // export async function POST(request: Request) {
// //   try {
// //     // Obtener el FormData del request
// //     const formData = await request.formData()
// //     const imagen = formData.get("imagen")

// //     if (!imagen || !(imagen instanceof File)) {
// //       return NextResponse.json(
// //         { exito: false, mensaje: "No se envió ninguna imagen" },
// //         { status: 400 }
// //       )
// //     }

// //     // Inicializar tabla si no existe
// //     await initConfigTable()

// //     // Obtener URL desde Turso DB
// //     const apiUrl = await getSharedUrl()

// //     if (!apiUrl) {
// //       return NextResponse.json(
// //         { exito: false, mensaje: "URL del servidor no configurada" },
// //         { status: 404 }
// //       )
// //     }

// //     // Crear nuevo FormData para enviar al servidor externo
// //     const externalFormData = new FormData()
// //     externalFormData.append("imagen", imagen)

// //     // Hacer la peticion al servidor externo
// //     const res = await fetch(`${apiUrl}/recibirImagen`, {
// //       method: "POST",
// //       body: externalFormData,
// //     })

// //     // Verificar si la respuesta es JSON antes de parsear
// //     const contentType = res.headers.get("content-type")
// //     if (!contentType || !contentType.includes("application/json")) {
// //       // El servidor devolvio algo que no es JSON (ej: error en texto plano)
// //       const textResponse = await res.text()
// //       console.error("[v0] Respuesta no-JSON del servidor:", textResponse)
// //       return NextResponse.json(
// //         {
// //           exito: false,
// //           mensaje: "Error del servidor externo",
// //           error: textResponse || `HTTP ${res.status}`,
// //         },
// //         { status: res.status }
// //       )
// //     }

// //     const data = await res.json()

// //     // Devolver la respuesta del servidor
// //     return NextResponse.json(data, { status: res.status })
// //   } catch (error) {
// //     console.error("Error en proxy /recibirImagen:", error)
// //     return NextResponse.json(
// //       {
// //         exito: false,
// //         mensaje: "Error al conectar con el servidor de escaneo",
// //         error: error instanceof Error ? error.message : "Error desconocido",
// //       },
// //       { status: 500 }
// //     )
// //   }
// // }
