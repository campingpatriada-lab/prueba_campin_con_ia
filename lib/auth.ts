import jwt from "jsonwebtoken"
import { cookies } from "next/headers"
import type { RolEmpleado } from "@/lib/repositories/empleado.repository"

const JWT_SECRET = process.env.JWT_SECRET!

export interface JwtPayload {
  id_empleado: number
  nombre: string
  rol: RolEmpleado
}

// Duracion del token segun rol
function getTokenDuration(rol: RolEmpleado): string {
  return rol === "ADMIN" ? "7d" : "1d"
}

// Generar token JWT
export function generarToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: getTokenDuration(payload.rol),
  })
}

// Verificar token JWT
export function verificarToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload
    return decoded
  } catch {
    return null
  }
}

// Obtener sesion desde cookies (para uso en Route Handlers)
export async function obtenerSesion(): Promise<JwtPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get("session")?.value

  if (!token) return null

  return verificarToken(token)
}

// Validar que sea ADMIN
export async function validarAdmin(): Promise<JwtPayload> {
  const sesion = await obtenerSesion()

  if (!sesion) {
    throw new Error("No autenticado")
  }

  if (sesion.rol !== "ADMIN") {
    throw new Error("Acceso denegado: se requiere rol ADMIN")
  }

  return sesion
}

// Validar que este autenticado (cualquier rol)
export async function validarAutenticado(): Promise<JwtPayload> {
  const sesion = await obtenerSesion()

  if (!sesion) {
    throw new Error("No autenticado")
  }

  return sesion
}

// Duracion de la cookie en segundos segun rol
export function getCookieMaxAge(rol: RolEmpleado): number {
  return rol === "ADMIN" ? 7 * 24 * 60 * 60 : 24 * 60 * 60
}
