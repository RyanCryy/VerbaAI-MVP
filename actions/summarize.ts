"use server"

import OpenAI from 'openai'

export type SummaryMode = "tldr" | "executive" | "notes" | "bullets" | "actions" | "sales"

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// Debug: Log API key status
console.log('OpenAI API Key present:', !!process.env.OPENAI_API_KEY)
console.log('OpenAI API Key length:', process.env.OPENAI_API_KEY?.length)

// Helper function to count filler words
function countFillerWords(text: string): number {
  const fillerWords = ['um', 'uh', 'like', 'you know', 'basically', 'actually', 'literally', 'honestly']
  return fillerWords.reduce((count, word) => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi')
    return count + (text.match(regex) || []).length
  }, 0)
}

// Helper function to detect interruptions
function detectInterruptions(text: string): number {
  const interruptionPatterns = [
    /but\s/i,
    /however\s/i,
    /wait\s/i,
    /hold on\s/i,
    /let me\s/i,
    /actually\s/i
  ]
  return interruptionPatterns.reduce((count, pattern) => {
    return count + (text.match(pattern) || []).length
  }, 0)
}

// Helper function to detect objections
function detectObjections(text: string): string[] {
  const objections = [
    { pattern: /too expensive|cost too much|price is high/i, type: 'Price' },
    { pattern: /already using|current solution|existing tool/i, type: 'Existing Solution' },
    { pattern: /not the right time|too early|later/i, type: 'Timing' },
    { pattern: /not sure|need to think|consider/i, type: 'Uncertainty' }
  ]

  return objections
    .filter(obj => obj.pattern.test(text))
    .map(obj => obj.type)
}

// Helper function to detect content topics
function detectTopics(text: string): string[] {
  const topics = [
    { pattern: /price|cost|pricing|budget|investment/i, type: 'Pricing' },
    { pattern: /competitor|competition|alternative|vs\.|versus/i, type: 'Competitors' },
    { pattern: /budget|cost|investment|price/i, type: 'Budget' },
    { pattern: /timeline|schedule|when|deadline/i, type: 'Timeline' },
    { pattern: /feature|function|capability|can it|does it/i, type: 'Features' }
  ]

  return [...new Set(topics
    .filter(topic => topic.pattern.test(text))
    .map(topic => topic.type))]
}

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
        prompt = `Please provide a concise TL;DR summary of the following conversation:\n\n${transcription}`
        break
      case "executive":
        prompt = `Please provide an executive summary of the following conversation, highlighting key points and decisions:\n\n${transcription}`
        break
      case "notes":
        prompt = `Please create detailed notes from the following conversation, organizing key points and important details:\n\n${transcription}`
        break
      case "bullets":
        prompt = `Please create bullet points summarizing the key points from this conversation:\n\n${transcription}`
        break
      case "actions":
        prompt = `Please extract action items and next steps from this conversation:\n\n${transcription}`
        break
      case "sales":
        prompt = `Please analyze this sales conversation and provide insights on key points, objections, and next steps:\n\n${transcription}`
        break
    }

    // Make the API call with a timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Analysis timed out after 30 seconds')), 30000)
    })

    const completionPromise = openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that summarizes conversations accurately and concisely."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    }).catch(error => {
      console.error('[SERVER] OpenAI API error:', error)
      throw new Error(`OpenAI API error: ${error.message}`)
    })

    // Race between the API call and timeout
    const result = await Promise.race([
      completionPromise,
      timeoutPromise
    ])

    if (!result) {
      throw new Error('No summary generated')
    }

    const summary = result.choices[0]?.message?.content || null

    if (!summary) {
      throw new Error('Failed to generate summary')
    }

    return { summary, error: null }
  } catch (error: any) {
    console.error("Error in summarization:", error)
    return { summary: null, error: error.message || "Failed to generate summary" }
  }
}
