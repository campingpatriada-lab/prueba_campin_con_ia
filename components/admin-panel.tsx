"use client"

import React from "react"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { fechaHoyArgentina } from "@/lib/utils"
import {
  Loader2,
  UserPlus,
  Users,
  Download,
  DollarSign,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Pencil,
  Check,
  X,
  Banknote,
  Power,
  Trash2,
} from "lucide-react"

interface Empleado {
  id_empleado: number
  nombre: string
  rol: "ADMIN" | "EMPLEADO"
  activo: number
  creado_en: string
}

interface Ingreso {
  id_ingreso: number
  fecha: string
  monto: number
  concepto: string
  tipo_ingreso: string | null
  id_empleado: number
  id_estadia: number | null
  nombre_empleado?: string
}

export function AdminPanel() {
  const [activeSection, setActiveSection] = useState<"empleados" | "ingresos" | "reportes" | "caja">("empleados")

  return (
    <div className="flex-1 overflow-auto pb-20">
      {/* Tabs */}
      <div className="flex border-b border-border">
        {[
          { id: "empleados" as const, label: "Empleados", icon: Users },
          { id: "ingresos" as const, label: "Ingresos", icon: DollarSign },
          { id: "reportes" as const, label: "Reportes", icon: Download },
          { id: "caja" as const, label: "Caja", icon: Banknote },
        ].map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeSection === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      <div className="p-4">
        {activeSection === "empleados" && <EmpleadosSection />}
        {activeSection === "ingresos" && <IngresosGlobales />}
        {activeSection === "reportes" && <ReportesSection />}
        {activeSection === "caja" && <CajaSection />}
      </div>
    </div>
  )
}

/* ============================
   Seccion Empleados
============================ */
function EmpleadosSection() {
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ nombre: "", password: "", rol: "EMPLEADO" as "ADMIN" | "EMPLEADO" })
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState("")
  const [successMsg, setSuccessMsg] = useState("")
  // Edicion
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editNombre, setEditNombre] = useState("")
  const [editPassword, setEditPassword] = useState("")
  const [editShowPassword, setEditShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)

  const fetchEmpleados = useCallback(async () => {
    try {
      const res = await fetch("/api/empleados")
      const data = await res.json()
      if (data.success) {
        setEmpleados(data.empleados)
      }
    } catch {
      setError("Error al cargar empleados")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEmpleados()
  }, [fetchEmpleados])

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setError("")
    setSuccessMsg("")

    try {
      const res = await fetch("/api/empleados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (data.success) {
        setSuccessMsg("Empleado creado correctamente")
        setFormData({ nombre: "", password: "", rol: "EMPLEADO" })
        setShowForm(false)
        fetchEmpleados()
      } else {
        setError(data.message)
      }
    } catch {
      setError("Error de conexion")
    } finally {
      setCreating(false)
    }
  }

  const startEdit = (emp: Empleado) => {
    setEditingId(emp.id_empleado)
    setEditNombre(emp.nombre)
    setEditPassword("")
    setEditShowPassword(false)
    setError("")
    setSuccessMsg("")
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditNombre("")
    setEditPassword("")
    setEditShowPassword(false)
  }

  const handleEditar = async () => {
    if (!editingId || !editNombre.trim()) return

    setSaving(true)
    setError("")
    setSuccessMsg("")

    try {
      const res = await fetch("/api/empleados", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_empleado: editingId,
          nombre: editNombre.trim(),
          password: editPassword || undefined,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setSuccessMsg("Empleado editado correctamente")
        cancelEdit()
        fetchEmpleados()
      } else {
        setError(data.message || "Error al editar")
      }
    } catch {
      setError("Error de conexion")
    } finally {
      setSaving(false)
    }
  }

  // Ordenar: activos primero, inactivos despues
  const empleadosOrdenados = [...empleados].sort((a, b) => b.activo - a.activo)

  const handleToggleActivo = async (emp: Empleado) => {
    const accion = emp.activo === 1 ? "desactivar" : "activar"
    if (!confirm(`${emp.activo === 1 ? "Desactivar" : "Activar"} a "${emp.nombre}"?`)) return

    try {
      const res = await fetch("/api/empleados", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_empleado: emp.id_empleado }),
      })

      const data = await res.json()

      if (data.success) {
        setSuccessMsg(`Empleado ${accion === "desactivar" ? "desactivado" : "activado"} correctamente`)
        fetchEmpleados()
      } else {
        setError(data.message)
      }
    } catch {
      setError("Error de conexion")
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}

      {successMsg && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
          <p className="text-primary text-sm">{successMsg}</p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">
          Empleados ({empleados.length})
        </h3>
        <Button
          size="sm"
          onClick={() => setShowForm(!showForm)}
          variant={showForm ? "outline" : "default"}
        >
          <UserPlus className="w-4 h-4 mr-1" />
          {showForm ? "Cancelar" : "Nuevo"}
        </Button>
      </div>

      {showForm && (
        <Card className="border-primary/30">
          <CardContent className="pt-4">
            <form onSubmit={handleCrear} className="space-y-3">
              <Input
                placeholder="Nombre de usuario"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className="bg-secondary/50"
              />
              <Input
                type="password"
                placeholder="Contrasena (min 6 caracteres)"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="bg-secondary/50"
              />
              <Select
                value={formData.rol}
                onValueChange={(v) => setFormData({ ...formData, rol: v as "ADMIN" | "EMPLEADO" })}
              >
                <SelectTrigger className="bg-secondary/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMPLEADO">Empleado</SelectItem>
                  <SelectItem value="ADMIN">Administrador</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" className="w-full" disabled={creating || !formData.nombre || !formData.password}>
                {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Crear Empleado
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {empleadosOrdenados.map((emp) => (
          <Card key={emp.id_empleado} className={`${emp.activo === 0 ? "opacity-50" : ""}`}>
            <CardContent className="py-3">
              {editingId === emp.id_empleado ? (
                <div className="space-y-2">
                  <Input
                    value={editNombre}
                    onChange={(e) => setEditNombre(e.target.value)}
                    placeholder="Nombre"
                    className="bg-secondary/50 text-sm"
                  />
                  <div className="relative">
                    <Input
                      type={editShowPassword ? "text" : "password"}
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      placeholder="Nueva contrasena (dejar vacio para no cambiar)"
                      className="bg-secondary/50 text-sm pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setEditShowPassword(!editShowPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {editShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={cancelEdit}
                      disabled={saving}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleEditar}
                      disabled={saving || !editNombre.trim()}
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
                      Guardar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{emp.nombre}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          emp.rol === "ADMIN"
                            ? "bg-primary/20 text-primary"
                            : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {emp.rol}
                      </span>
                      <span className={`text-xs ${emp.activo === 1 ? "text-primary" : "text-destructive"}`}>
                        {emp.activo === 1 ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {emp.activo === 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEdit(emp)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleToggleActivo(emp)}
                      className={emp.activo === 1
                        ? "text-destructive hover:text-destructive hover:bg-destructive/10"
                        : "text-primary hover:text-primary hover:bg-primary/10"
                      }
                      title={emp.activo === 1 ? "Desactivar" : "Activar"}
                    >
                      <Power className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

/* ============================
   Seccion Ingresos Globales
============================ */
function IngresosGlobales() {
  const hoy = fechaHoyArgentina()
  const [dia, setDia] = useState(hoy.split("-")[2])
  const [mes, setMes] = useState(hoy.split("-")[1])
  const [anio, setAnio] = useState(hoy.split("-")[0])
  const [ingresos, setIngresos] = useState<Ingreso[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [successMsg, setSuccessMsg] = useState("")

  const selectedFecha = `${anio}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`

  const fetchIngresos = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/ingresos?modo=todos_fecha&fecha=${selectedFecha}`)
      const data = await res.json()
      if (data.success) {
        setIngresos(data.ingresos)
      }
    } catch {
      setError("Error al cargar ingresos")
    } finally {
      setLoading(false)
    }
  }, [selectedFecha])

  useEffect(() => {
    fetchIngresos()
  }, [fetchIngresos])

  const totalVisible = ingresos.reduce((sum, i) => sum + i.monto, 0)

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}
      {successMsg && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
          <p className="text-primary text-sm">{successMsg}</p>
        </div>
      )}

      {/* Periodo */}
      <div className="flex items-center gap-2">
        <Select value={dia} onValueChange={setDia}>
          <SelectTrigger className="bg-secondary/50 text-sm flex-1 h-9">
            <SelectValue placeholder="Dia" />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 31 }, (_, i) => {
              const d = String(i + 1).padStart(2, "0")
              return <SelectItem key={d} value={d}>{d}</SelectItem>
            })}
          </SelectContent>
        </Select>
        <Select value={mes} onValueChange={setMes}>
          <SelectTrigger className="bg-secondary/50 text-sm flex-1 h-9">
            <SelectValue placeholder="Mes" />
          </SelectTrigger>
          <SelectContent>
            {["01","02","03","04","05","06","07","08","09","10","11","12"].map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={anio} onValueChange={setAnio}>
          <SelectTrigger className="bg-secondary/50 text-sm flex-1 h-9">
            <SelectValue placeholder="Anio" />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 5 }, (_, i) => {
              const y = String(Number(hoy.split("-")[0]) - 2 + i)
              return <SelectItem key={y} value={y}>{y}</SelectItem>
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Total */}
      <Card className="bg-primary/10 border-primary/20">
        <CardContent className="py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">
              Total {dia}/{mes}/{anio}
            </p>
            <p className="text-xl font-bold text-primary">${totalVisible.toLocaleString("es-AR")}</p>
            <p className="text-xs text-muted-foreground">{ingresos.length} registro(s)</p>
          </div>
          <DollarSign className="w-7 h-7 text-primary/50" />
        </CardContent>
      </Card>

      {/* Lista */}
      <h3 className="font-semibold text-foreground text-sm">
        Ingresos del {dia}/{mes}/{anio}
      </h3>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-2">
          {ingresos.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">No hay ingresos para esta fecha</p>
          ) : (
            ingresos.map((ing) => (
              <AdminIngresoCard
                key={ing.id_ingreso}
                ingreso={ing}
                onUpdated={fetchIngresos}
                setError={setError}
                setSuccessMsg={setSuccessMsg}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

/* ============================
   Admin Ingreso Card con editar/eliminar
============================ */
function AdminIngresoCard({
  ingreso,
  onUpdated,
  setError,
  setSuccessMsg,
}: {
  ingreso: Ingreso
  onUpdated: () => void
  setError: (msg: string) => void
  setSuccessMsg: (msg: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [editMonto, setEditMonto] = useState(String(ingreso.monto))
  const [editConcepto, setEditConcepto] = useState(ingreso.concepto)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    setError("")
    try {
      const res = await fetch("/api/ingresos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_ingreso: ingreso.id_ingreso,
          monto: Number(editMonto),
          concepto: editConcepto,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setSuccessMsg("Ingreso editado")
        setEditing(false)
        onUpdated()
      } else {
        setError(data.message || "Error al editar")
      }
    } catch {
      setError("Error de conexion")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Eliminar este ingreso?")) return
    setDeleting(true)
    setError("")
    try {
      const res = await fetch("/api/ingresos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_ingreso: ingreso.id_ingreso }),
      })
      const data = await res.json()
      if (data.success) {
        setSuccessMsg("Ingreso eliminado")
        onUpdated()
      } else {
        setError(data.message || "Error al eliminar")
      }
    } catch {
      setError("Error de conexion")
    } finally {
      setDeleting(false)
    }
  }

  if (editing) {
    return (
      <Card className="border-primary/30">
        <CardContent className="py-3 space-y-2">
          <Input
            value={editConcepto}
            onChange={(e) => setEditConcepto(e.target.value)}
            placeholder="Concepto"
            className="bg-secondary/50 text-sm"
          />
          <Input
            type="number"
            value={editMonto}
            onChange={(e) => setEditMonto(e.target.value)}
            placeholder="Monto"
            className="bg-secondary/50 text-sm"
            min="0"
            step="0.01"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 mr-1" />}
              Guardar
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)} className="flex-1">
              <X className="w-3 h-3 mr-1" />
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="py-3">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground">{ingreso.concepto}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {ingreso.nombre_empleado && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary font-medium">
                  {ingreso.nombre_empleado}
                </span>
              )}
              <span className="text-xs text-muted-foreground">{ingreso.fecha}</span>
              {ingreso.tipo_ingreso && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                  {ingreso.tipo_ingreso}
                </span>
              )}
              {ingreso.id_estadia && (
                <span className="text-xs text-muted-foreground">Est. #{ingreso.id_estadia}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <p className="font-semibold text-primary">${ingreso.monto.toLocaleString("es-AR")}</p>
            <button
              onClick={() => setEditing(true)}
              className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
              title="Editar"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
              title="Eliminar"
            >
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/* ============================
   Seccion Reportes
============================ */
function ReportesSection() {
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [successMsg, setSuccessMsg] = useState("")

  const meses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ]

  // Escapar valores CSV
  const escapeCsv = (val: string) => {
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`
    }
    return val
  }

  // Consolidar ingresos: una fila por estadia, columnas Efectivo/Transferencia/Debito
  const consolidarIngresosCSV = (ingresos: any[]) => {
    const estadiaMap = new Map<number, {
      id_ingreso: number
      fecha: string
      efectivo: number
      transferencia: number
      debito: number
      concepto: string
      id_estadia: number
      empleado: string
    }>()

    const sinEstadia: {
      id_ingreso: number
      fecha: string
      efectivo: number
      transferencia: number
      debito: number
      concepto: string
      id_estadia: string
      empleado: string
    }[] = []

    for (const ing of ingresos) {
      const tipo = (ing.tipo_ingreso || "").toLowerCase()
      const esEfectivo = tipo.includes("efectivo") ? ing.monto : 0
      const esTransferencia = tipo.includes("transferencia") ? ing.monto : 0
      const esDebito = tipo.includes("debito") || tipo.includes("débito") ? ing.monto : 0

      if (ing.id_estadia) {
        const existing = estadiaMap.get(ing.id_estadia)
        if (existing) {
          existing.efectivo += esEfectivo
          existing.transferencia += esTransferencia
          existing.debito += esDebito
        } else {
          estadiaMap.set(ing.id_estadia, {
            id_ingreso: ing.id_ingreso,
            fecha: ing.fecha,
            efectivo: esEfectivo,
            transferencia: esTransferencia,
            debito: esDebito,
            concepto: ing.concepto,
            id_estadia: ing.id_estadia,
            empleado: ing.nombre_empleado || "-",
          })
        }
      } else {
        sinEstadia.push({
          id_ingreso: ing.id_ingreso,
          fecha: ing.fecha,
          efectivo: esEfectivo,
          transferencia: esTransferencia,
          debito: esDebito,
          concepto: ing.concepto,
          id_estadia: "-",
          empleado: ing.nombre_empleado || "-",
        })
      }
    }

    const filasConsolidadas = [
      ...Array.from(estadiaMap.values()).map((e) => [
        e.id_ingreso,
        e.fecha,
        e.efectivo || "",
        e.transferencia || "",
        e.debito || "",
        escapeCsv(e.concepto),
        e.id_estadia,
        escapeCsv(e.empleado),
      ]),
      ...sinEstadia.map((e) => [
        e.id_ingreso,
        e.fecha,
        e.efectivo || "",
        e.transferencia || "",
        e.debito || "",
        escapeCsv(e.concepto),
        e.id_estadia,
        escapeCsv(e.empleado),
      ]),
    ]

    let totalEfectivo = 0
    let totalTransferencia = 0
    let totalDebito = 0
    for (const ing of ingresos) {
      const tipo = (ing.tipo_ingreso || "").toLowerCase()
      if (tipo.includes("efectivo")) totalEfectivo += ing.monto
      if (tipo.includes("transferencia")) totalTransferencia += ing.monto
      if (tipo.includes("debito") || tipo.includes("débito")) totalDebito += ing.monto
    }
    const totalGanancia = totalEfectivo + totalTransferencia + totalDebito

    const headers = ["ID", "Fecha", "Efectivo", "Transferencia", "Debito", "Concepto", "Estadia", "Empleado"]
    const filasVacia = ["", "", "", "", "", "", "", ""]
    const filaTotalGanancia = ["", "Total ganancia", totalGanancia, "", "", "", "", ""]
    const filaTotalEfectivo = ["", "Total Efectivo", totalEfectivo, "", "", "", "", ""]
    const filaTotalTransferencia = ["", "Total Transferencia", "", totalTransferencia, "", "", "", ""]
    const filaTotalDebito = ["", "Total Debito", "", "", totalDebito, "", "", ""]

    const allRows = [
      headers,
      ...filasConsolidadas,
      filasVacia,
      filaTotalGanancia,
      filaTotalEfectivo,
      filaTotalTransferencia,
      filaTotalDebito,
    ]

    return { csvRows: allRows, totalGanancia }
  }

  const descargarEstadiasMes = async () => {
    setLoading(true)
    setError("")
    setSuccessMsg("")

    try {
      const res = await fetch(`/api/reportes?tipo=estadias-mes&anio=${anio}&mes=${mes}`)
      const data = await res.json()

      if (!data.success) {
        setError(data.message)
        return
      }

      const estadias = data.estadias
      if (estadias.length === 0) {
        setError("No hay estadias para el periodo seleccionado")
        return
      }

      // Consolidar: una fila por estadia con columnas Efectivo/Transferencia/Debito
      const estadiaMap = new Map<number, {
        id_estadia: number
        patente: string
        personas: number
        menores: number
        entrada: string
        salida: string
        responsable: string
        dni: string
        tipo: string
        empleado: string
        estado: string
        efectivo: number
        transferencia: number
        debito: number
        observaciones: string
        hora_ingreso: string
        hora_egreso: string
      }>()

      for (const e of estadias) {
        const monto = e.ingreso_monto != null ? Number(e.ingreso_monto) : 0
        const tipoIngreso = (e.ingreso_tipo || "").toLowerCase()
        const esEfectivo = tipoIngreso.includes("efectivo") ? monto : 0
        const esTransferencia = tipoIngreso.includes("transferencia") ? monto : 0
        const esDebito = tipoIngreso.includes("debito") || tipoIngreso.includes("débito") ? monto : 0

        const existing = estadiaMap.get(e.id_estadia)
        if (existing) {
          existing.efectivo += esEfectivo
          existing.transferencia += esTransferencia
          existing.debito += esDebito
        } else {
          estadiaMap.set(e.id_estadia, {
            id_estadia: e.id_estadia,
            patente: e.patente || "-",
            personas: e.cantidad_personas,
            menores: e.cantidad_menores != null ? e.cantidad_menores : 0,
            entrada: e.fecha_entrada,
            salida: e.fecha_salida || "-",
            responsable: e.nombre_responsable || "-",
            dni: e.dni_responsable || "-",
            tipo: e.tipo_estadia || "-",
            empleado: e.nombre_empleado || "-",
            estado: e.estado === 1 ? "Activa" : "Cerrada",
            efectivo: esEfectivo,
            transferencia: esTransferencia,
            debito: esDebito,
            observaciones: e.observaciones || "-",
            hora_ingreso: e.hora_ingreso || "-",
            hora_egreso: e.hora_egreso || "-",
          })
        }
      }

      const filasConsolidadas = Array.from(estadiaMap.values()).map((e) => [
        e.id_estadia,
        e.patente,
        e.personas,
        e.menores,
        e.entrada,
        e.salida,
        escapeCsv(e.responsable),
        e.dni,
        e.tipo,
        escapeCsv(e.empleado),
        e.estado,
        e.efectivo || "",
        e.transferencia || "",
        e.debito || "",
        escapeCsv(e.observaciones),
        e.hora_ingreso,
        e.hora_egreso,
      ])

      // Calcular totales
      let totalEfectivo = 0
      let totalTransferencia = 0
      let totalDebito = 0
      for (const e of estadiaMap.values()) {
        totalEfectivo += e.efectivo
        totalTransferencia += e.transferencia
        totalDebito += e.debito
      }
      const totalGanancia = totalEfectivo + totalTransferencia + totalDebito

      const headers = ["ID", "Patente", "Personas", "Menores", "Entrada", "Salida", "Responsable", "DNI", "Tipo", "Empleado", "Estado", "Efectivo", "Transferencia", "Debito", "Observaciones", "Hora Ingreso", "Hora Egreso"]
      const filasVacia = Array(headers.length).fill("")
      const filaTotalGanancia = ["", "Total ganancia", "", "", "", "", "", "", "", "", "", totalGanancia, "", "", "", "", ""]
      const filaTotalEfectivo = ["", "Total Efectivo", "", "", "", "", "", "", "", "", "", totalEfectivo, "", "", "", "", ""]
      const filaTotalTransferencia = ["", "Total Transferencia", "", "", "", "", "", "", "", "", "", "", totalTransferencia, "", "", "", ""]
      const filaTotalDebito = ["", "Total Debito", "", "", "", "", "", "", "", "", "", "", "", totalDebito, "", "", ""]

      const allRows = [
        headers,
        ...filasConsolidadas,
        filasVacia,
        filaTotalGanancia,
        filaTotalEfectivo,
        filaTotalTransferencia,
        filaTotalDebito,
      ]

      const csvContent = "\uFEFF" + allRows.map((r: any[]) => r.join(",")).join("\n")
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      link.href = URL.createObjectURL(blob)
      link.download = `estadias_${anio}_${String(mes).padStart(2, "0")}.csv`
      link.click()
      URL.revokeObjectURL(link.href)

      setSuccessMsg(`Archivo descargado. Total: $${totalGanancia.toLocaleString("es-AR")}`)
    } catch {
      setError("Error al generar reporte")
    } finally {
      setLoading(false)
    }
  }

  // Descargar ingresos de un mes
  const descargarIngresosMes = async () => {
    setLoading(true)
    setError("")
    setSuccessMsg("")

    try {
      const res = await fetch(`/api/reportes?tipo=ingresos-mes&anio=${anio}&mes=${mes}`)
      const data = await res.json()

      if (!data.success) {
        setError(data.message)
        return
      }

      const ingresos = data.ingresos
      if (ingresos.length === 0) {
        setError("No hay ingresos para el periodo seleccionado")
        return
      }

      const { csvRows, totalGanancia } = consolidarIngresosCSV(ingresos)

      const csvContent = "\uFEFF" + csvRows.map((r: any[]) => r.join(",")).join("\n")
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      link.href = URL.createObjectURL(blob)
      link.download = `ingresos_${anio}_${String(mes).padStart(2, "0")}.csv`
      link.click()
      URL.revokeObjectURL(link.href)

      setSuccessMsg(`Archivo descargado. Total del mes: $${totalGanancia.toLocaleString("es-AR")}`)
    } catch {
      setError("Error al generar reporte")
    } finally {
      setLoading(false)
    }
  }

  // Descargar todos los ingresos
  const descargarIngresosTodos = async () => {
    setLoading(true)
    setError("")
    setSuccessMsg("")

    try {
      const res = await fetch("/api/reportes?tipo=ingresos-todos")
      const data = await res.json()

      if (!data.success) {
        setError(data.message)
        return
      }

      const ingresos = data.ingresos
      if (ingresos.length === 0) {
        setError("No hay ingresos registrados")
        return
      }

      const { csvRows, totalGanancia } = consolidarIngresosCSV(ingresos)

      const csvContent = "\uFEFF" + csvRows.map((r: any[]) => r.join(",")).join("\n")
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      link.href = URL.createObjectURL(blob)
      link.download = "ingresos_total.csv"
      link.click()
      URL.revokeObjectURL(link.href)

      setSuccessMsg(`Archivo descargado. Total general: $${totalGanancia.toLocaleString("es-AR")}`)
    } catch {
      setError("Error al generar reporte")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}

      {successMsg && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
          <p className="text-primary text-sm">{successMsg}</p>
        </div>
      )}

      {/* Selector de mes/anio */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Periodo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
              <SelectTrigger className="flex-1 bg-secondary/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {meses.map((m, i) => (
                  <SelectItem key={i} value={String(i + 1)}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              value={anio}
              onChange={(e) => setAnio(Number(e.target.value))}
              className="w-24 bg-secondary/50"
              min={2020}
              max={2030}
            />
          </div>
        </CardContent>
      </Card>

      {/* Exportar ingresos del mes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ingresos del mes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Consolidado por estadia. Columnas: ID, Fecha, Efectivo, Transferencia, Debito, Concepto, Estadia, Empleado. Con totales al final.
          </p>
          <Button onClick={descargarIngresosMes} className="w-full" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
            Descargar Ingresos del Mes
          </Button>
        </CardContent>
      </Card>

      {/* Exportar todos los ingresos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Todos los ingresos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Consolidado por estadia. Todos los ingresos con totales por metodo de pago al final.
          </p>
          <Button onClick={descargarIngresosTodos} className="w-full" variant="secondary" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
            Descargar Todos los Ingresos
          </Button>
        </CardContent>
      </Card>

      {/* Estadias por mes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Estadias por mes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-2">
            Consolidado por estadia. Columnas: Efectivo, Transferencia, Debito con totales al final.
          </p>
          <Button onClick={descargarEstadiasMes} className="w-full bg-transparent" variant="outline" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
            Descargar Estadias del Mes
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

/* ============================
   Seccion Caja
============================ */
function CajaSection() {
  const hoy = fechaHoyArgentina()
  const [dia, setDia] = useState(hoy.split("-")[2])
  const [mes, setMes] = useState(hoy.split("-")[1])
  const [anio, setAnio] = useState(hoy.split("-")[0])
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState<number | null>(null)
  const [error, setError] = useState("")
  const [successMsg, setSuccessMsg] = useState("")

  const selectedFecha = `${anio}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`

  useEffect(() => {
    const fetchEmpleados = async () => {
      try {
        const res = await fetch("/api/empleados")
        const data = await res.json()
        if (data.success) {
          setEmpleados(data.empleados)
        }
      } catch {
        setError("Error al cargar empleados")
      } finally {
        setLoading(false)
      }
    }
    fetchEmpleados()
  }, [])

  const escapeCsv = (val: string) => {
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`
    }
    return val
  }

  const descargarCSVEmpleado = async (emp: Empleado) => {
    setDownloading(emp.id_empleado)
    setError("")
    setSuccessMsg("")

    try {
      const res = await fetch(`/api/ingresos?id_empleado=${emp.id_empleado}&fecha=${selectedFecha}`)
      const data = await res.json()

      if (!data.success) {
        setError(data.message || "Error al obtener ingresos")
        return
      }

      const ingresos = data.ingresos
      if (!ingresos || ingresos.length === 0) {
        setError(`No hay ingresos de ${emp.nombre} para el ${dia}/${mes}/${anio}`)
        return
      }

      // Consolidar por estadia
      const estadiaMap = new Map<number, {
        id_ingreso: number
        fecha: string
        efectivo: number
        transferencia: number
        debito: number
        concepto: string
        id_estadia: number
      }>()

      const sinEstadia: {
        id_ingreso: number
        fecha: string
        efectivo: number
        transferencia: number
        debito: number
        concepto: string
        id_estadia: string
      }[] = []

      for (const ing of ingresos) {
        const tipo = (ing.tipo_ingreso || "").toLowerCase()
        const esEfectivo = tipo.includes("efectivo") ? ing.monto : 0
        const esTransferencia = tipo.includes("transferencia") ? ing.monto : 0
        const esDebito = tipo.includes("debito") || tipo.includes("débito") ? ing.monto : 0

        if (ing.id_estadia) {
          const existing = estadiaMap.get(ing.id_estadia)
          if (existing) {
            existing.efectivo += esEfectivo
            existing.transferencia += esTransferencia
            existing.debito += esDebito
          } else {
            estadiaMap.set(ing.id_estadia, {
              id_ingreso: ing.id_ingreso,
              fecha: ing.fecha,
              efectivo: esEfectivo,
              transferencia: esTransferencia,
              debito: esDebito,
              concepto: ing.concepto,
              id_estadia: ing.id_estadia,
            })
          }
        } else {
          sinEstadia.push({
            id_ingreso: ing.id_ingreso,
            fecha: ing.fecha,
            efectivo: esEfectivo,
            transferencia: esTransferencia,
            debito: esDebito,
            concepto: ing.concepto,
            id_estadia: "-",
          })
        }
      }

      const filasConsolidadas = [
        ...Array.from(estadiaMap.values()).map((e) => [
          e.id_ingreso,
          e.fecha,
          e.efectivo || "",
          e.transferencia || "",
          e.debito || "",
          escapeCsv(e.concepto),
          e.id_estadia,
        ]),
        ...sinEstadia.map((e) => [
          e.id_ingreso,
          e.fecha,
          e.efectivo || "",
          e.transferencia || "",
          e.debito || "",
          escapeCsv(e.concepto),
          e.id_estadia,
        ]),
      ]

      let totalEfectivo = 0
      let totalTransferencia = 0
      let totalDebito = 0
      for (const ing of ingresos) {
        const tipo = (ing.tipo_ingreso || "").toLowerCase()
        if (tipo.includes("efectivo")) totalEfectivo += ing.monto
        if (tipo.includes("transferencia")) totalTransferencia += ing.monto
        if (tipo.includes("debito") || tipo.includes("débito")) totalDebito += ing.monto
      }
      const totalGanancia = totalEfectivo + totalTransferencia + totalDebito

      const headers = ["ID", "Fecha", "Efectivo", "Transferencia", "Debito", "Concepto", "Estadia"]
      const filasVacia = Array(headers.length).fill("")
      const filaTotalGanancia = ["", "Total ganancia", totalGanancia, "", "", "", ""]
      const filaTotalEfectivo = ["", "Total Efectivo", totalEfectivo, "", "", "", ""]
      const filaTotalTransferencia = ["", "Total Transferencia", "", totalTransferencia, "", "", ""]
      const filaTotalDebito = ["", "Total Debito", "", "", totalDebito, "", ""]

      const allRows = [
        headers,
        ...filasConsolidadas,
        filasVacia,
        filaTotalGanancia,
        filaTotalEfectivo,
        filaTotalTransferencia,
        filaTotalDebito,
      ]

      const csvContent = "\uFEFF" + allRows.map((r: any[]) => r.join(",")).join("\n")
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      link.href = URL.createObjectURL(blob)
      link.download = `caja_${emp.nombre.replace(/\s+/g, "_")}_${selectedFecha}.csv`
      link.click()
      URL.revokeObjectURL(link.href)

      setSuccessMsg(`CSV de ${emp.nombre} descargado. Total: $${totalGanancia.toLocaleString("es-AR")}`)
    } catch {
      setError("Error al generar CSV")
    } finally {
      setDownloading(null)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}
      {successMsg && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
          <p className="text-primary text-sm">{successMsg}</p>
        </div>
      )}

      {/* Periodo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Periodo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Select value={dia} onValueChange={setDia}>
              <SelectTrigger className="bg-secondary/50 text-sm flex-1 h-9">
                <SelectValue placeholder="Dia" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 31 }, (_, i) => {
                  const d = String(i + 1).padStart(2, "0")
                  return <SelectItem key={d} value={d}>{d}</SelectItem>
                })}
              </SelectContent>
            </Select>
            <Select value={mes} onValueChange={setMes}>
              <SelectTrigger className="bg-secondary/50 text-sm flex-1 h-9">
                <SelectValue placeholder="Mes" />
              </SelectTrigger>
              <SelectContent>
                {["01","02","03","04","05","06","07","08","09","10","11","12"].map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={anio} onValueChange={setAnio}>
              <SelectTrigger className="bg-secondary/50 text-sm flex-1 h-9">
                <SelectValue placeholder="Anio" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 5 }, (_, i) => {
                  const y = String(Number(hoy.split("-")[0]) - 2 + i)
                  return <SelectItem key={y} value={y}>{y}</SelectItem>
                })}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de empleados */}
      <h3 className="font-semibold text-foreground text-sm">
        Empleados - {dia}/{mes}/{anio}
      </h3>

      <div className="space-y-2">
        {empleados.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">No hay empleados registrados</p>
        ) : (
          [...empleados].sort((a, b) => b.activo - a.activo).map((emp) => (
            <Card key={emp.id_empleado}>
              <CardContent className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{emp.nombre}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        emp.rol === "ADMIN"
                          ? "bg-primary/20 text-primary"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {emp.rol}
                    </span>
                    <span className={`text-xs ${emp.activo === 1 ? "text-primary" : "text-destructive"}`}>
                      {emp.activo === 1 ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => descargarCSVEmpleado(emp)}
                  disabled={downloading === emp.id_empleado}
                  className="shrink-0"
                >
                  {downloading === emp.id_empleado ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  ) : (
                    <Download className="w-4 h-4 mr-1" />
                  )}
                  CSV
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
