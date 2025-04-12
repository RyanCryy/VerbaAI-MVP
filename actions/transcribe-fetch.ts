"use server"

import { writeFile } from "fs/promises"
import { join } from "path"
import { tmpdir } from "os"
import { v4 as uuidv4 } from "uuid"

export async function transcribeAudioWithFetch(
  audioBase64: string,
  previousTranscription = "",
  isFinal = false,
  language = "en-US",
  quality: "standard" | "high" = "standard",
  enableDiarization = false,
  enableVoiceFocus = true,
) {
  try {
    console.log(`[SERVER] Transcribing audio with fetch: length=${audioBase64?.length || 0}, isFinal=${isFinal}`)

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

    // Create a FormData object
    const formData = new FormData()

    // Add the file to the form data
    const file = new File([buffer], "audio.webm", { type: "audio/webm" })
    formData.append("file", file)
    formData.append("model", "whisper-1")
    formData.append("response_format", "text")

    if (language) {
      formData.append("language", language.split("-")[0])
    }

    // Call OpenAI's transcription API with fetch
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`)
    }

    // Get the transcription text
    const transcriptionText = await response.text()

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
