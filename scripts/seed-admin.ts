import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";

/*
  Script para crear el usuario administrador:
  - usuario: facundo
  - password: ichbinAdmin26
  - rol: ADMIN

  Usa bcryptjs con 10 salt rounds (mismo sistema que empleado.service.ts)
*/

const tursoClient = createClient({
  url: process.env.URL_TURSO_DB!,
  authToken: process.env.TOKEN_TURSO_DB!,
});

async function main() {
  const nombre = "facundo";
  const password = "ichbinAdmin26";
  const rol = "ADMIN";

  console.log(`[seed-admin] Verificando si ya existe el usuario "${nombre}"...`);

  // Verificar si ya existe
  const existing = await tursoClient.execute({
    sql: `SELECT id_empleado, nombre, rol, activo FROM empleado WHERE nombre = ? LIMIT 1`,
    args: [nombre],
  });

  if (existing.rows.length > 0) {
    const row = existing.rows[0];
    console.log(`[seed-admin] El usuario "${nombre}" ya existe:`);
    console.log(`  - id_empleado: ${row.id_empleado}`);
    console.log(`  - rol: ${row.rol}`);
    console.log(`  - activo: ${row.activo}`);

    // Si existe pero esta inactivo, reactivar y actualizar
    if (Number(row.activo) === 0) {
      console.log(`[seed-admin] El usuario esta inactivo. Reactivando...`);
      const passwordHash = await bcrypt.hash(password, 10);
      await tursoClient.execute({
        sql: `UPDATE empleado SET password_hash = ?, rol = ?, activo = 1 WHERE id_empleado = ?`,
        args: [passwordHash, rol, Number(row.id_empleado)],
      });
      console.log(`[seed-admin] Usuario reactivado y password actualizado.`);
    } else if (row.rol !== "ADMIN") {
      // Si existe pero no es ADMIN, actualizar rol y password
      console.log(`[seed-admin] Actualizando rol a ADMIN y password...`);
      const passwordHash = await bcrypt.hash(password, 10);
      await tursoClient.execute({
        sql: `UPDATE empleado SET password_hash = ?, rol = ? WHERE id_empleado = ?`,
        args: [passwordHash, rol, Number(row.id_empleado)],
      });
      console.log(`[seed-admin] Rol y password actualizados.`);
    } else {
      // Actualizar solo el password para asegurar que coincide
      console.log(`[seed-admin] Actualizando password del admin existente...`);
      const passwordHash = await bcrypt.hash(password, 10);
      await tursoClient.execute({
        sql: `UPDATE empleado SET password_hash = ? WHERE id_empleado = ?`,
        args: [passwordHash, Number(row.id_empleado)],
      });
      console.log(`[seed-admin] Password actualizado correctamente.`);
    }
  } else {
    // No existe, crear desde cero
    console.log(`[seed-admin] Creando usuario admin "${nombre}"...`);
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await tursoClient.execute({
      sql: `INSERT INTO empleado (nombre, password_hash, rol, activo) VALUES (?, ?, ?, 1)`,
      args: [nombre, passwordHash, rol],
    });

    console.log(`[seed-admin] Usuario admin creado con id_empleado: ${result.lastInsertRowid}`);
  }

  // Verificacion final
  const check = await tursoClient.execute({
    sql: `SELECT id_empleado, nombre, rol, activo FROM empleado WHERE nombre = ? LIMIT 1`,
    args: [nombre],
  });

  if (check.rows.length > 0) {
    const row = check.rows[0];
    console.log(`\n[seed-admin] VERIFICACION FINAL:`);
    console.log(`  - id_empleado: ${row.id_empleado}`);
    console.log(`  - nombre: ${row.nombre}`);
    console.log(`  - rol: ${row.rol}`);
    console.log(`  - activo: ${row.activo}`);

    // Verificar que el password es correcto
    const fullRow = await tursoClient.execute({
      sql: `SELECT password_hash FROM empleado WHERE nombre = ? LIMIT 1`,
      args: [nombre],
    });
    const hash = String(fullRow.rows[0].password_hash);
    const match = await bcrypt.compare(password, hash);
    console.log(`  - password valido: ${match}`);
    console.log(`\n[seed-admin] LISTO. El usuario admin esta operativo.`);
  } else {
    console.error(`[seed-admin] ERROR: No se pudo verificar la creacion del usuario.`);
  }
}

main().catch((err) => {
  console.error("[seed-admin] Error fatal:", err);
  process.exit(1);
});
