import { type NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { writeFile } from "fs/promises"
import { join } from "path"
import { v4 as uuidv4 } from "uuid"
import { mkdir } from "fs/promises"

// Initialize OpenAI client with error handling
let openai: OpenAI
try {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set in environment variables")
  }
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
} catch (error) {
  console.error("Failed to initialize OpenAI client:", error)
  throw error
}

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

    // Create a temporary directory if it doesn't exist
    const tmpDir = join(process.cwd(), "tmp")
    try {
      await mkdir(tmpDir, { recursive: true })
    } catch (err) {
      console.log("Directory already exists or cannot be created")
    }

    // Save the file to disk temporarily
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Generate a unique filename
    const filename = `${uuidv4()}.${file.name.split(".").pop() || "webm"}`
    const filepath = join(tmpDir, filename)

    await writeFile(filepath, buffer)
    console.log(`File saved to ${filepath}`)

    // Call OpenAI's transcription API with the file path
    try {
      const transcription = await openai.audio.transcriptions.create({
        file: new File([buffer], file.name, { type: file.type }),
        model: "whisper-1",
        language: "en",
        response_format: "text",
      })

      console.log("Transcription successful")
      return NextResponse.json({ text: transcription }, { headers: corsHeaders })
    } catch (openaiError: any) {
      console.error("OpenAI API error:", openaiError)
      return NextResponse.json(
        { error: `OpenAI API error: ${openaiError.message}` },
        { status: 500, headers: corsHeaders }
      )
    }
  } catch (error: any) {
    console.error("Error in transcription API:", error)
    return NextResponse.json(
      { error: error.message || "Failed to transcribe audio" },
      { status: 500, headers: corsHeaders }
    )
  }
}
