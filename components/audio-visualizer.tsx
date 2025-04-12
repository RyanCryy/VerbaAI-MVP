"use client"

import { useRef, useEffect } from "react"

interface AudioVisualizerProps {
  audioData: Float32Array | null
  isRecording: boolean
}

export default function AudioVisualizer({ audioData, isRecording }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current || !audioData) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (!isRecording) {
      // Draw a flat line when not recording
      ctx.beginPath()
      ctx.moveTo(0, canvas.height / 2)
      ctx.lineTo(canvas.width, canvas.height / 2)
      ctx.strokeStyle = "#64748b" // slate-500
      ctx.lineWidth = 2
      ctx.stroke()
      return
    }

    // Draw waveform
    const sliceWidth = canvas.width / audioData.length
    let x = 0

    ctx.beginPath()
    ctx.moveTo(0, canvas.height / 2)

    for (let i = 0; i < audioData.length; i++) {
      const v = audioData[i]
      const y = (v * canvas.height) / 2 + canvas.height / 2

      ctx.lineTo(x, y)
      x += sliceWidth
    }

    ctx.lineTo(canvas.width, canvas.height / 2)
    ctx.strokeStyle = "#10b981" // emerald-500
    ctx.lineWidth = 2
    ctx.stroke()

    // Add a glow effect
    ctx.shadowBlur = 10
    ctx.shadowColor = "#34d399" // emerald-400

    // Draw a background fill to make the visualization more visible
    ctx.globalAlpha = 0.1
    ctx.fillStyle = "#10b981"
    ctx.fill()
    ctx.globalAlpha = 1.0
  }, [audioData, isRecording])

  return (
    <div className="w-full h-32 bg-slate-900 rounded-lg overflow-hidden border border-slate-700 relative">
      <canvas ref={canvasRef} width={800} height={128} className="w-full h-full" />
      {isRecording && (
        <div className="absolute top-2 right-2 flex items-center">
          <div className="h-2 w-2 rounded-full bg-red-500 mr-1 animate-pulse"></div>
          <span className="text-xs text-slate-300">Recording</span>
        </div>
      )}
    </div>
  )
}
