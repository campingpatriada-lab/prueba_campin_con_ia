"use client"

import React from "react"
import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Loader2,
  RefreshCw,
  Calendar,
  User,
  Car,
  Users,
  CalendarCheck,
  CalendarX,
  DollarSign,
  Activity,
  AlertCircle,
  Pencil,
  Check,
  X,
  Tent,
  UserCheck,
  CalendarDays,
  ChevronDown,
  Trash2,
  Plus,
  TriangleAlert,
  Hash,
} from "lucide-react"
import { cn, fechaHoyArgentina } from "@/lib/utils"

interface PagoDetalle {
  id_ingreso?: number
  tipo: string
  monto: number
}

interface Estadia {
  id_estadia: number
  patente: string | null
  cantidad_personas: number
  cantidad_menores: number | null
  fecha_entrada: string
  fecha_salida: string | null
  nombre_responsable: string | null
  dni_responsable: string | null
  tipo_estadia: string | null
  estado: number
  observaciones: string | null
  id_empleado: number
  nombre_empleado: string | null
  ingreso_monto: number | null
  estado_pago: string
  pagos: PagoDetalle[]
  total_abonado: number
  hora_ingreso?: string | null
  tiene_incidencia?: boolean
  id_fogon?: number | null
}

function calcularCantidadDias(estadia: Estadia): string {
  const tipo = estadia.tipo_estadia?.toLowerCase() || ""
  if (tipo === "dia" || tipo === "tarde") return "---"
  if (tipo === "acampe") {
    const fechaEntradaStr = estadia.fecha_entrada?.split("T")[0]
    if (!fechaEntradaStr) return "---"
    const fechaEntrada = new Date(fechaEntradaStr + "T12:00:00")
    const fechaSalidaStr = estadia.fecha_salida?.split("T")[0] || null
    if (fechaSalidaStr) {
      const fechaSalida = new Date(fechaSalidaStr + "T12:00:00")
      const diff = Math.ceil((fechaSalida.getTime() - fechaEntrada.getTime()) / (1000 * 60 * 60 * 24))
      return String(Math.max(diff, 0))
    } else {
      return "Falta especificar la fecha de salida"
    }
  }
  return "---"
}

function formatearFecha(fecha: string | null | undefined): string {
  if (!fecha) return "---"
  const partes = fecha.split("T")
  return partes[0] || fecha
}

export function ReservasList() {
  const [estadias, setEstadias] = useState<Estadia[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEstadias = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/reservas")
      const data = await res.json()

      if (data.success && Array.isArray(data.estadias)) {
        setEstadias(data.estadias)
      } else if (data.message) {
        setError(data.message)
      } else {
        setEstadias([])
      }
    } catch (err) {
      setError("No se pudieron cargar las reservas")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchEstadias()
  }, [])

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando reservas...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="p-6 bg-card border-destructive/50 max-w-sm w-full">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Error</h2>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
            <Button onClick={fetchEstadias} variant="secondary" className="mt-2">
              <RefreshCw className="w-4 h-4 mr-2" />
              Reintentar
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto pb-20">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Reservas Activas</h2>
          </div>
          <Button
            onClick={fetchEstadias}
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {estadias.length === 0 ? (
          <Card className="p-6 bg-card border-border">
            <div className="flex flex-col items-center gap-3 text-center">
              <Calendar className="w-10 h-10 text-muted-foreground" />
              <p className="text-muted-foreground">No hay reservas activas</p>
            </div>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              {estadias.length} reserva{estadias.length !== 1 ? "s" : ""}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {estadias.map((estadia) => (
                <EstadiaCard key={estadia.id_estadia} estadia={estadia} onUpdated={fetchEstadias} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function AbonoCollapsible({ pagos, totalAbonado }: { pagos: PagoDetalle[]; totalAbonado: number }) {
  const [open, setOpen] = useState(false)
  const hasPagos = pagos.length > 0

  const formatMonto = (monto: number) =>
    "$" + monto.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

  if (!hasPagos) {
    return (
      <DataRow
        icon={<DollarSign className="w-4 h-4" />}
        label="Abono"
        value="SIN pagar"
      />
    )
  }

  return (
    <div className="flex flex-col gap-1 p-2 rounded-lg bg-muted/50 overflow-hidden min-w-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-left gap-1 min-w-0"
      >
        <div className="flex items-center gap-1.5 text-muted-foreground min-w-0 overflow-hidden">
          <DollarSign className="w-4 h-4 shrink-0" />
          <span className="text-xs shrink-0">Abono:</span>
          <span className="text-sm font-medium text-foreground truncate">{formatMonto(totalAbonado)}</span>
        </div>
        <ChevronDown
          className={cn(
            "w-4 h-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <div className="mt-1 p-2 rounded-md bg-card border border-border overflow-hidden">
          {pagos.map((pago, i) => (
            <div key={i} className="flex items-center justify-between gap-1 py-0.5">
              <span className="text-[11px] text-muted-foreground truncate shrink-1">{capitalize(pago.tipo)}:</span>
              <span className="text-[11px] font-medium text-foreground shrink-0 text-right">{formatMonto(pago.monto)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between gap-1 pt-1 mt-1 border-t border-border">
            <span className="text-[11px] text-muted-foreground">Total:</span>
            <span className="text-[11px] font-semibold text-foreground shrink-0 text-right">{formatMonto(totalAbonado)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function EstadiaCard({ estadia, onUpdated }: { estadia: Estadia; onUpdated: () => void }) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editData, setEditData] = useState({
    patente: estadia.patente || "",
    nombre_responsable: estadia.nombre_responsable || "",
    dni_responsable: estadia.dni_responsable || "",
    cantidad_personas: String(estadia.cantidad_personas),
    cantidad_menores: estadia.cantidad_menores != null ? String(estadia.cantidad_menores) : "",
    fecha_entrada: estadia.fecha_entrada?.split("T")[0] || "",
    fecha_salida: estadia.fecha_salida?.split("T")[0] || "",
    tipo_estadia: estadia.tipo_estadia || "",
    estado: String(estadia.estado),
  })
  const [fogonInfo, setFogonInfo] = useState<{ numero?: number; ocupado?: boolean; servicios?: string[] } | null>(null)
  const [fogonSelectorOpen, setFogonSelectorOpen] = useState(false)
  const [fogonesLista, setFogonesLista] = useState<{ numero: number; ocupado: boolean; servicios: string[] }[]>([])
  const [editIdFogon, setEditIdFogon] = useState<number | null>(estadia.id_fogon ?? null)
  const [editNumeroFogon, setEditNumeroFogon] = useState<string>(
    fogonInfo?.numero != null ? String(fogonInfo.numero) : ""
  )

  // Estado local para editar pagos individuales
  const [editPagos, setEditPagos] = useState<{ id_ingreso?: number; tipo: string; monto: string }[]>(
    estadia.pagos && estadia.pagos.length > 0
      ? estadia.pagos.map((p) => ({ id_ingreso: p.id_ingreso, tipo: p.tipo, monto: String(p.monto) }))
      : []
  )
  // IDs de pagos originales para detectar eliminados
  const [pagosOriginales] = useState<number[]>(
    (estadia.pagos || []).filter((p) => p.id_ingreso).map((p) => p.id_ingreso as number)
  )

  const tipoEstadia = estadia.tipo_estadia?.toLowerCase() || ""
  const isAcampe = tipoEstadia === "acampe"
  const isDia = tipoEstadia === "dia"
  const cantidadDias = calcularCantidadDias(estadia)

  useEffect(() => {
    ;(async () => {
      if (estadia.id_fogon != null) {
        try {
          const res = await fetch(`/api/fogones/by-id?id=${encodeURIComponent(estadia.id_fogon)}`)
          const data = await res.json()
          if (data.success) {
            setFogonInfo({
              numero: Number(data.numero_fogon),
              ocupado: Number(data.estado) === 1,
              servicios: Array.isArray(data.servicios) ? data.servicios : [],
            })
          }
        } catch {}
      } else {
        setFogonInfo(null)
      }
    })()
  }, [estadia.id_fogon])

  const handleSave = async () => {
    setSaving(true)
    try {
      // 1. Guardar datos de la estadia
      const res = await fetch("/api/estadias", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_estadia: estadia.id_estadia,
          datos: {
            patente: editData.patente ? editData.patente.trim().toUpperCase() : null,
            nombre_responsable: editData.nombre_responsable || null,
            dni_responsable: editData.dni_responsable || null,
            cantidad_personas: Number(editData.cantidad_personas),
            cantidad_menores: editData.cantidad_menores ? Number(editData.cantidad_menores) : null,
            fecha_entrada: editData.fecha_entrada,
            fecha_salida: editData.fecha_salida || null,
            tipo_estadia: editData.tipo_estadia || null,
            estado: Number(editData.estado),
            id_fogon: editIdFogon ?? null,
          },
        }),
      })
      const data = await res.json()
      if (!data.success) {
        alert(data.message || "Error al guardar")
        setSaving(false)
        return
      }

      // 2. Procesar pagos individuales
      const idsActuales = editPagos.filter((p) => p.id_ingreso).map((p) => p.id_ingreso as number)

      // Eliminar pagos que fueron removidos
      for (const idOrig of pagosOriginales) {
        if (!idsActuales.includes(idOrig)) {
          await fetch("/api/ingresos", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id_ingreso: idOrig }),
          })
        }
      }

      // Editar existentes y crear nuevos
      for (const pago of editPagos) {
        const monto = Number(pago.monto)
        if (monto <= 0) continue

        if (pago.id_ingreso) {
          // Editar ingreso existente
          await fetch("/api/ingresos", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id_ingreso: pago.id_ingreso,
              monto,
              tipo_ingreso: pago.tipo,
            }),
          })
        } else {
          // Crear nuevo ingreso - se registra con fecha de hoy y en la caja del usuario autenticado
          await fetch("/api/ingresos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              concepto: `Abono estadia #${estadia.id_estadia}`,
              monto,
              tipo_ingreso: pago.tipo,
              id_estadia: estadia.id_estadia,
              fecha: fechaHoyArgentina(),
            }),
          })
        }
      }

      setEditing(false)
      onUpdated()
    } catch {
      alert("Error de conexion")
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <Card className="bg-card border-primary/30 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border bg-primary/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Pencil className="w-5 h-5 text-primary" />
            </div>
            <span className="text-sm font-medium text-primary">Editando</span>
          </div>
          <Badge variant="secondary" className="text-xs font-medium px-3 py-1 bg-primary/20 text-primary">
            Editando
          </Badge>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Patente</label>
            <Input
              value={editData.patente}
              onChange={(e) => setEditData({ ...editData, patente: e.target.value.toUpperCase() })}
              className="bg-secondary/50 text-sm font-mono uppercase"
              placeholder="ABC123"
              maxLength={10}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Nombre</label>
              <Input
                value={editData.nombre_responsable}
                onChange={(e) => setEditData({ ...editData, nombre_responsable: e.target.value })}
                className="bg-secondary/50 text-sm"
                placeholder="Nombre"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">DNI</label>
              <Input
                value={editData.dni_responsable}
                onChange={(e) => setEditData({ ...editData, dni_responsable: e.target.value })}
                className="bg-secondary/50 text-sm"
                placeholder="DNI"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Cantidad personas</label>
              <Input
                type="number"
                value={editData.cantidad_personas}
                onChange={(e) => setEditData({ ...editData, cantidad_personas: e.target.value })}
                className="bg-secondary/50 text-sm"
                min="1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Cantidad menores</label>
              <Input
                type="number"
                value={editData.cantidad_menores}
                onChange={(e) => setEditData({ ...editData, cantidad_menores: e.target.value })}
                className="bg-secondary/50 text-sm"
                min="0"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Entrada</label>
              <Input
                type="date"
                value={editData.fecha_entrada}
                onChange={(e) => setEditData({ ...editData, fecha_entrada: e.target.value })}
                className="bg-secondary/50 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Salida</label>
              <Input
                type="date"
                value={editData.fecha_salida}
                onChange={(e) => setEditData({ ...editData, fecha_salida: e.target.value })}
                className="bg-secondary/50 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Fogon</label>
            <div className="flex items-center gap-2">
              <Input
                value={editNumeroFogon}
                onChange={(e) => setEditNumeroFogon(e.target.value)}
                className="bg-secondary/50 text-sm"
                placeholder="Ej: 12"
                inputMode="numeric"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={async () => {
                  if (!fogonSelectorOpen) {
                    try {
                      const res = await fetch("/api/fogones/list")
                      const data = await res.json()
                      if (data.success) {
                        setFogonesLista(
                          data.fogones.map((f: any) => ({
                            numero: Number(f.numero_fogon),
                            ocupado: Number(f.estado) === 1,
                            servicios: Array.isArray(f.servicios) ? f.servicios : [],
                          }))
                        )
                      }
                    } catch {}
                  }
                  setFogonSelectorOpen(!fogonSelectorOpen)
                }}
              >
                seleccionar fogon
              </Button>
            </div>
            {fogonSelectorOpen && fogonesLista.length > 0 && (
              <div className="mt-2 grid grid-cols-4 gap-2">
                {fogonesLista.map((f) => (
                  <button
                    key={f.numero}
                    type="button"
                    onClick={async () => {
                      setEditNumeroFogon(String(f.numero))
                      try {
                        const res = await fetch("/api/fogones", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ numero: f.numero }),
                        })
                        const data = await res.json()
                        if (data.success && data.id_fogon != null) {
                          setEditIdFogon(Number(data.id_fogon))
                        }
                      } catch {}
                      setFogonSelectorOpen(false)
                    }}
                    className={cn(
                      "w-full text-xs rounded-md border px-2 py-2 text-left transition-colors",
                      f.ocupado
                        ? "bg-amber-600/15 border-amber-600/30 text-amber-700"
                        : "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/20"
                    )}
                    title={f.ocupado ? `Fogon ${f.numero} ocupado` : `Fogon ${f.numero} disponible`}
                  >
                    <div className="font-medium">#{f.numero}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {f.servicios.map((s, i) => (
                        <span key={i} className="px-1 py-0.5 rounded border bg-background/60">
                          {abreviarServicio(s)}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-muted-foreground">Pagos / Abonos</label>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-xs text-primary"
                onClick={() => setEditPagos([...editPagos, { tipo: "efectivo", monto: "" }])}
              >
                <Plus className="w-3 h-3 mr-1" />
                Agregar pago
              </Button>
            </div>
            {editPagos.length === 0 && (
              <p className="text-xs text-muted-foreground italic py-2">Sin pagos registrados</p>
            )}
            <div className="flex flex-col gap-2">
              {editPagos.map((pago, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Select
                    value={pago.tipo}
                    onValueChange={(v) => {
                      const updated = [...editPagos]
                      updated[idx] = { ...updated[idx], tipo: v }
                      setEditPagos(updated)
                    }}
                  >
                    <SelectTrigger className="bg-secondary/50 text-xs w-[130px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="efectivo">Efectivo</SelectItem>
                      <SelectItem value="transferencia">Transferencia</SelectItem>
                      <SelectItem value="debito">Debito</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    value={pago.monto}
                    onChange={(e) => {
                      const updated = [...editPagos]
                      updated[idx] = { ...updated[idx], monto: e.target.value }
                      setEditPagos(updated)
                    }}
                    className="bg-secondary/50 text-sm h-8 flex-1"
                    placeholder="$0"
                    min="0"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      const updated = editPagos.filter((_, i) => i !== idx)
                      setEditPagos(updated)
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Estado</label>
              <Select value={editData.estado} onValueChange={(v) => setEditData({ ...editData, estado: v })}>
                <SelectTrigger className="bg-secondary/50 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Activa</SelectItem>
                  <SelectItem value="0">Finalizada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Tipo estadia</label>
              <Select value={editData.tipo_estadia} onValueChange={(v) => setEditData({ ...editData, tipo_estadia: v })}>
                <SelectTrigger className="bg-secondary/50 text-sm">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="acampe">Acampe</SelectItem>
                  <SelectItem value="dia">Dia</SelectItem>
                  <SelectItem value="tarde">Tarde</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
              Guardar
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)} className="flex-1">
              <X className="w-4 h-4 mr-1" />
              Cancelar
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="bg-card border-border overflow-hidden">
      {/* Header con hora, patente y badge */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Car className="w-5 h-5 text-primary" />
          </div>
          <div className="flex flex-col">
            {estadia.hora_ingreso && (
              <span className="text-xs font-medium text-muted-foreground tabular-nums">
                {estadia.hora_ingreso}
              </span>
            )}
            <span className="font-mono text-xl font-bold text-foreground uppercase tracking-wider">
              {estadia.patente || "Sin patente"}
            </span>
            {estadia.nombre_responsable && (
              <span className="text-xs text-muted-foreground">{estadia.nombre_responsable}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {estadia.tiene_incidencia && (
            <div className="p-1.5 rounded-md bg-amber-500/10" title="Tiene incidencia registrada">
              <TriangleAlert className="w-4 h-4 text-amber-600" />
            </div>
          )}
          <Badge
            variant="secondary"
            className={cn(
              "text-xs font-medium px-3 py-1",
              isAcampe && "bg-primary/20 text-primary border-primary/30",
              isDia && "bg-warning/20 text-warning border-warning/30",
              !isAcampe && !isDia && "bg-muted text-muted-foreground"
            )}
          >
            {estadia.tipo_estadia || "---"}
          </Badge>
          <button
            onClick={() => setEditing(true)}
            className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
            title="Editar reserva"
          >
            <Pencil className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div className="p-4">
        <div className="grid grid-cols-1 gap-3">
          <div className="grid grid-cols-2 gap-3">
            <DataRow
              icon={<Hash className="w-4 h-4" />}
              label="Fogon"
              value={fogonInfo?.numero != null ? `#${fogonInfo.numero}` : "---"}
              highlight
            />
            <div className="flex items-center gap-1 flex-wrap">
              {(fogonInfo?.servicios || []).map((s, i) => (
                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-md border bg-muted text-muted-foreground" title={s}>
                  {abreviarServicio(s)}
                </span>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <DataRow icon={<User className="w-4 h-4" />} label="Nombre" value={estadia.nombre_responsable || "---"} />
            <DataRow icon={<User className="w-4 h-4" />} label="DNI" value={estadia.dni_responsable || "---"} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <DataRow icon={<Users className="w-4 h-4" />} label="Personas" value={String(estadia.cantidad_personas)} />
            <DataRow icon={<Users className="w-4 h-4" />} label="Menores" value={estadia.cantidad_menores != null ? String(estadia.cantidad_menores) : "0"} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <DataRow icon={<CalendarCheck className="w-4 h-4" />} label="Entrada" value={formatearFecha(estadia.fecha_entrada)} highlight />
            <DataRow icon={<CalendarX className="w-4 h-4" />} label="Salida" value={formatearFecha(estadia.fecha_salida)} highlight />
          </div>

          <AbonoCollapsible pagos={estadia.pagos || []} totalAbonado={estadia.total_abonado || 0} />

          <div className="grid grid-cols-2 gap-3">
            <DataRow icon={<Tent className="w-4 h-4" />} label="Tipo" value={estadia.tipo_estadia || "---"} />
            <DataRow icon={<UserCheck className="w-4 h-4" />} label="Empleado" value={estadia.nombre_empleado || "---"} />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <DataRow icon={<Activity className="w-4 h-4" />} label="Estado" value={estadia.estado === 1 ? "Activa" : "Finalizada"} />
            <DataRow icon={<CalendarDays className="w-4 h-4" />} label="Cantidad de dias" value={cantidadDias} />
          </div>

          {estadia.observaciones && (
            <div className="p-2 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground mb-1">Observaciones</p>
              <p className="text-sm text-foreground">{estadia.observaciones}</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

function DataRow({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ReactNode
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className={cn("flex flex-col gap-1 p-2 rounded-lg", highlight ? "bg-muted/50" : "")}>
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <span className={cn("text-sm font-medium text-foreground pl-6", highlight && "font-mono")}>
        {value}
      </span>
    </div>
  )
}

function abreviarServicio(nombre: string) {
  const n = nombre.toLowerCase()
  if (n === "agua") return "AG"
  if (n === "luz") return "LZ"
  if (n === "parrilla") return "PR"
  if (n === "internet") return "IN"
  return n.slice(0, 2).toUpperCase()
}
