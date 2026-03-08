import {
  obtenerEmpleadoPorNombre,
  darDeBajaEmpleado,
  crearEmpleado,
  editarEmpleado,
  obtenerEmpleadoPorId,
  toggleActivoEmpleado,
  RolEmpleado
} from "@/lib/repositories/empleado.repository";

import bcrypt from "bcryptjs";

/* ============================
   Login
============================ */

export async function validarEmpleado(
  nombre: string,
  password: string
) {
  if (!nombre.trim() || !password.trim()) {
    throw new Error("Faltan datos");
  }

  const empleado = await obtenerEmpleadoPorNombre(nombre);

  if (!empleado) {
    throw new Error("No existe el empleado");
  }

  const passwordOk = await bcrypt.compare(
    password,
    empleado.password_hash
  );

  if (!passwordOk) {
    throw new Error("Contraseña incorrecta");
  }

  return {
    id_empleado: empleado.id_empleado,
    nombre: empleado.nombre,
    rol: empleado.rol,
  };
}

/* ============================
   Dar de baja
============================ */

export async function darDeBajaEmpleadoService(
  nombre: string
): Promise<void> {

  const empleado = await obtenerEmpleadoPorNombre(nombre);

  if (!empleado) {
    throw new Error("Empleado no encontrado");
  }

  if (empleado.activo === 0) {
    throw new Error("El empleado ya está dado de baja");
  }

  const ok = await darDeBajaEmpleado(empleado.id_empleado);

  if (!ok) {
    throw new Error("No se pudo dar de baja el empleado");
  }
}

/* ============================
   Crear empleado
============================ */

export async function crearEmpleadoService(
  nombre: string,
  password: string,
  rol: RolEmpleado = "EMPLEADO"
) {
  if (!nombre.trim() || !password.trim()) {
    throw new Error("Faltan datos");
  }

  if (password.length < 6) {
    throw new Error("La contraseña debe tener al menos 6 caracteres");
  }

  const existe = await obtenerEmpleadoPorNombre(nombre);

  if (existe) {
    throw new Error("El empleado ya existe");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const empleado = await crearEmpleado(
    nombre,
    passwordHash,
    rol
  );

  return {
    id_empleado: empleado.id_empleado,
    nombre: empleado.nombre,
    rol: empleado.rol,
    activo: empleado.activo,
    creado_en: empleado.creado_en,
  };
}

/* ============================
   Editar empleado
============================ */

export async function editarEmpleadoService(
  id: number,
  nuevoNombre?: string,
  nuevaPassword?: string,
  nuevoRol?: RolEmpleado
): Promise<void> {

  if (!id) {
    throw new Error("Faltan datos para poder editar");
  }

  const empleado = await obtenerEmpleadoPorId(id);

  if (!empleado) {
    throw new Error("No existe el empleado");
  }

  if (empleado.activo === 0) {
    throw new Error("El empleado está dado de baja");
  }

  const nombreFinal = nuevoNombre
    ? nuevoNombre.trim()
    : empleado.nombre;

  if (nombreFinal.length < 3) {
    throw new Error("El nombre es demasiado corto");
  }

  let passwordHash = empleado.password_hash;

  if (nuevaPassword) {
    if (nuevaPassword.length < 6) {
      throw new Error("La contraseña debe tener al menos 6 caracteres");
    }
    passwordHash = await bcrypt.hash(nuevaPassword, 10);
  }

  const rolFinal = nuevoRol ?? empleado.rol;

  const ok = await editarEmpleado(
    empleado.id_empleado,
    nombreFinal,
    passwordHash,
    rolFinal
  );

  if (!ok) {
    throw new Error("No se pudo editar el empleado");
  }
}

/* ============================
   Toggle activo/inactivo
============================ */

export async function toggleActivoEmpleadoService(
  id_empleado: number
): Promise<void> {
  if (!id_empleado) {
    throw new Error("ID de empleado requerido");
  }

  const ok = await toggleActivoEmpleado(id_empleado);

  if (!ok) {
    throw new Error("No se pudo cambiar el estado del empleado");
  }
}

/* ============================
   Obtener por nombre (vista)
============================ */

export async function obtenerEmpleadoPorNombreService(
  nombre: string
) {
  if (!nombre || !nombre.trim()) {
    throw new Error("Nombre inválido");
  }

  const empleado = await obtenerEmpleadoPorNombre(nombre);

  if (!empleado) return null;

  return {
    id_empleado: empleado.id_empleado,
    nombre: empleado.nombre,
    rol: empleado.rol,
    activo: empleado.activo,
    creado_en: empleado.creado_en,
  };
}
