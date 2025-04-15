import { type NextRequest, NextResponse } from "next/server"
import { writeFile } from "fs/promises"
import { join } from "path"
import { v4 as uuidv4 } from "uuid"
import { mkdir } from "fs/promises"

// Add CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  try {
    // Check if the request is multipart form data
    const contentType = request.headers.get("content-type") || ""

    if (!contentType.includes("multipart/form-data")) {
      console.error("Expected multipart/form-data, got:", contentType)
      return NextResponse.json(
        { error: "Invalid content type. Expected multipart/form-data." },
        { status: 400, headers: corsHeaders }
      )
    }

    // Parse the form data
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400, headers: corsHeaders }
      )
    }

    // Log file details for debugging
    console.log(`Received file: ${file.name}, type: ${file.type}, size: ${file.size} bytes`)

    // Convert the file to base64
    const buffer = Buffer.from(await file.arrayBuffer())
    const audioContent = buffer.toString('base64')

    // Prepare the request to Google Cloud Speech-to-Text API
    const requestBody = {
      config: {
        encoding: 'WEBM_OPUS',
        sampleRateHertz: 48000,
        languageCode: 'en-US',
        model: 'latest_long',
        enableAutomaticPunctuation: true,
        useEnhanced: true,
        audioChannelCount: 2,  // Specify 2 channels for stereo audio
        enableSeparateRecognitionPerChannel: true,
        enableWordTimeOffsets: true,
        diarizationConfig: {
          enableSpeakerDiarization: true,
          minSpeakerCount: 2,
          maxSpeakerCount: 2
        }
      },
      audio: {
        content: audioContent
      }
    }

    // Call Google Cloud Speech-to-Text API using v1p1beta1 endpoint for speaker diarization
    const response = await fetch(
      `https://speech.googleapis.com/v1p1beta1/speech:recognize?key=${process.env.GOOGLE_CLOUD_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`Google Speech-to-Text API error: ${JSON.stringify(errorData)}`)
    }

    const data = await response.json()

    // Process the diarized transcription
    let currentSpeaker = -1
    let conversationText = ''
    let currentUtterance = ''

    // Process each word with speaker tags
    data.results?.forEach((result: any) => {
      if (result.alternatives?.[0]?.words) {
        const words = result.alternatives[0].words

        words.forEach((word: any) => {
          const speakerTag = word.speakerTag || 0

          if (currentSpeaker !== speakerTag) {
            // If we have accumulated text for the previous speaker, add it
            if (currentUtterance.trim()) {
              conversationText += `Speaker ${currentSpeaker + 1}: ${currentUtterance.trim()}\n\n`
            }

            // Start new utterance for new speaker
            currentSpeaker = speakerTag
            currentUtterance = word.word + ' '
          } else {
            // Continue current utterance
            currentUtterance += word.word + ' '
          }
        })
      }
    })

    // Add the last utterance
    if (currentUtterance.trim()) {
      conversationText += `Speaker ${currentSpeaker + 1}: ${currentUtterance.trim()}\n\n`
    }

    console.log("Transcription with diarization successful")
    return NextResponse.json({ text: conversationText.trim() }, { headers: corsHeaders })
  } catch (error: any) {
    console.error("Error in transcription API:", error)
    return NextResponse.json(
      { error: error.message || "Failed to transcribe audio" },
      { status: 500, headers: corsHeaders }
    )
  }
}
