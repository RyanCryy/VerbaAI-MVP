import DashboardHeader from "@/components/dashboard-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// Demo user data
const demoUser = {
  name: "Demo User",
  username: "demo@example.com",
  plan: "free",
  usageCount: 3,
  usageLimit: 10,
  createdAt: new Date().toISOString(),
}

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-6">Your Profile</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Account Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-slate-400">Name</p>
                <p className="text-lg text-white">{demoUser.name}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Username</p>
                <p className="text-lg text-white">{demoUser.username}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Plan</p>
                <p className="text-lg text-white capitalize">{demoUser.plan}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Usage Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-slate-400">Transcriptions Used</p>
                <p className="text-lg text-white">
                  {demoUser.usageCount} / {demoUser.usageLimit}
                </p>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2.5">
                <div
                  className="bg-emerald-500 h-2.5 rounded-full"
                  style={{ width: `${Math.min(100, (demoUser.usageCount / demoUser.usageLimit) * 100)}%` }}
                ></div>
              </div>
              <div>
                <p className="text-sm text-slate-400">Account Created</p>
                <p className="text-lg text-white">{new Date(demoUser.createdAt).toLocaleDateString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
