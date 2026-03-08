import { tursoClient } from "@/lib/turso-db";

/* ============================
   Tipos
============================ */

export type RolEmpleado = "ADMIN" | "EMPLEADO";

export interface EmpleadoDB {
  id_empleado: number;
  nombre: string;
  password_hash: string;
  rol: RolEmpleado;
  activo: number;
  creado_en: string;
}

/* ============================
   Obtener por nombre (login)
============================ */

export async function obtenerEmpleadoPorNombre(nombre: string): Promise<EmpleadoDB | null> {
  try {
    const result = await tursoClient.execute({
      sql: `
        SELECT *
        FROM empleado
        WHERE nombre = ? AND activo = 1
        LIMIT 1
      `,
      args: [nombre],
    });

    if (result.rows.length === 0) return null;

    const row = result.rows[0];

    return {
      id_empleado: Number(row.id_empleado),
      nombre: String(row.nombre),
      password_hash: String(row.password_hash),
      rol: row.rol as RolEmpleado,
      activo: Number(row.activo),
      creado_en: String(row.creado_en),
    };
  } catch (error) {
    console.error("Error obteniendo empleado por nombre:", error);
    throw new Error("Error de base de datos");
  }
}

/* ============================
   Obtener por ID
============================ */

export async function obtenerEmpleadoPorId(id: number): Promise<EmpleadoDB | null> {
  try {
    const result = await tursoClient.execute({
      sql: `
        SELECT *
        FROM empleado
        WHERE id_empleado = ? AND activo = 1
      `,
      args: [id],
    });

    if (result.rows.length === 0) return null;

    const row = result.rows[0];

    return {
      id_empleado: Number(row.id_empleado),
      nombre: String(row.nombre),
      password_hash: String(row.password_hash),
      rol: row.rol as RolEmpleado,
      activo: Number(row.activo),
      creado_en: String(row.creado_en),
    };
  } catch (error) {
    console.error("Error obteniendo empleado por id:", error);
    throw new Error("Error de base de datos");
  }
}

/* ============================
   Obtener todos
============================ */

export async function obtenerEmpleados(): Promise<EmpleadoDB[]> {
  try {
    const result = await tursoClient.execute({
      sql: `
        SELECT id_empleado, nombre, password_hash, rol, activo, creado_en
        FROM empleado
      `,
    });

    if (result.rows.length === 0) return [];

    return result.rows.map(row => ({
      id_empleado: Number(row.id_empleado),
      nombre: String(row.nombre),
      password_hash: String(row.password_hash),
      rol: row.rol as RolEmpleado,
      activo: Number(row.activo),
      creado_en: String(row.creado_en),
    }));
  } catch (error) {
    console.error("Error obteniendo empleados:", error);
    throw new Error("Error de base de datos");
  }
}

/* ============================
   Crear empleado
============================ */

export async function crearEmpleado(
  nombre: string,
  passwordHash: string,
  rol: RolEmpleado = "EMPLEADO"
): Promise<EmpleadoDB> {
  try {
    const result = await tursoClient.execute({
      sql: `
        INSERT INTO empleado (nombre, password_hash, rol, activo)
        VALUES (?, ?, ?, 1)
      `,
      args: [nombre, passwordHash, rol],
    });

    if (result.rowsAffected === 0) {
      throw new Error("No se pudo crear el empleado");
    }

    const id = Number(result.lastInsertRowid);

    const selectResult = await tursoClient.execute({
      sql: `
        SELECT id_empleado, nombre, password_hash, rol, activo, creado_en
        FROM empleado
        WHERE id_empleado = ?
      `,
      args: [id],
    });

    const row = selectResult.rows[0];

    return {
      id_empleado: Number(row.id_empleado),
      nombre: String(row.nombre),
      password_hash: String(row.password_hash),
      rol: row.rol as RolEmpleado,
      activo: Number(row.activo),
      creado_en: String(row.creado_en),
    };
  } catch (error) {
    console.error("Error creando empleado:", error);
    throw new Error("Error de base de datos");
  }
}

/* ============================
   Editar empleado
============================ */

export async function editarEmpleado(
  id_empleado: number,
  nombre: string,
  password_hash: string,
  rol: RolEmpleado
): Promise<boolean> {
  try {
    const result = await tursoClient.execute({
      sql: `
        UPDATE empleado
        SET nombre = ?, password_hash = ?, rol = ?
        WHERE id_empleado = ? AND activo = 1
      `,
      args: [nombre, password_hash, rol, id_empleado],
    });

    return result.rowsAffected === 1;
  } catch (error) {
    console.error("Error editando empleado:", error);
    throw new Error("Error de base de datos");
  }
}

/* ============================
   Dar de baja (soft delete)
============================ */

export async function darDeBajaEmpleado(id_empleado: number): Promise<boolean> {
  try {
    const result = await tursoClient.execute({
      sql: `
        UPDATE empleado
        SET activo = 0
        WHERE id_empleado = ?
      `,
      args: [id_empleado],
    });

    return result.rowsAffected === 1;
  } catch (error) {
    console.error("Error dando de baja empleado:", error);
    throw new Error("Error de base de datos");
  }
}

/* ============================
   Toggle activo/inactivo
============================ */

export async function toggleActivoEmpleado(id_empleado: number): Promise<boolean> {
  try {
    const result = await tursoClient.execute({
      sql: `
        UPDATE empleado
        SET activo = CASE WHEN activo = 1 THEN 0 ELSE 1 END
        WHERE id_empleado = ?
      `,
      args: [id_empleado],
    });

    return result.rowsAffected === 1;
  } catch (error) {
    console.error("Error toggling activo empleado:", error);
    throw new Error("Error de base de datos");
  }
}




// import{tursoClient} from "@/lib/turso-db"

// export interface EmpleadoDB {
//   id_empleado: number;
//   nombre: string;
//   password_hash: string;
//   activo: number;
//   creado_en: string;
// }

// export async function obtenerEmpleadoPorNombre(nombre: string) {
//   try {
//     const result = await tursoClient.execute({
//       sql: `
//         SELECT *
//         FROM empleado
//         WHERE nombre = ? AND activo=1
//         LIMIT 1
//       `,
//       args: [nombre],
//     });

//     if (result.rows.length === 0) {
//       return null;
//     }

//     const row = result.rows[0];

//     if (!row) return null;

//     const empleado: EmpleadoDB = {
//         id_empleado: row.id_empleado as number,
//         nombre: row.nombre as string,
//         password_hash: row.password_hash as string,
//         activo: row.activo as number,
//         creado_en: row.creado_en as string,
//     };

//    return empleado;
//   } catch (error) {
//     console.error("Error obteniendo empleado:", error);
//     throw new Error("Error de base de datos");
//   }
// }


// export async function obtenerEmpleadoPorId(id:number) {
//   try {
//     const result = await tursoClient.execute({
//       sql: `
//         SELECT *
//         FROM empleado
//         WHERE id_empleado = ? AND activo=1
//       `,
//       args: [id],
//     });

//     if (result.rows.length === 0) {
//       return null;
//     }

//     const row = result.rows[0];

//     if (!row) return null;

//     const empleado: EmpleadoDB = {
//         id_empleado: row.id_empleado as number,
//         nombre: row.nombre as string,
//         password_hash: row.password_hash as string,
//         activo: row.activo as number,
//         creado_en: row.creado_en as string,
//     };

//    return empleado;
//   } catch (error) {
//     console.error("Error obteniendo empleado:", error);
//     throw new Error("Error de base de datos");
//   }
// }




// export async function obtenerEmpleados(): Promise<EmpleadoDB[]> {
//   try {
//     const result = await tursoClient.execute({
//       sql: `
//         SELECT id_empleado, nombre, password_hash, activo, creado_en
//         FROM empleado
//       `,
//     });

//     // Si no hay filas → array vacío
//     if (result.rows.length === 0) {
//       return [];
//     }

//     return result.rows.map(row => ({
//       id_empleado: Number(row.id_empleado),
//       nombre: String(row.nombre),
//       password_hash: String(row.password_hash),
//       activo: Number(row.activo),
//       creado_en: String(row.creado_en),
//     }));
//   } catch (error) {
//     console.error("Error obteniendo empleados:", error);
//     throw new Error("Error al obtener empleados");
//   }
// }




// export async function crearEmpleado(
//   nombre: string,
//   passwordHash: string
// ): Promise<EmpleadoDB> {
//   try {
//     const result = await tursoClient.execute({
//       sql: `
//         INSERT INTO empleado (nombre, password_hash, activo)
//         VALUES (?, ?, 1)
//       `,
//       args: [nombre, passwordHash],
//     });

//     if (result.rowsAffected === 0) {
//       throw new Error("No se pudo crear el empleado");
//     }

//     const id = Number(result.lastInsertRowid);

//     // 🔎 Volvemos a buscar el empleado recién creado
//     const selectResult = await tursoClient.execute({
//       sql: `
//         SELECT id_empleado, nombre, password_hash, activo, creado_en
//         FROM empleado
//         WHERE id_empleado = ?
//       `,
//       args: [id],
//     });

//     const row = selectResult.rows[0];

//     return {
//       id_empleado: Number(row.id_empleado),
//       nombre: String(row.nombre),
//       password_hash: String(row.password_hash),
//       activo: Number(row.activo),
//       creado_en: String(row.creado_en),
//     };
//   } catch (error) {
//     console.error("Error creando empleado:", error);
//     throw new Error("Error de base de datos");
//   }
// }


// export async function darDeBajaEmpleado(
//   id_empleado: number
// ): Promise<boolean> {
//   try {
//     const result = await tursoClient.execute({
//       sql: `
//         UPDATE empleado
//         SET activo = 0
//         WHERE id_empleado = ?
//       `,
//       args: [id_empleado],
//     });

//     return result.rowsAffected === 1;
//   } catch (error) {
//     console.error("Error dando de baja empleado:", error);
//     throw new Error("Error de base de datos");
//   }
// }

// export async function editarEmpleado(
//   id_empleado: number,
//   nombre: string,
//   password_hash: string
// ): Promise<boolean> {
//   try {
//     const result = await tursoClient.execute({
//       sql: `
//         UPDATE empleado
//         SET nombre = ?, password_hash = ?
//         WHERE id_empleado = ? AND activo = 1
//       `,
//       args: [nombre, password_hash, id_empleado],
//     });

//     return result.rowsAffected === 1;
//   } catch (error) {
//     console.error("Error BD editando empleado:", error);
//     throw new Error("Error de base de datos");
//   }
// }


/**
 * obtenerEmpleadoPorNombre: devuelve:
 * EmpleadoDB: cuando se encuntra el nombre registrado en la bd y el activo es 1 .
 * null: cunado no exite empleado
 * error: cuando  hay un problema con la consulta o la bd.
 * 
 * obtenerEmpleados devuelve :
 * Array de EmpleadoDB: da igual si son activo o no.
 * Array de empleado vacio []: cuando no hay ningun empleado o usuario(nunca va a pasar casi)
 * erro: cuando ocurre algun errro ne la consulta.
 * 
 * darDeBajaEmpleado devuelve:
 * booleano : true -> si se puedo dar de baja
 *            false -> no se pudo dar de baja(no exite empleado)
 * error: ocurrio un erro en la bd - 
 *
 * editarEmpleadoRepo:
 * booleano : true -> si se puedo hacer el update
 *            false -> no se pudo dar  hacer el update(no exite empleado)  
 * error: ocurrio un erro en la bd - 
 * 
 */
