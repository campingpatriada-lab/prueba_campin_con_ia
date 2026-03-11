"use client"

import React from "react"
import { useState, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Search,
  Loader2,
  Car,
  User,
  Users,
  CalendarCheck,
  CalendarX,
  AlertCircle,
  XCircle,
  DollarSign,
  Activity,
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
  Mic,
  MicOff,
  Hash,
} from "lucide-react"
import { cn, fechaHoyArgentina } from "@/lib/utils"

type SearchType = "patente" | "nombre" | "dni"

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

export function Busqueda() {
  const [searchType, setSearchType] = useState<SearchType>("patente")
  const [searchValue, setSearchValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [resultado, setResultado] = useState<Estadia | null>(null)
  const [resultados, setResultados] = useState<Estadia[]>([])
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)

  // Voz
  const voiceRef = useRef<any | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [voiceError, setVoiceError] = useState<string | null>(null)

  const normalizarPatente = (texto: string): string =>
    texto
      .toUpperCase()
      .replace(/\s+/g, "")
      .replace(/HA/g, "A")
      .replace(/AH/g, "A")
      .replace(/TE/g, "T")
      .replace(/DE/g, "D")
      .replace(/BE/g, "B")
      .replace(/VE/g, "V")
      .replace(/CE/g, "C")

  const toggleVoice = () => {
    if (isListening) {
      voiceRef.current?.stop()
      setIsListening(false)
      return
    }

    const AudioInput =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition

    if (!AudioInput) {
      setVoiceError("Tu navegador no soporta reconocimiento de voz.")
      return
    }

    setVoiceError(null)
    setSearchValue("")
    const recognition = new AudioInput()
    recognition.lang = "es-AR"
    recognition.interimResults = false
    recognition.maxAlternatives = 3
    recognition.continuous = true

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          const raw = event.results[i][0].transcript.trim()
          let valor: string
          if (searchType === "patente") {
            valor = normalizarPatente(raw)
          } else if (searchType === "dni") {
            valor = raw.replace(/\s+/g, "")
          } else {
            valor = raw
          }
          if (valor.length > 0) {
            setSearchValue(valor)
            setVoiceError(null)
            voiceRef.current?.stop()
            setIsListening(false)
            // Ejecutar busqueda automaticamente
            setTimeout(() => {
              handleSearch(valor)
            }, 0)
          }
        }
      }
    }

    recognition.onerror = (event: any) => {
      if (event.error !== "aborted") {
        setVoiceError("No se pudo reconocer la voz. Intente nuevamente.")
      }
      setIsListening(false)
    }

    recognition.onend = () => setIsListening(false)

    voiceRef.current = recognition
    recognition.start()
    setIsListening(true)
  }

  const handleSearch = async (valorOverride?: string) => {
    const valorBase = valorOverride ?? searchValue
    if (!valorBase.trim()) return

    setIsLoading(true)
    setError(null)
    setResultado(null)
    setResultados([])
    setSearched(true)

    try {
      const res = await fetch("/api/buscar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: searchType,
          valor:
            searchType === "patente"
              ? valorBase.trim().toUpperCase()
              : valorBase.trim(),
        }),
      })

      const data = await res.json()

      if (data.success && data.resultados && Array.isArray(data.resultados)) {
        setResultados(data.resultados)
      } else if (data.success && data.resultado) {
        setResultado(data.resultado)
      } else if (data.message || data.mensaje) {
        setError(data.message || data.mensaje)
      } else {
        setResultado(null)
      }
    } catch (err) {
      setError("Error de conexion con el servidor")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const clearSearch = () => {
    setSearchValue("")
    setResultado(null)
    setResultados([])
    setError(null)
    setSearched(false)
  }

  return (
    <div className="flex-1 overflow-auto pb-20">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Search className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Busqueda</h2>
        </div>

        <Card className="p-4 bg-card border-border mb-4">
          <div className="flex flex-col gap-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setSearchType("patente"); clearSearch(); voiceRef.current?.stop(); setIsListening(false); setVoiceError(null) }}
                className={cn(
                  "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors",
                  searchType === "patente"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <Car className="w-4 h-4 inline mr-2" />
                Por Patente
              </button>
              <button
                type="button"
                onClick={() => { setSearchType("nombre"); clearSearch(); voiceRef.current?.stop(); setIsListening(false); setVoiceError(null) }}
                className={cn(
                  "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors",
                  searchType === "nombre"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <User className="w-4 h-4 inline mr-2" />
                Por Nombre
              </button>
              <button
                type="button"
                onClick={() => { setSearchType("dni"); clearSearch(); voiceRef.current?.stop(); setIsListening(false); setVoiceError(null) }}
                className={cn(
                  "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors",
                  searchType === "dni"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <User className="w-4 h-4 inline mr-2" />
                Por DNI
              </button>
            </div>

            <div className="flex gap-2">
              <Input
                value={searchValue}
                onChange={(e) => {
                  setSearchValue(searchType === "patente" ? e.target.value.toUpperCase() : e.target.value)
                  setVoiceError(null)
                }}
                placeholder={searchType === "patente" ? "Ej: ABC123" : searchType === "nombre" ? "Ej: Juan Perez" : "Ej: 12345678"}
                className={cn("flex-1 bg-muted border-border", searchType === "patente" && "font-mono uppercase")}
                onKeyDown={(e) => { if (e.key === "Enter") handleSearch() }}
              />
              <Button
                type="button"
                variant={isListening ? "default" : "outline"}
                size="icon"
                className={cn(
                  "shrink-0 border-border",
                  isListening && "bg-destructive hover:bg-destructive border-destructive text-destructive-foreground animate-pulse"
                )}
                onClick={toggleVoice}
                title={isListening ? "Toque para detener" : "Buscar por voz"}
                aria-label={isListening ? "Detener grabacion" : "Iniciar busqueda por voz"}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
              <Button onClick={() => handleSearch()} disabled={!searchValue.trim() || isLoading} className="px-4">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
            {isListening && (
              <p className="text-xs text-muted-foreground animate-pulse">
                Escuchando... Toque el microfono para detener.
              </p>
            )}
            {voiceError && (
              <div className="flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                <p className="text-xs text-destructive">{voiceError}</p>
              </div>
            )}
          </div>
        </Card>

        {error && (
          <Card className="p-4 bg-card border-destructive/50 mb-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          </Card>
        )}

        {searched && !isLoading && !error && !resultado && resultados.length === 0 && (
          <Card className="p-6 bg-card border-border">
            <div className="flex flex-col items-center gap-3 text-center">
              <XCircle className="w-10 h-10 text-muted-foreground" />
              <p className="text-muted-foreground">
                No se encontraron resultados para{" "}
                <span className="font-mono font-semibold">{searchValue}</span>
              </p>
            </div>
          </Card>
        )}

        {resultado && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">1 resultado encontrado</p>
            <ResultadoCard resultado={resultado} onUpdated={handleSearch} />
          </div>
        )}

        {resultados.length > 0 && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              {resultados.length} resultado{resultados.length > 1 ? "s" : ""} encontrado{resultados.length > 1 ? "s" : ""}
            </p>
            {resultados.map((r) => (
              <ResultadoCard key={r.id_estadia} resultado={r} onUpdated={handleSearch} />
            ))}
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

function ResultadoCard({ resultado, onUpdated }: { resultado: Estadia; onUpdated: () => void }) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editData, setEditData] = useState({
    patente: resultado.patente || "",
    nombre_responsable: resultado.nombre_responsable || "",
    dni_responsable: resultado.dni_responsable || "",
    cantidad_personas: String(resultado.cantidad_personas),
    cantidad_menores: resultado.cantidad_menores != null ? String(resultado.cantidad_menores) : "",
    fecha_entrada: resultado.fecha_entrada?.split("T")[0] || "",
    fecha_salida: resultado.fecha_salida?.split("T")[0] || "",
    tipo_estadia: resultado.tipo_estadia || "",
    estado: String(resultado.estado),
  })
  const [fogonInfo, setFogonInfo] = useState<{ numero?: number; ocupado?: boolean; servicios?: string[] } | null>(null)
  const [fogonSelectorOpen, setFogonSelectorOpen] = useState(false)
  const [fogonesLista, setFogonesLista] = useState<{ numero: number; ocupado: boolean; servicios: string[] }[]>([])
  const [editIdFogon, setEditIdFogon] = useState<number | null>(resultado.id_fogon ?? null)
  const [editNumeroFogon, setEditNumeroFogon] = useState<string>(fogonInfo?.numero != null ? String(fogonInfo.numero) : "")

  // Estado local para editar pagos individuales
  const [editPagos, setEditPagos] = useState<{ id_ingreso?: number; tipo: string; monto: string }[]>(
    resultado.pagos && resultado.pagos.length > 0
      ? resultado.pagos.map((p) => ({ id_ingreso: p.id_ingreso, tipo: p.tipo, monto: String(p.monto) }))
      : []
  )
  // IDs de pagos originales para detectar eliminados
  const [pagosOriginales] = useState<number[]>(
    (resultado.pagos || []).filter((p) => p.id_ingreso).map((p) => p.id_ingreso as number)
  )

  const tipoEstadia = resultado.tipo_estadia?.toLowerCase() || ""
  const isAcampe = tipoEstadia === "acampe"
  const isDia = tipoEstadia === "dia"
  const cantidadDias = calcularCantidadDias(resultado)

  React.useEffect(() => {
    ;(async () => {
      if (resultado.id_fogon != null) {
        try {
          const res = await fetch(`/api/fogones/by-id?id=${encodeURIComponent(resultado.id_fogon)}`)
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
  }, [resultado.id_fogon])

  const handleSave = async () => {
    setSaving(true)
    try {
      // 1. Guardar datos de la estadia
      const res = await fetch("/api/estadias", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_estadia: resultado.id_estadia,
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
              concepto: `Abono estadia #${resultado.id_estadia}`,
              monto,
              tipo_ingreso: pago.tipo,
              id_estadia: resultado.id_estadia,
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
              <Input value={editData.nombre_responsable} onChange={(e) => setEditData({ ...editData, nombre_responsable: e.target.value })} className="bg-secondary/50 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">DNI</label>
              <Input value={editData.dni_responsable} onChange={(e) => setEditData({ ...editData, dni_responsable: e.target.value })} className="bg-secondary/50 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Cantidad personas</label>
              <Input type="number" value={editData.cantidad_personas} onChange={(e) => setEditData({ ...editData, cantidad_personas: e.target.value })} className="bg-secondary/50 text-sm" min="1" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Cantidad menores</label>
              <Input type="number" value={editData.cantidad_menores} onChange={(e) => setEditData({ ...editData, cantidad_menores: e.target.value })} className="bg-secondary/50 text-sm" min="0" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Entrada</label>
              <Input type="date" value={editData.fecha_entrada} onChange={(e) => setEditData({ ...editData, fecha_entrada: e.target.value })} className="bg-secondary/50 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Salida</label>
              <Input type="date" value={editData.fecha_salida} onChange={(e) => setEditData({ ...editData, fecha_salida: e.target.value })} className="bg-secondary/50 text-sm" />
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
    <Card className="bg-card border-primary/30 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border bg-primary/5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Car className="w-5 h-5 text-primary" />
          </div>
          <div className="flex flex-col">
            {resultado.hora_ingreso && (
              <span className="text-xs font-medium text-muted-foreground tabular-nums">
                {resultado.hora_ingreso}
              </span>
            )}
            <span className="font-mono text-xl font-bold text-foreground uppercase tracking-wider">
              {resultado.patente || "Sin patente"}
            </span>
            {resultado.nombre_responsable && (
              <span className="text-xs text-muted-foreground">{resultado.nombre_responsable}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {resultado.tiene_incidencia && (
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
            {resultado.tipo_estadia || "---"}
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

      <div className="p-4">
        <div className="grid grid-cols-1 gap-3">
          <div className="grid grid-cols-2 gap-3">
            <DataRow icon={<Hash className="w-4 h-4" />} label="Fogon" value={fogonInfo?.numero != null ? `#${fogonInfo.numero}` : "---"} highlight />
            <div className="flex items-center gap-1 flex-wrap">
              {(fogonInfo?.servicios || []).map((s, i) => (
                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-md border bg-muted text-muted-foreground" title={s}>
                  {abreviarServicio(s)}
                </span>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <DataRow icon={<User className="w-4 h-4" />} label="Nombre" value={resultado.nombre_responsable || "---"} />
            <DataRow icon={<User className="w-4 h-4" />} label="DNI" value={resultado.dni_responsable || "---"} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <DataRow icon={<Users className="w-4 h-4" />} label="Personas" value={String(resultado.cantidad_personas)} />
            <DataRow icon={<Users className="w-4 h-4" />} label="Menores" value={resultado.cantidad_menores != null ? String(resultado.cantidad_menores) : "0"} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <DataRow icon={<CalendarCheck className="w-4 h-4" />} label="Entrada" value={formatearFecha(resultado.fecha_entrada)} highlight />
            <DataRow icon={<CalendarX className="w-4 h-4" />} label="Salida" value={formatearFecha(resultado.fecha_salida)} highlight />
          </div>

          <AbonoCollapsible pagos={resultado.pagos || []} totalAbonado={resultado.total_abonado || 0} />

          <div className="grid grid-cols-2 gap-3">
            <DataRow icon={<Tent className="w-4 h-4" />} label="Tipo" value={resultado.tipo_estadia || "---"} />
            <DataRow icon={<UserCheck className="w-4 h-4" />} label="Empleado" value={resultado.nombre_empleado || "---"} />
          </div>

          <DataRow icon={<Activity className="w-4 h-4" />} label="Estado" value={resultado.estado === 1 ? "Activa" : "Finalizada"} />

          <DataRow icon={<CalendarDays className="w-4 h-4" />} label="Cantidad de dias" value={cantidadDias} />

          {resultado.observaciones && (
            <div className="p-2 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground mb-1">Observaciones</p>
              <p className="text-sm text-foreground">{resultado.observaciones}</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

function DataRow({ icon, label, value, highlight = false }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn("flex flex-col gap-1 p-2 rounded-lg", highlight ? "bg-muted/50" : "")}>
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <span className={cn("text-sm font-medium text-foreground pl-6", highlight && "font-mono")}>{value}</span>
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
