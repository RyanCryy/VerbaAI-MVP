import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Mic, FileText, Wand2, CheckCircle2 } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative">
        {/* Background with gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 to-slate-800 z-0"></div>

        {/* Gradient mesh */}
        <div className="absolute inset-0 bg-[url('/mesh-gradient.png')] bg-cover opacity-10 z-0"></div>

        <div className="container mx-auto px-4 py-24 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-white">
              Transform Speech to Text with <span className="text-emerald-400">AI Precision</span>
            </h1>
            <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
              Powerful, real-time transcription for meetings, interviews, lectures, and more. Save time and never miss a
              word.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-6 text-lg">
                <Link href="/transcribe">
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-slate-600 text-slate-200 hover:bg-slate-800 px-8 py-6 text-lg"
              >
                <Link href="/demo">Try Demo</Link>
              </Button>
            </div>
            <p className="text-slate-400 mt-4 text-sm">No registration required. Start transcribing immediately.</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-slate-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Powerful Transcription Features</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Our AI-powered platform offers everything you need for perfect transcriptions
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-emerald-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10">
              <div className="bg-emerald-500/10 p-3 rounded-full w-14 h-14 flex items-center justify-center mb-4">
                <Mic className="h-7 w-7 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Multiple Recording Options</h3>
              <p className="text-slate-400">
                Capture audio from your microphone, screen, or both simultaneously for maximum flexibility.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-emerald-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10">
              <div className="bg-emerald-500/10 p-3 rounded-full w-14 h-14 flex items-center justify-center mb-4">
                <FileText className="h-7 w-7 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Real-time Transcription</h3>
              <p className="text-slate-400">
                See your transcription appear in real-time as you speak, with high accuracy and low latency.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-emerald-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10">
              <div className="bg-emerald-500/10 p-3 rounded-full w-14 h-14 flex items-center justify-center mb-4">
                <Wand2 className="h-7 w-7 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">AI Summaries</h3>
              <p className="text-slate-400">
                Generate concise summaries of your transcriptions with different formats to suit your needs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gradient-to-b from-slate-900 to-slate-800">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">How It Works</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">Three simple steps to perfect transcriptions</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center">
              <div className="bg-emerald-500/20 text-emerald-400 w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Record</h3>
              <p className="text-slate-400">Choose your audio source and start recording with a single click.</p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center">
              <div className="bg-emerald-500/20 text-emerald-400 w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Transcribe</h3>
              <p className="text-slate-400">Our AI automatically converts speech to text with high accuracy.</p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center">
              <div className="bg-emerald-500/20 text-emerald-400 w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Export</h3>
              <p className="text-slate-400">Download your transcription or generate an AI summary.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-slate-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Simple, Transparent Pricing</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">Choose the plan that works for you</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Plan */}
            <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10 flex flex-col">
              <div className="p-6 border-b border-slate-700">
                <h3 className="text-xl font-semibold text-white mb-2">Free</h3>
                <div className="flex items-end gap-1 mb-4">
                  <span className="text-4xl font-bold text-white">$0</span>
                  <span className="text-slate-400 mb-1">/month</span>
                </div>
                <p className="text-slate-400">Perfect for occasional use</p>
              </div>
              <div className="p-6 flex-grow">
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-300">10 transcriptions per month</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-300">Up to 10 minutes per recording</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-300">Basic summaries</span>
                  </li>
                </ul>
              </div>
              <div className="p-6 mt-auto">
                <Button asChild className="w-full bg-slate-700 hover:bg-slate-600 text-white">
                  <Link href="/transcribe">Get Started</Link>
                </Button>
              </div>
            </div>

            {/* Pro Plan */}
            <div className="bg-slate-800 rounded-xl overflow-hidden border border-emerald-500 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/20 flex flex-col relative">
              <div className="absolute top-0 right-0 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                POPULAR
              </div>
              <div className="p-6 border-b border-slate-700">
                <h3 className="text-xl font-semibold text-white mb-2">Pro</h3>
                <div className="flex items-end gap-1 mb-4">
                  <span className="text-4xl font-bold text-white">$12</span>
                  <span className="text-slate-400 mb-1">/month</span>
                </div>
                <p className="text-slate-400">For professionals and teams</p>
              </div>
              <div className="p-6 flex-grow">
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-300">100 transcriptions per month</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-300">Up to 60 minutes per recording</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-300">Advanced AI summaries</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-300">Speaker identification</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-300">Export to multiple formats</span>
                  </li>
                </ul>
              </div>
              <div className="p-6 mt-auto">
                <Button asChild className="w-full bg-emerald-500 hover:bg-emerald-600 text-white">
                  <Link href="/transcribe">Get Started</Link>
                </Button>
              </div>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10 flex flex-col">
              <div className="p-6 border-b border-slate-700">
                <h3 className="text-xl font-semibold text-white mb-2">Enterprise</h3>
                <div className="flex items-end gap-1 mb-4">
                  <span className="text-4xl font-bold text-white">$49</span>
                  <span className="text-slate-400 mb-1">/month</span>
                </div>
                <p className="text-slate-400">For organizations with high volume</p>
              </div>
              <div className="p-6 flex-grow">
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-300">Unlimited transcriptions</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-300">Unlimited recording length</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-300">All Pro features</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-300">Priority support</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-300">API access</span>
                  </li>
                </ul>
              </div>
              <div className="p-6 mt-auto">
                <Button asChild className="w-full bg-slate-700 hover:bg-slate-600 text-white">
                  <Link href="/transcribe">Get Started</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-b from-slate-800 to-slate-900">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto bg-gradient-to-r from-emerald-900/30 to-slate-800 rounded-2xl p-8 md:p-12 border border-emerald-500/30 shadow-lg">
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to Transform Your Workflow?</h2>
              <p className="text-slate-300 mb-8 max-w-2xl mx-auto">
                Join thousands of professionals who save time and increase productivity with our AI transcription
                service.
              </p>
              <Button asChild size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-6 text-lg">
                <Link href="/transcribe">
                  Start Transcribing Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
