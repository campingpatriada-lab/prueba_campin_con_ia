"use client"

import { useState } from "react"
import { ScannerApp } from "@/components/scanner-app"
import { BottomMenu, TabType } from "@/components/bottom-menu"
import { ReservasList } from "@/components/reservas-list"
import { CrearReserva } from "@/components/crear-reserva"
import { Busqueda } from "@/components/busqueda"
import { IngresosPanel } from "@/components/ingresos-panel"
import { AdminPanel } from "@/components/admin-panel"
import { Wifi, LogOut, Scan, List, PlusCircle, Search, DollarSign, Shield, User } from "lucide-react"

interface EmpleadoSesion {
  id_empleado: number
  nombre: string
  rol: "ADMIN" | "EMPLEADO"
}

interface MainAppProps {
  empleado: EmpleadoSesion
  onLogout: () => void
}

export function MainApp({ empleado, onLogout }: MainAppProps) {
  const [activeTab, setActiveTab] = useState<TabType>("scanner")

  const getHeaderTitle = () => {
    switch (activeTab) {
      case "scanner":
        return { icon: Scan, label: "Scanner" }
      case "reservas":
        return { icon: List, label: "Reservas" }
      case "crear":
        return { icon: PlusCircle, label: "Nueva Reserva" }
      case "busqueda":
        return { icon: Search, label: "Busqueda" }
      case "ingresos":
        return { icon: DollarSign, label: "Ingresos" }
      case "admin":
        return { icon: Shield, label: "Administracion" }
    }
  }

  const headerInfo = getHeaderTitle()
  const HeaderIcon = headerInfo.icon

  // Para el scanner, renderizamos el componente completo con espacio para el menu
  if (activeTab === "scanner") {
    return (
      <div className="h-dvh bg-background flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-hidden">
          <ScannerApp onLogout={onLogout} />
        </div>
        <BottomMenu activeTab={activeTab} onTabChange={setActiveTab} rol={empleado.rol} />
      </div>
    )
  }

  // Para las otras vistas, usamos el header comun
  return (
    <div className="h-dvh bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <HeaderIcon className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-foreground">{headerInfo.label}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{empleado.nombre}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
              empleado.rol === "ADMIN"
                ? "bg-primary/20 text-primary"
                : "bg-secondary text-muted-foreground"
            }`}>
              {empleado.rol}
            </span>
          </div>
          <button
            onClick={onLogout}
            className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
            title="Cerrar sesion"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Content - scrollable area between header and bottom menu */}
      <div className="flex-1 min-h-0 overflow-y-auto max-w-2xl mx-auto w-full">
        {activeTab === "reservas" && <ReservasList />}
        {activeTab === "crear" && <CrearReserva />}
        {activeTab === "busqueda" && <Busqueda />}
        {activeTab === "ingresos" && <IngresosPanel empleado={empleado} />}
        {activeTab === "admin" && empleado.rol === "ADMIN" && <AdminPanel />}
      </div>

      {/* Bottom Menu */}
      <BottomMenu activeTab={activeTab} onTabChange={setActiveTab} rol={empleado.rol} />
    </div>
  )
}
