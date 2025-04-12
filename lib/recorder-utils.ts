const SAMPLE_RATE = 44100

/**
 * Creates a WAV file from raw PCM audio data
 */
export function createWavFileFromPcm(pcmData: Float32Array, numChannels = 1, sampleRate = SAMPLE_RATE): Blob {
  // Create the WAV file header
  const dataLength = pcmData.length * 2 // 16-bit samples
  const buffer = new ArrayBuffer(44 + dataLength)
  const view = new DataView(buffer)

  // "RIFF" chunk descriptor
  writeString(view, 0, "RIFF")
  view.setUint32(4, 36 + dataLength, true)
  writeString(view, 8, "WAVE")

  // "fmt " sub-chunk
  writeString(view, 12, "fmt ")
  view.setUint32(16, 16, true) // fmt chunk size
  view.setUint16(20, 1, true) // Audio format (1 for PCM)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * numChannels * 2, true) // Byte rate
  view.setUint16(32, numChannels * 2, true) // Block align
  view.setUint16(34, 16, true) // Bits per sample

  // "data" sub-chunk
  writeString(view, 36, "data")
  view.setUint32(40, dataLength, true)

  // Write the PCM samples
  const volume = 1
  let index = 44
  for (let i = 0; i < pcmData.length; i++) {
    // Convert float to int16
    const sample = Math.max(-1, Math.min(1, pcmData[i])) * volume
    const int16Sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff
    view.setInt16(index, int16Sample, true)
    index += 2
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
 * Creates a recorder that captures audio directly to WAV format
 */
export function createWavRecorder(stream: MediaStream, onDataAvailable: (wavBlob: Blob) => void) {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)()
  const source = audioContext.createMediaStreamSource(stream)
  const processor = audioContext.createScriptProcessor(4096, 1, 1)

  const sampleRate = audioContext.sampleRate
  const recordedData: Float32Array[] = []

  processor.onaudioprocess = (e) => {
    const inputData = e.inputBuffer.getChannelData(0)
    const audioData = new Float32Array(inputData.length)
    audioData.set(inputData)
    recordedData.push(audioData)
  }

  source.connect(processor)
  processor.connect(audioContext.destination)

  let isRecording = false

  return {
    start: () => {
      recordedData.length = 0
      isRecording = true
    },

    stop: () => {
      isRecording = false

      // Concatenate all chunks
      const totalLength = recordedData.reduce((acc, chunk) => acc + chunk.length, 0)
      const mergedData = new Float32Array(totalLength)
      let offset = 0

      for (const chunk of recordedData) {
        mergedData.set(chunk, offset)
        offset += chunk.length
      }

      // Create WAV file
      const wavBlob = createWavFileFromPcm(mergedData, 1, sampleRate)
      onDataAvailable(wavBlob)

      // Clean up
      processor.disconnect()
      source.disconnect()
      audioContext.close()
    },

    requestData: () => {
      if (!isRecording || recordedData.length === 0) return

      // Create a WAV from current data without stopping
      const totalLength = recordedData.reduce((acc, chunk) => acc + chunk.length, 0)
      const mergedData = new Float32Array(totalLength)
      let offset = 0

      for (const chunk of recordedData) {
        mergedData.set(chunk, offset)
        offset += chunk.length
      }

      const wavBlob = createWavFileFromPcm(mergedData, 1, sampleRate)
      onDataAvailable(wavBlob)
    },
  }
}

/**
 * Creates a recorder that captures audio to MP3 format using MediaRecorder
 */
export function createMp3Recorder(stream: MediaStream, onDataAvailable: (blob: Blob) => void) {
  let options = {}

  // Try to use MP3 if supported
  if (MediaRecorder.isTypeSupported("audio/mp3")) {
    options = { mimeType: "audio/mp3" }
  } else if (MediaRecorder.isTypeSupported("audio/mpeg")) {
    options = { mimeType: "audio/mpeg" }
  } else if (MediaRecorder.isTypeSupported("audio/webm;codecs=mp3")) {
    options = { mimeType: "audio/webm;codecs=mp3" }
  }

  const recorder = new MediaRecorder(stream, options)
  const chunks: Blob[] = []

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) {
      chunks.push(e.data)

      // Create a blob from all chunks
      const blob = new Blob(chunks, { type: recorder.mimeType })
      onDataAvailable(blob)

      // Clear chunks after sending
      chunks.length = 0
    }
  }

  return recorder
}

/**
 * Converts an audio blob to base64 format
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        // Extract the base64 data (remove the data URL prefix)
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
 * Creates a sample WAV file with a test tone
 * This is useful for testing the OpenAI API with a known good WAV file
 */
export function createTestToneWav(duration = 1, frequency = 440): Blob {
  const sampleRate = 44100
  const numSamples = Math.floor(duration * sampleRate)
  const data = new Float32Array(numSamples)

  // Generate a sine wave
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate
    data[i] = Math.sin(2 * Math.PI * frequency * t) * 0.5 // 0.5 amplitude
  }

  return createWavFileFromPcm(data, 1, sampleRate)
}
