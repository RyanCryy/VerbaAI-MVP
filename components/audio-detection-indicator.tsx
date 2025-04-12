"use client"

import { useEffect, useState } from "react"
import { Volume2, VolumeX } from "lucide-react"

interface AudioDetectionIndicatorProps {
  stream: MediaStream | null
  isActive: boolean
}

export default function AudioDetectionIndicator({ stream, isActive }: AudioDetectionIndicatorProps) {
  const [audioLevel, setAudioLevel] = useState(0)
  const [isAudioDetected, setIsAudioDetected] = useState(false)
  const [noAudioTimeout, setNoAudioTimeout] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!stream || !isActive || stream.getAudioTracks().length === 0) {
      setAudioLevel(0)
      setIsAudioDetected(false)
      return
    }

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const source = audioContext.createMediaStreamSource(stream)
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Float32Array(bufferLength)

    let animationFrame: number
    let silenceCounter = 0
    const MAX_SILENCE_COUNT = 50 // About 5 seconds of silence before warning

    // Start a timeout to check if we're getting any audio
    const timeout = setTimeout(() => {
      if (!isAudioDetected) {
        console.warn("No audio detected after 5 seconds")
      }
    }, 5000)

    setNoAudioTimeout(timeout)

    const checkAudio = () => {
      analyser.getFloatTimeDomainData(dataArray)

      // Calculate RMS (root mean square) to get volume level
      let sum = 0
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i]
      }
      const rms = Math.sqrt(sum / dataArray.length)

      // Scale the RMS to a 0-100 range for the meter
      const scaledLevel = Math.min(100, Math.max(0, rms * 1000))
      setAudioLevel(scaledLevel)

      // Check if we're detecting audio
      const hasAudio = rms > 0.01

      if (hasAudio) {
        setIsAudioDetected(true)
        silenceCounter = 0
      } else {
        silenceCounter++
        if (silenceCounter > MAX_SILENCE_COUNT) {
          // Only set to false if we previously detected audio
          // This prevents false negatives during natural silence
          if (isAudioDetected) {
            console.log("Audio signal lost")
          }
        }
      }

      animationFrame = requestAnimationFrame(checkAudio)
    }

    checkAudio()

    return () => {
      cancelAnimationFrame(animationFrame)
      source.disconnect()
      audioContext.close()
      if (noAudioTimeout) {
        clearTimeout(noAudioTimeout)
      }
    }
  }, [stream, isActive])

  if (!stream || !isActive) {
    return null
  }

  return (
    <div className="flex items-center space-x-2">
      {audioLevel > 0 ? (
        <Volume2 className="h-4 w-4 text-emerald-400" />
      ) : (
        <VolumeX className="h-4 w-4 text-amber-400" />
      )}

      <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${audioLevel > 0 ? "bg-emerald-500" : "bg-amber-500"}`}
          style={{ width: `${audioLevel}%` }}
        ></div>
      </div>

      <span className="text-xs text-slate-400">{audioLevel > 0 ? "Audio detected" : "No audio"}</span>
    </div>
  )
}
