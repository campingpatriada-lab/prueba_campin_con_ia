import * as incidenciaRepo from "@/lib/repositories/incidencia.repository";
import { IncidenciaConEmpleado } from "@/lib/repositories/incidencia.repository";

export async function buscarIncidenciasPorPatenteServicio(
  patente: string
): Promise<IncidenciaConEmpleado[]> {
  if (!patente || !patente.trim()) {
    return [];
  }
  return await incidenciaRepo.buscarPorPatente(patente.trim());
}

export async function crearIncidenciaServicio(data: {
  patente: string;
  descripcion: string;
  id_empleado: number;
  id_estadia: number;
}): Promise<number> {
  if (!data.patente?.trim()) throw new Error("Patente requerida");
  if (!data.descripcion?.trim()) throw new Error("Descripcion requerida");
  if (!data.id_empleado) throw new Error("Empleado requerido");
  if (!data.id_estadia) throw new Error("Estadia requerida");
  return await incidenciaRepo.crearIncidencia({
    ...data,
    patente: data.patente.trim(),
    descripcion: data.descripcion.trim(),
  });
}
