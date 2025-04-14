"use server"

import { LanguageServiceClient } from '@google-cloud/language'

export type SummaryMode = "tldr" | "executive" | "notes" | "bullets" | "actions"

// Initialize Google Cloud Language client
const languageClient = new LanguageServiceClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
})

export async function summarizeTranscription(transcription: string, mode: SummaryMode = "tldr") {
  try {
    if (!transcription || transcription.length < 10) {
      return { summary: null, error: "Transcription is too short to summarize" }
    }

    console.log(`[SERVER] Generating ${mode} summary for transcription of length ${transcription.length}`)

    // Create a document for analysis
    const document = {
      content: transcription,
      type: 'PLAIN_TEXT',
    }

    try {
      // Analyze the document
      const [result] = await languageClient.analyzeSentiment({
        document: document,
        encodingType: 'UTF8',
      })

      // Extract sentences with highest sentiment scores for summary
      const sentences = result.sentences || []
      const sortedSentences = sentences
        .sort((a, b) => (b.sentiment?.score || 0) - (a.sentiment?.score || 0))
        .slice(0, 5) // Get top 5 most important sentences
        .sort((a, b) => (a.text?.beginOffset || 0) - (b.text?.beginOffset || 0)) // Resort by original order

      // Create summary based on mode
      let summary = ''
      switch (mode) {
        case "tldr":
          summary = sortedSentences
            .map(sentence => sentence.text?.content || '')
            .join(' ')
          break
        case "executive":
          summary = `Executive Summary:\n\n${sortedSentences
            .map(sentence => `- ${sentence.text?.content}`)
            .join('\n')}`
          break
        case "notes":
          summary = `Key Points:\n\n${sortedSentences
            .map(sentence => `• ${sentence.text?.content}`)
            .join('\n')}`
          break
        case "bullets":
          summary = sortedSentences
            .map(sentence => `• ${sentence.text?.content}`)
            .join('\n')
          break
        case "actions":
          // Filter sentences that might contain action items
          const actionSentences = sentences.filter(sentence =>
            (sentence.text?.content || '').toLowerCase().includes('need to') ||
            (sentence.text?.content || '').toLowerCase().includes('should') ||
            (sentence.text?.content || '').toLowerCase().includes('must') ||
            (sentence.text?.content || '').toLowerCase().includes('will')
          )
          summary = `Action Items:\n\n${actionSentences
            .map(sentence => `- ${sentence.text?.content}`)
            .join('\n')}`
          break
        default:
          summary = sortedSentences
            .map(sentence => sentence.text?.content || '')
            .join(' ')
      }

      return { summary, error: null }
    } catch (error: any) {
      console.error("Google Language API error:", error)
      return { summary: null, error: `Failed to generate summary: ${error.message}` }
    }
  } catch (error: any) {
    console.error("Error in summarization:", error)
    return { summary: null, error: error.message || "Failed to generate summary" }
  }
}
