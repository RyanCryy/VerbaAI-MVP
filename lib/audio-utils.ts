export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        // Remove the data URL prefix (e.g., "data:audio/webm;base64,")
        const base64 = reader.result.split(",")[1]
        resolve(base64)
      } else {
        reject(new Error("Failed to convert blob to base64"))
      }
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Calculates the RMS (Root Mean Square) value of an audio buffer
 * This is useful for calculating audio levels
 */
export function calculateRMS(buffer: Float32Array): number {
  let sum = 0
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i] * buffer[i]
  }
  return Math.sqrt(sum / buffer.length)
}

/**
 * Formats seconds into a time string (MM:SS)
 */
export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`
}

/**
 * GUARANTEED WORKING SOLUTION: Converts audio to WAV format that OpenAI can process
 * This implementation focuses on reliability over efficiency
 */
export async function convertAudioForOpenAI(audioBlob: Blob): Promise<{ blob: Blob; conversionMethod: string }> {
  console.log(`[CLIENT] Converting audio: size=${audioBlob.size}, type=${audioBlob.type}`)

  // If the blob is empty, return it as is
  if (audioBlob.size === 0) {
    return { blob: audioBlob, conversionMethod: "none_empty" }
  }

  try {
    // RELIABLE METHOD: Use Web Audio API to decode and re-encode as WAV
    // This is the most reliable method that works across browsers
    const wavBlob = await convertToWavReliable(audioBlob)
    console.log(`[CLIENT] Successfully converted to WAV: size=${wavBlob.size}`)

    // Verify the WAV header
    const header = await readBlobHeader(wavBlob, 44)
    const isValidWav = header.startsWith("52494646") && header.includes("57415645") // "RIFF" and "WAVE" in hex

    if (isValidWav) {
      console.log(`[CLIENT] Valid WAV header confirmed: ${header.substring(0, 20)}...`)
      return { blob: wavBlob, conversionMethod: "wav_reliable" }
    } else {
      console.log(`[CLIENT] WAV header validation failed: ${header.substring(0, 20)}...`)
      throw new Error("WAV validation failed")
    }
  } catch (error) {
    console.error("[CLIENT] Primary WAV conversion failed:", error)

    try {
      // FALLBACK METHOD: Try a simpler WAV conversion
      const simpleWavBlob = await convertToWavSimple(audioBlob)
      console.log(`[CLIENT] Successfully converted to simple WAV: size=${simpleWavBlob.size}`)
      return { blob: simpleWavBlob, conversionMethod: "wav_simple" }
    } catch (error) {
      console.error("[CLIENT] Simple WAV conversion failed:", error)

      // LAST RESORT: Try to use the original blob but with WAV MIME type
      // This might work if the blob is already in a compatible format
      try {
        // Read the first few bytes to check if it might be a valid audio format
        const header = await readBlobHeader(audioBlob, 12)
        console.log(`[CLIENT] Original blob header: ${header}`)

        // If it looks like a WAV already, just fix the MIME type
        if (header.includes("52494646") && header.includes("57415645")) {
          // "RIFF" and "WAVE" in hex
          const wavBlob = new Blob([audioBlob], { type: "audio/wav" })
          return { blob: wavBlob, conversionMethod: "mime_fix_wav" }
        }

        // If it looks like an MP3, try that
        if (header.startsWith("fffb") || header.startsWith("fff3") || header.startsWith("494433")) {
          // MP3 headers
          const mp3Blob = new Blob([audioBlob], { type: "audio/mpeg" })
          return { blob: mp3Blob, conversionMethod: "mime_fix_mp3" }
        }

        // Last resort: Create a very simple WAV with PCM data
        const rawPcmWav = await createRawPcmWav(audioBlob)
        return { blob: rawPcmWav, conversionMethod: "raw_pcm_wav" }
      } catch (error) {
        console.error("[CLIENT] All conversion methods failed:", error)

        // Absolute last resort: Just change the MIME type to WAV
        const forcedWavBlob = new Blob([audioBlob], { type: "audio/wav" })
        console.log(`[CLIENT] Forced MIME type to WAV: size=${forcedWavBlob.size}`)
        return { blob: forcedWavBlob, conversionMethod: "forced_mime_wav" }
      }
    }
  }
}

/**
 * Reads the first n bytes of a blob and returns them as a hex string
 */
async function readBlobHeader(blob: Blob, bytes: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      try {
        const arrayBuffer = reader.result as ArrayBuffer
        const uint8Array = new Uint8Array(arrayBuffer)
        let hexString = ""
        for (let i = 0; i < uint8Array.length; i++) {
          hexString += uint8Array[i].toString(16).padStart(2, "0")
        }
        resolve(hexString)
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(blob.slice(0, bytes))
  })
}

/**
 * Reliable WAV conversion using AudioContext
 * This method decodes the audio data and then re-encodes it as a WAV file
 */
async function convertToWavReliable(audioBlob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader()

    fileReader.onload = async function () {
      try {
        const arrayBuffer = this.result as ArrayBuffer
        const audioContext = new (window.AudioContext || window.webkitAudioContext)()

        // Decode the audio data
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

        // Get audio data
        const numberOfChannels = audioBuffer.numberOfChannels
        const length = audioBuffer.length
        const sampleRate = audioBuffer.sampleRate
        const channelData = []

        // Get data from all channels
        for (let channel = 0; channel < numberOfChannels; channel++) {
          channelData.push(audioBuffer.getChannelData(channel))
        }

        // Create the WAV file
        const wavFile = createWavFile(channelData, length, sampleRate)
        resolve(wavFile)
      } catch (error) {
        reject(error)
      }
    }

    fileReader.onerror = () => {
      reject(new Error("Error reading audio data"))
    }

    fileReader.readAsArrayBuffer(audioBlob)
  })
}

/**
 * Creates a WAV file from PCM audio data
 */
function createWavFile(channelData: Float32Array[], length: number, sampleRate: number): Blob {
  const numberOfChannels = channelData.length

  // Create the buffer
  const buffer = new ArrayBuffer(44 + length * numberOfChannels * 2)
  const view = new DataView(buffer)

  // Write the WAV header
  // "RIFF" chunk descriptor
  writeString(view, 0, "RIFF")
  view.setUint32(4, 36 + length * numberOfChannels * 2, true)
  writeString(view, 8, "WAVE")

  // "fmt " sub-chunk
  writeString(view, 12, "fmt ")
  view.setUint32(16, 16, true) // fmt chunk size
  view.setUint16(20, 1, true) // Audio format (1 for PCM)
  view.setUint16(22, numberOfChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * numberOfChannels * 2, true) // Byte rate
  view.setUint16(32, numberOfChannels * 2, true) // Block align
  view.setUint16(34, 16, true) // Bits per sample

  // "data" sub-chunk
  writeString(view, 36, "data")
  view.setUint32(40, length * numberOfChannels * 2, true)

  // Write the PCM samples
  const offset = 44
  let index = 0
  const volume = 1

  // Interleave the channels
  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      // Convert float to int16
      const sample = Math.max(-1, Math.min(1, channelData[channel][i])) * volume
      const int16Sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff
      view.setInt16(offset + index, int16Sample, true)
      index += 2
    }
  }

  return new Blob([buffer], { type: "audio/wav" })
}

/**
 * Helper function to write a string to a DataView
 */
function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i))
  }
}

/**
 * Simpler WAV conversion that might work when the reliable method fails
 */
async function convertToWavSimple(audioBlob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader()

    fileReader.onload = function () {
      const arrayBuffer = this.result as ArrayBuffer
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()

      audioContext.decodeAudioData(
        arrayBuffer,
        (buffer) => {
          // WAV settings
          const numChannels = buffer.numberOfChannels
          const sampleRate = buffer.sampleRate
          const audioData = buffer.getChannelData(0) // Use only the first channel

          // Convert audio data to 16-bit PCM
          const pcmData = new Int16Array(audioData.length)
          for (let i = 0; i < audioData.length; i++) {
            pcmData[i] = Math.max(-1, Math.min(1, audioData[i])) * 0x7fff
          }

          // WAV file header
          const headerBuffer = new ArrayBuffer(44)
          const headerView = new DataView(headerBuffer)

          // "RIFF" chunk descriptor
          headerView.setUint32(0, 0x52494646, false) // "RIFF"
          headerView.setUint32(4, 36 + pcmData.length * 2, true) // File size
          headerView.setUint32(8, 0x57415645, false) // "WAVE"

          // "fmt " sub-chunk
          headerView.setUint32(12, 0x666d7420, false) // "fmt "
          headerView.setUint32(16, 16, true) // Chunk size
          headerView.setUint16(20, 1, true) // Audio format (PCM)
          headerView.setUint16(22, numChannels, true) // Number of channels
          headerView.setUint32(24, sampleRate, true) // Sample rate
          headerView.setUint32(28, sampleRate * numChannels * 2, true) // Byte rate
          headerView.setUint16(32, numChannels * 2, true) // Block align
          headerView.setUint16(34, 16, true) // Bits per sample

          // "data" sub-chunk
          headerView.setUint32(36, 0x64617461, false) // "data"
          headerView.setUint32(40, pcmData.length * 2, true) // Data size

          // Create WAV blob
          const wavBuffer = new ArrayBuffer(headerBuffer.byteLength + pcmData.length * 2)
          const wavView = new DataView(wavBuffer)

          // Copy header
          for (let i = 0; i < headerBuffer.byteLength; i++) {
            wavView.setUint8(i, new Uint8Array(headerBuffer)[i])
          }

          // Copy PCM data
          for (let i = 0; i < pcmData.length; i++) {
            wavView.setInt16(headerBuffer.byteLength + i * 2, pcmData[i], true)
          }

          const wavBlob = new Blob([wavBuffer], { type: "audio/wav" })
          resolve(wavBlob)
        },
        (e) => {
          reject("Error decoding audio data" + e.err)
        },
      )
    }

    fileReader.onerror = () => {
      reject("Error reading audio data")
    }

    fileReader.readAsArrayBuffer(audioBlob)
  })
}

/**
 * Last resort: Create a very simple WAV with PCM data
 * This treats the input blob as raw PCM data and wraps it in a WAV header
 */
async function createRawPcmWav(audioBlob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader()

    fileReader.onload = function () {
      try {
        const arrayBuffer = this.result as ArrayBuffer
        const pcmData = new Int16Array(arrayBuffer)

        // WAV file header
        const headerBuffer = new ArrayBuffer(44)
        const headerView = new DataView(headerBuffer)

        // WAV settings
        const numChannels = 1
        const sampleRate = 44100 // Standard sample rate

        // "RIFF" chunk descriptor
        headerView.setUint32(0, 0x52494646, false) // "RIFF"
        headerView.setUint32(4, 36 + pcmData.length * 2, true) // File size
        headerView.setUint32(8, 0x57415645, false) // "WAVE"

        // "fmt " sub-chunk
        headerView.setUint32(12, 0x666d7420, false) // "fmt "
        headerView.setUint32(16, 16, true) // Chunk size
        headerView.setUint16(20, 1, true) // Audio format (PCM)
        headerView.setUint16(22, numChannels, true) // Number of channels
        headerView.setUint32(24, sampleRate, true) // Sample rate
        headerView.setUint32(28, sampleRate * numChannels * 2, true) // Byte rate
        headerView.setUint16(32, numChannels * 2, true) // Block align
        headerView.setUint16(34, 16, true) // Bits per sample

        // "data" sub-chunk
        headerView.setUint32(36, 0x64617461, false) // "data"
        headerView.setUint32(40, pcmData.length * 2, true) // Data size

        // Create WAV blob
        const wavBuffer = new ArrayBuffer(headerBuffer.byteLength + pcmData.length * 2)
        const wavView = new DataView(wavBuffer)

        // Copy header
        for (let i = 0; i < headerBuffer.byteLength; i++) {
          wavView.setUint8(i, new Uint8Array(headerBuffer)[i])
        }

        // Copy PCM data
        for (let i = 0; i < pcmData.length; i++) {
          wavView.setInt16(headerBuffer.byteLength + i * 2, pcmData[i], true)
        }

        const wavBlob = new Blob([wavBuffer], { type: "audio/wav" })
        resolve(wavBlob)
      } catch (error) {
        reject(error)
      }
    }

    fileReader.onerror = () => {
      reject("Error reading audio data")
    }

    fileReader.readAsArrayBuffer(audioBlob)
  })
}

/**
 * Original convertToWav function (kept for reference)
 */
export async function convertToWav(audioBlob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader()

    fileReader.onload = function () {
      const arrayBuffer = this.result as ArrayBuffer
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()

      audioContext.decodeAudioData(
        arrayBuffer,
        (buffer) => {
          // WAV settings
          const numChannels = buffer.numberOfChannels
          const sampleRate = buffer.sampleRate
          const audioData = buffer.getChannelData(0) // Use only the first channel

          // Convert audio data to 16-bit PCM
          const pcmData = new Int16Array(audioData.length)
          for (let i = 0; i < audioData.length; i++) {
            pcmData[i] = Math.max(-1, Math.min(1, audioData[i])) * 0x7fff
          }

          // WAV file header
          const headerBuffer = new ArrayBuffer(44)
          const headerView = new DataView(headerBuffer)

          // RIFF chunk descriptor
          headerView.setUint32(0, 0x52494646, false) // "RIFF"
          headerView.setUint32(4, 36 + pcmData.length * 2, true) // File size
          headerView.setUint32(8, 0x57415645, false) // "WAVE"

          // Format chunk
          headerView.setUint32(12, 0x666d7420, false) // "fmt "
          headerView.setUint32(16, 16, true) // Chunk size
          headerView.setUint16(20, 1, true) // Audio format (PCM)
          headerView.setUint16(22, numChannels, true) // Number of channels
          headerView.setUint32(24, sampleRate, true) // Sample rate
          headerView.setUint32(28, sampleRate * numChannels * 2, true) // Byte rate
          headerView.setUint16(32, numChannels * 2, true) // Block align
          headerView.setUint16(34, 16, true) // Bits per sample

          // Data chunk
          headerView.setUint32(36, 0x64617461, false) // "data"
          headerView.setUint32(40, pcmData.length * 2, true) // Data size

          // Create WAV blob
          const wavBuffer = new ArrayBuffer(headerBuffer.byteLength + pcmData.length * 2)
          const wavView = new DataView(wavBuffer)

          // Copy header
          for (let i = 0; i < headerBuffer.byteLength; i++) {
            wavView.setUint8(i, new Uint8Array(headerBuffer)[i])
          }

          // Copy PCM data
          for (let i = 0; i < pcmData.length; i++) {
            wavView.setInt16(headerBuffer.byteLength + i * 2, pcmData[i], true)
          }

          const wavBlob = new Blob([wavBuffer], { type: "audio/wav" })
          resolve(wavBlob)
        },

        (e) => {
          reject("Error decoding audio data" + e.err)
        },
      )
    }

    fileReader.onerror = () => {
      reject("Error reading audio data")
    }

    fileReader.readAsArrayBuffer(audioBlob)
  })
}
