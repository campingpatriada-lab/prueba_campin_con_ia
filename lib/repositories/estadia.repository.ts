import { tursoClient } from "@/lib/turso-db";
import { horaAhoraArgentina } from "@/lib/utils";

/* ============================
   Tipos
============================ */

export type EstadoEstadia = 1 | 0; // 1 = activa, 0 = cerrada

export interface EstadiaDB {
  id_estadia: number;

  patente: string | null;
  cantidad_personas: number;
  cantidad_menores: number | null;

  fecha_entrada: string;
  fecha_salida: string | null;

  nombre_responsable: string | null;
  dni_responsable: string | null;

  tipo_estadia: string | null;

  estado: EstadoEstadia;
  observaciones: string | null;

  id_empleado: number;
  nombre_empleado?: string | null;
  ingreso_monto?: number | null;
  hora_ingreso?: string | null;
  hora_egreso?: string | null;
}

/* ============================
   Mapper único
============================ */

function mapRowToEstadia(row: any): EstadiaDB {
  return {
    id_estadia: Number(row.id_estadia),
    patente: row.patente ? String(row.patente) : null,
    cantidad_personas: Number(row.cantidad_personas),
    cantidad_menores: row.cantidad_menores != null ? Number(row.cantidad_menores) : null,
    fecha_entrada: String(row.fecha_entrada),
    fecha_salida: row.fecha_salida ? String(row.fecha_salida) : null,
    nombre_responsable: row.nombre_responsable
      ? String(row.nombre_responsable)
      : null,
    dni_responsable: row.dni_responsable
      ? String(row.dni_responsable)
      : null,
    tipo_estadia: row.tipo_estadia ? String(row.tipo_estadia) : null,
    estado: Number(row.estado) as EstadoEstadia,
    observaciones: row.observaciones
      ? String(row.observaciones)
      : null,
    id_empleado: Number(row.id_empleado),
    nombre_empleado: row.nombre_empleado
      ? String(row.nombre_empleado)
      : null,
    ingreso_monto:
      row.ingreso_monto !== undefined
        ? Number(row.ingreso_monto)
        : null,
    hora_ingreso: row.hora_ingreso ? String(row.hora_ingreso) : null,
    hora_egreso: row.hora_egreso ? String(row.hora_egreso) : null,
  };
}

/* ============================
   Obtener por ID
============================ */
export async function obtenerEstadiaPorId(
  id: number
): Promise<EstadiaDB | null> {
  try {
    const result = await tursoClient.execute({
      sql: `
        SELECT 
          e.*,
          i.monto AS ingreso_monto,
          emp.nombre AS nombre_empleado
        FROM estadia e
        LEFT JOIN ingreso i 
          ON e.id_estadia = i.id_estadia
        LEFT JOIN empleado emp
          ON e.id_empleado = emp.id_empleado
        WHERE e.estado = 1
        AND e.id_estadia = ?
        LIMIT 1
      `,
      args: [id],
    });

    if (result.rows.length === 0) return null;

    return mapRowToEstadia(result.rows[0]);

  } catch (error) {
    console.error("Error obteniendo estadía por id:", error);
    throw new Error("Error de base de datos");
  }
}
/* ============================
   Obtener activas por patente
============================ */
export async function obtenerEstadiasPorPatente(
  patente: string
): Promise<EstadiaDB[]> {
  try {

    const pat = patente?.trim().toUpperCase();
    if (!pat) return [];

    const result = await tursoClient.execute({
      sql: `
        SELECT 
          e.*,
          emp.nombre AS nombre_empleado
        FROM estadia e
        LEFT JOIN empleado emp
          ON e.id_empleado = emp.id_empleado
        WHERE e.estado = 1
        AND UPPER(e.patente) LIKE ?
        ORDER BY e.fecha_entrada DESC
      `,
      args: [`${pat}%`],
    });

    if (result.rows.length === 0) return [];

    return result.rows.map(mapRowToEstadia);

  } catch (error) {
    console.error("Error obteniendo estadias por patente:", error);
    throw new Error("Error de base de datos");
  }
}
/* ============================
   Obtener activas por DNI
============================ */
export async function obtenerEstadiasPorDni(
  dni: string
): Promise<EstadiaDB[]> {
  try {

    const doc = dni?.trim();
    if (!doc) return [];

    const result = await tursoClient.execute({
      sql: `
        SELECT 
          e.*,
          emp.nombre AS nombre_empleado
        FROM estadia e
        LEFT JOIN empleado emp
          ON e.id_empleado = emp.id_empleado
        WHERE e.estado = 1
        AND e.dni_responsable LIKE ?
        ORDER BY e.fecha_entrada DESC
      `,
      args: [`%${doc}%`],
    });

    if (result.rows.length === 0) return [];

    return result.rows.map(mapRowToEstadia);

  } catch (error) {
    console.error("Error obteniendo estadias por dni:", error);
    throw new Error("Error de base de datos");
  }
}
/* ============================
   Obtener activas por nombre (LIKE)
============================ */
export async function obtenerEstadiasPorNombre(
  nombre: string
): Promise<EstadiaDB[]> {
  try {
    const nom = nombre?.trim();
    if (!nom) return [];

    const result = await tursoClient.execute({
      sql: `
        SELECT
          e.*,
          emp.nombre AS nombre_empleado
        FROM estadia e
        LEFT JOIN empleado emp
          ON e.id_empleado = emp.id_empleado
        WHERE e.estado = 1
          AND e.nombre_responsable LIKE ?
        ORDER BY e.fecha_entrada DESC
      `,
      args: [`${nom}%`],
    });

    if (result.rows.length === 0) return [];

    return result.rows.map(mapRowToEstadia);

  } catch (error) {
    console.error("Error obteniendo estadias por nombre:", error);
    throw new Error("Error de base de datos");
  }
}
/* ============================
   Obtener activas
============================ */
export async function obtenerEstadiasActivas(): Promise<EstadiaDB[]> {
  try {
    const result = await tursoClient.execute({
      sql: `
        SELECT 
          e.*,
          emp.nombre AS nombre_empleado
        FROM estadia e
        LEFT JOIN empleado emp
          ON e.id_empleado = emp.id_empleado
        WHERE e.estado = 1
        ORDER BY e.id_estadia DESC
      `,
    });

    if (result.rows.length === 0) {
      return [];
    }

    return result.rows.map(mapRowToEstadia);

  } catch (error) {
    console.error("Error obteniendo estadías activas:", error);
    throw new Error("Error de base de datos");
  }
}
/* ============================
   Obtener todas estadias + ingreso left join
============================ */

export async function obtenerEstadias(): Promise<EstadiaDB[]> {
  try {
    const result = await tursoClient.execute({
      sql: `
        SELECT 
          e.*,
          i.monto AS ingreso_monto,
          emp.nombre AS nombre_empleado
        FROM estadia e
        LEFT JOIN ingreso i 
          ON e.id_estadia = i.id_estadia
        LEFT JOIN empleado emp
          ON e.id_empleado = emp.id_empleado
        ORDER BY e.fecha_entrada DESC
      `,
    });

    if (result.rows.length === 0) {
      return [];
    }

    return result.rows.map(mapRowToEstadia);

  } catch (error) {
    console.error("Error obteniendo estadías:", error);
    throw new Error("Error de base de datos");
  }
}


/* ============================
   Crear estadía
============================ */

export async function crearEstadia(
  estadia: Omit<EstadiaDB, "id_estadia" | "estado">
): Promise<EstadiaDB> {
  try {
    const horaIngreso = horaAhoraArgentina();

    const result = await tursoClient.execute({
      sql: `
        INSERT INTO estadia (
          patente,
          cantidad_personas,
          cantidad_menores,
          fecha_entrada,
          fecha_salida,
          nombre_responsable,
          dni_responsable,
          tipo_estadia,
          observaciones,
          id_empleado,
          estado,
          hora_ingreso
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
      `,
      args: [
        estadia.patente
          ? estadia.patente.trim().toUpperCase()
          : null,
        estadia.cantidad_personas,
        estadia.cantidad_menores ?? null,
        estadia.fecha_entrada,
        estadia.fecha_salida ?? null,
        estadia.nombre_responsable ?? null,
        estadia.dni_responsable ?? null,
        estadia.tipo_estadia ?? null,
        estadia.observaciones ?? null,
        estadia.id_empleado,
        horaIngreso,
      ],
    });

    if (result.rowsAffected === 0) {
      throw new Error("No se pudo crear la estadía");
    }

    const id = Number(result.lastInsertRowid);

    const creada = await obtenerEstadiaPorId(id);

    if (!creada) {
      throw new Error("Error al recuperar la estadía creada");
    }

    return creada;
  } catch (error) {
    console.error("Error creando estadía:", error);
    throw new Error("Error de base de datos");
  }
}

/* ============================
   Cerrar estadía (idempotente)
============================ */

export async function cerrarEstadia(
  id_estadia: number,
  fecha_salida: string
): Promise<boolean> {
  try {
    const horaEgreso = horaAhoraArgentina();

    const result = await tursoClient.execute({
      sql: `
        UPDATE estadia
        SET estado = 0,
            fecha_salida = ?,
            hora_egreso = ?
        WHERE id_estadia = ? AND estado = 1
      `,
      args: [fecha_salida, horaEgreso, id_estadia],
    });

    return result.rowsAffected === 1;
  } catch (error) {
    console.error("Error cerrando estadía:", error);
    throw new Error("Error de base de datos");
  }
}

/* ============================
   Editar estadia 
============================ */

export async function editarEstadia(
  id_estadia: number,
  datos: Partial<Omit<EstadiaDB, "id_estadia" | "id_empleado">>
): Promise<boolean> {
  try {

    const campos: string[] = [];
    const valores: any[] = [];

    if (datos.patente !== undefined) {
      campos.push("patente = ?");
      valores.push(datos.patente ? datos.patente.trim().toUpperCase() : null);
    }

    if (datos.cantidad_personas !== undefined) {
      campos.push("cantidad_personas = ?");
      valores.push(datos.cantidad_personas);
    }

    if (datos.cantidad_menores !== undefined) {
      campos.push("cantidad_menores = ?");
      valores.push(datos.cantidad_menores ?? null);
    }

    if (datos.fecha_entrada !== undefined) {
      campos.push("fecha_entrada = ?");
      valores.push(datos.fecha_entrada);
    }

    if (datos.fecha_salida !== undefined) {
      campos.push("fecha_salida = ?");
      valores.push(datos.fecha_salida ?? null);
    }

    if (datos.nombre_responsable !== undefined) {
      campos.push("nombre_responsable = ?");
      valores.push(datos.nombre_responsable ?? null);
    }

    if (datos.dni_responsable !== undefined) {
      campos.push("dni_responsable = ?");
      valores.push(datos.dni_responsable ?? null);
    }

    if (datos.tipo_estadia !== undefined) {
      campos.push("tipo_estadia = ?");
      valores.push(datos.tipo_estadia ?? null);
    }

    if (datos.observaciones !== undefined) {
      campos.push("observaciones = ?");
      valores.push(datos.observaciones ?? null);
    }

    if (datos.estado !== undefined) {
      campos.push("estado = ?");
      valores.push(datos.estado);
    }

    if (campos.length === 0) return false;

    valores.push(id_estadia);

    const result = await tursoClient.execute({
      sql: `
        UPDATE estadia
        SET ${campos.join(", ")}
        WHERE id_estadia = ?
      `,
      args: valores,
    });

    return result.rowsAffected === 1;

  } catch (error) {
    console.error("Error editando estadía:", error);
    throw new Error("Error de base de datos");
  }
}




/* ============================
   obtener estadias por mes. Para generar los .exel y que el usurario pueda descargarlo.
============================ */

// export async function obtenerEstadiasPorMes(
//   anio: number,
//   mes: number
// ): Promise<EstadiaDB[]> {
//   try {
//     // Fecha de inicio del mes
//     const inicio = `${anio}-${String(mes).padStart(2, "0")}-01`;

//     // Fecha de fin del mes (el primer día del siguiente mes)
//     const fin = `${anio}-${String(mes + 1).padStart(2, "0")}-01`;

//     const result = await tursoClient.execute({
//       sql: `
//         SELECT e.*,i.monto AS ingreso_monto
//         FROM estadia e
//         LEFT JOIN ingreso i 
//             ON e.id_estadia = i.id_estadia
//         WHERE e.fecha_entrada >= ?
//           AND e.fecha_entrada < ?
//           AND e.estado = 1
//         ORDER BY e.fecha_entrada DESC
//       `,
//       args: [inicio, fin],
//     });

//     if (result.rows.length === 0) return [];

//     return result.rows.map(mapRowToEstadia);

//   } catch (error) {
//     console.error("Error obteniendo estadías por mes:", error);
//     throw new Error("Error de base de datos");
//   }
// }


export interface EstadiaConPagoRow extends EstadiaDB {
  ingreso_tipo?: string | null;
}

function mapRowToEstadiaConPago(row: any): EstadiaConPagoRow {
  return {
    ...mapRowToEstadia(row),
    ingreso_tipo: row.ingreso_tipo ? String(row.ingreso_tipo) : null,
  };
}

export async function obtenerEstadiasPorMes(
  anio: number,
  mes: number
): Promise<EstadiaConPagoRow[]> {
  try {

    const inicio = `${anio}-${String(mes).padStart(2, "0")}-01`;

    const siguienteMes = mes === 12 ? 1 : mes + 1;
    const siguienteAnio = mes === 12 ? anio + 1 : anio;

    const fin = `${siguienteAnio}-${String(siguienteMes).padStart(2, "0")}-01`;

    const result = await tursoClient.execute({
      sql: `
        SELECT 
          e.*,
          i.monto AS ingreso_monto,
          i.tipo_ingreso AS ingreso_tipo,
          emp.nombre AS nombre_empleado
        FROM estadia e
        LEFT JOIN ingreso i 
          ON e.id_estadia = i.id_estadia
        LEFT JOIN empleado emp
          ON e.id_empleado = emp.id_empleado
        WHERE e.fecha_entrada >= ?
          AND e.fecha_entrada < ?
        ORDER BY e.fecha_entrada DESC
      `,
      args: [inicio, fin],
    });

    if (result.rows.length === 0) return [];

    return result.rows.map(mapRowToEstadiaConPago);

  } catch (error) {
    console.error("Error obteniendo estadías por mes:", error);
    throw new Error("Error de base de datos");
  }
}



