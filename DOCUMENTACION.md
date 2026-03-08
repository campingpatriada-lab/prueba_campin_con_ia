# Tently - Sistema de Gestion de Camping

## Descripcion General

Tently es una aplicacion web para la gestion de un camping. Permite registrar estadias (reservas), escanear patentes de vehiculos, administrar ingresos economicos y gestionar empleados. Fue construida con Next.js 16 (App Router), Turso (SQLite), y Tailwind CSS con shadcn/ui.

---

## Arquitectura del Proyecto

```
app/                          # Next.js App Router
  api/                        # API Routes (backend)
    auth/route.ts             # Autenticacion (login/logout/sesion)
    buscar/route.ts           # Busqueda de estadias
    cambiar-estado/route.ts   # Cerrar/finalizar estadia por patente
    config/route.ts           # Configuracion de URL del scanner externo
    empleados/route.ts        # CRUD de empleados (ADMIN)
    estadias/route.ts         # Editar estadias
    generar_url/route.ts      # Generar URL compartida para scanner
    ingresos/route.ts         # CRUD de ingresos economicos
    reportes/route.ts         # Generacion de reportes (Excel/CSV)
    reservas/route.ts         # Listar y crear reservas
    scanner/route.ts          # Proxy al scanner externo + busqueda manual
    scanner-image/route.ts    # Busqueda por foto (Cloudinary OCR)
  layout.tsx                  # Layout principal
  page.tsx                    # Pagina principal

components/                   # Componentes React
  admin-panel.tsx             # Panel de administracion (empleados, ingresos, reportes)
  bottom-menu.tsx             # Menu de navegacion inferior
  busqueda.tsx                # Busqueda de estadias
  crear-reserva.tsx           # Formulario para crear nueva reserva
  ingresos-panel.tsx          # Panel de ingresos del empleado
  login-screen.tsx            # Pantalla de login
  main-app.tsx                # App principal post-login
  reservas-list.tsx           # Listado de reservas activas
  scanner-app.tsx             # Escaner de patentes
  theme-provider.tsx          # Proveedor de tema (dark/light)

lib/                          # Logica de negocio
  auth.ts                     # Validacion de autenticacion con cookies
  config-store.ts             # Almacenamiento de configuracion
  turso-db.ts                 # Conexion a Turso DB
  repositories/               # Capa de acceso a datos
    empleado.repository.ts    # Consultas SQL para empleados
    estadia.repository.ts     # Consultas SQL para estadias
    ingreso.repository.ts     # Consultas SQL para ingresos
  services/                   # Capa de servicios (logica de negocio)
    empleado.service.ts       # Servicio de empleados
    estadia.service.ts        # Servicio de estadias
    ingresos.service.ts       # Servicio de ingresos
```

---

## Base de Datos (Turso/SQLite)

### Tabla: `empleado`

| Campo          | Tipo    | Descripcion                          |
|----------------|---------|--------------------------------------|
| id_empleado    | INTEGER | PK, autoincrement                    |
| nombre         | TEXT    | Nombre unico del empleado            |
| password_hash  | TEXT    | Hash de la contrasena                |
| activo         | INTEGER | 1 = activo, 0 = dado de baja        |
| rol            | TEXT    | "ADMIN" o "EMPLEADO"                 |
| creado_en      | NUMERIC | Fecha de creacion (CURRENT_TIMESTAMP)|

### Tabla: `estadia`

| Campo              | Tipo    | Descripcion                              |
|--------------------|---------|------------------------------------------|
| id_estadia         | INTEGER | PK, autoincrement                        |
| patente            | TEXT    | Patente del vehiculo                     |
| cantidad_personas  | INTEGER | Cantidad de personas                     |
| fecha_entrada      | NUMERIC | Fecha de entrada                         |
| fecha_salida       | NUMERIC | Fecha de salida                          |
| nombre_responsable | TEXT    | Nombre del responsable                   |
| dni_responsable    | TEXT    | DNI del responsable                      |
| tipo_estadia       | TEXT    | Tipo (acampe, dia, etc.)                 |
| estado             | INTEGER | 1 = activa, 0 = finalizada              |
| observaciones      | TEXT    | Observaciones adicionales                |
| id_empleado        | INTEGER | FK a empleado (quien registro)           |

**Nota sobre `estado`:** El valor 1 significa que la estadia esta activa (la persona esta en el camping). El valor 0 significa que la estadia esta finalizada (la persona ya se fue). Este campo NO tiene relacion con el estado de pago.

### Tabla: `ingreso`

| Campo        | Tipo    | Descripcion                                |
|--------------|---------|---------------------------------------------|
| id_ingreso   | INTEGER | PK, autoincrement                           |
| fecha        | NUMERIC | Fecha del ingreso                           |
| monto        | REAL    | Monto del ingreso                           |
| concepto     | TEXT    | Concepto/descripcion                        |
| tipo_ingreso | TEXT    | "efectivo", "transferencia", "debito", etc. |
| id_empleado  | INTEGER | FK a empleado (quien registro)              |
| id_estadia   | INTEGER | FK a estadia (puede ser NULL)               |

**Relacion pago-estadia:** Para determinar si una estadia fue pagada, se hace un LEFT JOIN entre `estadia` e `ingreso` por `id_estadia`. Si `ingreso.monto` es NULL o 0, significa que la estadia NO ha sido pagada.

---

## Modulos Funcionales

### 1. Autenticacion

- Login con nombre de usuario y contrasena.
- Las contrasenas se almacenan hasheadas con bcrypt.
- La sesion se gestiona con cookies HTTP-only seguras.
- Dos roles: **ADMIN** y **EMPLEADO**.

### 2. Scanner de Patentes

Tres modos de busqueda:
- **Escanear Patente:** Usa un servidor externo con camara para detectar patentes automaticamente.
- **Ingresar Manualmente:** El empleado escribe la patente y se busca en la BD.
- **Buscar por Foto:** Se sube una foto y se envia a Cloudinary para OCR.

**Datos mostrados al encontrar una estadia:**
1. Patente
2. Nombre del responsable
3. DNI del responsable
4. Cantidad de personas
5. Fecha de entrada
6. Fecha de salida
7. Abono (monto pagado; si es 0 muestra "SIN pagar")
8. Estado (Activa / Finalizada)
9. Nombre del empleado que registro

**Logica de finalizacion:**
- Si el abono es 0 (no se ha pagado): Se muestra el mensaje "No se ha abonado la estadia" y se solicita ingresar el monto antes de poder finalizar.
- Si el abono es mayor a 0: Se puede finalizar directamente sin preguntar nada adicional.
- Al finalizar, el estado de la estadia cambia de 1 a 0 y se registra la fecha de salida.

### 3. Reservas

- Lista todas las estadias activas (estado = 1), ordenadas de la mas reciente a la mas antigua.
- Cada reserva se puede editar en el momento: nombre, DNI, cantidad de personas, fecha de entrada, fecha de salida y abono.
- El campo "Estado" muestra el valor del campo `estado` de la BD:
  - 1 = Activa (la persona sigue en el camping)
  - 0 = Finalizada (la persona se retiro)

### 4. Crear Reserva

- Formulario para registrar una nueva estadia con todos los campos.
- Opcion de agregar un abono al momento de la creacion.
- Si se agrega abono, se crea automaticamente un ingreso asociado.

### 5. Ingresos (Panel del Empleado)

- Muestra solo las ganancias generadas en el dia actual.
- Formulario para nuevo ingreso con campos:
  - Concepto (obligatorio)
  - Monto (obligatorio)
  - Tipo de ingreso (obligatorio): Efectivo / Transferencia / Debito
  - ID Estadia asociada (opcional)
- El empleado puede editar o eliminar sus ingresos.
- Descarga CSV del dia actual con codificacion UTF-8 (BOM).

### 6. Panel de Administracion

#### Empleados
- Ver todos los empleados (activos e inactivos).
- Crear nuevo empleado (nombre, contrasena, rol).
- Dar de baja a un empleado (cambia activo a 0).

#### Ingresos Globales
- Muestra el total de todos los ingresos registrados.
- Lista los ultimos 10 ingresos (ordenados del mas reciente al mas antiguo).
- Cada ingreso puede ser editado o eliminado.

#### Reportes (Excel/CSV)
Todos los archivos CSV generados usan codificacion **UTF-8 con BOM** para evitar problemas con caracteres especiales como la letra N.

- **Ingresos del mes:** Columnas: Empleado, Concepto, Monto, Tipo de ingreso, Fecha. Incluye total al final.
- **Todos los ingresos:** Descarga completa con total general.
- **Estadias por mes:** Columnas: ID, Patente, Personas, Entrada, Salida, Responsable, DNI, Tipo, Empleado, Estado, Monto, Pago, Observaciones. El campo "Monto" se obtiene via LEFT JOIN con la tabla ingreso (0 si no hay pago). El campo "Pago" muestra "no pagado" si el monto es 0, o "pagado" si hay un monto registrado.

### 7. Busqueda

- Busqueda de estadias por patente o DNI.
- Los resultados son editables (nombre, DNI, personas, fechas, abono).

---

## API Endpoints

| Metodo | Ruta                  | Descripcion                           | Acceso          |
|--------|-----------------------|---------------------------------------|-----------------|
| POST   | /api/auth             | Login                                 | Publico         |
| DELETE | /api/auth             | Logout                                | Autenticado     |
| GET    | /api/auth             | Obtener sesion actual                 | Autenticado     |
| GET    | /api/empleados        | Listar empleados                      | ADMIN           |
| POST   | /api/empleados        | Crear empleado                        | ADMIN           |
| DELETE | /api/empleados        | Dar de baja empleado                  | ADMIN           |
| GET    | /api/reservas         | Listar estadias activas               | Autenticado     |
| POST   | /api/reservas         | Crear nueva reserva                   | Autenticado     |
| PUT    | /api/estadias         | Editar estadia                        | Autenticado     |
| GET    | /api/ingresos         | Listar ingresos (dia/todos)           | Autenticado     |
| POST   | /api/ingresos         | Crear ingreso                         | Autenticado     |
| PUT    | /api/ingresos         | Editar ingreso                        | Autenticado     |
| DELETE | /api/ingresos         | Eliminar ingreso                      | Autenticado     |
| GET    | /api/scanner          | Escaneo automatico (proxy externo)    | Autenticado     |
| POST   | /api/scanner          | Busqueda manual por patente           | Autenticado     |
| POST   | /api/scanner-image    | Busqueda por foto (Cloudinary)        | Autenticado     |
| POST   | /api/cambiar-estado   | Cerrar/finalizar estadia              | Autenticado     |
| GET    | /api/reportes         | Generar reportes CSV                  | ADMIN           |
| GET    | /api/buscar           | Buscar estadia por patente/DNI        | Autenticado     |
| GET    | /api/config           | Obtener URL del scanner externo       | Autenticado     |
| POST   | /api/generar_url      | Configurar URL del scanner            | ADMIN           |

---

## Consultas SQL Principales

### Obtener estadia con monto de pago y nombre de empleado
```sql
SELECT 
  e.*,
  i.monto AS ingreso_monto,
  emp.nombre AS nombre_empleado
FROM estadia e
LEFT JOIN ingreso i ON e.id_estadia = i.id_estadia
LEFT JOIN empleado emp ON e.id_empleado = emp.id_empleado
WHERE e.estado = 1
ORDER BY e.id_estadia DESC
```

### Obtener estadias por mes (para reportes)
```sql
SELECT 
  e.*,
  i.monto AS ingreso_monto,
  emp.nombre AS nombre_empleado
FROM estadia e
LEFT JOIN ingreso i ON e.id_estadia = i.id_estadia
LEFT JOIN empleado emp ON e.id_empleado = emp.id_empleado
WHERE e.fecha_entrada >= ? AND e.fecha_entrada < ?
ORDER BY e.fecha_entrada DESC
```

### Obtener ingresos con nombre de empleado
```sql
SELECT i.*, e.nombre AS nombre_empleado
FROM ingreso i
JOIN empleado e ON i.id_empleado = e.id_empleado
ORDER BY i.fecha DESC
```

### Obtener ingresos de un empleado por dia
```sql
SELECT * FROM ingreso
WHERE id_empleado = ? AND fecha = ?
ORDER BY fecha DESC
```

### Cerrar estadia
```sql
UPDATE estadia
SET estado = 0, fecha_salida = ?
WHERE id_estadia = ? AND estado = 1
```

---

## Variables de Entorno Requeridas

| Variable              | Descripcion                                    |
|-----------------------|------------------------------------------------|
| TURSO_DATABASE_URL    | URL de la base de datos Turso                  |
| TURSO_AUTH_TOKEN      | Token de autenticacion para Turso              |
| CLOUDINARY_CLOUD_NAME | Nombre del cloud de Cloudinary (para OCR)     |
| CLOUDINARY_API_KEY    | API Key de Cloudinary                          |
| CLOUDINARY_API_SECRET | API Secret de Cloudinary                       |

---

## Tecnologias Utilizadas

- **Frontend:** Next.js 16, React 19, Tailwind CSS v4, shadcn/ui
- **Backend:** Next.js API Routes (App Router)
- **Base de datos:** Turso (SQLite distribuido)
- **Autenticacion:** bcrypt + cookies HTTP-only
- **OCR de patentes:** Cloudinary (procesamiento de imagenes)
- **Scanner externo:** API REST configurable para deteccion de patentes con camara
