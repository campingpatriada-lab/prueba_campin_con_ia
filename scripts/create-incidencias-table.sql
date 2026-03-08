CREATE TABLE IF NOT EXISTS incidencias (
    id_incidencia INTEGER PRIMARY KEY AUTOINCREMENT,
    patente TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    fecha NUMERIC DEFAULT CURRENT_TIMESTAMP,
    id_empleado INTEGER NOT NULL,
    id_estadia INTEGER NOT NULL,

    FOREIGN KEY (id_empleado) REFERENCES empleado(id_empleado),
    FOREIGN KEY (id_estadia) REFERENCES estadia(id_estadia)
);
