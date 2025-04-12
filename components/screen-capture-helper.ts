import { captureDesktopAudio } from "./desktop-audio-capture"

// Check if the browser supports getDisplayMedia
export function isScreenCaptureSupported(): boolean {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia)
}

// Get screen capture with optimized audio settings
export async function getScreenCaptureWithAudio(): Promise<MediaStream> {
  if (!isScreenCaptureSupported()) {
    throw new Error("Screen capture is not supported in this browser")
  }

  try {
    // Use specialized desktop audio capture for applications like Spotify
    const stream = await captureDesktopAudio()

    // Check if we got audio tracks
    const hasAudio = stream.getAudioTracks().length > 0

    if (!hasAudio) {
      console.warn("No audio tracks detected in screen capture")
    }

    return stream
  } catch (error) {
    console.error("Error capturing screen:", error)
    throw error
  }
}

// Helper to detect if audio is actually flowing in the stream
export function detectAudioActivity(
  stream: MediaStream,
  callback: (isActive: boolean, level: number) => void,
): () => void {
  if (!stream.getAudioTracks().length) {
    callback(false, 0)
    return () => {}
  }

  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  const source = audioContext.createMediaStreamSource(stream)
  const analyser = audioContext.createAnalyser()
  analyser.fftSize = 256
  source.connect(analyser)

  const bufferLength = analyser.frequencyBinCount
  const dataArray = new Float32Array(bufferLength)

  let animationFrame: number

  const checkAudio = () => {
    analyser.getFloatTimeDomainData(dataArray)

    // Calculate RMS (root mean square) to get volume level
    let sum = 0
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i] * dataArray[i]
    }
    const rms = Math.sqrt(sum / dataArray.length)

    // Consider active if above noise floor
    const isActive = rms > 0.01

    callback(isActive, rms)
    animationFrame = requestAnimationFrame(checkAudio)
  }

  checkAudio()

  // Return cleanup function
  return () => {
    cancelAnimationFrame(animationFrame)
    source.disconnect()
    audioContext.close()
  }
}
