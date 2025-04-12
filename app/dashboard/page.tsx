import Link from "next/link"
import { getUserTranscriptions } from "@/lib/db"
import DashboardHeader from "@/components/dashboard-header"
import TranscriptionsList from "@/components/transcriptions-list"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

// Demo user ID
const DEMO_USER_ID = "demo-user-id"

export default async function DashboardPage() {
  // Get demo transcriptions
  const transcriptions = await getUserTranscriptions(DEMO_USER_ID)

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-white">Your Transcriptions</h1>
          <Button asChild className="bg-emerald-500 hover:bg-emerald-600">
            <Link href="/transcribe">
              <Plus className="h-4 w-4 mr-2" />
              New Transcription
            </Link>
          </Button>
        </div>

        {transcriptions.length > 0 ? (
          <TranscriptionsList transcriptions={transcriptions} />
        ) : (
          <div className="text-center py-12 bg-slate-800/50 rounded-lg border border-slate-700">
            <h3 className="text-xl font-medium text-white mb-2">No transcriptions yet</h3>
            <p className="text-slate-400 mb-6">Create your first transcription to get started</p>
            <Button asChild className="bg-emerald-500 hover:bg-emerald-600">
              <Link href="/transcribe">
                <Plus className="h-4 w-4 mr-2" />
                New Transcription
              </Link>
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}
