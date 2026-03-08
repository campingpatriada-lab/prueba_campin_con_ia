import { tursoClient } from "@/lib/turso-db";

/* ============================
   Tipos
============================ */

export interface IngresoDB {
  id_ingreso: number;
  fecha: string;
  monto: number;
  concepto: string;
  tipo_ingreso: string | null;
  id_empleado: number;
  id_estadia: number | null;
}

/* ============================
   Mapper
============================ */

function mapRowToIngreso(row: any): IngresoDB {
  return {
    id_ingreso: Number(row.id_ingreso),
    fecha: String(row.fecha),
    monto: Number(row.monto),
    concepto: String(row.concepto),
    tipo_ingreso: row.tipo_ingreso ? String(row.tipo_ingreso) : null,
    id_empleado: Number(row.id_empleado),
    id_estadia: row.id_estadia !== null ? Number(row.id_estadia) : null,
  };
}

/* ============================
   Obtener ingreso por ID
============================ */

export async function obtenerIngresoPorId(id: number): Promise<IngresoDB | null> {
  try {
    const result = await tursoClient.execute({
      sql: `
        SELECT *
        FROM ingreso
        WHERE id_ingreso = ?
        LIMIT 1
      `,
      args: [id],
    });

    if (result.rows.length === 0) return null;

    return mapRowToIngreso(result.rows[0]);
  } catch (error) {
    console.error("Error obteniendo ingreso por id:", error);
    throw new Error("Error de base de datos");
  }
}

/* ============================
   Obtener todos los ingresos
============================ */

export async function obtenerIngresos(): Promise<IngresoDB[]> {
  try {
    const result = await tursoClient.execute({
      sql: `SELECT * FROM ingreso ORDER BY fecha DESC`,
    });

    if (result.rows.length === 0) return [];

    return result.rows.map(mapRowToIngreso);
  } catch (error) {
    console.error("Error obteniendo ingresos:", error);
    throw new Error("Error de base de datos");
  }
}

/* ============================
   Obtener ingresos con nombre de empleado (para admin)
============================ */

export interface IngresoConEmpleado extends IngresoDB {
  nombre_empleado: string;
}

export async function obtenerIngresosConEmpleado(): Promise<IngresoConEmpleado[]> {
  try {
    const result = await tursoClient.execute({
      sql: `
        SELECT i.*, e.nombre AS nombre_empleado
        FROM ingreso i
        JOIN empleado e ON i.id_empleado = e.id_empleado
        ORDER BY i.id_ingreso DESC
        LIMIT 10
      `,
    });

    if (result.rows.length === 0) return [];

    return result.rows.map((row) => ({
      ...mapRowToIngreso(row),
      nombre_empleado: String(row.nombre_empleado),
    }));
  } catch (error) {
    console.error("Error obteniendo ingresos con empleado:", error);
    throw new Error("Error de base de datos");
  }
}

/* ============================
   Obtener todos los ingresos por fecha con nombre de empleado (para admin)
============================ */

export async function obtenerIngresosConEmpleadoPorFecha(fecha: string): Promise<IngresoConEmpleado[]> {
  try {
    const result = await tursoClient.execute({
      sql: `
        SELECT i.*, e.nombre AS nombre_empleado
        FROM ingreso i
        JOIN empleado e ON i.id_empleado = e.id_empleado
        WHERE i.fecha = ?
        ORDER BY i.id_ingreso DESC
      `,
      args: [fecha],
    });

    if (result.rows.length === 0) return [];

    return result.rows.map((row) => ({
      ...mapRowToIngreso(row),
      nombre_empleado: String(row.nombre_empleado),
    }));
  } catch (error) {
    console.error("Error obteniendo ingresos con empleado por fecha:", error);
    throw new Error("Error de base de datos");
  }
}

/* ============================
   Obtener ingresos por estadía
============================ */

export async function obtenerIngresosPorEstadia(id_estadia: number): Promise<IngresoDB[]> {
  try {
    const result = await tursoClient.execute({
      sql: `SELECT * FROM ingreso WHERE id_estadia = ? ORDER BY fecha DESC`,
      args: [id_estadia],
    });

    if (result.rows.length === 0) return [];

    return result.rows.map(mapRowToIngreso);
  } catch (error) {
    console.error("Error obteniendo ingresos por estadía:", error);
    throw new Error("Error de base de datos");
  }
}

/* ============================
   Obtener ingresos agrupados por múltiples estadías (batch)
============================ */

export async function obtenerIngresosPorEstadias(ids: number[]): Promise<Map<number, IngresoDB[]>> {
  const map = new Map<number, IngresoDB[]>();
  if (ids.length === 0) return map;

  try {
    const placeholders = ids.map(() => "?").join(",");
    const result = await tursoClient.execute({
      sql: `SELECT * FROM ingreso WHERE id_estadia IN (${placeholders}) ORDER BY id_ingreso ASC`,
      args: ids,
    });

    for (const row of result.rows) {
      const ingreso = mapRowToIngreso(row);
      if (ingreso.id_estadia != null) {
        const arr = map.get(ingreso.id_estadia) || [];
        arr.push(ingreso);
        map.set(ingreso.id_estadia, arr);
      }
    }

    return map;
  } catch (error) {
    console.error("Error obteniendo ingresos por estadías (batch):", error);
    return map;
  }
}

/* ============================
   Crear ingreso
============================ */

export async function crearIngreso(ingreso: Omit<IngresoDB, "id_ingreso">): Promise<IngresoDB> {
  try {
    const result = await tursoClient.execute({
      sql: `
        INSERT INTO ingreso (
          fecha, monto, concepto, tipo_ingreso, id_empleado, id_estadia
        ) VALUES (?, ?, ?, ?, ?, ?)
      `,
      args: [
        ingreso.fecha,
        ingreso.monto,
        ingreso.concepto,
        ingreso.tipo_ingreso ?? null,
        ingreso.id_empleado,
        ingreso.id_estadia ?? null,
      ],
    });

    if (result.rowsAffected === 0) {
      throw new Error("No se pudo crear el ingreso");
    }

    const id = Number(result.lastInsertRowid);
    const creado = await obtenerIngresoPorId(id);

    if (!creado) {
      throw new Error("Error al recuperar el ingreso creado");
    }

    return creado;
  } catch (error) {
    console.error("Error creando ingreso:", error);
    throw new Error("Error de base de datos");
  }
}

/* ============================
   Editar ingreso
============================ */

export async function editarIngreso(
  id_ingreso: number,
  datos: Partial<Omit<IngresoDB, "id_ingreso">>
): Promise<boolean> {
  try {
    const campos: string[] = [];
    const valores: any[] = [];

    if (datos.fecha !== undefined) {
      campos.push("fecha = ?");
      valores.push(datos.fecha);
    }
    if (datos.monto !== undefined) {
      campos.push("monto = ?");
      valores.push(datos.monto);
    }
    if (datos.concepto !== undefined) {
      campos.push("concepto = ?");
      valores.push(datos.concepto);
    }
    if (datos.tipo_ingreso !== undefined) {
      campos.push("tipo_ingreso = ?");
      valores.push(datos.tipo_ingreso ?? null);
    }
    if (datos.id_empleado !== undefined) {
      campos.push("id_empleado = ?");
      valores.push(datos.id_empleado);
    }
    if (datos.id_estadia !== undefined) {
      campos.push("id_estadia = ?");
      valores.push(datos.id_estadia ?? null);
    }

    if (campos.length === 0) return false;

    valores.push(id_ingreso);

    const result = await tursoClient.execute({
      sql: `
        UPDATE ingreso
        SET ${campos.join(", ")}
        WHERE id_ingreso = ?
      `,
      args: valores,
    });

    return result.rowsAffected === 1;
  } catch (error) {
    console.error("Error editando ingreso:", error);
    throw new Error("Error de base de datos");
  }
}

/* ============================
   Eliminar ingreso
============================ */

export async function eliminarIngreso(id_ingreso: number): Promise<boolean> {
  try {
    const result = await tursoClient.execute({
      sql: `DELETE FROM ingreso WHERE id_ingreso = ?`,
      args: [id_ingreso],
    });

    return result.rowsAffected === 1;
  } catch (error) {
    console.error("Error eliminando ingreso:", error);
    throw new Error("Error de base de datos");
  }
}

/* ============================
   Obtener ingresos por mes (para reportes)
============================ */

export async function obtenerIngresosPorMes(
  anio: number,
  mes: number
): Promise<IngresoConEmpleado[]> {
  try {
    const inicio = `${anio}-${String(mes).padStart(2, "0")}-01`;
    const siguienteMes = mes === 12 ? 1 : mes + 1;
    const siguienteAnio = mes === 12 ? anio + 1 : anio;
    const fin = `${siguienteAnio}-${String(siguienteMes).padStart(2, "0")}-01`;

    const result = await tursoClient.execute({
      sql: `
        SELECT i.*, e.nombre AS nombre_empleado
        FROM ingreso i
        JOIN empleado e ON i.id_empleado = e.id_empleado
        WHERE i.fecha >= ? AND i.fecha < ?
        ORDER BY i.fecha DESC
      `,
      args: [inicio, fin],
    });

    if (result.rows.length === 0) return [];

    return result.rows.map((row) => ({
      ...mapRowToIngreso(row),
      nombre_empleado: String(row.nombre_empleado),
    }));
  } catch (error) {
    console.error("Error obteniendo ingresos por mes:", error);
    throw new Error("Error de base de datos");
  }
}

/* ============================
   Obtener ingresos por empleado
============================ */

export async function obtenerIngresosPorEmpleado(id_empleado: number): Promise<IngresoDB[]> {
  try {
    const result = await tursoClient.execute({
      sql: `
        SELECT *
        FROM ingreso
        WHERE id_empleado = ?
        ORDER BY fecha DESC
      `,
      args: [id_empleado],
    });

    if (result.rows.length === 0) return [];

    return result.rows.map(mapRowToIngreso);
  } catch (error) {
    console.error("Error obteniendo ingresos por empleado:", error);
    throw new Error("Error de base de datos");
  }
}


/* ============================
   Obtener ingresos de un empleado por día
============================ */

export async function obtenerIngresosPorEmpleadoPorDia(
  id_empleado: number,
  fecha: string // formato "YYYY-MM-DD"
): Promise<IngresoDB[]> {
  try {
    const result = await tursoClient.execute({
      sql: `
        SELECT *
        FROM ingreso
        WHERE id_empleado = ?
          AND fecha = ?
        ORDER BY fecha DESC
      `,
      args: [id_empleado, fecha],
    });

    if (result.rows.length === 0) return [];

    return result.rows.map(mapRowToIngreso);
  } catch (error) {
    console.error("Error obteniendo ingresos por empleado por día:", error);
    throw new Error("Error de base de datos");
  }
}



/* ============================
   Obtener reservas por empleado por un ida
============================ */

// export async function obtenerIngresoReservaPorEmpleadoPorDia(
//   id_empleado: number,
//   fecha: string // formato "YYYY-MM-DD"
// ): Promise<IngresoDB[]> {
//   try {
//     const result = await tursoClient.execute({
//       sql: `
//         SELECT ,i.monto
//         FROM ingreso i
//         JOIN estadia e ON e.id_estadia=i.id_estadia
//         WHERE id_empleado = ?
//           AND fecha = ?
//         ORDER BY fecha DESC
//       `,
//       args: [id_empleado, fecha],
//     });

//     if (result.rows.length === 0) return [];

//     return result.rows.map(mapRowToIngreso);
//   } catch (error) {
//     console.error("Error obteniendo ingresos por empleado por día:", error);
//     throw new Error("Error de base de datos");
//   }
// }

