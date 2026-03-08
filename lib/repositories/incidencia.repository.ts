import { tursoClient } from "@/lib/turso-db";

/* ============================
   Tipos
============================ */

export interface IncidenciaDB {
  id_incidencia: number;
  patente: string;
  descripcion: string;
  fecha: string;
  id_empleado: number;
  id_estadia: number;
}

export interface IncidenciaConEmpleado extends IncidenciaDB {
  nombre_empleado: string;
}

/* ============================
   Mapper
============================ */

function mapRow(row: any): IncidenciaConEmpleado {
  return {
    id_incidencia: Number(row.id_incidencia),
    patente: String(row.patente),
    descripcion: String(row.descripcion),
    fecha: String(row.fecha),
    id_empleado: Number(row.id_empleado),
    id_estadia: Number(row.id_estadia),
    nombre_empleado: row.nombre_empleado ? String(row.nombre_empleado) : "",
  };
}

/* ============================
   Obtener IDs de estadias que tienen incidencias
============================ */

export async function obtenerEstadiasConIncidencia(ids: number[]): Promise<Set<number>> {
  if (ids.length === 0) return new Set();
  try {
    const placeholders = ids.map(() => "?").join(",");
    const result = await tursoClient.execute({
      sql: `SELECT DISTINCT id_estadia FROM incidencias WHERE id_estadia IN (${placeholders})`,
      args: ids,
    });
    return new Set(result.rows.map((r) => Number(r.id_estadia)));
  } catch (error) {
    console.error("Error obteniendo estadias con incidencia:", error);
    return new Set();
  }
}

/* ============================
   Crear incidencia
============================ */

export async function crearIncidencia(data: {
  patente: string;
  descripcion: string;
  id_empleado: number;
  id_estadia: number;
}): Promise<number> {
  try {
    const result = await tursoClient.execute({
      sql: `
        INSERT INTO incidencias (patente, descripcion, id_empleado, id_estadia)
        VALUES (?, ?, ?, ?)
      `,
      args: [data.patente.toUpperCase(), data.descripcion, data.id_empleado, data.id_estadia],
    });
    return Number(result.lastInsertRowid);
  } catch (error) {
    console.error("Error creando incidencia:", error);
    throw new Error("Error de base de datos al crear incidencia");
  }
}

/* ============================
   Buscar incidencias por patente
============================ */

export async function buscarPorPatente(patente: string): Promise<IncidenciaConEmpleado[]> {
  try {
    const result = await tursoClient.execute({
      sql: `
        SELECT i.*, e.nombre AS nombre_empleado
        FROM incidencias i
        LEFT JOIN empleado e ON i.id_empleado = e.id_empleado
        WHERE UPPER(i.patente) = UPPER(?)
        ORDER BY i.fecha DESC
      `,
      args: [patente],
    });

    return result.rows.map(mapRow);
  } catch (error) {
    console.error("Error buscando incidencias por patente:", error);
    throw new Error("Error de base de datos");
  }
}
