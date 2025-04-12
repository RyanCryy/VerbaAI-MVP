"use client"

import { useState } from "react"
import type { SummaryMode } from "@/actions/summarize"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ChevronDown } from "lucide-react"

interface SummaryModeSelectorProps {
  value: SummaryMode
  onChange: (value: SummaryMode) => void
  disabled?: boolean
}

export function SummaryModeSelector({ value, onChange, disabled = false }: SummaryModeSelectorProps) {
  const [open, setOpen] = useState(false)

  const modes = [
    { value: "tldr" as const, label: "TL;DR", icon: "🧠" },
    { value: "executive" as const, label: "Executive Summary", icon: "💼" },
    { value: "notes" as const, label: "Study Notes", icon: "📚" },
    { value: "bullets" as const, label: "Bullet Points", icon: "🗒️" },
    { value: "actions" as const, label: "Action Items", icon: "🎯" },
  ]

  const selectedMode = modes.find((mode) => mode.value === value) || modes[0]

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
        >
          <span className="flex items-center">
            <span className="mr-2">{selectedMode.icon}</span>
            {selectedMode.label}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-full min-w-[200px] bg-slate-800 border-slate-700">
        {modes.map((mode) => (
          <DropdownMenuItem
            key={mode.value}
            onClick={() => {
              onChange(mode.value)
              setOpen(false)
            }}
            className={`flex items-center ${
              value === mode.value ? "bg-emerald-500/20 text-emerald-400" : "text-slate-300"
            } hover:bg-slate-700 hover:text-white cursor-pointer`}
          >
            <span className="mr-2">{mode.icon}</span>
            {mode.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
