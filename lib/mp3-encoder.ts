const LAME_JS_URL = "https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js"

// Load lamejs from CDN
let lamePromise: Promise<any> | null = null

function loadLame(): Promise<any> {
  if (!lamePromise) {
    lamePromise = new Promise((resolve, reject) => {
      // Check if it's already loaded
      if ((window as any).lamejs) {
        resolve((window as any).lamejs)
        return
      }

      // Load the script
      const script = document.createElement("script")
      script.src = LAME_JS_URL
      script.async = true

      script.onload = () => {
        if ((window as any).lamejs) {
          resolve((window as any).lamejs)
        } else {
          reject(new Error("Failed to load lamejs"))
        }
      }

      script.onerror = () => {
        reject(new Error("Failed to load lamejs"))
      }

      document.body.appendChild(script)
    })
  }

  return lamePromise
}

/**
 * Converts PCM audio data to MP3 format
 */
export async function convertToMp3(audioData: Float32Array, sampleRate = 44100): Promise<Blob> {
  try {
    // Load lamejs
    await loadLame()
    const lamejs = (window as any).lamejs

    if (!lamejs) {
      throw new Error("lamejs not loaded")
    }

    // MP3 encoder settings
    const bitRate = 128
    const mp3encoder = new lamejs.Mp3Encoder(1, sampleRate, bitRate) // Mono, sample rate, bitrate

    // Convert float32 to int16
    const samples = new Int16Array(audioData.length)
    for (let i = 0; i < audioData.length; i++) {
      // Scale to 16-bit range and clip
      const sample = Math.max(-1, Math.min(1, audioData[i]))
      samples[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff
    }

    // Encode to MP3
    const mp3Data = []
    const blockSize = 1152 // Must be a multiple of 576

    for (let i = 0; i < samples.length; i += blockSize) {
      const sampleBlock = samples.subarray(i, i + blockSize)
      const mp3buf = mp3encoder.encodeBuffer(sampleBlock)
      if (mp3buf.length > 0) {
        mp3Data.push(mp3buf)
      }
    }

    // Get the last buffer
    const mp3buf = mp3encoder.flush()
    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf)
    }

    // Combine all chunks
    const totalLength = mp3Data.reduce((acc, buf) => acc + buf.length, 0)
    const mp3Buffer = new Uint8Array(totalLength)
    let offset = 0

    for (const buf of mp3Data) {
      mp3Buffer.set(buf, offset)
      offset += buf.length
    }

    // Create MP3 blob
    return new Blob([mp3Buffer], { type: "audio/mpeg" })
  } catch (error) {
    console.error("Error converting to MP3:", error)
    throw error
  }
}

/**
 * Creates a simple MP3 test tone - CLEAN VERSION
 * This creates a pure sine wave with no external audio
 */
export async function createMp3TestTone(duration = 2, frequency = 440): Promise<Blob> {
  try {
    // Generate a sine wave
    const sampleRate = 44100
    const numSamples = Math.floor(duration * sampleRate)
    const audioData = new Float32Array(numSamples)

    // Create a pure sine wave with no external audio
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate
      audioData[i] = Math.sin(2 * Math.PI * frequency * t) * 0.5 // 0.5 amplitude
    }

    // Convert to MP3
    return await convertToMp3(audioData, sampleRate)
  } catch (error) {
    console.error("Error creating MP3 test tone:", error)
    throw error
  }
}

/**
 * Records audio directly to MP3 format
 */
export function createMp3Recorder(stream: MediaStream, onDataAvailable: (mp3Blob: Blob) => void) {
  // Create audio context and source
  const audioContext = new (window as any).AudioContext()
  const source = audioContext.createMediaStreamSource(stream)
  const processor = audioContext.createScriptProcessor(4096, 1, 1)

  // Buffer to store audio data
  const audioBuffer: Float32Array[] = []
  let isRecording = false

  // Process audio data
  processor.onaudioprocess = async (e: any) => {
    if (!isRecording) return

    const inputData = e.inputBuffer.getChannelData(0)
    const audioData = new Float32Array(inputData.length)
    audioData.set(inputData)
    audioBuffer.push(audioData)
  }

  // Connect nodes
  source.connect(processor)
  processor.connect(audioContext.destination)

  return {
    start: () => {
      audioBuffer.length = 0
      isRecording = true
    },

    stop: async () => {
      isRecording = false

      try {
        // Concatenate all chunks
        const totalLength = audioBuffer.reduce((acc, chunk) => acc + chunk.length, 0)
        const mergedData = new Float32Array(totalLength)
        let offset = 0

        for (const chunk of audioBuffer) {
          mergedData.set(chunk, offset)
          offset += chunk.length
        }

        // Convert to MP3
        const mp3Blob = await convertToMp3(mergedData, audioContext.sampleRate)
        onDataAvailable(mp3Blob)

        // Clean up
        processor.disconnect()
        source.disconnect()
        audioContext.close()
      } catch (error) {
        console.error("Error in MP3 recorder stop:", error)
      }
    },

    requestData: async () => {
      if (!isRecording || audioBuffer.length === 0) return

      try {
        // Create a copy of the current buffer
        const bufferCopy = [...audioBuffer]

        // Concatenate chunks
        const totalLength = bufferCopy.reduce((acc, chunk) => acc + chunk.length, 0)
        const mergedData = new Float32Array(totalLength)
        let offset = 0

        for (const chunk of bufferCopy) {
          mergedData.set(chunk, offset)
          offset += chunk.length
        }

        // Convert to MP3
        const mp3Blob = await convertToMp3(mergedData, audioContext.sampleRate)
        onDataAvailable(mp3Blob)
      } catch (error) {
        console.error("Error in MP3 recorder requestData:", error)
      }
    },
  }
}
