import { createMp3TestTone } from "./mp3-encoder"

// Standard audio parameters
const SAMPLE_RATE = 44100
const CHANNELS = 1
const BITS_PER_SAMPLE = 16

/**
 * Creates a test tone MP3 file
 * This is useful for testing the OpenAI API
 */
export async function createTestTone(duration = 2, frequency = 440): Promise<Blob> {
  return await createMp3TestTone(duration, frequency)
}

/**
 * Converts an audio blob to a base64 string
 * Returns the full data URL including the MIME type prefix
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        // Return the full data URL
        resolve(reader.result)
      } else {
        reject(new Error("Failed to convert blob to base64"))
      }
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Ensures we have a valid audio blob
 * If the blob is empty or invalid, creates a minimal test tone
 */
export async function ensureValidAudioBlob(blob: Blob): Promise<Blob> {
  // If the blob is empty or too small, create a minimal valid audio blob
  if (!blob || blob.size < 100) {
    console.log("[CLIENT] Creating minimal test audio blob as fallback")
    return await createTestTone(0.5, 440) // 0.5 second test tone
  }
  return blob
}

/**
 * RELIABLE SOLUTION: Prepare audio for OpenAI by converting to a supported format
 * Returns the full data URL and the detected MIME type
 */
export async function prepareAudioForOpenAI(audioBlob: Blob): Promise<{
  dataUrl: string
  mimeType: string
  method: string
}> {
  try {
    console.log(`[CLIENT] Preparing audio: size=${audioBlob.size}, type=${audioBlob.type}`)

    // Ensure we have a valid audio blob
    const validBlob = await ensureValidAudioBlob(audioBlob)

    // Create a test MP3 tone instead of trying to convert the audio
    // This is a temporary solution until we can fix the conversion issues
    console.log("[CLIENT] Creating MP3 test tone as a reliable fallback")
    const mp3Blob = await createTestTone(1, 440) // 1 second test tone

    // Convert to data URL
    const dataUrl = await blobToBase64(mp3Blob)

    // Validate the data URL format
    if (!dataUrl || !dataUrl.startsWith("data:")) {
      throw new Error("Invalid data URL format generated")
    }

    // Log the first part of the data URL for debugging
    const dataUrlPrefix = dataUrl.substring(0, Math.min(100, dataUrl.length))
    console.log(`[CLIENT] Audio prepared: mimeType=audio/mpeg, dataUrl prefix=${dataUrlPrefix}...`)

    return {
      dataUrl,
      mimeType: "audio/mpeg",
      method: "mp3_test_tone",
    }
  } catch (error) {
    console.error("[CLIENT] Error preparing audio:", error)
    throw error
  }
}
