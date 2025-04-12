import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import type { Transcription } from "@/lib/db"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, Clock, Tag } from "lucide-react"

interface TranscriptionsListProps {
  transcriptions: Transcription[]
}

export default function TranscriptionsList({ transcriptions }: TranscriptionsListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {transcriptions.map((transcription) => (
        <Link href={`/transcriptions/${transcription._id}`} key={transcription._id?.toString()}>
          <Card className="h-full bg-slate-800 border-slate-700 hover:border-emerald-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="bg-slate-700 p-2 rounded-md">
                  <FileText className="h-5 w-5 text-emerald-400" />
                </div>
                <Badge variant="outline" className="bg-slate-700 text-slate-300 border-slate-600">
                  {formatDuration(transcription.duration)}
                </Badge>
              </div>
              <h3 className="text-lg font-semibold text-white mt-4 mb-2 line-clamp-2">{transcription.title}</h3>
              <p className="text-slate-400 text-sm line-clamp-3">
                {transcription.content.substring(0, 150)}
                {transcription.content.length > 150 ? "..." : ""}
              </p>
            </CardContent>
            <CardFooter className="px-6 py-4 border-t border-slate-700 bg-slate-800/50">
              <div className="flex items-center justify-between w-full text-xs text-slate-400">
                <div className="flex items-center">
                  <Clock className="h-3.5 w-3.5 mr-1" />
                  <span>{formatDistanceToNow(new Date(transcription.createdAt), { addSuffix: true })}</span>
                </div>
                {transcription.tags && transcription.tags.length > 0 && (
                  <div className="flex items-center">
                    <Tag className="h-3.5 w-3.5 mr-1" />
                    <span>{transcription.tags.join(", ")}</span>
                  </div>
                )}
              </div>
            </CardFooter>
          </Card>
        </Link>
      ))}
    </div>
  )
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)

  if (minutes < 1) {
    return `${remainingSeconds}s`
  }

  return `${minutes}m ${remainingSeconds}s`
}
