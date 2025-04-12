"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Mic,
  MicOff,
  AlertTriangle,
  Download,
  FileText,
  Pause,
  Play,
  Activity,
  Monitor,
  Headphones,
  CheckCircle2,
  Clock,
  Wand2,
  ChevronRight,
  Volume2,
  Layers,
  Settings,
  Save,
  Music,
} from "lucide-react"
import { summarizeTranscription, type SummaryMode } from "@/actions/summarize"
import { SummaryModeSelector } from "@/components/summary-mode-selector"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { createTranscription } from "@/lib/db-actions"
import { useRouter } from "next/navigation"
import { toast } from "@/components/ui/use-toast"
import { Input } from "@/components/ui/input"
import AudioDetectionIndicator from "@/components/audio-detection-indicator"
import DesktopAudioGuide from "@/components/desktop-audio-guide"
import { getOperatingSystem } from "@/components/desktop-audio-capture"

// Import the screen capture helpers
import {
  isScreenCaptureSupported,
  getScreenCaptureWithAudio,
  detectAudioActivity,
} from "@/components/screen-capture-helper"

// Add these props to your component
interface TranscriptionAppProps {
  userId: string
  userPlan: "free" | "pro" | "enterprise"
  currentUsage: number
  usageLimit: number
}

export default function TranscriptionApp({ userId, userPlan, currentUsage, usageLimit }: TranscriptionAppProps) {
  const router = useRouter()
  const [os, setOs] = useState<"windows" | "macos" | "linux" | "unknown">("unknown")

  // Set the OS on component mount
  useEffect(() => {
    setOs(getOperatingSystem())
  }, [])

  // Add this function to save transcription
  const saveTranscription = async (title: string) => {
    if (!transcription) {
      toast({
        title: "Error",
        description: "No transcription to save",
        variant: "destructive",
      })
      return
    }

    try {
      const result = await createTranscription({
        title,
        content: transcription,
        summary: summary || undefined,
        duration: elapsedTime,
        userId,
        isPublic: false,
        tags: [],
      })

      toast({
        title: "Success",
        description: "Transcription saved successfully",
      })

      // Refresh server components to update usage count
      router.refresh()

      // Redirect to the transcription page
      router.push(`/transcriptions/${result._id}`)
    } catch (error) {
      console.error("Error saving transcription:", error)
      toast({
        title: "Error",
        description: "Failed to save transcription",
        variant: "destructive",
      })
    }
  }

  // Add a save dialog state
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [transcriptionTitle, setTranscriptionTitle] = useState("")

  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [transcription, setTranscription] = useState("")
  const [summary, setSummary] = useState("")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [micActive, setMicActive] = useState(false)
  const [screenActive, setScreenActive] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [enableDiarization, setEnableDiarization] = useState(false)
  const [summaryMode, setSummaryMode] = useState<SummaryMode>("tldr")
  const [recordingMode, setRecordingMode] = useState<"mic" | "screen" | "both" | "desktop-app" | null>(null)
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)
  const [showDesktopGuide, setShowDesktopGuide] = useState(false)

  // New states for recording health monitoring
  const [recordingHealth, setRecordingHealth] = useState(100) // 0-100 health indicator
  const [lastProcessedChunk, setLastProcessedChunk] = useState(0)
  const [audioDetected, setAudioDetected] = useState(false)

  // Refs for recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const startTimeRef = useRef(0)
  const pausedTimeRef = useRef(0)
  const transcriptionIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const healthCheckTimerRef = useRef<NodeJS.Timeout | null>(null)
  const audioMonitoringCleanupRef = useRef<(() => void) | null>(null)

  // Constants
  const HEALTH_CHECK_INTERVAL = 30 * 1000 // 30 seconds
  const TRANSCRIPTION_INTERVAL = 5 * 1000 // 5 seconds for more real-time feel

  // Set up timer for recording duration
  useEffect(() => {
    let timerInterval: NodeJS.Timeout | null = null

    if (isRecording && !isPaused) {
      startTimeRef.current = Date.now() - elapsedTime * 1000
      timerInterval = setInterval(() => {
        const now = Date.now()
        setElapsedTime((now - startTimeRef.current) / 1000)
      }, 100)
    }

    return () => {
      if (timerInterval) {
        clearInterval(timerInterval)
      }
    }
  }, [isRecording, isPaused, elapsedTime])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopRecording()

      if (transcriptionIntervalRef.current) {
        clearInterval(transcriptionIntervalRef.current)
      }

      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
      }

      if (healthCheckTimerRef.current) {
        clearInterval(healthCheckTimerRef.current)
      }

      if (audioMonitoringCleanupRef.current) {
        audioMonitoringCleanupRef.current()
      }
    }
  }, [])

  // New function specifically for desktop application audio
  const startDesktopAppRecording = async () => {
    try {
      setErrorMessage(null)
      setTranscription("")
      setSummary("")
      setElapsedTime(0)
      audioChunksRef.current = []
      setMicActive(false)
      setScreenActive(false)
      setIsInitializing(true)
      setIsTranscribing(false)
      setIsPaused(false)
      setRecordingHealth(100)
      setLastProcessedChunk(0)
      setRecordingMode("desktop-app")
      setAudioDetected(false)

      // Create an audio context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      audioContextRef.current = audioContext
      const destination = audioContext.createMediaStreamDestination()

      // Show OS-specific guidance
      const os = getOperatingSystem()
      if (os === "windows") {
        toast({
          title: "Windows Desktop Audio",
          description:
            "Select the specific application window (e.g., Spotify) and make sure to check 'Share audio' in the dialog.",
          variant: "default",
          duration: 10000,
        })
      } else if (os === "macos") {
        toast({
          title: "macOS Desktop Audio",
          description:
            "macOS has limited support for capturing application audio. You may need additional software like BlackHole.",
          variant: "default",
          duration: 10000,
        })
      }

      // Get screen with specialized desktop audio capture
      console.log("Requesting desktop application audio capture...")
      const screenStream = await getScreenCaptureWithAudio()
      screenStreamRef.current = screenStream
      setScreenActive(true)

      // Check if we have audio tracks
      if (screenStream.getAudioTracks().length > 0) {
        console.log("Desktop audio tracks detected:", screenStream.getAudioTracks().length)

        // Connect screen audio to destination
        const screenSource = audioContext.createMediaStreamSource(screenStream)
        screenSource.connect(destination)

        // Set up audio monitoring with callback
        const cleanup = detectAudioActivity(screenStream, (isActive, level) => {
          if (isActive && level > 0.01) {
            console.log(`Desktop audio detected! Level: ${level.toFixed(4)}`)
            setAudioDetected(true)
          }
        })

        audioMonitoringCleanupRef.current = cleanup
      } else {
        console.warn("No audio tracks in desktop capture")
        toast({
          title: "No Audio Detected",
          description:
            "No audio tracks were detected. Make sure to select 'Share audio' in the dialog and that the application is playing audio.",
          variant: "destructive",
        })
      }

      // Handle screen sharing stop
      screenStream.getVideoTracks()[0].onended = () => {
        if (isRecording) {
          stopRecording()
          setErrorMessage("Screen sharing was stopped. Recording has ended.")
        }
      }

      // Use the combined stream for recording
      const combinedStream = destination.stream
      console.log("Combined stream created with tracks:", combinedStream.getTracks().length)

      // Set up MediaRecorder with optimized format and bitrate
      let options = {}
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        options = {
          mimeType: "audio/webm;codecs=opus",
          audioBitsPerSecond: 128000, // Higher bitrate for better quality
        }
        console.log("Using audio/webm with opus codec at 128kbps")
      } else if (MediaRecorder.isTypeSupported("audio/webm")) {
        options = {
          mimeType: "audio/webm",
          audioBitsPerSecond: 128000,
        }
        console.log("Using audio/webm format at 128kbps")
      } else {
        console.log("Using default audio format")
      }

      const mediaRecorder = new MediaRecorder(combinedStream, options)
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
          console.log(`Received audio chunk: ${event.data.size} bytes`)
        } else {
          console.log("Received empty audio chunk")
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType })
        console.log(`Recording stopped. Total size: ${audioBlob.size} bytes, type: ${audioBlob.type}`)

        // Transcribe the complete recording
        if (audioBlob.size > 0) {
          setIsTranscribing(true)
          transcribeRecording(audioBlob, true)
        } else {
          console.log("No audio data captured during recording")
          setErrorMessage(
            "No audio was captured during recording. Please check your application audio settings and try again.",
          )
        }
      }

      // Start recording
      mediaRecorder.start(1000) // Collect data every second
      setIsRecording(true)
      setIsInitializing(false)
      console.log("Desktop application audio recording started")

      // Set up real-time transcription interval
      transcriptionIntervalRef.current = setInterval(() => {
        if (isRecording && !isPaused && audioChunksRef.current.length > 0) {
          // Only process if we have enough new data
          if (audioChunksRef.current.length >= 3) {
            // Get only the most recent chunks for interim transcription
            const recentChunks = audioChunksRef.current.slice(-10)
            const currentAudioBlob = new Blob(recentChunks, {
              type: mediaRecorderRef.current?.mimeType || "audio/webm",
            })

            if (currentAudioBlob.size > 0) {
              const blobSizeMB = (currentAudioBlob.size / (1024 * 1024)).toFixed(2)
              console.log(`Transcribing interim audio: ${blobSizeMB} MB (recent chunks only)`)
              setIsTranscribing(true)
              transcribeRecording(currentAudioBlob, false)
            }
          }
        }
      }, TRANSCRIPTION_INTERVAL)

      // Set up health check timer
      setupHealthCheckTimer()

      // Show desktop guide
      setShowDesktopGuide(true)
    } catch (error: any) {
      console.error("Error starting desktop app recording:", error)
      setErrorMessage(`Error starting desktop app recording: ${error.message}`)
      setIsRecording(false)
      setIsInitializing(false)
      setRecordingMode(null)

      // Clean up any partial setup
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop())
      }

      if (audioContextRef.current) {
        audioContextRef.current.close().catch((e) => console.error("Error closing audio context:", e))
      }

      if (audioMonitoringCleanupRef.current) {
        audioMonitoringCleanupRef.current()
      }
    }
  }

  const startRecording = async (mode: "mic" | "screen" | "both") => {
    try {
      setErrorMessage(null)
      setTranscription("")
      setSummary("") // Clear any previous summary
      setElapsedTime(0)
      audioChunksRef.current = []
      setMicActive(false)
      setScreenActive(false)
      setIsInitializing(true)
      setIsTranscribing(false)
      setIsPaused(false)
      setRecordingHealth(100)
      setLastProcessedChunk(0)
      setRecordingMode(mode)
      setAudioDetected(false)

      // Create an audio context for mixing streams
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      audioContextRef.current = audioContext
      const destination = audioContext.createMediaStreamDestination()

      // Get microphone stream if needed
      let micSuccess = false
      if (mode === "mic" || mode === "both") {
        try {
          console.log("Requesting microphone permission...")
          const micStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
            video: false,
          })

          if (micStream.getAudioTracks().length > 0) {
            console.log("Microphone permission granted, tracks:", micStream.getAudioTracks().length)
            micStreamRef.current = micStream
            setMicActive(true)
            micSuccess = true

            // Connect microphone to destination
            const micSource = audioContext.createMediaStreamSource(micStream)
            micSource.connect(destination)
            console.log("Microphone connected to audio destination")

            // Add a volume meter to verify microphone input
            const analyser = audioContext.createAnalyser()
            analyser.fftSize = 256
            micSource.connect(analyser)

            // Check for audio input periodically
            const dataArray = new Float32Array(analyser.frequencyBinCount)
            const checkMicInput = () => {
              if (isRecording && analyser) {
                analyser.getFloatTimeDomainData(dataArray)

                // Calculate RMS (root mean square) to get volume level
                let sum = 0
                for (let i = 0; i < dataArray.length; i++) {
                  sum += dataArray[i] * dataArray[i]
                }
                const rms = Math.sqrt(sum / dataArray.length)

                console.log(`Microphone input level: ${rms.toFixed(6)}`)

                if (rms > 0.01) {
                  console.log("Microphone is picking up audio!")
                  setAudioDetected(true)
                }

                setTimeout(checkMicInput, 1000)
              }
            }
            checkMicInput()
          } else {
            console.error("No audio tracks in microphone stream")
            if (mode === "mic") {
              throw new Error("No audio tracks detected in microphone. Please check your microphone settings.")
            }
          }
        } catch (error: any) {
          console.error("Error accessing microphone:", error)
          if (mode === "mic") {
            throw new Error(`Could not access microphone: ${error.message}`)
          }
        }
      }

      // Get screen audio if needed
      let screenSuccess = false
      if (mode === "screen" || mode === "both") {
        try {
          console.log("Requesting screen sharing permission...")

          // Check if screen capture is supported
          if (!isScreenCaptureSupported()) {
            throw new Error("Screen capture is not supported in your browser")
          }

          // Get screen with audio using our helper
          const screenStream = await getScreenCaptureWithAudio()
          screenStreamRef.current = screenStream

          // Connect screen audio to destination if we have audio tracks
          if (screenStream.getAudioTracks().length > 0) {
            console.log("Screen audio tracks detected:", screenStream.getAudioTracks().length)
            setScreenActive(true)
            screenSuccess = true

            // Set up audio activity detection
            const cleanup = detectAudioActivity(screenStream, (isActive, level) => {
              if (isActive) {
                console.log(`Screen audio detected! Level: ${level.toFixed(4)}`)
                setAudioDetected(true)
              }
            })

            audioMonitoringCleanupRef.current = cleanup

            const screenSource = audioContext.createMediaStreamSource(screenStream)
            screenSource.connect(destination)
            console.log("Screen audio connected successfully")

            // Show helpful toast with guidance
            toast({
              title: "Screen Audio Captured",
              description:
                "Screen audio is being captured. If you don't hear any sound in your recording, try selecting a different window or tab.",
              variant: "default",
            })
          } else {
            console.log("No audio tracks in screen capture")
            setScreenActive(true) // Still set screen as active even without audio
            screenSuccess = true // Consider it a success for UI purposes

            const os = getOperatingSystem()
            let audioGuidance = "Screen capture started, but no audio was detected."

            if (os === "windows") {
              audioGuidance +=
                " For Windows: Make sure to select the specific application window and check 'Share audio' in the dialog. Some applications may require you to run the browser as administrator."
            } else if (os === "macos") {
              audioGuidance +=
                " For macOS: Browser tab audio should work, but application audio may require system extensions or additional software like BlackHole or Loopback."
            } else {
              audioGuidance +=
                " For browser tabs, make sure to check 'Share tab audio' in the sharing dialog. For applications, try selecting the specific application instead of the entire screen."
            }

            toast({
              title: "No audio detected",
              description: audioGuidance,
              variant: "default",
            })
          }

          // Handle screen sharing stop
          screenStream.getVideoTracks()[0].onended = () => {
            if (isRecording) {
              stopRecording()
              setErrorMessage("Screen sharing was stopped. Recording has ended.")
            }
          }
        } catch (error: any) {
          console.error("Error capturing screen:", error)
          if (mode === "screen") {
            // More helpful error message with troubleshooting tips
            const errorMsg = `Screen capture failed: ${error.message}. 
      
Troubleshooting tips:
- Make sure you've selected an application or window, not just a browser tab
- Some browsers require system permissions to capture screen audio
- Try selecting "Share audio" if that option is available in the screen share dialog
- For application audio, try Chrome or Edge on Windows or macOS
- Some applications may not allow their audio to be captured due to system restrictions`

            setErrorMessage(errorMsg)
            setIsInitializing(false)
            setRecordingMode(null)
            return // Return instead of throwing to prevent the app from crashing
          }
        }
      }

      // Check if we have any audio sources based on the selected mode
      if (
        (mode === "mic" && !micSuccess) ||
        (mode === "screen" && !screenSuccess) ||
        (mode === "both" && !micSuccess && !screenSuccess)
      ) {
        setIsInitializing(false)
        throw new Error("No audio sources available. Please check your permissions.")
      }

      // Use the combined stream for recording
      const combinedStream = destination.stream
      console.log("Combined stream created with tracks:", combinedStream.getTracks().length)

      // Set up MediaRecorder with optimized format and bitrate
      let options = {}
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        // Opus codec provides better compression for speech
        options = {
          mimeType: "audio/webm;codecs=opus",
          audioBitsPerSecond: 24000, // Lower bitrate optimized for speech (24kbps)
        }
        console.log("Using audio/webm with opus codec at 24kbps")
      } else if (MediaRecorder.isTypeSupported("audio/webm")) {
        options = {
          mimeType: "audio/webm",
          audioBitsPerSecond: 24000, // Lower bitrate
        }
        console.log("Using audio/webm format at 24kbps")
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        options = {
          mimeType: "audio/mp4",
          audioBitsPerSecond: 24000, // Lower bitrate
        }
        console.log("Using audio/mp4 format at 24kbps")
      } else {
        console.log("Using default audio format")
      }

      const mediaRecorder = new MediaRecorder(combinedStream, options)
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
          console.log(`Received audio chunk: ${event.data.size} bytes`)
        } else {
          console.log("Received empty audio chunk")
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType })
        console.log(`Recording stopped. Total size: ${audioBlob.size} bytes, type: ${audioBlob.type}`)

        // Transcribe the complete recording
        if (audioBlob.size > 0) {
          setIsTranscribing(true) // Set transcribing state to true
          transcribeRecording(audioBlob, true)
        } else {
          console.log("No audio data captured during recording")
          setErrorMessage("No audio was captured during recording. Please check your microphone and try again.")
        }
      }

      // Start recording
      mediaRecorder.start(1000) // Collect data every second
      setIsRecording(true)
      setIsInitializing(false)
      console.log(`Recording started in ${mode} mode`)

      // Set up real-time transcription interval with optimized approach
      transcriptionIntervalRef.current = setInterval(() => {
        if (isRecording && !isPaused && audioChunksRef.current.length > 0) {
          // Only process if we have enough new data (at least 3 seconds)
          if (audioChunksRef.current.length >= 3) {
            // Get only the most recent chunks for interim transcription
            // This avoids sending the entire recording each time
            const recentChunks = audioChunksRef.current.slice(-10) // Last 10 seconds approximately
            const currentAudioBlob = new Blob(recentChunks, {
              type: mediaRecorderRef.current?.mimeType || "audio/webm",
            })

            if (currentAudioBlob.size > 0) {
              const blobSizeMB = (currentAudioBlob.size / (1024 * 1024)).toFixed(2)
              console.log(`Transcribing interim audio: ${blobSizeMB} MB (recent chunks only)`)
              setIsTranscribing(true)
              transcribeRecording(currentAudioBlob, false)
            } else {
              console.log("No audio data to transcribe yet")
            }
          }
        }
      }, TRANSCRIPTION_INTERVAL) // Check every 5 seconds for more real-time feel

      // Set up health check timer
      setupHealthCheckTimer()
    } catch (error: any) {
      console.error("Error starting recording:", error)
      setErrorMessage(`Error starting recording: ${error.message}`)
      setIsRecording(false)
      setIsInitializing(false)
      setRecordingMode(null)

      // Clean up any partial setup
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop())
      }

      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop())
      }

      if (audioContextRef.current) {
        audioContextRef.current.close().catch((e) => console.error("Error closing audio context:", e))
      }

      if (audioMonitoringCleanupRef.current) {
        audioMonitoringCleanupRef.current()
      }
    }
  }

  // Set up health check timer
  const setupHealthCheckTimer = () => {
    if (healthCheckTimerRef.current) {
      clearInterval(healthCheckTimerRef.current)
    }

    healthCheckTimerRef.current = setInterval(() => {
      if (isRecording && !isPaused) {
        // Check if we're still receiving audio chunks
        const currentChunkCount = audioChunksRef.current.length

        if (currentChunkCount === lastProcessedChunk) {
          // No new chunks since last check - reduce health
          setRecordingHealth((prev) => Math.max(0, prev - 20))

          if (recordingHealth <= 20) {
            console.warn("Recording health critical - may not be capturing audio properly")
          }
        } else {
          // New chunks received - recording is healthy
          setRecordingHealth((prev) => Math.min(100, prev + 10))
          setLastProcessedChunk(currentChunkCount)
        }
      }
    }, HEALTH_CHECK_INTERVAL)
  }

  const pauseRecording = () => {
    if (!isRecording || isPaused) return

    console.log("Pausing recording")
    setIsPaused(true)
    pausedTimeRef.current = Date.now()

    // Pause the MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      try {
        mediaRecorderRef.current.pause()
        console.log("MediaRecorder paused")
      } catch (error) {
        // Some browsers might not support pause, so we'll handle that
        console.error("Error pausing media recorder:", error)
        console.log("MediaRecorder pause not supported, using workaround")

        // If pause is not supported, we'll just stop collecting data
        // The recording will continue but we won't process the data
      }
    }
  }

  const resumeRecording = () => {
    if (!isRecording || !isPaused) return

    console.log("Resuming recording")

    // Adjust the start time to account for the pause duration
    if (pausedTimeRef.current > 0) {
      const pauseDuration = Date.now() - pausedTimeRef.current
      startTimeRef.current += pauseDuration
      pausedTimeRef.current = 0
    }

    setIsPaused(false)

    // Resume the MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
      try {
        mediaRecorderRef.current.resume()
        console.log("MediaRecorder resumed")
      } catch (error) {
        // Some browsers might not support resume, so we'll handle that
        console.error("Error resuming media recorder:", error)
        console.log("MediaRecorder resume not supported, using workaround")

        // If resume is not supported, we'll just start collecting data again
      }
    }
  }

  const stopRecording = () => {
    if (!isRecording) return

    console.log("Stopping recording")
    setIsRecording(false)
    setIsPaused(false)
    setRecordingMode(null)

    // Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop()
      } catch (error) {
        console.error("Error stopping media recorder:", error)
      }
    }

    // Stop all streams
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop())
    }

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop())
    }

    // Clear all timers
    if (transcriptionIntervalRef.current) {
      clearInterval(transcriptionIntervalRef.current)
    }

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
    }

    if (healthCheckTimerRef.current) {
      clearInterval(healthCheckTimerRef.current)
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close().catch((e) => console.error("Error closing audio context:", e))
    }

    // Clean up audio monitoring
    if (audioMonitoringCleanupRef.current) {
      audioMonitoringCleanupRef.current()
      audioMonitoringCleanupRef.current = null
    }

    setMicActive(false)
    setScreenActive(false)
    setShowDesktopGuide(false)
  }

  // Update the transcribeRecording function to optimize data transfer
  const transcribeRecording = async (blob: Blob, isFinal: boolean) => {
    if (!blob || blob.size === 0) {
      console.log("No audio data to transcribe")
      setIsTranscribing(false)
      return
    }

    try {
      console.log(`Audio blob size: ${(blob.size / (1024 * 1024)).toFixed(2)} MB`)

      if (!isFinal && blob.size > 5 * 1024 * 1024) {
        const chunks = audioChunksRef.current
        const recentChunks = chunks.slice(Math.max(0, chunks.length - 30))
        blob = new Blob(recentChunks, { type: mediaRecorderRef.current?.mimeType || "audio/webm" })
        console.log(`Created smaller blob for interim transcription: ${(blob.size / (1024 * 1024)).toFixed(2)} MB`)
      }

      const formData = new FormData()
      formData.append("file", blob, "audio.webm")
      formData.append("model", "whisper-1")

      // Add retry logic
      let retries = 3
      let lastError = null

      while (retries > 0) {
        try {
          const response = await fetch("/api/transcribe", {
            method: "POST",
            body: formData,
          })

          if (!response.ok) {
            throw new Error(`Transcription API error: ${response.status}`)
          }

          const result = await response.json()

          if (result.error) {
            throw new Error(result.error)
          }

          if (result.text) {
            let newText = result.text.trim()
            if (newText.includes("Transcribed by https://otter.ai")) {
              newText = newText.replace("Transcribed by https://otter.ai", "").trim()
            }
            setTranscription((prev) => {
              if (isFinal) {
                return newText
              }
              return prev + (prev ? "\n" : "") + newText
            })
          }

          setIsTranscribing(false)
          return
        } catch (error) {
          lastError = error
          retries--
          if (retries > 0) {
            console.log(`Retrying transcription... (${retries} attempts left)`)
            await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second before retry
          }
        }
      }

      // If we get here, all retries failed
      throw lastError
    } catch (error: any) {
      console.error("Transcription error:", error)
      setErrorMessage(error.message || "Failed to transcribe audio")
      setIsTranscribing(false)
    }
  }

  // Function to generate a summary of the transcription
  const generateSummary = async () => {
    if (!transcription || transcription.length < 10) {
      setErrorMessage("Transcription is too short to summarize")
      return
    }

    try {
      setIsSummarizing(true)
      setSummary("") // Clear any previous summary

      console.log(`Generating ${summaryMode} summary for transcription`)
      const result = await summarizeTranscription(transcription, summaryMode)

      if (result.error) {
        setErrorMessage(result.error)
        console.error("Summary error:", result.error)
      } else if (result.summary) {
        console.log(`Received summary: "${result.summary.substring(0, 50)}..."`)
        setSummary(result.summary)
      } else {
        setErrorMessage("Failed to generate summary")
      }
    } catch (error: any) {
      console.error("Error generating summary:", error)
      setErrorMessage(`Summary generation failed: ${error.message}`)
    } finally {
      setIsSummarizing(false)
    }
  }

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  // Function to download transcription as a text file
  const downloadTranscription = (isFinal = true) => {
    if (!transcription) return

    try {
      // Create text content with appropriate header
      const textToDownload = isFinal
        ? transcription
        : `[IN PROGRESS] Recording time: ${formatTime(elapsedTime)}

${transcription}`

      // Create a blob with the transcription text
      const blob = new Blob([textToDownload], { type: "text/plain" })

      // Create a URL for the blob
      const url = URL.createObjectURL(blob)

      // Create a temporary anchor element
      const a = document.createElement("a")
      a.href = url

      // Generate a filename with current date and time
      const now = new Date()
      const dateStr = now.toISOString().slice(0, 10) // YYYY-MM-DD
      const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, "-") // HH-MM-SS
      const prefix = isFinal ? "transcription" : "in-progress-transcription"
      a.download = `${prefix}-${dateStr}-${timeStr}.txt`

      // Append to the document, click it, and remove it
      document.body.appendChild(a)
      a.click()

      // Clean up
      setTimeout(() => {
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }, 100)

      console.log(`${isFinal ? "Transcription" : "In-progress transcription"} downloaded successfully`)
    } catch (error) {
      console.error("Error downloading transcription:", error)
      setErrorMessage("Failed to download transcription. Please try again.")
    }
  }

  // Function to download summary as a text file
  const downloadSummary = () => {
    if (!summary) return

    try {
      // Create a blob with the summary text
      const blob = new Blob([summary], { type: "text/plain" })

      // Create a URL for the blob
      const url = URL.createObjectURL(blob)

      // Create a temporary anchor element
      const a = document.createElement("a")
      a.href = url

      // Generate a filename with current date and time
      const now = new Date()
      const dateStr = now.toISOString().slice(0, 10) // YYYY-MM-DD
      const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, "-") // HH-MM-SS
      a.download = `summary-${dateStr}-${timeStr}.txt`

      // Append to the document, click it, and remove it
      document.body.appendChild(a)
      a.click()

      // Clean up
      setTimeout(() => {
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }, 100)

      console.log("Summary downloaded successfully")
    } catch (error) {
      console.error("Error downloading summary:", error)
      setErrorMessage("Failed to download summary. Please try again.")
    }
  }

  // Add a helper function to format transcription with speaker labels
  const formatTranscription = (text: string) => {
    if (!text) return null

    // Split by speaker labels (Speaker 1:, Speaker 2:, etc.)
    const parts = text.split(/\b(Speaker \d+:)/g)

    return parts.map((part, index) => {
      if (part.match(/^Speaker \d+:/)) {
        // This is a speaker label
        return (
          <span key={index} className="font-bold text-emerald-400">
            {part}
          </span>
        )
      }
      return <span key={index}>{part}</span>
    })
  }

  return (
    <div className="space-y-8">
      {/* Header with status indicators */}
      <div className="relative">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1 flex items-center">
              <Volume2 className="h-5 w-5 mr-2 text-emerald-400" />
              AI Transcription Studio
            </h2>
            <p className="text-slate-400 text-sm">Convert speech to text with advanced AI processing</p>
          </div>

          {isRecording && (
            <div className="flex items-center space-x-3 bg-slate-800/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-slate-700/50">
              {micActive && (
                <span className="text-sm text-emerald-400 flex items-center">
                  <div
                    className={`w-2 h-2 rounded-full bg-emerald-400 mr-1.5 ${isPaused ? "" : "animate-pulse"}`}
                  ></div>
                  Mic
                </span>
              )}
              {screenActive && (
                <span className="text-sm text-emerald-400 flex items-center">
                  <div
                    className={`w-2 h-2 rounded-full bg-emerald-400 mr-1.5 ${isPaused ? "" : "animate-pulse"}`}
                  ></div>
                  {recordingMode === "desktop-app" ? "Desktop App" : "Screen"}
                </span>
              )}
              <span className="text-sm text-slate-300 flex items-center">
                <Clock className="h-3.5 w-3.5 mr-1 text-slate-400" />
                {formatTime(elapsedTime)}
              </span>
            </div>
          )}
        </div>

        {/* Gradient divider */}
        <div className="h-px w-full bg-gradient-to-r from-emerald-500/0 via-emerald-500/80 to-emerald-500/0 mt-4"></div>
      </div>

      {!isRecording ? (
        // Recording Options
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            className={`relative overflow-hidden group rounded-xl border border-slate-800 bg-gradient-to-b from-slate-800 to-slate-900 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10 hover:border-emerald-500/50 ${isInitializing && recordingMode === "mic" ? "border-emerald-500/50 shadow-lg shadow-emerald-500/10" : ""
              }`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <button
              onClick={() => startRecording("mic")}
              disabled={isInitializing}
              className="w-full h-full p-6 flex flex-col items-center justify-center relative"
            >
              {isInitializing && recordingMode === "mic" ? (
                <div className="flex flex-col items-center justify-center">
                  <svg
                    className="animate-spin h-10 w-10 text-emerald-400 mb-3"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span className="text-emerald-400 animate-pulse">Initializing microphone...</span>
                </div>
              ) : (
                <>
                  <div className="bg-slate-800/80 p-4 rounded-full mb-4 group-hover:bg-emerald-500/20 transition-colors duration-300">
                    <Mic className="h-10 w-10 text-emerald-400" />
                  </div>
                  <span className="text-lg font-medium text-white mb-1">Microphone Only</span>
                  <span className="text-sm text-slate-400">Record your voice</span>
                  <div className="mt-4 px-4 py-1.5 rounded-full bg-slate-800/80 text-xs text-slate-400 group-hover:bg-emerald-500/20 group-hover:text-emerald-300 transition-colors duration-300">
                    Start Recording
                  </div>
                </>
              )}
            </button>
          </div>

          <div
            className={`relative overflow-hidden group rounded-xl border border-slate-800 bg-gradient-to-b from-slate-800 to-slate-900 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10 hover:border-emerald-500/50 ${isInitializing && recordingMode === "screen"
                ? "border-emerald-500/50 shadow-lg shadow-emerald-500/10"
                : ""
              }`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <button
              onClick={() => startRecording("screen")}
              disabled={isInitializing}
              className="w-full h-full p-6 flex flex-col items-center justify-center relative"
            >
              {isInitializing && recordingMode === "screen" ? (
                <div className="flex flex-col items-center justify-center">
                  <svg
                    className="animate-spin h-10 w-10 text-emerald-400 mb-3"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span className="text-emerald-400 animate-pulse">Initializing screen capture...</span>
                </div>
              ) : (
                <>
                  <div className="bg-slate-800/80 p-4 rounded-full mb-4 group-hover:bg-emerald-500/20 transition-colors duration-300">
                    <Monitor className="h-10 w-10 text-emerald-400" />
                  </div>
                  <span className="text-lg font-medium text-white mb-1">Browser Tab Audio</span>
                  <span className="text-sm text-slate-400">Record browser tab audio</span>
                  <div className="mt-4 px-4 py-1.5 rounded-full bg-slate-800/80 text-xs text-slate-400 group-hover:bg-emerald-500/20 group-hover:text-emerald-300 transition-colors duration-300">
                    Start Recording
                  </div>
                </>
              )}
            </button>
          </div>

          {/* New Desktop App Recording Option */}
          <div
            className={`relative overflow-hidden group rounded-xl border border-amber-500/50 bg-gradient-to-b from-amber-900/20 to-slate-900 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/20 hover:border-amber-500 ${isInitializing && recordingMode === "desktop-app" ? "border-amber-500 shadow-lg shadow-amber-500/20" : ""
              }`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 via-transparent to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-300"></div>
            <button
              onClick={startDesktopAppRecording}
              disabled={isInitializing}
              className="w-full h-full p-6 flex flex-col items-center justify-center relative"
            >
              {isInitializing && recordingMode === "desktop-app" ? (
                <div className="flex flex-col items-center justify-center">
                  <svg
                    className="animate-spin h-10 w-10 text-white mb-3"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span className="text-white animate-pulse">Initializing desktop app capture...</span>
                </div>
              ) : (
                <>
                  <div className="bg-amber-500/20 p-4 rounded-full mb-4 group-hover:bg-amber-500/30 transition-colors duration-300">
                    <Music className="h-10 w-10 text-white" />
                  </div>
                  <span className="text-lg font-medium text-white mb-1">Desktop App Audio</span>
                  <span className="text-sm text-amber-200/80">Record Spotify & other apps</span>
                  <div className="mt-4 px-4 py-1.5 rounded-full bg-amber-500/30 text-xs text-amber-200 group-hover:bg-amber-500/50 transition-colors duration-300">
                    Start Recording
                  </div>
                </>
              )}
            </button>
          </div>

          <div
            className={`relative overflow-hidden group rounded-xl border border-emerald-500/50 bg-gradient-to-b from-emerald-900/20 to-slate-900 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/20 hover:border-emerald-500 ${isInitializing && recordingMode === "both" ? "border-emerald-500 shadow-lg shadow-emerald-500/20" : ""
              }`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-transparent to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-300"></div>
            <button
              onClick={() => startRecording("both")}
              disabled={isInitializing}
              className="w-full h-full p-6 flex flex-col items-center justify-center relative"
            >
              {isInitializing && recordingMode === "both" ? (
                <div className="flex flex-col items-center justify-center">
                  <svg
                    className="animate-spin h-10 w-10 text-white mb-3"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span className="text-white animate-pulse">Initializing all sources...</span>
                </div>
              ) : (
                <>
                  <div className="bg-emerald-500/20 p-4 rounded-full mb-4 group-hover:bg-emerald-500/30 transition-colors duration-300">
                    <Headphones className="h-10 w-10 text-white" />
                  </div>
                  <span className="text-lg font-medium text-white mb-1">Microphone & Screen</span>
                  <span className="text-sm text-emerald-200/80">Record both sources</span>
                  <div className="mt-4 px-4 py-1.5 rounded-full bg-emerald-500/30 text-xs text-emerald-200 group-hover:bg-emerald-500/50 transition-colors duration-300">
                    Start Recording
                  </div>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        // Recording Controls
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 p-4">
            <div className="flex items-center mb-3">
              <Activity className={`h-5 w-5 mr-2 ${isPaused ? "text-amber-400" : "text-emerald-400"}`} />
              <h3 className="font-medium text-white">Recording Status</h3>
            </div>

            <div className="space-y-4">
              {/* Status indicator */}
              <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                <div className="flex items-center">
                  {isPaused ? (
                    <div className="h-3 w-3 rounded-full bg-amber-500 mr-2"></div>
                  ) : (
                    <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse mr-2"></div>
                  )}
                  <span className={`font-medium ${isPaused ? "text-amber-400" : "text-emerald-400"}`}>
                    {isPaused ? "Recording Paused" : "Recording Active"}
                  </span>
                </div>
                <span className="text-slate-300 text-sm flex items-center">
                  <Clock className="h-3.5 w-3.5 mr-1 text-slate-400" />
                  {formatTime(elapsedTime)}
                </span>
              </div>

              {/* Recording mode */}
              <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                <div className="text-sm text-slate-400 mb-1">Recording Mode</div>
                <div className="flex items-center">
                  {recordingMode === "mic" && (
                    <div className="flex items-center text-white">
                      <Mic className="h-4 w-4 mr-1.5 text-emerald-400" />
                      Microphone Only
                    </div>
                  )}
                  {recordingMode === "screen" && (
                    <div className="flex items-center text-white">
                      <Monitor className="h-4 w-4 mr-1.5 text-emerald-400" />
                      Browser Tab Audio
                    </div>
                  )}
                  {recordingMode === "desktop-app" && (
                    <div className="flex items-center text-white">
                      <Music className="h-4 w-4 mr-1.5 text-amber-400" />
                      Desktop App Audio
                    </div>
                  )}
                  {recordingMode === "both" && (
                    <div className="flex items-center text-white">
                      <Headphones className="h-4 w-4 mr-1.5 text-emerald-400" />
                      Microphone & Screen
                    </div>
                  )}
                </div>
              </div>

              {/* Audio detection status */}
              <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                <div className="text-sm text-slate-400 mb-1">Audio Status</div>
                <div className="flex items-center">
                  {audioDetected ? (
                    <div className="flex items-center text-emerald-400">
                      <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse mr-2"></div>
                      Audio detected and flowing
                    </div>
                  ) : (
                    <div className="flex items-center text-amber-400">
                      <div className="h-3 w-3 rounded-full bg-amber-500 mr-2"></div>
                      No audio detected yet
                    </div>
                  )}
                </div>
              </div>

              {/* Recording health */}
              <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                <div className="flex justify-between mb-1.5">
                  <span className="text-sm text-slate-400">Recording Health</span>
                  <span className="text-xs text-slate-400">{recordingHealth}%</span>
                </div>
                <Progress
                  value={recordingHealth}
                  className="h-2 bg-slate-700"
                  indicatorClassName={`${recordingHealth > 70 ? "bg-emerald-500" : recordingHealth > 30 ? "bg-amber-500" : "bg-red-500"
                    }`}
                />
              </div>

              {/* Audio Detection */}
              <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 mt-4">
                <div className="text-sm text-slate-400 mb-2">Audio Detection</div>
                {recordingMode === "mic" && (
                  <AudioDetectionIndicator stream={micStreamRef.current} isActive={isRecording && !isPaused} />
                )}
                {(recordingMode === "screen" || recordingMode === "desktop-app") && (
                  <AudioDetectionIndicator stream={screenStreamRef.current} isActive={isRecording && !isPaused} />
                )}
                {recordingMode === "both" && (
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <span className="text-xs text-slate-400 w-16">Mic:</span>
                      <AudioDetectionIndicator stream={micStreamRef.current} isActive={isRecording && !isPaused} />
                    </div>
                    <div className="flex items-center">
                      <span className="text-xs text-slate-400 w-16">Screen:</span>
                      <AudioDetectionIndicator stream={screenStreamRef.current} isActive={isRecording && !isPaused} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 md:w-64">
            {/* Pause/Resume Button */}
            <Button
              variant="outline"
              onClick={isPaused ? resumeRecording : pauseRecording}
              className={`h-auto py-6 flex flex-col items-center justify-center gap-2 ${isPaused
                  ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                  : "border-amber-500/50 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                }`}
            >
              <div className="bg-slate-800 p-2 rounded-full">
                {isPaused ? <Play className="h-6 w-6" /> : <Pause className="h-6 w-6" />}
              </div>
              <span className="text-sm font-medium">{isPaused ? "Resume Recording" : "Pause Recording"}</span>
            </Button>

            {/* Stop Button */}
            <Button
              variant="default"
              onClick={stopRecording}
              className="h-auto py-6 flex flex-col items-center justify-center gap-2 bg-red-600/20 border border-red-600/50 text-red-400 hover:bg-red-600/30"
            >
              <div className="bg-slate-800 p-2 rounded-full">
                <MicOff className="h-6 w-6" />
              </div>
              <span className="text-sm font-medium">Stop Recording</span>
            </Button>
          </div>
        </div>
      )}

      {/* Desktop App Guide */}
      {showDesktopGuide && <DesktopAudioGuide />}

      {/* Settings panel */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
        <div
          className="flex items-center justify-between p-4 cursor-pointer"
          onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
        >
          <div className="flex items-center">
            <Settings className="h-5 w-5 mr-2 text-emerald-400" />
            <h3 className="font-medium text-white">Advanced Settings</h3>
          </div>
          <ChevronRight
            className={`h-5 w-5 text-slate-400 transition-transform duration-200 ${showAdvancedSettings ? "rotate-90" : ""}`}
          />
        </div>

        {showAdvancedSettings && (
          <div className="p-4 pt-0 border-t border-slate-700/50 space-y-4">
            {/* Speaker Diarization Toggle */}
            <div className="flex items-center justify-between bg-slate-800/80 p-3 rounded-lg">
              <div className="flex flex-col">
                <div className="flex items-center">
                  <Layers className="h-4 w-4 mr-2 text-emerald-400" />
                  <Label htmlFor="speaker-diarization" className="text-white font-medium">
                    Speaker Identification
                  </Label>
                </div>
                <p className="text-xs text-slate-400 mt-1 ml-6">Identify different speakers in the audio</p>
              </div>
              <Switch
                id="speaker-diarization"
                checked={enableDiarization}
                onCheckedChange={setEnableDiarization}
                disabled={isRecording}
                className="data-[state=checked]:bg-emerald-500"
              />
            </div>

            {isRecording && enableDiarization && (
              <div className="bg-amber-500/20 text-amber-200 text-sm p-3 rounded-lg border border-amber-500/30 flex items-start">
                <AlertTriangle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                <p>Speaker identification will be applied to the final transcription when recording is complete.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Transcription Box */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-700/50 flex justify-between items-center">
          <div className="flex items-center">
            <FileText className="h-5 w-5 mr-2 text-emerald-400" />
            <h3 className="text-lg font-medium text-white">Transcription</h3>
          </div>

          {transcription && (
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => downloadTranscription(true)}
                className="text-slate-300 hover:text-emerald-400 hover:bg-emerald-500/10"
              >
                <Download className="h-4 w-4 mr-1.5" />
                <span className="text-xs">Download</span>
              </Button>

              {isRecording && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => downloadTranscription(false)}
                  className="text-slate-300 hover:text-amber-400 hover:bg-amber-500/10"
                >
                  <Download className="h-4 w-4 mr-1.5" />
                  <span className="text-xs">Download Progress</span>
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="p-5">
          <div className="min-h-[200px] max-h-[400px] overflow-y-auto rounded-lg bg-slate-900/50 border border-slate-700/50 p-4">
            {isTranscribing ? (
              <div className="flex flex-col items-center justify-center h-full py-8">
                <svg
                  className="animate-spin h-10 w-10 text-emerald-500 mb-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <p className="text-emerald-400 text-center font-medium mb-2">Transcribing your audio</p>
                <p className="text-slate-400 text-sm text-center">This may take a moment...</p>

                {transcription && (
                  <div className="mt-6 w-full bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                    <p className="text-slate-400 text-xs mb-2">Previous transcription:</p>
                    <div className="text-slate-300 text-sm whitespace-pre-wrap">
                      {enableDiarization ? formatTranscription(transcription) : <p>{transcription}</p>}
                    </div>
                  </div>
                )}
              </div>
            ) : transcription ? (
              <div className="text-slate-200 whitespace-pre-wrap leading-relaxed">
                {enableDiarization ? formatTranscription(transcription) : transcription}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                <div className="bg-slate-800/80 p-3 rounded-full mb-4">
                  <Volume2 className="h-8 w-8 text-slate-500" />
                </div>
                <p className="text-slate-500 italic mb-2">Your transcription will appear here</p>
                <p className="text-slate-600 text-sm max-w-md">
                  Select a recording mode above to begin capturing audio for transcription
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary Controls */}
      {transcription && transcription.length >= 10 && (
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-700/50 flex items-center">
            <Wand2 className="h-5 w-5 mr-2 text-emerald-400" />
            <h3 className="text-lg font-medium text-white">AI Summary</h3>
          </div>

          <div className="p-5">
            <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-4">
              <div className="flex flex-col md:flex-row md:items-end gap-4">
                <div className="flex-1">
                  <Label htmlFor="summary-mode" className="text-slate-300 mb-2 block text-sm">
                    Summary Type
                  </Label>
                  <SummaryModeSelector value={summaryMode} onChange={setSummaryMode} disabled={isSummarizing} />
                </div>
                <Button
                  variant="default"
                  onClick={generateSummary}
                  disabled={isSummarizing || transcription.length < 10}
                  className="md:w-auto w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isSummarizing ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4 mr-2"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Generating Summary...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Generate Summary
                    </>
                  )}
                </Button>
              </div>

              {/* Summary display */}
              {summary && (
                <div className="mt-6">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-emerald-400 font-medium flex items-center">
                      {summaryMode === "tldr" && "🧠 TL;DR Summary"}
                      {summaryMode === "executive" && "💼 Executive Summary"}
                      {summaryMode === "notes" && "📚 Study Notes"}
                      {summaryMode === "bullets" && "🗒️ Bullet Points"}
                      {summaryMode === "actions" && "🎯 Action Items"}
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={downloadSummary}
                      className="text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10"
                    >
                      <Download className="h-3.5 w-3.5 mr-1" />
                      <span className="text-xs">Download</span>
                    </Button>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg border border-slate-700/50 p-4 text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {summary}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error message */}
      {errorMessage && (
        <div className="rounded-xl bg-gradient-to-r from-red-900/30 to-red-900/10 p-4 border border-red-700/50 text-red-100">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-red-400" />
            <h3 className="text-sm font-medium text-red-300">Error</h3>
          </div>
          <div className="mt-2 text-sm ml-7">
            <p>{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Help text */}
      <div className="text-sm text-slate-500 bg-slate-800/30 rounded-lg p-4 border border-slate-700/30">
        <div className="flex items-start">
          <CheckCircle2 className="h-4 w-4 mr-2 mt-0.5 text-emerald-500/70" />
          <p>
            {isInitializing
              ? "Setting up audio capture... Please grant permissions when prompted."
              : isRecording
                ? isPaused
                  ? "Recording is paused. Click Resume to continue recording."
                  : "Recording in progress. Speak clearly or play audio from your selected source."
                : "Select a recording mode above to begin capturing audio for transcription."}
          </p>
        </div>
        <div className="flex items-start mt-2">
          <CheckCircle2 className="h-4 w-4 mr-2 mt-0.5 text-emerald-500/70" />
          <p>For best results, use Chrome or Edge on desktop and ensure your microphone is working properly.</p>
        </div>

        <div className="mt-4 border-t border-slate-700/30 pt-3">
          <h4 className="font-medium text-slate-300 mb-2">Desktop Application Audio Tips:</h4>

          <div className="flex items-start mt-2">
            <CheckCircle2 className="h-4 w-4 mr-2 mt-0.5 text-emerald-500/70" />
            <p>
              <strong>For Spotify and other apps:</strong> Use the "Desktop App Audio" option and select the specific
              application window in the sharing dialog.
            </p>
          </div>

          <div className="flex items-start mt-2">
            <CheckCircle2 className="h-4 w-4 mr-2 mt-0.5 text-emerald-500/70" />
            <p>
              <strong>Windows users:</strong> Make sure to check "Share audio" in the dialog. For some applications, you
              may need to run Chrome/Edge as administrator.
            </p>
          </div>

          <div className="flex items-start mt-2">
            <CheckCircle2 className="h-4 w-4 mr-2 mt-0.5 text-emerald-500/70" />
            <p>
              <strong>macOS users:</strong> Application audio capture is limited on macOS. You may need additional
              software like BlackHole or Loopback to route audio.
            </p>
          </div>

          <div className="flex items-start mt-2">
            <CheckCircle2 className="h-4 w-4 mr-2 mt-0.5 text-emerald-500/70" />
            <p>
              <strong>Troubleshooting:</strong> If no audio is detected, try playing audio at a higher volume, selecting
              a different window, or using the microphone option to record system audio playing through speakers.
            </p>
          </div>
        </div>
      </div>

      {/* Add a save button to your UI */}
      {transcription && (
        <Button
          variant="default"
          onClick={() => setShowSaveDialog(true)}
          className="bg-emerald-500 hover:bg-emerald-600 text-white"
        >
          <Save className="h-4 w-4 mr-2" />
          Save Transcription
        </Button>
      )}

      {/* Add a save dialog component */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 p-6 rounded-lg w-full max-w-md border border-slate-700">
            <h3 className="text-xl font-bold text-white mb-4">Save Transcription</h3>
            <div className="mb-4">
              <Label htmlFor="title" className="text-slate-300">
                Title
              </Label>
              <Input
                id="title"
                value={transcriptionTitle}
                onChange={(e) => setTranscriptionTitle(e.target.value)}
                placeholder="Enter a title for your transcription"
                className="bg-slate-700 border-slate-600 text-white mt-1"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowSaveDialog(false)}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </Button>
              <Button
                variant="default"
                onClick={() => {
                  if (transcriptionTitle.trim()) {
                    saveTranscription(transcriptionTitle)
                    setShowSaveDialog(false)
                  }
                }}
                disabled={!transcriptionTitle.trim()}
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
