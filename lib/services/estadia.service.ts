import * as estadiaRepo from "@/lib/repositories/estadia.repository";
import { crearIngreso, obtenerIngresosPorEstadia, obtenerIngresosPorEstadias } from "@/lib/repositories/ingreso.repository";
import { obtenerEstadiasConIncidencia } from "@/lib/repositories/incidencia.repository";
import { ocuparFogonPorId, liberarFogonPorId } from "@/lib/repositories/fogon.repository";

export interface PagoDetalle {
  id_ingreso?: number;
  tipo: string;
  monto: number;
}

function mapEstadoPago(e: estadiaRepo.EstadiaDB, pagos?: PagoDetalle[]) {
  const totalPagos = pagos && pagos.length > 0
    ? pagos.reduce((sum, p) => sum + p.monto, 0)
    : (e.ingreso_monto != null ? Number(e.ingreso_monto) : 0)
  return {
    ...e,
    estado_pago: totalPagos > 0 ? "Abonado" : "No abonado",
    pagos: pagos || [],
    total_abonado: totalPagos,
  }
}

export async function listarTodasEstadiasServicio() {
  const estadias = await estadiaRepo.obtenerEstadias();

  // devolvemos array vacío si no hay estadías
  if (!estadias || estadias.length === 0) {
    return [];
  }

  // agregamos estado_pago a cada estadía
  return estadias.map((e) => mapEstadoPago(e));
}


export async function obtenerEstadiasActivasServicio() {
  const estadias = await estadiaRepo.obtenerEstadiasActivas();

  if (!estadias || estadias.length === 0) {
    return [];
  }

  // Obtener todos los pagos de todas las estadias activas en una sola query
  const ids = estadias.map(e => e.id_estadia);
  const [pagosMap, incidenciasSet] = await Promise.all([
    obtenerIngresosPorEstadias(ids),
    obtenerEstadiasConIncidencia(ids),
  ]);

  return estadias.map(e => {
    const ingresos = pagosMap.get(e.id_estadia) || [];
    const pagos: PagoDetalle[] = ingresos.map(i => ({
      id_ingreso: i.id_ingreso,
      tipo: i.tipo_ingreso || "efectivo",
      monto: i.monto,
    }));
    return { ...mapEstadoPago(e, pagos), tiene_incidencia: incidenciasSet.has(e.id_estadia) };
  });
}



export async function buscarPorPatenteServicio(patente: string) {
  if (!patente?.trim()) {
    throw new Error("Patente requerida");
  }
  
  const estadias = await estadiaRepo.obtenerEstadiasPorPatente(patente);
  
  if (!estadias || estadias.length === 0) {
    throw new Error(
      "No se encontraron estadias activas con la patente que contenga \"" + patente.trim() + "\""
    );
  }
  
  const ids = estadias.map((e) => e.id_estadia);
  const [pagosMap, incidenciasSet] = await Promise.all([
    obtenerIngresosPorEstadias(ids),
    obtenerEstadiasConIncidencia(ids),
  ]);

  return estadias.map((e) => {
    const ingresos = pagosMap.get(e.id_estadia) || [];
    const pagos: PagoDetalle[] = ingresos.map((i) => ({
      id_ingreso: i.id_ingreso,
      tipo: i.tipo_ingreso || "efectivo",
      monto: i.monto,
    }));
    return { ...mapEstadoPago(e, pagos), tiene_incidencia: incidenciasSet.has(e.id_estadia) };
  });
}




export async function buscarPorDniServicio(dni: string) {
  if (!dni?.trim()) {
    throw new Error("DNI requerido");
  }
  
  const estadias = await estadiaRepo.obtenerEstadiasPorDni(dni);
  
  if (!estadias || estadias.length === 0) {
    throw new Error(
      `No se encontraron estadias activas con DNI que contenga "${dni.trim()}"`
    );
  }
  
  const ids = estadias.map((e) => e.id_estadia);
  const [pagosMap, incidenciasSet] = await Promise.all([
    obtenerIngresosPorEstadias(ids),
    obtenerEstadiasConIncidencia(ids),
  ]);

  return estadias.map((e) => {
    const ingresos = pagosMap.get(e.id_estadia) || [];
    const pagos: PagoDetalle[] = ingresos.map((i) => ({
      id_ingreso: i.id_ingreso,
      tipo: i.tipo_ingreso || "efectivo",
      monto: i.monto,
    }));
    return { ...mapEstadoPago(e, pagos), tiene_incidencia: incidenciasSet.has(e.id_estadia) };
  });
}




export async function buscarPorNombreServicio(nombre: string) {
  if (!nombre?.trim()) {
    throw new Error("Nombre requerido");
  }

  const estadias = await estadiaRepo.obtenerEstadiasPorNombre(nombre);

  if (!estadias || estadias.length === 0) {
    throw new Error(
      `No se encontraron estadias activas con el nombre "${nombre.trim()}"`
    );
  }

  const ids = estadias.map((e) => e.id_estadia);
  const [pagosMap, incidenciasSet] = await Promise.all([
    obtenerIngresosPorEstadias(ids),
    obtenerEstadiasConIncidencia(ids),
  ]);

  return estadias.map((e) => {
    const ingresos = pagosMap.get(e.id_estadia) || [];
    const pagos: PagoDetalle[] = ingresos.map((i) => ({
      id_ingreso: i.id_ingreso,
      tipo: i.tipo_ingreso || "efectivo",
      monto: i.monto,
    }));
    return { ...mapEstadoPago(e, pagos), tiene_incidencia: incidenciasSet.has(e.id_estadia) };
  });
}

export async function crearEstadiaServicio(estadia: Omit<estadiaRepo.EstadiaDB, "id_estadia" | "estado">) {
  // Validaciones básicas
  if (!estadia.patente?.trim()) {
    throw new Error("Patente requerida");
  }
  if (!estadia.cantidad_personas || estadia.cantidad_personas <= 0) {
    throw new Error("Cantidad de personas inválida");
  }
  if (!estadia.fecha_entrada) {
    throw new Error("Fecha de entrada requerida");
  }
  if (!estadia.id_empleado) {
    throw new Error("Empleado responsable requerido");
  }

  // Llamada al repositorio
  const creada = await estadiaRepo.crearEstadia(estadia);

  if (creada.id_fogon != null) {
    try {
      await ocuparFogonPorId(Number(creada.id_fogon));
    } catch {}
  }

  return {
    ...creada,
    estado_pago: (creada.ingreso_monto != null && Number(creada.ingreso_monto) > 0) ? "Abonado" : "No abonado",
  };
}

export async function cerrarEstadiaServicio(
  id_estadia: number,
  fecha_salida: string
) {
  if (!id_estadia) {
    throw new Error("ID de estadía requerido");
  }

  if (!fecha_salida?.trim()) {
    throw new Error("Fecha de salida requerida");
  }

  const ok = await estadiaRepo.cerrarEstadia(id_estadia, fecha_salida);

  if (!ok) {
    throw new Error("No se pudo cerrar la estadía. Puede que ya esté cerrada o no exista.");
  }

  return { mensaje: "Estadía cerrada correctamente" };
}


export async function editarEstadiaServicio(
  id_estadia: number,
  datos: Partial<Omit<estadiaRepo.EstadiaDB, "id_estadia" | "id_empleado">>
) {
  if (!id_estadia) {
    throw new Error("ID de estadía requerido");
  }

  const antes = await estadiaRepo.obtenerEstadiaPorId(id_estadia);
  const fogonAnterior = antes?.id_fogon ?? null;

  const ok = await estadiaRepo.editarEstadia(id_estadia, datos);
  if (!ok) {
    throw new Error("No se pudo editar la estadía");
  }

  const despues = await estadiaRepo.obtenerEstadiaPorId(id_estadia);

  if (datos.id_fogon !== undefined) {
    const fogonNuevo = despues?.id_fogon ?? null;
    if (fogonNuevo !== fogonAnterior) {
      if (fogonAnterior != null) {
        try { await liberarFogonPorId(Number(fogonAnterior)); } catch {}
      }
      if (fogonNuevo != null) {
        try { await ocuparFogonPorId(Number(fogonNuevo)); } catch {}
      }
    }
  }

  return despues;
}

export async function obtenerEstadiasPorMesServicio(
  anio: number,
  mes: number
) {
  if (!anio || !mes || mes < 1 || mes > 12) {
    throw new Error("Año o mes inválido");
  }

  const estadias = await estadiaRepo.obtenerEstadiasPorMes(anio, mes);

  // No lanzamos error si está vacío, solo devolvemos array vacío
  return estadias.map(e => ({
    ...e,
    estado_pago: (e.ingreso_monto != null && Number(e.ingreso_monto) > 0) ? "Abonado" : "No abonado"
  }));
}

/* ============================
   Crear estadia con abono automatico
   Si se pasa un monto de abono > 0, se crea automaticamente
   un ingreso asociado a la estadia
============================ */
export async function crearEstadiaConAbonoServicio(
  estadia: Omit<estadiaRepo.EstadiaDB, "id_estadia" | "estado">,
  pagos?: { tipo: string; monto: number }[]
) {
  // Crear la estadia normalmente
  const creada = await crearEstadiaServicio(estadia);

  // Si hay pagos, crear un ingreso por cada pago
  if (pagos && pagos.length > 0) {
    for (const pago of pagos) {
      if (pago.monto > 0) {
        try {
          await crearIngreso({
            fecha: estadia.fecha_entrada,
            monto: pago.monto,
            concepto: `Abono estadia #${creada.id_estadia}`,
            tipo_ingreso: pago.tipo || "efectivo",
            id_empleado: estadia.id_empleado,
            id_estadia: creada.id_estadia,
          });
        } catch (error) {
          console.error("Error creando ingreso de abono:", error);
          // No lanzamos error para no perder la estadia creada
        }
      }
    }
  }

  return creada;
}
