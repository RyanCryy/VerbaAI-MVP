import { type NextRequest, NextResponse } from "next/server"
import { SpeechClient } from '@google-cloud/speech'

// Add CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

// Initialize Google Cloud Speech client
const speechClient = new SpeechClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
})

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(req: NextRequest) {
  try {
    // Check content type
    const contentType = req.headers.get('content-type')
    if (!contentType?.includes('multipart/form-data')) {
      console.error('Invalid content type:', contentType)
      return NextResponse.json(
        { error: 'Content type must be multipart/form-data' },
        { status: 400, headers: corsHeaders }
      )
    }

    const formData = await req.formData()
    const audioFile = formData.get('file') as File

    if (!audioFile) {
      console.error('No audio file found in form data')
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400, headers: corsHeaders }
      )
    }

    console.log(`Received file: ${audioFile.name}, type: ${audioFile.type}, size: ${audioFile.size} bytes`)

    // Convert audio file to base64
    const buffer = Buffer.from(await audioFile.arrayBuffer())
    const audioContent = buffer.toString('base64')

    // Log audio content details
    console.log(`Audio content length: ${audioContent.length} characters`)
    console.log(`Audio content preview: ${audioContent.substring(0, 100)}...`)

    // Configure the request
    const config = {
      encoding: 'WEBM_OPUS',
      sampleRateHertz: 48000,
      languageCode: 'en-US',
      enableAutomaticPunctuation: true,
      model: 'phone_call',
      audioChannelCount: 2,
      useEnhanced: true,
      diarizationConfig: {
        enableSpeakerDiarization: true,
        minSpeakerCount: 2,
        maxSpeakerCount: 2
      }
    }

    const audio = {
      content: audioContent
    }

    console.log('Starting long running recognition with config:', config)

    // Use longRunningRecognize for better handling of longer audio
    const [operation] = await speechClient.longRunningRecognize({
      config: config as any,
      audio: audio,
    })

    console.log('Operation started, waiting for completion...')
    const [response] = await operation.promise()

    if (!response.results || response.results.length === 0) {
      console.error('No transcription results received')
      throw new Error('No transcription received from API')
    }

    console.log(`Received ${response.results.length} results from API`)

    // Format the transcription with speaker labels
    let transcription = ''
    let currentSpeaker = null
    let currentText = ''

    if (response.results) {
      console.log(`Number of results: ${response.results.length}`)

      // Process all results for speaker diarization
      for (const result of response.results) {
        if (result.alternatives && result.alternatives[0]) {
          const words = result.alternatives[0].words || []

          for (const wordInfo of words) {
            // Check if this word has speaker information
            if (wordInfo.speakerTag && wordInfo.speakerTag !== currentSpeaker) {
              // If we have accumulated text for the previous speaker, add it
              if (currentText.trim()) {
                transcription += `Speaker ${currentSpeaker || '1'}: ${currentText.trim()}\n`
              }
              currentSpeaker = wordInfo.speakerTag
              currentText = ''
            }

            // Add the word to the current speaker's text
            currentText += `${wordInfo.word} `
          }
        }
      }

      // Add the last speaker's text if any remains
      if (currentText.trim()) {
        transcription += `Speaker ${currentSpeaker || '1'}: ${currentText.trim()}\n`
      }
    }

    console.log('Final transcription with speakers:', transcription)
    return NextResponse.json({ transcription }, { headers: corsHeaders })
  } catch (error: any) {
    console.error('Error in transcription API:', error)
    return NextResponse.json(
      { error: `Transcription API error: ${error.message}` },
      { status: 500, headers: corsHeaders }
    )
  }
}
