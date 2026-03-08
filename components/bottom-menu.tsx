"use client"

import { List, PlusCircle, Search, Scan, DollarSign, Shield } from "lucide-react"
import { cn } from "@/lib/utils"

export type TabType = "scanner" | "reservas" | "crear" | "busqueda" | "ingresos" | "admin"

interface BottomMenuProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  rol: "ADMIN" | "EMPLEADO"
}

export function BottomMenu({ activeTab, onTabChange, rol }: BottomMenuProps) {
  const tabs = [
    { id: "scanner" as TabType, label: "Scanner", icon: Scan },
    { id: "reservas" as TabType, label: "Reservas", icon: List },
    { id: "crear" as TabType, label: "Crear", icon: PlusCircle },
    { id: "busqueda" as TabType, label: "Buscar", icon: Search },
    { id: "ingresos" as TabType, label: "Ingresos", icon: DollarSign },
    ...(rol === "ADMIN"
      ? [{ id: "admin" as TabType, label: "Admin", icon: Shield }]
      : []),
  ]

  return (
    <nav className="shrink-0 bg-card/95 backdrop-blur-sm border-t border-border safe-area-bottom z-50">
      <div className="flex items-center justify-around h-16 max-w-2xl mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("w-5 h-5 md:w-4 md:h-4", isActive && "text-primary")} />
              <span className={cn("text-[10px] md:text-xs font-medium", isActive && "text-primary")}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
