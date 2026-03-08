"use client"

import React from "react"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Loader2,
  PlusCircle,
  Trash2,
  Pencil,
  Check,
  X,
} from "lucide-react"
import { fechaHoyArgentina } from "@/lib/utils"

interface EmpleadoSesion {
  id_empleado: number
  nombre: string
  rol: "ADMIN" | "EMPLEADO"
}

interface Ingreso {
  id_ingreso: number
  fecha: string
  monto: number
  concepto: string
  tipo_ingreso: string | null
  id_empleado: number
  id_estadia: number | null
}

interface IngresosPanelProps {
  empleado: EmpleadoSesion
}

export function IngresosPanel({ empleado }: IngresosPanelProps) {
  const [ingresos, setIngresos] = useState<Ingreso[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState("")
  const [successMsg, setSuccessMsg] = useState("")

  // Form
  const [concepto, setConcepto] = useState("")
  const [monto, setMonto] = useState("")
  const [tipoIngreso, setTipoIngreso] = useState("")
  const [idEstadia, setIdEstadia] = useState("")

  const hoy = fechaHoyArgentina()

  const fetchIngresos = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/ingresos?fecha=${hoy}`)
      const data = await res.json()
      if (data.success) {
        setIngresos(data.ingresos)
      }
    } catch {
      setError("Error al cargar ingresos")
    } finally {
      setLoading(false)
    }
  }, [hoy])

  useEffect(() => {
    fetchIngresos()
  }, [fetchIngresos])

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setError("")
    setSuccessMsg("")

    try {
      const res = await fetch("/api/ingresos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          concepto,
          monto: Number(monto),
          tipo_ingreso: tipoIngreso,
          id_estadia: idEstadia ? Number(idEstadia) : null,
          fecha: hoy,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setSuccessMsg("Ingreso registrado correctamente")
        setConcepto("")
        setMonto("")
        setTipoIngreso("")
        setIdEstadia("")
        setShowForm(false)
        fetchIngresos()
      } else {
        setError(data.message)
      }
    } catch {
      setError("Error de conexion")
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex justify-center items-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto p-4 pb-20 space-y-4">
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

      {/* Acciones */}
      <div className="flex gap-2">
        <Button
          onClick={() => setShowForm(!showForm)}
          variant={showForm ? "outline" : "default"}
          className="flex-1"
        >
          <PlusCircle className="w-4 h-4 mr-1" />
          {showForm ? "Cancelar" : "Nuevo ingreso"}
        </Button>
      </div>

      {/* Formulario nuevo ingreso */}
      {showForm && (
        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Registrar ingreso manual</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCrear} className="space-y-3">
              <Input
                placeholder="Concepto (ej: Venta de lena)"
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                className="bg-secondary/50"
              />
              <Input
                type="number"
                placeholder="Monto ($)"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                className="bg-secondary/50"
                min="0"
                step="0.01"
              />
              <Select value={tipoIngreso} onValueChange={setTipoIngreso}>
                <SelectTrigger className="bg-secondary/50">
                  <SelectValue placeholder="Tipo de ingreso" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="debito">Debito</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder="ID Estadia asociada (opcional)"
                value={idEstadia}
                onChange={(e) => setIdEstadia(e.target.value)}
                className="bg-secondary/50"
              />
              <Button
                type="submit"
                className="w-full"
                disabled={creating || !concepto || !monto || !tipoIngreso}
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Registrar Ingreso
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Lista de ingresos del dia */}
      <div className="space-y-2">
        <h3 className="font-semibold text-foreground text-sm">Ingresos de hoy</h3>
        {ingresos.length === 0 ? (
          <p className="text-center text-muted-foreground py-6 text-sm">
            No hay ingresos registrados hoy
          </p>
        ) : (
          ingresos.map((ing) => (
            <IngresoCardItem
              key={ing.id_ingreso}
              ingreso={ing}
              onUpdated={fetchIngresos}
              setError={setError}
              setSuccessMsg={setSuccessMsg}
            />
          ))
        )}
      </div>
    </div>
  )
}

/* ============================
   Componente IngresoCard con editar/eliminar
============================ */
function IngresoCardItem({
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
            <p className="font-medium text-foreground text-sm">{ingreso.concepto}</p>
            <div className="flex items-center gap-2 mt-1">
              {ingreso.tipo_ingreso && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                  {ingreso.tipo_ingreso}
                </span>
              )}
              {ingreso.id_estadia && (
                <span className="text-xs text-muted-foreground">
                  Est. #{ingreso.id_estadia}
                </span>
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
