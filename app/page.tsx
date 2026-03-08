"use client"

import { useState, useEffect } from "react"
import { MainApp } from "@/components/main-app"
import { LoginScreen } from "@/components/login-screen"

interface EmpleadoSesion {
  id_empleado: number
  nombre: string
  rol: "ADMIN" | "EMPLEADO"
}

export default function Page() {
  const [empleado, setEmpleado] = useState<EmpleadoSesion | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Verificar sesion activa al cargar
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch("/api/auth", { method: "GET" })
        const data = await res.json()

        if (data.success && data.empleado) {
          setEmpleado(data.empleado)
        }
      } catch {
        // Sin sesion activa
      } finally {
        setIsLoading(false)
      }
    }
    checkSession()
  }, [])

  const handleLogout = async () => {
    try {
      await fetch("/api/auth", { method: "DELETE" })
    } catch {
      // Ignorar error de red
    }
    setEmpleado(null)
  }

  const handleLoginSuccess = (emp: EmpleadoSesion) => {
    setEmpleado(emp)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!empleado) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />
  }

  return <MainApp empleado={empleado} onLogout={handleLogout} />
}
