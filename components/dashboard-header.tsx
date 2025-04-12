"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { FileText, Home } from "lucide-react"

export default function DashboardHeader() {
  const pathname = usePathname()

  const navigation = [
    { name: "Home", href: "/", icon: Home },
    { name: "Transcriptions", href: "/transcriptions", icon: FileText },
  ]

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <span className="text-xl font-bold text-white">
                Voice<span className="text-emerald-400">Script</span>
              </span>
            </Link>
            <nav className="ml-10 hidden md:flex items-center space-x-4">
              {navigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`px-3 py-2 rounded-md text-sm font-medium flex items-center ${
                      isActive ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <item.icon className="h-4 w-4 mr-2" />
                    {item.name}
                  </Link>
                )
              })}
            </nav>
          </div>

          <div className="flex items-center">
            <Button asChild variant="default" size="sm" className="mr-4 bg-emerald-500 hover:bg-emerald-600">
              <Link href="/transcribe">New Transcription</Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
