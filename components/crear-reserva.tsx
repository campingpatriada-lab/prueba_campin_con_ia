"use client"

import React, { useRef } from "react"
import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, CheckCircle2, AlertCircle, PlusCircle, Camera, Trash2, Plus, ChevronDown, ChevronUp, TriangleAlert, Mic, MicOff } from "lucide-react"
import { fechaHoyArgentina, cn } from "@/lib/utils"
import { optimizarImagen } from "@/lib/optimizar-imagen"

interface PagoItem {
  tipo: string
  monto: string
}

interface FormData {
  patente: string
  dni: string
  cantidadPersonas: string
  cantidadMenores: string
  tipoEstadia: string
  fechaEntrada: string
  fechaSalida: string
  nombre: string
  observaciones: string
  numeroFogon?: string
}

export function CrearReserva() {
  const hoy = fechaHoyArgentina()

  const [formData, setFormData] = useState<FormData>({
    patente: "",
    dni: "",
    cantidadPersonas: "",
    cantidadMenores: "",
    tipoEstadia: "",
    fechaEntrada: hoy,
    fechaSalida: "",
    nombre: "",
    observaciones: "",
  })
  const [pagos, setPagos] = useState<PagoItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const totalPagos = pagos.reduce((sum, p) => sum + (parseFloat(p.monto) || 0), 0)

  const agregarPago = () => {
    setPagos((prev) => [...prev, { tipo: "", monto: "" }])
  }

  const eliminarPago = (index: number) => {
    setPagos((prev) => prev.filter((_, i) => i !== index))
  }

  const actualizarPago = (index: number, field: keyof PagoItem, value: string) => {
    setPagos((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)))
    setResult(null)
  }

  // Refs para auto-avance entre campos
  const patenteRef = useRef<HTMLInputElement>(null)
  const nombreRef = useRef<HTMLInputElement>(null)
  const dniRef = useRef<HTMLInputElement>(null)
  const cantidadRef = useRef<HTMLInputElement>(null)
  const cantidadMenoresRef = useRef<HTMLInputElement>(null)
  const tipoEstadiaRef = useRef<HTMLDivElement>(null)
  const tipoEstadiaDefaultRef = useRef<HTMLInputElement>(null)
  const fechaEntradaRef = useRef<HTMLInputElement>(null)
  const fechaSalidaRef = useRef<HTMLInputElement>(null)
  const observacionesRef = useRef<HTMLTextAreaElement>(null)

  // Estado y ref para la deteccion de patente por foto
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [isDetecting, setIsDetecting] = useState(false)
  const [detectError, setDetectError] = useState<string | null>(null)

  // Estado y ref para reconocimiento de voz de la patente
  const recognitionRef = useRef<any>(null)
  const [isListening, setIsListening] = useState(false)
  const [voiceError, setVoiceError] = useState<string | null>(null)

  // Normaliza el texto reconocido por voz para aproximarlo al formato de patente
  const normalizarPatente = (texto: string): string => {
    return texto
      .toUpperCase()
      .replace(/\s+/g, "")
      .replace(/HA/g, "A")
      .replace(/AH/g, "A")
      .replace(/TE/g, "T")
      .replace(/DE/g, "D")
      .replace(/BE/g, "B")
      .replace(/VE/g, "V")
      .replace(/CE/g, "C")
      .replace(/BE/g, "B")
      .replace(/VE/g, "V")
      
  }

  const toggleVoiceRecognition = () => {
    // Si ya esta escuchando, detener
    if (isListening) {
      recognitionRef.current?.stop()
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
    setDetectError(null)

    const recognition = new AudioInput()
    recognition.lang = "es-AR"
    recognition.interimResults = false
    recognition.maxAlternatives = 3
    recognition.continuous = true

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          const transcript = event.results[i][0].transcript
          const normalizada = normalizarPatente(transcript)

          if (normalizada.length > 0) {
            handleChange("patente", normalizada)
            buscarIncidencias(normalizada)
            setVoiceError(null)
            recognitionRef.current?.stop()
            setIsListening(false)
            setTimeout(() => nombreRef.current?.focus(), 200)
          } else {
            setVoiceError("No se pudo interpretar la patente. Intente nuevamente.")
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

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }

  // Incidencias
  interface Incidencia {
    id_incidencia: number
    patente: string
    descripcion: string
    fecha: string
    nombre_empleado: string
  }
  const [incidencias, setIncidencias] = useState<Incidencia[]>([])
  const [incidenciasOpen, setIncidenciasOpen] = useState(false)
  const incidenciaTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const buscarIncidencias = (patente: string) => {
    // Limpiar timeout anterior
    if (incidenciaTimeoutRef.current) {
      clearTimeout(incidenciaTimeoutRef.current)
    }

    const val = patente.trim().toUpperCase()
    if (val.length < 3) {
      setIncidencias([])
      setIncidenciasOpen(false)
      return
    }

    // Debounce 500ms para no bombardear la API
    incidenciaTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/incidencias?patente=${encodeURIComponent(val)}`)
        const data = await res.json()
        if (data.success && data.incidencias.length > 0) {
          setIncidencias(data.incidencias)
        } else {
          setIncidencias([])
          setIncidenciasOpen(false)
        }
      } catch {
        // Silencioso - no interrumpir el flujo
      }
    }, 500)
  }

  // Fogones disponibles y validacion
  const [fogonesDisponibles, setFogonesDisponibles] = useState<number[]>([])
  const [fogonMensaje, setFogonMensaje] = useState<string | null>(null)
  const [fogonEstado, setFogonEstado] = useState<"ok" | "ocupado" | "noexiste" | null>(null)
  const [fogonSelectorOpen, setFogonSelectorOpen] = useState(false)
  const [fogonesLista, setFogonesLista] = useState<{ numero: number; ocupado: boolean; servicios: string[] }[]>([])

  React.useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch("/api/fogones", { method: "GET" })
        const data = await res.json()
        if (data.success && Array.isArray(data.disponibles)) {
          setFogonesDisponibles(data.disponibles)
        }
      } catch {
        // silencioso
      }
    })()
  }, [])

  const validarFogon = async (numero: string) => {
    const n = Number(numero)
    if (!numero || Number.isNaN(n)) {
      setFogonMensaje(null)
      setFogonEstado(null)
      return
    }
    try {
      const res = await fetch("/api/fogones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numero: n }),
      })
      const data = await res.json()
      if (!data.success) {
        setFogonMensaje(null)
        setFogonEstado(null)
        return
      }
      if (!data.existe) {
        setFogonEstado("noexiste")
        setFogonMensaje("El fogon no existe")
      } else if (data.ocupado) {
        const salida = data.fecha_salida ? String(data.fecha_salida) : "sin fecha de salida"
        setFogonEstado("ocupado")
        setFogonMensaje(`Este fogon esta ocupado. Fecha de salida: ${salida}`)
      } else {
        setFogonEstado("ok")
        setFogonMensaje(null)
      }
    } catch {
      setFogonMensaje(null)
      setFogonEstado(null)
    }
  }

  const abreviarServicio = (nombre: string) => {
    const n = nombre.toLowerCase()
    if (n === "agua") return "AG"
    if (n === "luz") return "LZ"
    if (n === "parrilla") return "PR"
    if (n === "internet") return "IN"
    return n.slice(0, 2).toUpperCase()
  }

  const cargarFogonesLista = async () => {
    try {
      const res = await fetch("/api/fogones/list")
      const data = await res.json()
      if (data.success && Array.isArray(data.fogones)) {
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

  const handleCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Reset input para permitir seleccionar la misma imagen de nuevo
    e.target.value = ""

    // Guardar la patente actual antes de iniciar deteccion
    const patenteAntes = formData.patente

    setIsDetecting(true)
    setDetectError(null)
    setResult(null)

    try {
      // Optimizar imagen en cliente (reduce de ~5MB a ~150KB)
      let optimized: File
      try {
        optimized = await optimizarImagen(file)
      } catch {
        optimized = file
      }

      // Subir con timeout de 30s
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)

      const formDataUpload = new FormData()
      formDataUpload.append("imagen", optimized)

      const res = await fetch("/api/scanner-image", {
        method: "POST",
        body: formDataUpload,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      const data = await res.json()

      if (data.patente) {
        // Solo completar si el usuario no escribio algo distinto mientras tanto
        const patenteActual = patenteRef.current?.value || ""
        if (!patenteActual || patenteActual === patenteAntes) {
          handleChange("patente", data.patente.toUpperCase())
          buscarIncidencias(data.patente)
          setDetectError(null)
          setTimeout(() => nombreRef.current?.focus(), 200)
        }
      } else {
        setDetectError(data.mensaje || "No se pudo detectar la patente.")
        if (!formData.patente) {
          patenteRef.current?.focus()
        }
      }
    } catch (err) {
      const msg = err instanceof DOMException && err.name === "AbortError"
        ? "Tiempo de espera agotado. Ingrese la patente manualmente."
        : "Error de conexion. Ingrese la patente manualmente."
      setDetectError(msg)
      if (!formData.patente) {
        patenteRef.current?.focus()
      }
    } finally {
      setIsDetecting(false)
    }
  }

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setResult(null)
    if (field === "patente") {
      buscarIncidencias(value)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (
      !formData.patente ||
      !formData.cantidadPersonas ||
      !formData.tipoEstadia ||
      !formData.fechaEntrada ||
      !formData.nombre
    ) {
      setResult({
        success: false,
        message:
          "Completa los campos obligatorios: Patente, Cantidad de personas, Tipo de estadia, Fecha de entrada y Nombre",
      })
      return
    }

    // Validar que cada pago tenga tipo y monto
    const pagosValidos = pagos.filter((p) => p.monto && parseFloat(p.monto) > 0)
    for (const p of pagosValidos) {
      if (!p.tipo) {
        setResult({
          success: false,
          message: "Cada abono debe tener seleccionado un tipo de ingreso (Efectivo, Transferencia o Debito)",
        })
        return
      }
    }

    setIsLoading(true)
    setResult(null)

    try {
      const body: Record<string, unknown> = {
        patente: formData.patente.toUpperCase(),
        cantidadPersonas: parseInt(formData.cantidadPersonas),
        tipoEstadia: formData.tipoEstadia,
        fechaEntrada: formData.fechaEntrada,
        nombre: formData.nombre,
      }

      // Optional fields
      if (formData.cantidadMenores) body.cantidadMenores = parseInt(formData.cantidadMenores)
      if (formData.dni) body.dni = formData.dni
      if (formData.fechaSalida) body.fechaSalida = formData.fechaSalida
      if (pagosValidos.length > 0) {
        body.pagos = pagosValidos.map((p) => ({
          tipo: p.tipo,
          monto: parseFloat(p.monto),
        }))
      }
      if (formData.observaciones) body.observaciones = formData.observaciones
      if (formData.numeroFogon) {
        const n = parseInt(formData.numeroFogon)
        if (!Number.isNaN(n)) body.numero_fogon = n
      }

      const res = await fetch("/api/reservas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (data.success || res.ok) {
        setResult({
          success: true,
          message: data.mensaje || "Reserva creada exitosamente",
        })
        setFormData({
          patente: "",
          dni: "",
          cantidadPersonas: "",
          cantidadMenores: "",
          tipoEstadia: "",
          fechaEntrada: hoy,
          fechaSalida: "",
          nombre: "",
          observaciones: "",
          numeroFogon: "",
        })
        setPagos([])
      } else {
        setResult({
          success: false,
          message: data.mensaje || data.message || "Error al crear la reserva",
        })
      }
    } catch (err) {
      setResult({
        success: false,
        message: "Error de conexion con el servidor",
      })
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex-1 overflow-auto pb-20">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <PlusCircle className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Crear Reserva</h2>
        </div>

        <Card className="p-4 bg-card border-border">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="patente" className="text-sm text-foreground">
                Patente <span className="text-destructive">*</span>
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="patente"
                  ref={patenteRef}
                  value={formData.patente}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase()
                    handleChange("patente", val)
                    setDetectError(null)
                    setVoiceError(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); nombreRef.current?.focus() }
                  }}
                  placeholder="Ej: ABC123 / AB123CD"
                  className="bg-muted border-border font-mono uppercase flex-1"
                  maxLength={10}
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleCameraCapture}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0 border-border"
                  disabled={isDetecting}
                  onClick={() => cameraInputRef.current?.click()}
                  title="Detectar patente con foto"
                >
                  {isDetecting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant={isListening ? "default" : "outline"}
                  size="icon"
                  className={cn(
                    "h-9 w-9 shrink-0 border-border select-none",
                    isListening && "bg-destructive hover:bg-destructive border-destructive text-destructive-foreground animate-pulse"
                  )}
                  disabled={isDetecting}
                  onClick={toggleVoiceRecognition}
                  title={isListening ? "Toque para detener" : "Toque para dictar la patente por voz"}
                  aria-label={isListening ? "Detener grabacion de voz" : "Dictar patente por voz"}
                >
                  {isListening ? (
                    <MicOff className="w-4 h-4" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </Button>
              </div>
              {isDetecting && (
                <p className="text-xs text-muted-foreground mt-1">Detectando patente...</p>
              )}
              {isListening && (
                <p className="text-xs text-muted-foreground mt-1 animate-pulse">Escuchando... Toque el microfono para detener.</p>
              )}
              {detectError && (
                <div className="flex items-start gap-1.5 mt-1">
                  <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                  <p className="text-xs text-destructive">{detectError} Ingrese manualmente.</p>
                </div>
              )}
              {voiceError && (
                <div className="flex items-start gap-1.5 mt-1">
                  <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                  <p className="text-xs text-destructive">{voiceError}</p>
                </div>
              )}
            </div>

            {/* Notificacion de incidencias */}
            {incidencias.length > 0 && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIncidenciasOpen(!incidenciasOpen)}
                  className="w-full flex items-center justify-between px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <TriangleAlert className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="text-xs font-medium text-amber-700">
                      {incidencias.length} incidencia{incidencias.length > 1 ? "s" : ""} registrada{incidencias.length > 1 ? "s" : ""}
                    </span>
                  </div>
                  {incidenciasOpen ? (
                    <ChevronUp className="w-4 h-4 text-amber-600" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-amber-600" />
                  )}
                </button>
                {incidenciasOpen && (
                  <div className="px-3 pb-2 space-y-2">
                    {incidencias.map((inc) => (
                      <div key={inc.id_incidencia} className="rounded-md bg-background/60 p-2 text-xs space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-medium text-foreground">{inc.patente}</span>
                          <span className="text-muted-foreground">
                            {inc.fecha ? (() => {
                              const d = new Date(inc.fecha)
                              return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`
                            })() : "-"}
                          </span>
                        </div>
                        <p className="text-foreground">{inc.descripcion}</p>
                        <p className="text-muted-foreground">Registrado por: {inc.nombre_empleado || "Desconocido"}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-1">
              <Label htmlFor="nombre" className="text-sm text-foreground">
                Nombre responsable <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nombre"
                ref={nombreRef}
                value={formData.nombre}
                onChange={(e) => handleChange("nombre", e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); dniRef.current?.focus() }
                }}
                placeholder="Nombre del titular"
                className="bg-muted border-border"
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="dni" className="text-sm text-foreground">
                DNI
              </Label>
              <Input
                id="dni"
                ref={dniRef}
                inputMode="numeric"
                pattern="[0-9]*"
                value={formData.dni}
                onChange={(e) => handleChange("dni", e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); cantidadRef.current?.focus() }
                }}
                placeholder="Ej: 12345678"
                className="bg-muted border-border"
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="cantidadPersonas" className="text-sm text-foreground">
                Cantidad de Personas <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cantidadPersonas"
                ref={cantidadRef}
                type="number"
                min="1"
                value={formData.cantidadPersonas}
                onChange={(e) => handleChange("cantidadPersonas", e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); cantidadMenoresRef.current?.focus() }
                }}
                placeholder="Ej: 4"
                className="bg-muted border-border"
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="cantidadMenores" className="text-sm text-foreground">
                Cantidad de Menores
              </Label>
              <Input
                id="cantidadMenores"
                ref={cantidadMenoresRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={formData.cantidadMenores}
                onChange={(e) => handleChange("cantidadMenores", e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    tipoEstadiaDefaultRef.current?.focus()
                    tipoEstadiaDefaultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
                  }
                }}
                placeholder="Ej: 2"
                className="bg-muted border-border"
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="tipoEstadiaInput" className="text-sm text-foreground">
                Tipo de Estadia <span className="text-destructive">*</span>
              </Label>
              {/* Input invisible que captura el foco nativo del "Siguiente" en movil */}
              <input
                id="tipoEstadiaInput"
                ref={tipoEstadiaDefaultRef}
                className="sr-only"
                tabIndex={0}
                aria-label="Tipo de Estadia"
                onFocus={() => {
                  tipoEstadiaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
                }}
              />
              <div ref={tipoEstadiaRef} className="flex gap-2">
                {[
                  { value: "dia", label: "Dia" },
                  { value: "acampe", label: "Acampe" },
                  { value: "tarde", label: "Tarde" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      handleChange("tipoEstadia", opt.value)
                      setTimeout(() => fechaEntradaRef.current?.focus(), 100)
                    }}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors border",
                      formData.tipoEstadia === opt.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted text-muted-foreground border-border hover:text-foreground"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Numero de Fogon (opcional) */}
            <div className="flex flex-col gap-1">
              <Label htmlFor="numeroFogon" className="text-sm text-foreground">
                Numero de Fogon
              </Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="numeroFogon"
                  value={formData.numeroFogon || ""}
                  onChange={(e) => {
                    handleChange("numeroFogon", e.target.value)
                  }}
                  onBlur={(e) => validarFogon(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      validarFogon(formData.numeroFogon || "")
                      fechaEntradaRef.current?.focus()
                    }
                  }}
                  placeholder="Ej: 12"
                  className="bg-muted border-border flex-1"
                  inputMode="numeric"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0 h-9"
                  onClick={async () => {
                    if (!fogonSelectorOpen) await cargarFogonesLista()
                    setFogonSelectorOpen(!fogonSelectorOpen)
                  }}
                >
                  seleccionar fogon
                </Button>
              </div>
              {formData.numeroFogon && (
                <div className="mt-1 flex items-center gap-2 text-xs">
                  <span className="px-2 py-1 rounded-md border bg-muted text-foreground">
                    #{formData.numeroFogon}
                  </span>
                  {fogonesLista
                    .find((f) => String(f.numero) === String(formData.numeroFogon))
                    ?.servicios.map((s, i) => (
                      <span
                        key={i}
                        className="px-1.5 py-0.5 rounded-md border text-muted-foreground"
                        title={s}
                      >
                        {abreviarServicio(s)}
                      </span>
                    ))}
                </div>
              )}
              {fogonSelectorOpen && fogonesLista.length > 0 && (
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {fogonesLista.map((f) => (
                    <button
                      key={f.numero}
                      type="button"
                      onClick={() => {
                        const val = String(f.numero)
                        handleChange("numeroFogon", val)
                        validarFogon(val)
                        setFogonSelectorOpen(false)
                        setTimeout(() => fechaEntradaRef.current?.focus(), 100)
                      }}
                      className={cn(
                        "w-full text-xs rounded-md border px-2 py-2 text-left transition-colors",
                        f.ocupado
                          ? "bg-amber-600/15 border-amber-600/30 text-amber-700"
                          : "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/20"
                      )}
                      title={
                        f.ocupado
                          ? `Fogon ${f.numero} ocupado`
                          : `Fogon ${f.numero} disponible`
                      }
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
              {/* Visual de fogones disponibles */}
              {fogonEstado && fogonMensaje && (
                <div
                  className={cn(
                    "mt-1 text-xs p-2 rounded-md border",
                    fogonEstado === "ocupado"
                      ? "bg-destructive/10 border-destructive/30 text-destructive"
                      : fogonEstado === "noexiste"
                      ? "bg-warning/10 border-warning/30 text-warning"
                      : "bg-primary/10 border-primary/30 text-primary"
                  )}
                >
                  {fogonMensaje}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="fechaEntrada" className="text-sm text-foreground">
                Fecha Entrada <span className="text-destructive">*</span>
              </Label>
              <Input
                id="fechaEntrada"
                ref={fechaEntradaRef}
                type="date"
                value={formData.fechaEntrada}
                onChange={(e) => handleChange("fechaEntrada", e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); fechaSalidaRef.current?.focus() }
                }}
                className="bg-muted border-border"
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="fechaSalida" className="text-sm text-foreground">
                Fecha Salida
              </Label>
              <Input
                id="fechaSalida"
                ref={fechaSalidaRef}
                type="date"
                value={formData.fechaSalida}
                onChange={(e) => handleChange("fechaSalida", e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); observacionesRef.current?.focus() }
                }}
                className="bg-muted border-border"
              />
            </div>

            {/* Seccion Abonos - pagos multiples */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-foreground">Abonos</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1 border-border"
                  onClick={agregarPago}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Agregar pago
                </Button>
              </div>

              {pagos.length === 0 && (
                <p className="text-xs text-muted-foreground">Sin abonos agregados.</p>
              )}

              {pagos.map((pago, index) => (
                <div key={index} className="flex flex-col gap-2 rounded-lg border border-border p-2">
                  <div className="flex gap-1.5">
                    {[
                      { value: "efectivo", label: "Efectivo" },
                      { value: "transferencia", label: "Transfer." },
                      { value: "debito", label: "Debito" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => actualizarPago(index, "tipo", opt.value)}
                        className={cn(
                          "flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-colors border",
                          pago.tipo === opt.value
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted text-muted-foreground border-border hover:text-foreground"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground shrink-0">$</span>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      step="0.01"
                      value={pago.monto}
                      onChange={(e) => actualizarPago(index, "monto", e.target.value)}
                      placeholder="0"
                      className="bg-muted border-border flex-1 min-w-0 h-8 text-sm"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => eliminarPago(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {pagos.length > 0 && (
                <div className="flex justify-end pt-1 border-t border-border">
                  <span className="text-sm font-medium text-foreground">
                    {"Total: $" + totalPagos.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="observaciones" className="text-sm text-foreground">
                Observaciones
              </Label>
              <Textarea
                id="observaciones"
                ref={observacionesRef}
                value={formData.observaciones}
                onChange={(e) => handleChange("observaciones", e.target.value)}
                placeholder="Notas adicionales..."
                className="bg-muted border-border min-h-[80px]"
              />
            </div>

            {result && (
              <div
                className={`p-3 rounded-lg flex items-center gap-2 ${result.success
                    ? "bg-primary/10 border border-primary/20"
                    : "bg-destructive/10 border border-destructive/20"
                  }`}
              >
                {result.success ? (
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                )}
                <p
                  className={`text-sm ${result.success ? "text-primary" : "text-destructive"
                    }`}
                >
                  {result.message}
                </p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 text-base font-semibold mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                "Crear Reserva"
              )}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
