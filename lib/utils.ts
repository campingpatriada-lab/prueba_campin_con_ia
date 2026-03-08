import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Devuelve la fecha actual en horario argentino (America/Buenos_Aires)
 * en formato YYYY-MM-DD
 */
export function fechaHoyArgentina(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Buenos_Aires",
  })
}

/**
 * Devuelve un Date representando "ahora" en Argentina
 */
export function ahoraArgentina(): Date {
  const now = new Date()
  const argStr = now.toLocaleString("en-US", { timeZone: "America/Buenos_Aires" })
  return new Date(argStr)
}

/**
 * Devuelve la hora actual en Argentina en formato HH:MM:SS
 */
export function horaAhoraArgentina(): string {
  return new Date().toLocaleTimeString("en-GB", {
    timeZone: "America/Buenos_Aires",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
}
