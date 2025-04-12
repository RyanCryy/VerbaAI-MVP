"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Copy, Check, Download } from "lucide-react"

interface SpeakerTranscriptionDisplayProps {
  text: string
  interimText?: string
}

export default function SpeakerTranscriptionDisplay({ text, interimText = "" }: SpeakerTranscriptionDisplayProps) {
  const [copied, setCopied] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Scroll to bottom when text changes
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [text, interimText])

  const copyToClipboard = async () => {
    if (!text) return

    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy text:", error)
    }
  }

  const downloadTranscription = () => {
    if (!text) return

    try {
      // Create a blob with the text content
      const blob = new Blob([text], { type: "text/plain" })

      // Create a URL for the blob
      const url = URL.createObjectURL(blob)

      // Create a temporary anchor element
      const a = document.createElement("a")
      a.href = url

      // Generate a filename with current date and time
      const date = new Date()
      const formattedDate = date.toISOString().replace(/[:.]/g, "-").slice(0, 19)
      a.download = `transcription-${formattedDate}.txt`

      // Append to the document, click it, and remove it
      document.body.appendChild(a)
      a.click()

      // Clean up
      setTimeout(() => {
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }, 100)
    } catch (error) {
      console.error("Failed to download transcription:", error)
    }
  }

  // Format the text to highlight speaker labels
  const formatTranscription = (text: string) => {
    if (!text) return null

    // Split by speaker labels (Speaker 1:, Speaker 2:, etc.)
    const parts = text.split(/\b(Speaker \d+:)/g)

    return parts.map((part, index) => {
      if (part.match(/^Speaker \d+:/)) {
        // This is a speaker label
        return (
          <span key={index} className="font-bold text-emerald-400">
            {part}
          </span>
        )
      }
      return <span key={index}>{part}</span>
    })
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-slate-200">Transcription</h2>
        <div className="flex space-x-2">
          {text && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyToClipboard}
                className="text-slate-400 hover:text-slate-200"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span className="ml-1 hidden sm:inline">{copied ? "Copied!" : "Copy"}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={downloadTranscription}
                className="text-slate-400 hover:text-slate-200"
              >
                <Download className="h-4 w-4" />
                <span className="ml-1 hidden sm:inline">Download</span>
              </Button>
            </>
          )}
        </div>
      </div>

      <Card className="bg-slate-900 border-slate-700">
        <CardContent className="p-4">
          <div
            ref={containerRef}
            className="min-h-[200px] max-h-[400px] overflow-y-auto text-slate-200 whitespace-pre-wrap"
          >
            {text || interimText ? (
              <>
                <div>{formatTranscription(text)}</div>
                <span className="text-slate-400">{interimText}</span>
              </>
            ) : (
              <p className="text-slate-500 italic">Your transcription will appear here...</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
