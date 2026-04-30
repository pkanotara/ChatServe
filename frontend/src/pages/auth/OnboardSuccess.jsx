import { useSearchParams, Link } from 'react-router-dom'
import { CheckCircle2, AlertCircle } from 'lucide-react'

export function OnboardSuccess() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <CheckCircle2 size={64} className="text-green-500 mx-auto mb-6" />
        <h1 className="font-display text-3xl font-bold text-surface-900 mb-3">You're Live! 🎉</h1>
        <p className="text-surface-500 mb-8">
          Your WhatsApp Business number is now connected. Your chatbot is active and ready to go!
        </p>
        <Link to="/dashboard" className="btn-primary">Go to Dashboard</Link>
      </div>
    </div>
  )
}

export function OnboardError() {
  const [params] = useSearchParams()
  const reason = params.get('reason') || 'Something went wrong during setup.'
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <AlertCircle size={64} className="text-red-400 mx-auto mb-6" />
        <h1 className="font-display text-2xl font-bold text-surface-900 mb-3">Setup Incomplete</h1>
        <p className="text-surface-500 mb-3">{decodeURIComponent(reason)}</p>
        <p className="text-surface-400 text-sm mb-8">You can retry the setup from your dashboard, or contact support if the issue persists.</p>
        <Link to="/dashboard" className="btn-secondary">Go to Dashboard</Link>
      </div>
    </div>
  )
}

export default OnboardSuccess
