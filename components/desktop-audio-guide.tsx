"use client"

import { useState, useEffect } from "react"
import { getOperatingSystem } from "./desktop-audio-capture"
import { AlertTriangle, Info, CheckCircle2 } from "lucide-react"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"

export default function DesktopAudioGuide() {
  const [os, setOs] = useState<"windows" | "macos" | "linux" | "unknown">("unknown")

  useEffect(() => {
    setOs(getOperatingSystem())
  }, [])

  return (
    <div className="space-y-4">
      <Alert variant="default" className="bg-slate-800 border-slate-700">
        <Info className="h-4 w-4 text-emerald-400" />
        <AlertTitle className="text-white">Desktop Application Audio Capture</AlertTitle>
        <AlertDescription className="text-slate-300">
          {os === "windows" ? (
            <div className="space-y-2">
              <p>To capture audio from applications like Spotify on Windows:</p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>
                  When the screen sharing dialog appears, select the <strong>specific application window</strong> (e.g.,
                  Spotify)
                </li>
                <li>
                  Make sure to check <strong>"Share audio"</strong> in the dialog
                </li>
                <li>For some applications, you may need to run Chrome/Edge as administrator</li>
                <li>Make sure the application is actively playing audio</li>
              </ol>
            </div>
          ) : os === "macos" ? (
            <div className="space-y-2">
              <p className="flex items-center">
                <AlertTriangle className="h-4 w-4 text-amber-400 mr-1" />
                <span>macOS has limited support for capturing application audio directly.</span>
              </p>
              <p>Possible workarounds:</p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>Use browser tabs instead of desktop applications when possible</li>
                <li>Install audio routing software like BlackHole or Loopback</li>
                <li>Use the microphone option to capture audio playing through speakers</li>
              </ol>
            </div>
          ) : (
            <p>Your operating system may have limited support for capturing application audio.</p>
          )}
        </AlertDescription>
      </Alert>

      {os === "windows" && (
        <Alert className="bg-emerald-900/20 border-emerald-500/30">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <AlertTitle className="text-emerald-300">Windows Detected</AlertTitle>
          <AlertDescription className="text-emerald-200/80">
            Good news! Your system supports application audio capture. Follow the instructions above for best results.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
