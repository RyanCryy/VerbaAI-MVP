"use server"

import OpenAI from "openai"
import { createReadStream } from "fs"
import { writeFile } from "fs/promises"
import { join } from "path"
import { tmpdir } from "os"
import { v4 as uuidv4 } from "uuid"

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function transcribeAudio(
  audioBase64: string,
  previousTranscription = "",
  isFinal = false,
  language = "en-US",
  quality: "standard" | "high" = "standard",
  enableDiarization = false,
  enableVoiceFocus = true,
) {
  try {
    console.log(`[SERVER] Transcribing audio: length=${audioBase64?.length || 0}, isFinal=${isFinal}`)

    if (!audioBase64 || audioBase64.length < 100) {
      console.log("[SERVER] Audio data too small or empty")
      return { text: null, error: "Audio data is empty or too small" }
    }

    // Extract the base64 data (remove the data URL prefix if present)
    let base64Data = audioBase64
    if (base64Data.includes("base64,")) {
      base64Data = base64Data.split("base64,")[1]
    }

    // Create a buffer from the base64 data
    const buffer = Buffer.from(base64Data, "base64")

    // Save buffer to a temporary file
    const tempFilePath = join(tmpdir(), `audio-${uuidv4()}.webm`)
    await writeFile(tempFilePath, buffer)

    // Create a file stream that OpenAI can use
    const fileStream = createReadStream(tempFilePath)

    // Call OpenAI's transcription API with the file
    const response = await openai.audio.transcriptions.create({
      file: fileStream,
      model: "whisper-1",
      language: language.split("-")[0], // Extract primary language code
      response_format: "text",
    })

    // Get the transcription text
    const transcriptionText = response.toString()

    console.log(`[SERVER] Transcription successful: ${transcriptionText.substring(0, 50)}...`)

    return { text: transcriptionText, error: null }
  } catch (error: any) {
    console.error("[SERVER] Transcription error:", error)
    return {
      text: null,
      error: error.message || "Failed to transcribe audio",
    }
  }
}
