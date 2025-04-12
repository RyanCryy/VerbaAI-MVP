import DashboardHeader from "@/components/dashboard-header"
import TranscriptionApp from "@/components/transcription-app"

// Demo user settings
const DEMO_USER = {
  _id: "demo-user-id",
  plan: "free",
  usageCount: 0,
  usageLimit: 10,
}

export default async function TranscribePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold text-white mb-6">New Transcription</h1>
          <TranscriptionApp
            userId={DEMO_USER._id.toString()}
            userPlan={DEMO_USER.plan as "free" | "pro" | "enterprise"}
            currentUsage={DEMO_USER.usageCount}
            usageLimit={DEMO_USER.usageLimit}
          />
        </div>
      </main>
    </div>
  )
}
