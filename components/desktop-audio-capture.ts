export function isSystemAudioSupported(): boolean {
  // Chrome and Edge on Windows are most likely to support system audio
  const isChromium = navigator.userAgent.includes("Chrome") || navigator.userAgent.includes("Edg")
  const isWindows = navigator.userAgent.includes("Windows")

  return isChromium && isWindows
}

// Get the operating system
export function getOperatingSystem(): "windows" | "macos" | "linux" | "unknown" {
  const userAgent = window.navigator.userAgent
  if (userAgent.indexOf("Windows") !== -1) return "windows"
  if (userAgent.indexOf("Mac") !== -1) return "macos"
  if (userAgent.indexOf("Linux") !== -1) return "linux"
  return "unknown"
}

// Get screen capture with optimized settings for desktop application audio
export async function captureDesktopAudio(): Promise<MediaStream> {
  const os = getOperatingSystem()

  // Different constraints based on OS
  const constraints: MediaStreamConstraints = {
    audio: false,
    video: {
      width: 1,
      height: 1,
      frameRate: 1,
    },
  }

  if (os === "windows") {
    // Windows-specific constraints for Chrome/Edge
    constraints.audio = {
      // These settings help with application audio capture on Windows
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      // @ts-ignore - Non-standard but supported in Chrome/Edge on Windows
      suppressLocalAudioPlayback: false,
    }
  } else if (os === "macos") {
    // macOS has limited support for system audio
    constraints.audio = {
      // Basic audio settings for macOS
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    }
  }

  try {
    // Request with explicit guidance
    console.log("Requesting screen capture with constraints:", JSON.stringify(constraints))

    // Show guidance based on OS
    if (os === "windows") {
      console.log(
        "Windows detected: For application audio, select the specific application window and check 'Share audio'",
      )
    } else if (os === "macos") {
      console.log("macOS detected: System audio capture is limited. Consider using browser tab audio instead.")
    }

    const stream = await navigator.mediaDevices.getDisplayMedia(constraints)

    // Check if we got audio tracks
    const hasAudio = stream.getAudioTracks().length > 0
    console.log(`Screen capture obtained. Audio tracks: ${stream.getAudioTracks().length}`)

    if (!hasAudio) {
      console.warn("No audio tracks detected in screen capture")
    } else {
      // Log audio track details
      const audioTrack = stream.getAudioTracks()[0]
      console.log("Audio track details:", audioTrack.label, audioTrack.enabled, audioTrack.readyState)
    }

    return stream
  } catch (error) {
    console.error("Error capturing desktop audio:", error)
    throw error
  }
}

// Monitor audio levels to detect if audio is actually flowing
export function setupAudioMonitoring(stream: MediaStream): () => void {
  if (!stream.getAudioTracks().length) return () => {}

  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  const source = audioContext.createMediaStreamSource(stream)
  const analyser = audioContext.createAnalyser()
  analyser.fftSize = 256
  source.connect(analyser)

  const bufferLength = analyser.frequencyBinCount
  const dataArray = new Float32Array(bufferLength)

  let animationFrame: number

  // Check audio levels periodically
  const checkAudioLevels = () => {
    analyser.getFloatTimeDomainData(dataArray)

    // Calculate RMS (root mean square) to get volume level
    let sum = 0
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i] * dataArray[i]
    }
    const rms = Math.sqrt(sum / dataArray.length)

    // Log audio level
    console.log(`Audio level: ${rms.toFixed(6)}`)

    // Consider active if above noise floor
    const isActive = rms > 0.005
    if (isActive) {
      console.log("Audio activity detected!")
    }

    // Continue monitoring
    animationFrame = requestAnimationFrame(checkAudioLevels)
  }

  // Start monitoring
  checkAudioLevels()

  // Return cleanup function
  return () => {
    cancelAnimationFrame(animationFrame)
    source.disconnect()
    audioContext.close().catch((e) => console.error("Error closing audio context:", e))
  }
}
