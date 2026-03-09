import { tursoClient } from "@/lib/turso-db";

export interface FogonDB {
  id_fogon: number;
  numero_fogon: number;
  estado: number; // 0 libre, 1 ocupado
}

export async function obtenerFogonesDisponibles(): Promise<number[]> {
  const res = await tursoClient.execute(`
    SELECT numero_fogon FROM fogon WHERE estado = 0 ORDER BY numero_fogon ASC
  `);
  return res.rows.map(r => Number(r.numero_fogon));
}

export async function obtenerFogonPorNumero(numero: number): Promise<FogonDB | null> {
  const res = await tursoClient.execute({
    sql: `SELECT * FROM fogon WHERE numero_fogon = ? LIMIT 1`,
    args: [numero],
  });
  if (res.rows.length === 0) return null;
  const row = res.rows[0];
  return {
    id_fogon: Number(row.id_fogon),
    numero_fogon: Number(row.numero_fogon),
    estado: Number(row.estado),
  };
}

export async function obtenerFechaSalidaDeFogon(numero: number): Promise<string | null> {
  const res = await tursoClient.execute({
    sql: `
      SELECT e.fecha_salida 
      FROM estadia e 
      JOIN fogon f ON e.id_fogon = f.id_fogon
      WHERE f.numero_fogon = ? AND e.estado = 1
      ORDER BY e.fecha_salida DESC
      LIMIT 1
    `,
    args: [numero],
  });
  if (res.rows.length === 0) return null;
  return res.rows[0].fecha_salida ? String(res.rows[0].fecha_salida) : null;
}

export async function obtenerIdPorNumero(numero: number): Promise<number | null> {
  const f = await obtenerFogonPorNumero(numero);
  return f ? f.id_fogon : null;
}

export interface FogonConServicios {
  numero_fogon: number;
  estado: number;
  servicios: string[];
}

export async function obtenerFogonesConServicios(): Promise<FogonConServicios[]> {
  const res = await tursoClient.execute(`
    SELECT 
      f.numero_fogon,
      f.estado,
      GROUP_CONCAT(s.nombre_servicio, ',') AS servicios
    FROM fogon f
    LEFT JOIN servicios_fogones sf ON sf.id_fogon = f.id_fogon
    LEFT JOIN servicios s ON s.id_servicio = sf.id_servicio
    GROUP BY f.id_fogon
    ORDER BY f.numero_fogon ASC
  `);
  return res.rows.map(r => ({
    numero_fogon: Number(r.numero_fogon),
    estado: Number(r.estado),
    servicios: r.servicios ? String(r.servicios).split(",") : [],
  }));
}

export async function liberarFogonPorId(id_fogon: number): Promise<boolean> {
  const res = await tursoClient.execute({
    sql: `UPDATE fogon SET estado = 0 WHERE id_fogon = ?`,
    args: [id_fogon],
  });
  return res.rowsAffected === 1;
}

export async function ocuparFogonPorId(id_fogon: number): Promise<boolean> {
  const res = await tursoClient.execute({
    sql: `UPDATE fogon SET estado = 1 WHERE id_fogon = ?`,
    args: [id_fogon],
  });
  return res.rowsAffected === 1;
}
