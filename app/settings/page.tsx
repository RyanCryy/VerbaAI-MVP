import DashboardHeader from "@/components/dashboard-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>

        <div className="max-w-2xl">
          <Card className="bg-slate-800 border-slate-700 mb-6">
            <CardHeader>
              <CardTitle className="text-white">Change Password</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password" className="text-slate-300">
                    Current Password
                  </Label>
                  <Input id="current-password" type="password" className="bg-slate-700 border-slate-600 text-white" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-slate-300">
                    New Password
                  </Label>
                  <Input id="new-password" type="password" className="bg-slate-700 border-slate-600 text-white" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-slate-300">
                    Confirm New Password
                  </Label>
                  <Input id="confirm-password" type="password" className="bg-slate-700 border-slate-600 text-white" />
                </div>
                <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white">
                  Update Password
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400 mb-4">
                This feature is coming soon. You'll be able to customize your notification preferences here.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
