"use client"

import React from "react"
import { useState, useRef } from "react"
import {
  Scan,
  CheckCircle2,
  XCircle,
  Loader2,
  Car,
  Clock,
  Hash,
  Database,
  Wifi,
  WifiOff,
  LogOut,
  Search,
  AlertTriangle,
  ServerOff,
  Camera,
  ImageIcon,
  LogOut as LogOutIcon,
  DollarSign,
  Trash2,
  Plus,
  ChevronDown,
  FileWarning,
  Check,
  X,
  RotateCcw,
  Cpu,
  Video,
  Mic,
  MicOff,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn, fechaHoyArgentina } from "@/lib/utils"
import { optimizarImagen } from "@/lib/optimizar-imagen"

function DataField({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("text-foreground font-medium", highlight && "text-destructive font-semibold")}>
        {value}
      </span>
    </div>
  )
}

interface ApiResponse {
  exito: boolean
  mensaje: string
  patente?: string
  data?: Record<string, unknown>
  intentos?: number
  tiempo?: number
  error?: string
}

type Status = "idle" | "loading" | "success" | "error" | "not-found" | "no-url"
type ScanMode = "select" | "auto" | "manual" | "photo" | "voice"

interface ScannerAppProps {
  onLogout: () => void
}

export function ScannerApp({ onLogout }: ScannerAppProps) {
  const [status, setStatus] = useState<Status>("idle")
  const [response, setResponse] = useState<ApiResponse | null>(null)
  const [isConnected, setIsConnected] = useState(true)
  const [manualPatente, setManualPatente] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [apiUrl, setApiUrl] = useState<string | null>(null)
  const [loadingConfig, setLoadingConfig] = useState(true)
  const [urlError, setUrlError] = useState<string | null>(null)
  const [scanMode, setScanMode] = useState<ScanMode>("select")
  
  // Estado para multiples resultados
  const [multipleResults, setMultipleResults] = useState<Record<string, unknown>[]>([])

  // Estado para confirmar fin de reserva
  const [showFinishConfirm, setShowFinishConfirm] = useState(false)
  const [finishingReservation, setFinishingReservation] = useState(false)
  const [finishResult, setFinishResult] = useState<{exito: boolean, mensaje: string} | null>(null)
  // Pagos nuevos a registrar (multiples)
  const [newPagos, setNewPagos] = useState<{ tipo: string; monto: string }[]>([])
  const [savingPago, setSavingPago] = useState(false)
  const [pagoResult, setPagoResult] = useState<{exito: boolean, mensaje: string} | null>(null)
  
  // Estado para incidencia
  const [showIncidenciaForm, setShowIncidenciaForm] = useState(false)
  const [incidenciaDesc, setIncidenciaDesc] = useState("")
  const [savingIncidencia, setSavingIncidencia] = useState(false)
  const [incidenciaResult, setIncidenciaResult] = useState<{exito: boolean, mensaje: string} | null>(null)

  const handleGuardarIncidencia = async () => {
    if (!incidenciaDesc.trim() || !response?.patente || !response?.data) return
    const d = response.data as any
    if (!d.id_estadia) return

    setSavingIncidencia(true)
    setIncidenciaResult(null)

    try {
      const res = await fetch("/api/incidencias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patente: response.patente,
          descripcion: incidenciaDesc.trim(),
          id_estadia: d.id_estadia,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setIncidenciaResult({ exito: true, mensaje: "Incidencia registrada" })
        setIncidenciaDesc("")
        setShowIncidenciaForm(false)
      } else {
        setIncidenciaResult({ exito: false, mensaje: data.message || "Error al guardar" })
      }
    } catch {
      setIncidenciaResult({ exito: false, mensaje: "Error de conexion" })
    } finally {
      setSavingIncidencia(false)
    }
  }

  // Estado para acciones de administracion del servidor
  const [adminAction, setAdminAction] = useState<{
    loading: string | null
    result: { exito: boolean; mensaje: string } | null
    confirm: string | null
  }>({ loading: null, result: null, confirm: null })

  const handleAdminAction = async (endpoint: string, label: string) => {
    if (!apiUrl) return
    setAdminAction({ loading: label, result: null, confirm: null })
    try {
      const res = await fetch(`${apiUrl}/${endpoint}`, { method: "POST" })
      const data = await res.json()
      if (data.exito) {
        setAdminAction({ loading: null, result: { exito: true, mensaje: data.mensaje }, confirm: null })
      } else {
        setAdminAction({ loading: null, result: { exito: false, mensaje: data.error || "Error desconocido" }, confirm: null })
      }
    } catch {
      setAdminAction({ loading: null, result: { exito: false, mensaje: "Error de conexion con el servidor" }, confirm: null })
    }
    setTimeout(() => setAdminAction((prev) => ({ ...prev, result: null })), 4000)
  }

  // Estado para busqueda por foto
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Estado para busqueda por voz
  const voiceRecognitionRef = useRef<any | null>(null)
  const [isVoiceListening, setIsVoiceListening] = useState(false)
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
  }

  const ejecutarBusquedaVoz = async (normalizada: string) => {
    if (!apiUrl) return
    setIsSearching(true)
    setResponse(null)
    setShowFinishConfirm(false)
    setFinishResult(null)
    try {
      const res = await fetch("/api/scanner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patente: normalizada }),
      })
      const data = await res.json()
      setIsConnected(true)
      if (data.exito === true) {
        if (data.multiple && data.resultados?.length > 1) {
          setMultipleResults(data.resultados)
          setResponse(data)
          setStatus("success")
        } else {
          setMultipleResults([])
          setResponse(data)
          setStatus("success")
          setShowFinishConfirm(true)
        }
      } else {
        setMultipleResults([])
        setStatus(data.mensaje === "Patente no encontrada" ? "not-found" : "error")
        setResponse({
          exito: false,
          mensaje: data.mensaje || "Error desconocido",
          patente: data.patente || normalizada,
          intentos: data.intentos,
          tiempo: data.tiempo,
          error: data.error || undefined,
        })
      }
      setManualPatente("")
    } catch (err) {
      setIsConnected(false)
      setStatus("error")
      setResponse({
        exito: false,
        mensaje: "No se pudo conectar con el servidor",
        error: err instanceof Error ? err.message : "Error desconocido",
      })
    } finally {
      setIsSearching(false)
    }
  }

  const toggleVoiceScanner = () => {
    if (isVoiceListening) {
      voiceRecognitionRef.current?.stop()
      setIsVoiceListening(false)
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
            setManualPatente(normalizada)
            voiceRecognitionRef.current?.stop()
            setIsVoiceListening(false)
            setVoiceError(null)
            setTimeout(() => ejecutarBusquedaVoz(normalizada), 100)
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
      setIsVoiceListening(false)
    }

    recognition.onend = () => {
      setIsVoiceListening(false)
    }

    voiceRecognitionRef.current = recognition
    recognition.start()
    setIsVoiceListening(true)
  }

  // Cargar URL de la API al iniciar
  React.useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch("/api/config")
        const data = await res.json()
        if (data.exito && data.url) {
          setApiUrl(data.url)
          setIsConnected(true)
          setUrlError(null)
        } else {
          setIsConnected(false)
          setUrlError(data.mensaje || "URL del servidor no configurada")
          setStatus("no-url")
        }
      } catch {
        setIsConnected(false)
        setUrlError("No se pudo cargar la configuración")
        setStatus("no-url")
      } finally {
        setLoadingConfig(false)
      }
    }
    fetchConfig()
  }, [])
  React.useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview)
      }
    }
  }, [imagePreview])
  const handleIniciar = async () => {
    if (!apiUrl) {
      setStatus("no-url")
      setResponse({
        exito: false,
        mensaje: "URL no configurada",
        error: "Debe iniciar el servidor primero.",
      })
      return
    }

    setStatus("loading")
    setResponse(null)
    setUrlError(null)
    setShowFinishConfirm(false)
    setFinishResult(null)

    try {
      const res = await fetch("/api/scanner", {
        method: "GET",
      })

      const data = await res.json()
      setResponse(data)
      setIsConnected(true)

      if (data.exito === true) {
        setStatus("success")
        // Mostrar opcion de finalizar reserva
        setShowFinishConfirm(true)
      } else if (data.exito === false) {
        if (data.patente && !data.data) {
          setStatus("not-found")
        } else {
          setStatus("error")
        }
        setResponse({
          exito: false,
          mensaje: data.mensaje || "Error desconocido",
          patente: data.patente,
          intentos: data.intentos,
          tiempo: data.tiempo,
          error: data.error || undefined,
        })
      } else {
        setStatus("error")
      }
    } catch (err) {
      setIsConnected(false)
      setStatus("error")
      const errorMessage = err instanceof Error ? err.message : "Error desconocido"
      setResponse({
        exito: false,
        mensaje: "No se pudo conectar con el servidor",
        error: `Verifica que la API esté corriendo. ${errorMessage}`,
      })
    }
  }

  const handleBuscarManual = async () => {
    if (!manualPatente.trim()) return

    if (!apiUrl) {
      setStatus("no-url")
      setResponse({
        exito: false,
        mensaje: "URL no configurada",
        error: "Debe iniciar el servidor primero.",
      })
      return
    }

    setIsSearching(true)
    setResponse(null)
    setUrlError(null)
    setShowFinishConfirm(false)
    setFinishResult(null)

    try {
      const patenteUpper = manualPatente.trim().toUpperCase()
      const res = await fetch("/api/scanner", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ patente: patenteUpper }),
      })

      const data = await res.json()
      setIsConnected(true)

      if (data.exito === true) {
        if (data.multiple && data.resultados?.length > 1) {
          // Multiples coincidencias: mostrar lista de seleccion
          setMultipleResults(data.resultados)
          setResponse(data)
          setStatus("success")
        } else {
          // Resultado unico
          setMultipleResults([])
          setResponse(data)
          setStatus("success")
          setShowFinishConfirm(true)
        }
      } else if (data.exito === false) {
        setMultipleResults([])
        if (data.mensaje === "Patente no encontrada") {
          setStatus("not-found")
        } else {
          setStatus("error")
        }
        setResponse({
          exito: false,
          mensaje: data.mensaje || "Error desconocido",
          patente: data.patente || patenteUpper,
          intentos: data.intentos,
          tiempo: data.tiempo,
          error: data.error || undefined,
        })
      } else {
        setMultipleResults([])
        setStatus("error")
      }
      setManualPatente("")
    } catch (err) {
      setIsConnected(false)
      setStatus("error")
      const errorMessage = err instanceof Error ? err.message : "Error desconocido"
      setResponse({
        exito: false,
        mensaje: "No se pudo conectar con el servidor",
        error: `Verifica que la API esté corriendo. ${errorMessage}`,
      })
    } finally {
      setIsSearching(false)
    }
  }

  // Optimiza la imagen en el cliente: redimensiona y comprime como JPEG
  // para reducir el tamanio de 5-10MB (HEIC celular) a ~200-500KB
  const optimizarImagen = (file: File, maxDimension = 1600, quality = 0.82): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        const img = new window.Image()
        img.crossOrigin = "anonymous"
        img.onload = () => {
          let { width, height } = img

          // Solo redimensionar si excede maxDimension
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width)
              width = maxDimension
            } else {
              width = Math.round((width * maxDimension) / height)
              height = maxDimension
            }
          }

          const canvas = document.createElement("canvas")
          canvas.width = width
          canvas.height = height

          const ctx = canvas.getContext("2d")
          if (!ctx) {
            reject(new Error("No se pudo crear el contexto del canvas"))
            return
          }
          ctx.drawImage(img, 0, 0, width, height)

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("No se pudo comprimir la imagen"))
                return
              }
              const optimizedFile = new File(
                [blob],
                file.name.replace(/\.[^/.]+$/, ".jpg"),
                { type: "image/jpeg" }
              )
              resolve(optimizedFile)
            },
            "image/jpeg",
            quality
          )
        }
        img.onerror = () => reject(new Error("Error al cargar la imagen"))
        img.src = event.target?.result as string
      }
      reader.onerror = () => reject(new Error("Error al leer el archivo"))
      reader.readAsDataURL(file)
    })
  }

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      // Optimizar imagen antes de guardarla
      const optimized = await optimizarImagen(file)
      setSelectedImage(optimized)
      const previewUrl = URL.createObjectURL(optimized)
      setImagePreview(previewUrl)
    } catch {
      // Si falla la optimizacion, usar original
      setSelectedImage(file)
      const previewUrl = URL.createObjectURL(file)
      setImagePreview(previewUrl)
    }
  }

  const handleBuscarPorFoto = async () => {
    if (!selectedImage) return

    if (!apiUrl) {
      setStatus("no-url")
      setResponse({
        exito: false,
        mensaje: "URL no configurada",
        error: "Debe iniciar el servidor primero.",
      })
      return
    }

    setStatus("loading")
    setResponse(null)
    setUrlError(null)
    setShowFinishConfirm(false)
    setFinishResult(null)

    try {
      const formData = new FormData()
      formData.append("imagen", selectedImage)

      const res = await fetch("/api/scanner-image", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()
      setResponse(data)
      setIsConnected(true)

      if (data.exito === true) {
        setStatus("success")
        // Mostrar opcion de finalizar reserva
        setShowFinishConfirm(true)
      } else if (data.exito === false) {
        // Si hay patente detectada pero sin reserva, o no se detecto patente
        if (data.patente && !data.data) {
          setStatus("not-found")
        } else if (data.patente === null) {
          // No se pudo detectar la patente en la imagen
          setStatus("error")
        } else {
          setStatus("error")
        }
        setResponse({
          exito: false,
          mensaje: data.mensaje || "Error desconocido",
          patente: data.patente,
          intentos: data.intentos,
          tiempo: data.tiempo,
          error: data.error || undefined,
        })
      } else {
        setStatus("error")
      }

      // Limpiar imagen seleccionada
      setSelectedImage(null)
      setImagePreview(null)
    } catch (err) {
      setIsConnected(false)
      setStatus("error")
      const errorMessage = err instanceof Error ? err.message : "Error desconocido"
      setResponse({
        exito: false,
        mensaje: "No se pudo conectar con el servidor",
        error: `Verifica que la API esté corriendo. ${errorMessage}`,
      })
    }
  }

  // Guardar pagos nuevos sin finalizar la reserva
  const handleGuardarPagos = async () => {
    if (!response?.data) return
    const d = response.data as any
    if (!d.id_estadia) return

    const pagosValidos = newPagos.filter((p) => Number(p.monto) > 0 && p.tipo)
    if (pagosValidos.length === 0) return

    setSavingPago(true)
    setPagoResult(null)

    try {
      for (const pago of pagosValidos) {
        await fetch("/api/ingresos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            concepto: `Abono estadia #${d.id_estadia}`,
            monto: Number(pago.monto),
            tipo_ingreso: pago.tipo,
            id_estadia: d.id_estadia,
            fecha: fechaHoyArgentina(),
          }),
        })
      }

      // Actualizar total_abonado en response.data para reflejar los pagos nuevos
      const nuevoTotal = pagosValidos.reduce((sum, p) => sum + Number(p.monto), 0)
      const totalAnterior = d.total_abonado != null ? Number(d.total_abonado) : 0
      const pagosAnteriores = d.pagos || []
      const nuevosPagosDetalle = pagosValidos.map((p) => ({ tipo: p.tipo, monto: Number(p.monto) }))
      setResponse({
        ...response,
        data: {
          ...d,
          total_abonado: totalAnterior + nuevoTotal,
          pagos: [...pagosAnteriores, ...nuevosPagosDetalle],
        },
      })
      setNewPagos([])
      setPagoResult({ exito: true, mensaje: `${pagosValidos.length} pago(s) registrado(s)` })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido"
      setPagoResult({ exito: false, mensaje: `Error: ${errorMessage}` })
    } finally {
      setSavingPago(false)
    }
  }

  const handleFinishReservation = async () => {
    if (!response?.patente) return

    setFinishingReservation(true)
    setFinishResult(null)

    try {
      // Guardar pagos pendientes si los hay
      const d = response.data as any
      const pagosValidos = newPagos.filter((p) => Number(p.monto) > 0 && p.tipo)
      if (pagosValidos.length > 0 && d?.id_estadia) {
        for (const pago of pagosValidos) {
          await fetch("/api/ingresos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              concepto: `Abono estadia #${d.id_estadia}`,
              monto: Number(pago.monto),
              tipo_ingreso: pago.tipo,
              id_estadia: d.id_estadia,
              fecha: fechaHoyArgentina(),
            }),
          })
        }
      }

      const res = await fetch("/api/cambiar-estado", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ patente: response.patente }),
      })

      const data = await res.json()

      if (data.exito && data.cambiado) {
        setFinishResult({ exito: true, mensaje: "Reserva finalizada correctamente" })
        setShowFinishConfirm(false)
        setNewPagos([])
      } else {
        setFinishResult({ exito: false, mensaje: data.error || data.mensaje || "Error al finalizar la reserva" })
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido"
      setFinishResult({ exito: false, mensaje: `Error de conexión: ${errorMessage}` })
    } finally {
      setFinishingReservation(false)
    }
  }

  const handleSelectEstadia = (estadia: Record<string, unknown>) => {
    setMultipleResults([])
    setResponse({
      exito: true,
      mensaje: "Patente encontrada",
      patente: String(estadia.patente || ""),
      data: estadia,
    })
    setShowFinishConfirm(true)
  }

  const resetScanner = () => {
    setStatus("idle")
    setResponse(null)
    setManualPatente("")
    setMultipleResults([])
    setUrlError(null)
    setScanMode("select")
    setShowFinishConfirm(false)
    setFinishResult(null)
    setNewPagos([])
    setPagoResult(null)
    setSelectedImage(null)
    setImagePreview(null)
    setShowIncidenciaForm(false)
    setIncidenciaDesc("")
    setIncidenciaResult(null)
    voiceRecognitionRef.current?.stop()
    setIsVoiceListening(false)
    setVoiceError(null)
  }

  // Loading inicial
  if (loadingConfig) {
    return (
      <div className="h-full bg-background flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground">Cargando configuración...</p>
      </div>
    )
  }

  return (
    <div className="h-full bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Scan className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-foreground">Tently</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {isConnected && apiUrl ? (
              <Wifi className="w-4 h-4 text-primary" />
            ) : (
              <WifiOff className="w-4 h-4 text-destructive" />
            )}
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {isConnected && apiUrl ? "Conectado" : "Sin conexion"}
            </span>
          </div>
          {/* Botones de administracion del servidor */}
          {apiUrl && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  if (adminAction.confirm === "app") {
                    handleAdminAction("reiniciarApp", "app")
                  } else {
                    setAdminAction({ loading: null, result: null, confirm: "app" })
                    setTimeout(() => setAdminAction((prev) => prev.confirm === "app" ? { ...prev, confirm: null } : prev), 3000)
                  }
                }}
                disabled={!!adminAction.loading}
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  adminAction.confirm === "app"
                    ? "bg-amber-500/20 text-amber-600 animate-pulse"
                    : "text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10"
                )}
                title={adminAction.confirm === "app" ? "Confirmar reinicio" : "Reiniciar aplicacion"}
              >
                {adminAction.loading === "app" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                onClick={() => handleAdminAction("liberarModelos", "modelos")}
                disabled={!!adminAction.loading}
                className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                title="Reiniciar modelos"
              >
                {adminAction.loading === "modelos" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Cpu className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                onClick={() => handleAdminAction("reiniciarCamara", "camara")}
                disabled={!!adminAction.loading}
                className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                title="Reiniciar camara"
              >
                {adminAction.loading === "camara" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Video className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          )}
          <button
            onClick={onLogout}
            className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
            title="Cerrar sesion"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Notificacion de accion admin */}
      {adminAction.result && (
        <div className={cn(
          "mx-4 mt-2 rounded-lg px-3 py-2 text-xs font-medium text-center transition-all",
          adminAction.result.exito
            ? "bg-primary/10 text-primary border border-primary/30"
            : "bg-destructive/10 text-destructive border border-destructive/30"
        )}>
          {adminAction.result.mensaje}
        </div>
      )}
      {adminAction.confirm === "app" && !adminAction.loading && (
        <div className="mx-4 mt-2 rounded-lg px-3 py-2 text-xs font-medium text-center bg-amber-500/10 text-amber-700 border border-amber-500/30">
          Presione nuevamente para confirmar el reinicio
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center p-4 gap-6 max-w-lg mx-auto w-full">
        {/* Status Display */}
        <div className="w-full max-w-sm">
          <StatusCard
            status={status}
            response={response}
            urlError={urlError}
            apiUrl={apiUrl}
            showFinishConfirm={showFinishConfirm}
            finishingReservation={finishingReservation}
            finishResult={finishResult}
            onFinishYes={handleFinishReservation}
            onFinishNo={() => setShowFinishConfirm(false)}
            newPagos={newPagos}
            onNewPagosChange={setNewPagos}
            onGuardarPagos={handleGuardarPagos}
            savingPago={savingPago}
            pagoResult={pagoResult}
            showIncidenciaForm={showIncidenciaForm}
            onToggleIncidencia={() => {
              setShowIncidenciaForm(!showIncidenciaForm)
              setIncidenciaResult(null)
            }}
            incidenciaDesc={incidenciaDesc}
            onIncidenciaDescChange={setIncidenciaDesc}
            onGuardarIncidencia={handleGuardarIncidencia}
            savingIncidencia={savingIncidencia}
            incidenciaResult={incidenciaResult}
            multipleResults={multipleResults}
            onSelectEstadia={handleSelectEstadia}
          />
        </div>

        {/* Action Buttons */}
        <div className="w-full max-w-sm flex flex-col gap-3">
          {status === "no-url" ? (
            <Card className="p-4 bg-card border-warning/50">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 rounded-full bg-warning/20 flex items-center justify-center">
                  <ServerOff className="w-8 h-8 text-warning" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Servidor no configurado</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Debe configurar la URL del servidor para usar el escaner.
                  </p>
                </div>
                <Button
                  onClick={async () => {
                    setLoadingConfig(true)
                    try {
                      const res = await fetch("/api/config")
                      const data = await res.json()
                      if (data.exito && data.url) {
                        setApiUrl(data.url)
                        setIsConnected(true)
                        setUrlError(null)
                        setStatus("idle")
                      } else {
                        setUrlError(data.mensaje || "URL aún no configurada")
                      }
                    } catch {
                      setUrlError("Error al recargar configuración")
                    } finally {
                      setLoadingConfig(false)
                    }
                  }}
                  variant="secondary"
                  className="w-full"
                >
                  Reintentar
                </Button>
              </div>
            </Card>
          ) : status === "idle" || status === "loading" ? (
            <>
              {/* Mode Selection */}
              {scanMode === "select" && status === "idle" && (
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-muted-foreground text-center mb-2">
                    Seleccione el método de búsqueda
                  </p>
                  <Button
                    onClick={() => setScanMode("auto")}
                    disabled={!apiUrl}
                    className="w-full h-14 text-base font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground transition-all active:scale-[0.98]"
                  >
                    <Scan className="w-5 h-5 mr-2" />
                    Escanear Patente
                  </Button>
                  <Button
                    onClick={() => setScanMode("manual")}
                    disabled={!apiUrl}
                    variant="secondary"
                    className="w-full h-14 text-base font-semibold rounded-xl transition-all active:scale-[0.98]"
                  >
                    <Search className="w-5 h-5 mr-2" />
                    Ingresar Manualmente
                  </Button>
                  <Button
                    onClick={() => setScanMode("photo")}
                    disabled={!apiUrl}
                    variant="secondary"
                    className="w-full h-14 text-base font-semibold rounded-xl transition-all active:scale-[0.98]"
                  >
                    <Camera className="w-5 h-5 mr-2" />
                    Buscar por Foto
                  </Button>
                  <Button
                    onClick={() => { setScanMode("voice"); setVoiceError(null) }}
                    disabled={!apiUrl}
                    variant="secondary"
                    className="w-full h-14 text-base font-semibold rounded-xl transition-all active:scale-[0.98]"
                  >
                    <Mic className="w-5 h-5 mr-2" />
                    Buscar por Voz
                  </Button>
                </div>
              )}

              {/* Auto Scan Mode */}
              {scanMode === "auto" && (
                <div className="flex flex-col gap-3">
                  <Button
                    onClick={handleIniciar}
                    disabled={status === "loading" || !apiUrl}
                    className="w-full h-16 text-lg font-semibold rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground transition-all active:scale-[0.98]"
                  >
                    {status === "loading" ? (
                      <span className="flex items-center gap-3">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        Escaneando...
                      </span>
                    ) : (
                      <span className="flex items-center gap-3">
                        <Scan className="w-6 h-6" />
                        Iniciar Escaneo
                      </span>
                    )}
                  </Button>
                  <button
                    onClick={() => setScanMode("select")}
                    disabled={status === "loading"}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2 disabled:opacity-50"
                  >
                    Volver a opciones
                  </button>
                </div>
              )}

              {/* Manual Mode */}
              {scanMode === "manual" && (
                <Card className="p-4 bg-card border-border">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Search className="w-4 h-4" />
                      <span>Ingrese la patente</span>
                    </div>
                    <Input
                      value={manualPatente}
                      onChange={(e) => setManualPatente(e.target.value.toUpperCase())}
                      placeholder="Ej: ABC123"
                      className="text-center text-lg font-mono tracking-wider uppercase bg-muted border-border"
                      maxLength={10}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleBuscarManual()
                      }}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          setScanMode("select")
                          setManualPatente("")
                        }}
                        variant="outline"
                        className="flex-1"
                      >
                        Volver
                      </Button>
                      <Button
                        onClick={handleBuscarManual}
                        disabled={!manualPatente.trim() || isSearching}
                        className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        {isSearching ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Buscar"
                        )}
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

              {/* Photo Mode */}
              {scanMode === "photo" && (
                <Card className="p-4 bg-card border-border">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Camera className="w-4 h-4" />
                      <span>Buscar por foto de patente</span>
                    </div>

                    {/* Image Preview */}
                    {imagePreview ? (
                      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-muted">
                        <img
                          src={imagePreview || "/placeholder.svg"}
                          alt="Vista previa de la patente"
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => {
                            setSelectedImage(null)
                            setImagePreview(null)
                          }}
                          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-foreground hover:bg-background transition-colors"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {/* Hidden file input */}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageSelect}
                          className="hidden"
                        />
                        
                        {/* Camera button - opens camera on mobile */}
                        <Button
                          onClick={() => {
                            if (fileInputRef.current) {
                              fileInputRef.current.setAttribute("capture", "environment")
                              fileInputRef.current.click()
                            }
                          }}
                          variant="secondary"
                          className="w-full h-14 text-base font-semibold rounded-xl transition-all active:scale-[0.98]"
                        >
                          <Camera className="w-5 h-5 mr-2" />
                          Tomar Foto
                        </Button>
                        
                        {/* Gallery button */}
                        <Button
                          onClick={() => {
                            if (fileInputRef.current) {
                              fileInputRef.current.removeAttribute("capture")
                              fileInputRef.current.click()
                            }
                          }}
                          variant="outline"
                          className="w-full h-14 text-base font-semibold rounded-xl transition-all active:scale-[0.98]"
                        >
                          <ImageIcon className="w-5 h-5 mr-2" />
                          Seleccionar de Galeria
                        </Button>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          setScanMode("select")
                          setSelectedImage(null)
                          setImagePreview(null)
                        }}
                        variant="outline"
                        className="flex-1"
                        disabled={status === "loading"}
                      >
                        Volver
                      </Button>
                      {imagePreview && (
                        <Button
                          onClick={handleBuscarPorFoto}
                          disabled={!selectedImage || status === "loading"}
                          className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                        >
                          {status === "loading" ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            "Buscar Patente"
                          )}
                        </Button>
                      )}
                    </div>
                                    </div>
                </Card>
              )}

              {/* Voice Mode */}
              {scanMode === "voice" && (
                <Card className="p-4 bg-card border-border">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mic className="w-4 h-4" />
                      <span>Buscar por voz</span>
                    </div>

                    {/* Big mic button */}
                    <div className="flex flex-col items-center gap-3 py-2">
                      <button
                        onClick={toggleVoiceScanner}
                        disabled={isSearching}
                        className={cn(
                          "w-24 h-24 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-md",
                          isVoiceListening
                            ? "bg-destructive text-destructive-foreground animate-pulse"
                            : "bg-primary text-primary-foreground hover:bg-primary/90"
                        )}
                        aria-label={isVoiceListening ? "Detener grabacion" : "Iniciar grabacion por voz"}
                      >
                        {isSearching ? (
                          <Loader2 className="w-10 h-10 animate-spin" />
                        ) : isVoiceListening ? (
                          <MicOff className="w-10 h-10" />
                        ) : (
                          <Mic className="w-10 h-10" />
                        )}
                      </button>
                      <p className={cn(
                        "text-sm text-center",
                        isVoiceListening ? "text-destructive animate-pulse font-medium" : "text-muted-foreground"
                      )}>
                        {isSearching
                          ? "Buscando..."
                          : isVoiceListening
                          ? "Escuchando... Toque para detener"
                          : "Toque para dictar la patente"}
                      </p>
                    </div>

                    {/* Patente detectada */}
                    {manualPatente && !isSearching && (
                      <div className="flex items-center justify-between bg-muted rounded-lg px-3 py-2">
                        <span className="text-xs text-muted-foreground">Detectada:</span>
                        <span className="font-mono font-semibold text-foreground tracking-wider">{manualPatente}</span>
                      </div>
                    )}

                    {/* Error de voz */}
                    {voiceError && (
                      <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>{voiceError}</span>
                      </div>
                    )}

                    <button
                      onClick={() => {
                        voiceRecognitionRef.current?.stop()
                        setIsVoiceListening(false)
                        setVoiceError(null)
                        setManualPatente("")
                        setScanMode("select")
                      }}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
                    >
                      Volver a opciones
                    </button>
                  </div>
                </Card>
              )}
            </>


          ) : (
            <div className="flex flex-col gap-3">
              <Button
                onClick={resetScanner}
                variant="secondary"
                className="w-full h-14 text-base font-semibold rounded-xl transition-all active:scale-[0.98]"
              >
                Nueva Búsqueda
              </Button>
            </div>
          )}
        </div>
      </main>


    </div>
  )
}

function ObservacionesField({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  const MAX_LEN = 50
  const isLong = text.length > MAX_LEN

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground shrink-0">Observaciones</span>
        <span className="text-foreground font-medium text-right break-words max-w-[60%]">
          {isLong && !expanded ? text.slice(0, MAX_LEN) + "..." : text}
        </span>
      </div>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-primary hover:underline self-end"
        >
          {expanded ? "Ver menos" : "Ver completo"}
        </button>
      )}
    </div>
  )
}

function StatusCard({
  status,
  response,
  urlError,
  apiUrl,
  showFinishConfirm,
  finishingReservation,
  finishResult,
  onFinishYes,
  onFinishNo,
  newPagos,
  onNewPagosChange,
  onGuardarPagos,
  savingPago,
  pagoResult,
  showIncidenciaForm,
  onToggleIncidencia,
  incidenciaDesc,
  onIncidenciaDescChange,
  onGuardarIncidencia,
  savingIncidencia,
  incidenciaResult,
  multipleResults,
  onSelectEstadia,
}: {
  status: Status
  response: ApiResponse | null
  urlError: string | null
  apiUrl: string | null
  showFinishConfirm: boolean
  finishingReservation: boolean
  finishResult: {exito: boolean, mensaje: string} | null
  onFinishYes: () => void
  onFinishNo: () => void
  newPagos: { tipo: string; monto: string }[]
  onNewPagosChange: (pagos: { tipo: string; monto: string }[]) => void
  onGuardarPagos: () => void
  savingPago: boolean
  pagoResult: {exito: boolean, mensaje: string} | null
  showIncidenciaForm: boolean
  onToggleIncidencia: () => void
  incidenciaDesc: string
  onIncidenciaDescChange: (desc: string) => void
  onGuardarIncidencia: () => void
  savingIncidencia: boolean
  incidenciaResult: {exito: boolean, mensaje: string} | null
  multipleResults: Record<string, unknown>[]
  onSelectEstadia: (estadia: Record<string, unknown>) => void
}) {
  if (status === "no-url") {
    return (
      <Card className="p-6 bg-card border-warning/50">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-20 h-20 rounded-full bg-warning/20 flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-warning" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Iniciar el servidor
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {urlError || "Configure la URL del servidor para continuar"}
            </p>
          </div>
        </div>
      </Card>
    )
  }

  if (status === "idle") {
    return (
      <Card className="p-6 bg-card border-border">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
            <Car className="w-10 h-10 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Listo para buscar
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Seleccione cómo desea buscar la patente
            </p>
          </div>
        </div>
      </Card>
    )
  }

  if (status === "loading") {
    return (
      <Card className="p-6 bg-card border-border">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
            <Scan className="w-10 h-10 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Buscando patente...
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Por favor espere
            </p>
          </div>
        </div>
      </Card>
    )
  }

  if (status === "success" && response && multipleResults.length > 0) {
    return (
      <Card className="p-6 bg-card border-primary/50">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <Search className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {multipleResults.length} estadias encontradas
              </h2>
              <p className="text-sm text-muted-foreground">Seleccione una para continuar</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
            {multipleResults.map((est, idx) => {
              const d = est as any
              const fechaEntrada = d.fecha_entrada
                ? (() => {
                    const dt = new Date(d.fecha_entrada)
                    return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`
                  })()
                : "---"
              return (
                <button
                  key={d.id_estadia || idx}
                  type="button"
                  onClick={() => onSelectEstadia(est)}
                  className="w-full text-left rounded-lg border border-border p-3 hover:border-primary/50 hover:bg-primary/5 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold uppercase text-foreground">
                      {d.patente || "---"}
                    </span>
                    <span className="text-xs text-muted-foreground capitalize px-2 py-0.5 rounded-full bg-muted">
                      {d.tipo_estadia || "---"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">
                      {d.nombre_responsable || "Sin nombre"}
                    </span>
                    <span className="text-xs text-muted-foreground">{fechaEntrada}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </Card>
    )
  }

  if (status === "success" && response) {
    return (
      <Card className="p-6 bg-card border-primary/50">
        <div className="flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Reserva Encontrada
              </h2>
              <p className="text-sm text-muted-foreground">{response.mensaje}</p>
            </div>
          </div>

          {/* Hora ingreso + Patente */}
          <div className="bg-muted rounded-xl p-4 text-center">
            {response.data && (response.data as any).hora_ingreso && (
              <p className="text-xs font-medium text-muted-foreground tabular-nums mb-1">
                {(response.data as any).hora_ingreso}
              </p>
            )}
            <p className="text-3xl font-mono font-bold text-foreground tracking-wider">
              {response.patente}
            </p>
          </div>

          {/* Stats */}
          {(response.intentos || response.tiempo) && (
            <div className="grid grid-cols-2 gap-3">
              <StatItem
                icon={<Hash className="w-4 h-4" />}
                label="Intentos"
                value={String(response.intentos || 0)}
              />
              <StatItem
                icon={<Clock className="w-4 h-4" />}
                label="Tiempo"
                value={`${response.tiempo || 0}s`}
              />
            </div>
          )}

          {/* Data - Orden: nombre, DNI, personas, entrada, salida, abono, estado, tipo estadia, cantidad dias */}
          {response.data && (() => {
            const d = response.data as any
            const monto = d.total_abonado != null ? Number(d.total_abonado) : (d.ingreso_monto != null ? Number(d.ingreso_monto) : 0)
            const abonoText = monto === 0 ? "SIN pagar" : `$${monto.toLocaleString("es-AR")}`
            const tipoEstadia = d.tipo_estadia ? String(d.tipo_estadia).toLowerCase() : ""

            // Calcular fecha argentina actual
            const hoyArgStr = new Date().toLocaleDateString("en-CA", { timeZone: "America/Buenos_Aires" })
            const hoyArg = new Date(hoyArgStr + "T12:00:00")

            // Verificar si la fecha de salida se paso
            let salidaVencida = false
            let diasPasados = 0
            const fechaSalidaStr = d.fecha_salida ? String(d.fecha_salida).split("T")[0] : null
            if (fechaSalidaStr) {
              const fechaSalida = new Date(fechaSalidaStr + "T12:00:00")
              if (fechaSalida < hoyArg) {
                salidaVencida = true
                diasPasados = Math.ceil((hoyArg.getTime() - fechaSalida.getTime()) / (1000 * 60 * 60 * 24))
              }
            }

            // Calcular cantidad de dias
            let cantidadDias = "---"
            if (tipoEstadia === "acampe") {
              const fechaEntradaStr = d.fecha_entrada ? String(d.fecha_entrada).split("T")[0] : null
              if (fechaEntradaStr) {
                const fechaEntrada = new Date(fechaEntradaStr + "T12:00:00")
                if (fechaSalidaStr) {
                  const fechaSalida = new Date(fechaSalidaStr + "T12:00:00")
                  const diff = Math.ceil((fechaSalida.getTime() - fechaEntrada.getTime()) / (1000 * 60 * 60 * 24))
                  cantidadDias = String(Math.max(diff, 0))
                } else {
                  const diff = Math.ceil((hoyArg.getTime() - fechaEntrada.getTime()) / (1000 * 60 * 60 * 24))
                  cantidadDias = String(Math.max(diff, 0))
                }
              }
            }

            return (
              <div className="bg-muted rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">
                      Datos de la reserva
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={onToggleIncidencia}
                    className={cn(
                      "p-1.5 rounded-md transition-colors",
                      showIncidenciaForm
                        ? "bg-amber-500/20 text-amber-600"
                        : "text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10"
                    )}
                    title="Registrar incidencia"
                  >
                    <FileWarning className="w-4 h-4" />
                  </button>
                </div>

                {/* Incidencia inline form */}
                {showIncidenciaForm && (
                  <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5 space-y-2">
                    <p className="text-xs font-medium text-amber-700">Registrar incidencia</p>
                    <textarea
                      value={incidenciaDesc}
                      onChange={(e) => onIncidenciaDescChange(e.target.value)}
                      placeholder="Descripcion de la incidencia..."
                      rows={2}
                      className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                    />
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={onToggleIncidencia}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={onGuardarIncidencia}
                        disabled={savingIncidencia || !incidenciaDesc.trim()}
                        className="p-1.5 rounded-md text-primary hover:bg-primary/10 transition-colors disabled:opacity-40"
                      >
                        {savingIncidencia ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Incidencia result */}
                {incidenciaResult && (
                  <div className={cn(
                    "mb-3 rounded-lg p-2 text-center text-xs font-medium",
                    incidenciaResult.exito
                      ? "bg-primary/10 text-primary border border-primary/30"
                      : "bg-destructive/10 text-destructive border border-destructive/30"
                  )}>
                    {incidenciaResult.mensaje}
                  </div>
                )}
                <div className="space-y-2">
                  <DataField label="Nombre" value={String(d.nombre_responsable || "---")} />
                  <DataField label="DNI" value={String(d.dni_responsable || "---")} />
                  <DataField label="Personas" value={String(d.cantidad_personas || "---")} />
                  <DataField label="Menores" value={d.cantidad_menores != null ? String(d.cantidad_menores) : "0"} />
                  <DataField label="Entrada" value={d.fecha_entrada ? String(d.fecha_entrada).split("T")[0] : "---"} />
                  <DataField label="Salida" value={fechaSalidaStr || "---"} />
                  {salidaVencida && (
                    <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 rounded-lg p-2">
                      <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                      <span className="text-xs text-destructive font-medium">
                        Se paso de la fecha de salida por {diasPasados} dia{diasPasados !== 1 ? "s" : ""}
                      </span>
                    </div>
                  )}
                  {/* Abono con detalle de pagos */}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Abono</span>
                    <span className={cn("font-medium", monto === 0 ? "text-destructive font-semibold" : "text-foreground")}>
                      {abonoText}
                    </span>
                  </div>
                  {d.pagos && d.pagos.length > 0 && (
                    <div className="ml-2 pl-2 border-l-2 border-border space-y-1">
                      {d.pagos.map((p: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-xs text-muted-foreground">
                          <span className="capitalize">{p.tipo}</span>
                          <span className="text-foreground">${Number(p.monto).toLocaleString("es-AR")}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <DataField label="Estado" value={d.estado === 1 ? "Activa" : "Finalizada"} />
                  <DataField label="Tipo estadia" value={d.tipo_estadia ? String(d.tipo_estadia) : "---"} />
                  <DataField label="Empleado" value={String(d.nombre_empleado || "---")} />
                  <DataField label="Cantidad de dias" value={cantidadDias} />
                  {d.observaciones ? (
                    <ObservacionesField text={String(d.observaciones)} />
                  ) : (
                    <DataField label="Observaciones" value="--" />
                  )}
                </div>
              </div>
            )
          })()}

          {/* Finish Result */}
          {finishResult && (
            <div className={cn(
              "rounded-xl p-4 text-center",
              finishResult.exito 
                ? "bg-primary/10 border border-primary/30" 
                : "bg-destructive/10 border border-destructive/30"
            )}>
              {finishResult.exito ? (
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium text-primary">{finishResult.mensaje}</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <XCircle className="w-5 h-5 text-destructive" />
                  <span className="text-sm font-medium text-destructive">{finishResult.mensaje}</span>
                </div>
              )}
            </div>
          )}

          {/* Registrar pago */}
          {showFinishConfirm && !finishResult && (
            <div className="bg-muted rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    Registrar pago
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs text-primary"
                  onClick={() => onNewPagosChange([...newPagos, { tipo: "efectivo", monto: "" }])}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Agregar
                </Button>
              </div>

              {newPagos.length === 0 && (
                <p className="text-xs text-muted-foreground italic py-2 text-center">
                  Presione "Agregar" para registrar un pago
                </p>
              )}

              <div className="flex flex-col gap-2">
                {newPagos.map((pago, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Select
                      value={pago.tipo}
                      onValueChange={(v) => {
                        const updated = [...newPagos]
                        updated[idx] = { ...updated[idx], tipo: v }
                        onNewPagosChange(updated)
                      }}
                    >
                      <SelectTrigger className="bg-background text-xs w-[120px] h-8">
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
                        const updated = [...newPagos]
                        updated[idx] = { ...updated[idx], monto: e.target.value }
                        onNewPagosChange(updated)
                      }}
                      className="bg-background text-sm h-8 flex-1"
                      placeholder="$0"
                      min="0"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        const updated = newPagos.filter((_, i) => i !== idx)
                        onNewPagosChange(updated)
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>

              {newPagos.length > 0 && (
                <Button
                  onClick={onGuardarPagos}
                  disabled={savingPago || newPagos.every((p) => !p.monto || Number(p.monto) <= 0)}
                  className="w-full mt-3 bg-primary hover:bg-primary/90 text-primary-foreground"
                  size="sm"
                >
                  {savingPago ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <DollarSign className="w-4 h-4 mr-2" />
                  )}
                  Guardar pago(s)
                </Button>
              )}

              {pagoResult && (
                <div className={cn(
                  "mt-2 rounded-lg p-2 text-center text-xs font-medium",
                  pagoResult.exito
                    ? "bg-primary/10 text-primary border border-primary/30"
                    : "bg-destructive/10 text-destructive border border-destructive/30"
                )}>
                  {pagoResult.mensaje}
                </div>
              )}
            </div>
          )}

          {/* Finalizar reserva */}
          {showFinishConfirm && !finishResult && (
            <div className="bg-muted rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <LogOutIcon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">
                  Finalizar reserva
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-4 text-center">
                ¿Desea marcar esta reserva como finalizada?
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={onFinishNo}
                  variant="outline"
                  className="flex-1 bg-transparent"
                  disabled={finishingReservation}
                >
                  No
                </Button>
                <Button
                  onClick={onFinishYes}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                  disabled={finishingReservation}
                >
                  {finishingReservation ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Si, finalizar"
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    )
  }

  if (status === "not-found" && response) {
    return (
      <Card className="p-6 bg-card border-warning/50">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-warning/20 flex items-center justify-center">
              <XCircle className="w-6 h-6 text-warning" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                No Encontrada
              </h2>
              <p className="text-sm text-muted-foreground">{response.mensaje}</p>
            </div>
          </div>

          {response.patente && (
            <div className="bg-muted rounded-xl p-4 text-center">
              <p className="text-3xl font-mono font-bold text-foreground tracking-wider">
                {response.patente}
              </p>
            </div>
          )}

          {response.intentos && (
            <div className="flex justify-center">
              <StatItem
                icon={<Hash className="w-4 h-4" />}
                label="Intentos"
                value={String(response.intentos || 0)}
              />
            </div>
          )}
        </div>
      </Card>
    )
  }

  if (status === "error" && response) {
    return (
      <Card className="p-6 bg-card border-destructive/50">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center">
            <XCircle className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Error</h2>
            <p className="text-sm text-muted-foreground mt-1">{response.mensaje}</p>
            {response.error && (
              <p className="text-xs text-destructive mt-2 break-words">
                {response.error}
              </p>
            )}
          </div>
        </div>
      </Card>
    )
  }

  return null
}

function StatItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className={cn("bg-muted rounded-lg p-3 flex items-center gap-3")}>
      <div className="text-muted-foreground">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-foreground">{value}</p>
      </div>
    </div>
  )
}
