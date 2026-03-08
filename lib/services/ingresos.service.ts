import * as ingresoRepo from "@/lib/repositories/ingreso.repository"
import { IngresoDB, IngresoConEmpleado } from "@/lib/repositories/ingreso.repository"

/* ============================
   Servicio: Obtener ingresos por mes
============================ */
export async function obtenerIngresosPorMesServicio(
  anio: number,
  mes: number
): Promise<IngresoConEmpleado[]> {
  if (!anio || !mes || mes < 1 || mes > 12) {
    throw new Error("Ano o mes invalido");
  }

  return await ingresoRepo.obtenerIngresosPorMes(anio, mes);
}

export async function obtenerIngresoPorIdServicio(id: number): Promise<IngresoDB> {
  if (!id) {
    throw new Error("ID de ingreso requerido");
  }

  const ingreso = await ingresoRepo.obtenerIngresoPorId(id); // 👈 usar ingresoRepo

  if (!ingreso) {
    throw new Error(`No se encontró un ingreso con ID ${id}`);
  }

  return ingreso;
}


/* ============================
   Servicio: Obtener todos los ingresos
============================ */
export async function obtenerIngresosServicio(): Promise<IngresoDB[]> {
  try {
    const ingresos = await ingresoRepo.obtenerIngresos();

    // No lanzamos error si está vacío, devolvemos array vacío
    return ingresos;
  } catch (error) {
    console.error("Error en el servicio obtenerIngresos:", error);
    throw new Error("No se pudieron obtener los ingresos");
  }
}


/* ============================
   Servicio: Obtener ingresos por estadía - no tan utilizada 
============================ */
export async function obtenerIngresosPorEstadiaServicio(
  id_estadia: number
): Promise<IngresoDB[]> {
  if (!id_estadia) {
    throw new Error("ID de estadía requerido");
  }

  try {
    const ingresos = await ingresoRepo.obtenerIngresosPorEstadia(id_estadia);

    // No lanzamos error si no hay ingresos, devolvemos array vacío
    return ingresos;
  } catch (error) {
    console.error("Error en el servicio obtenerIngresosPorEstadia:", error);
    throw new Error("No se pudieron obtener los ingresos de la estadía");
  }
}




/* ============================
   Servicio: Crear ingreso
============================ */
export async function crearIngresoServicio(
  ingreso: Omit<IngresoDB, "id_ingreso">
): Promise<IngresoDB> {
  // Validaciones básicas
  if (!ingreso.fecha) throw new Error("La fecha del ingreso es requerida");
  if (ingreso.monto === undefined || ingreso.monto === null) throw new Error("El monto del ingreso es requerido");
  if (!ingreso.concepto) throw new Error("El concepto del ingreso es requerido");
  if (!ingreso.id_empleado) throw new Error("ID de empleado requerido");

  try {
    const creado = await ingresoRepo.crearIngreso(ingreso);

    if (!creado) {
      throw new Error("No se pudo crear el ingreso");
    }

    return creado;
  } catch (error) {
    console.error("Error en el servicio crearIngreso:", error);
    throw new Error("No se pudo crear el ingreso en la base de datos");
  }
}
/* ============================
   Servicio: elininar ingreso
============================ */

export async function eliminarIngresoServicio(id_ingreso: number): Promise<boolean> {
  if (!id_ingreso) {
    throw new Error("ID de ingreso requerido");
  }

  try {
    const eliminado = await ingresoRepo.eliminarIngreso(id_ingreso);

    if (!eliminado) {
      throw new Error(`No se pudo eliminar el ingreso con ID ${id_ingreso}`);
    }

    return true;
  } catch (error: any) {
    console.error(`Error en servicio eliminarIngreso:`, error);
    throw new Error(
      `No se pudo eliminar el ingreso. Detalle: ${error.message}`
    );
  }
}

/* ============================
   Servicio: ingreso de todos los empelados
============================ */


export async function obtenerIngresosPorEmpleadoServicio(id_empleado: number): Promise<IngresoDB[]> {
  if (!id_empleado) {
    throw new Error("ID de empleado requerido");
  }

  try {
    const ingresos = await ingresoRepo.obtenerIngresosPorEmpleado(id_empleado);

    // Filtramos los ingresos que no tengan id_estadia
    const filtrados = ingresos.filter(ingreso => ingreso.id_estadia !== null);

    return filtrados;
  } catch (error: any) {
    console.error("Error en servicio obtenerIngresosPorEmpleado:", error);
    throw new Error(`No se pudieron obtener los ingresos del empleado. Detalle: ${error.message}`);
  }
}
/* ============================
   Servicio: ingreso de un empeado por dia 
============================ */

/* ============================
   Servicio: Obtener todos los ingresos con nombre de empleado (ADMIN)
============================ */
export async function obtenerIngresosConEmpleadoServicio(): Promise<IngresoConEmpleado[]> {
  try {
    return await ingresoRepo.obtenerIngresosConEmpleado()
  } catch (error: any) {
    console.error("Error en servicio obtenerIngresosConEmpleado:", error)
    throw new Error("No se pudieron obtener los ingresos")
  }
}

export async function obtenerIngresosConEmpleadoPorFechaServicio(fecha: string): Promise<IngresoConEmpleado[]> {
  if (!fecha) throw new Error("Fecha requerida")
  try {
    return await ingresoRepo.obtenerIngresosConEmpleadoPorFecha(fecha)
  } catch (error: any) {
    console.error("Error en servicio obtenerIngresosConEmpleadoPorFecha:", error)
    throw new Error("No se pudieron obtener los ingresos")
  }
}

/* ============================
   Servicio: Editar ingreso
============================ */
export async function editarIngresoServicio(
  id_ingreso: number,
  datos: Partial<Omit<IngresoDB, "id_ingreso">>
): Promise<boolean> {
  if (!id_ingreso) {
    throw new Error("ID de ingreso requerido");
  }

  const existe = await ingresoRepo.obtenerIngresoPorId(id_ingreso);
  if (!existe) {
    throw new Error(`No se encontró el ingreso con ID ${id_ingreso}`);
  }

  const ok = await ingresoRepo.editarIngreso(id_ingreso, datos);
  if (!ok) {
    throw new Error("No se pudo editar el ingreso");
  }

  return true;
}

export async function obtenerIngresosPorEmpleadoPorDiaServicio(
  id_empleado: number,
  fecha: string
): Promise<IngresoDB[]> {
  if (!id_empleado) {
    throw new Error("ID de empleado requerido");
  }

  if (!fecha) {
    throw new Error("Fecha requerida");
  }

  try {
    const ingresos = await ingresoRepo.obtenerIngresosPorEmpleadoPorDia(id_empleado, fecha);
    return ingresos;
  } catch (error: any) {
    console.error("Error en servicio obtenerIngresosPorEmpleadoPorDia:", error);
    throw new Error(`No se pudieron obtener los ingresos del empleado para la fecha ${fecha}. Detalle: ${error.message}`);
  }
}
