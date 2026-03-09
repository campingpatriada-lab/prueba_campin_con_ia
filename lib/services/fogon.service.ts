import { obtenerFogonesDisponibles, obtenerFogonPorNumero, obtenerFechaSalidaDeFogon, obtenerIdPorNumero } from "@/lib/repositories/fogon.repository";

export async function listarFogonesDisponibles() {
  const nums = await obtenerFogonesDisponibles();
  return nums;
}

export async function validarNumeroFogon(numero: number) {
  const fogon = await obtenerFogonPorNumero(numero);
  if (!fogon) {
    return { existe: false, ocupado: false, fecha_salida: null };
  }
  const ocupado = fogon.estado === 1;
  const fecha_salida = ocupado ? await obtenerFechaSalidaDeFogon(numero) : null;
  return { existe: true, ocupado, fecha_salida };
}

export async function idFogonPorNumero(numero: number) {
  return await obtenerIdPorNumero(numero);
}
