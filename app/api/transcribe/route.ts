import { type NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { writeFile } from "fs/promises"
import { join } from "path"
import { v4 as uuidv4 } from "uuid"
import { mkdir } from "fs/promises"

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    // Check if the request is multipart form data
    const contentType = request.headers.get("content-type") || ""

    if (!contentType.includes("multipart/form-data")) {
      console.error("Expected multipart/form-data, got:", contentType)
      return NextResponse.json({ error: "Invalid content type. Expected multipart/form-data." }, { status: 400 })
    }

    // Parse the form data
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
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
    // Updated to use the correct method for the latest OpenAI SDK
    const transcription = await openai.audio.transcriptions.create({
      file: new File([buffer], file.name, { type: file.type }),
      model: "whisper-1",
      language: "en",
      response_format: "text",
    })

    console.log("Transcription successful")

    // Return the transcription
    return NextResponse.json({ text: transcription })
  } catch (error: any) {
    console.error("Error in transcription API:", error)
    return NextResponse.json({ error: error.message || "Failed to transcribe audio" }, { status: 500 })
  }
}
