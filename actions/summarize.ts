"use server"

import OpenAI from "openai"

export type SummaryMode = "tldr" | "executive" | "notes" | "bullets" | "actions"

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function summarizeTranscription(transcription: string, mode: SummaryMode = "tldr") {
  try {
    if (!transcription || transcription.length < 10) {
      return { summary: null, error: "Transcription is too short to summarize" }
    }

    console.log(`[SERVER] Generating ${mode} summary for transcription of length ${transcription.length}`)

    // Create a prompt based on the summary mode
    let prompt = ""
    switch (mode) {
      case "tldr":
        prompt = `Please provide a concise TL;DR summary of the following transcription:\n\n${transcription}`
        break
      case "executive":
        prompt = `Please provide a professional executive summary of the following transcription, highlighting key points and decisions:\n\n${transcription}`
        break
      case "notes":
        prompt = `Please convert the following transcription into organized study notes with headings, subheadings, and bullet points:\n\n${transcription}`
        break
      case "bullets":
        prompt = `Please extract the main points from the following transcription as bullet points:\n\n${transcription}`
        break
      case "actions":
        prompt = `Please identify and list all action items, tasks, and commitments mentioned in the following transcription:\n\n${transcription}`
        break
      default:
        prompt = `Please summarize the following transcription:\n\n${transcription}`
    }

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that specializes in summarizing transcriptions accurately and concisely.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.5,
      max_tokens: 1000,
    })

    // Extract the summary from the response
    const summary = response.choices[0]?.message?.content || ""

    console.log(`[SERVER] Summary generated successfully: ${summary.substring(0, 50)}...`)

    return { summary, error: null }
  } catch (error: any) {
    console.error("[SERVER] Summary error:", error)
    return { summary: null, error: error.message || "Failed to generate summary" }
  }
}
