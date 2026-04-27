import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import axios from 'axios'
import {
  CheckCircle2, Clock, AlertCircle, ExternalLink,
  Wifi, ToggleLeft, ToggleRight, Loader2, Wrench
} from 'lucide-react'
import toast from 'react-hot-toast'

const publicApi = axios.create({ baseURL: '/api' })

export default function RestaurantWhatsApp() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const restaurantId = user?.restaurantId
  const [showManual, setShowManual] = useState(false)
  const [manualForm, setManualForm] = useState({ wabaId: '', phoneNumberId: '', accessToken: '' })

  const { data: wa, isLoading } = useQuery({
    queryKey: ['restaurant-whatsapp'],
    queryFn: () => api.get('/restaurant/whatsapp').then(r => r.data),
    refetchInterval: (data) => {
      if (data?.signupStatus === 'configured' && data?.wabaId !== 'PENDING') return false
      return 8000
    },
  })

  const { data: linkData } = useQuery({
    queryKey: ['signup-link', restaurantId],
    queryFn: () => publicApi.get(`/embedded-signup/link/${restaurantId}`).then(r => r.data),
    enabled: !!restaurantId && wa?.signupStatus !== 'configured',
    retry: 1,
  })

  const toggleBot = useMutation({
    mutationFn: (botEnabled) => api.patch('/restaurant/whatsapp/bot', { botEnabled }),
    onSuccess: (res) => {
      qc.invalidateQueries(['restaurant-whatsapp'])
      toast.success(res.data.botEnabled ? 'Bot enabled ✅' : 'Bot paused ⏸️')
    },
    onError: () => toast.error('Failed to toggle bot'),
  })

  const manualActivate = useMutation({
    mutationFn: () => api.post('/restaurant/whatsapp/manual-activate', manualForm),
    onSuccess: (res) => {
      qc.invalidateQueries(['restaurant-whatsapp'])
      toast.success(res.data.message)
      setShowManual(false)
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Activation failed'),
  })

  if (isLoading) return (
    <div className="flex justify-center py-12">
      <Loader2 className="animate-spin text-zinc-400" size={24} />
    </div>
  )

  const isConfigured = wa?.signupStatus === 'configured'
  const isFullyConfigured = isConfigured && wa?.wabaId && wa?.wabaId !== 'PENDING'
  const hasPendingIds = wa?.wabaId === 'PENDING' || wa?.phoneNumberId === 'PENDING'

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="font-bold text-xl text-zinc-900">WhatsApp Business Setup</h2>
        <p className="text-zinc-500 text-sm mt-0.5">Configure your restaurant's WhatsApp ordering chatbot</p>
      </div>

      {/* Status Card */}
      {isFullyConfigured ? (
        <div className="card p-6 border-green-200 bg-green-50">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 size={24} className="text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-green-900">WhatsApp Business Connected ✅</h3>
              <p className="text-sm text-green-700 mt-1">
                Your WhatsApp Business number is connected and your chatbot is ready.
              </p>
            </div>
          </div>
        </div>
      ) : hasPendingIds ? (
        <div className="card p-6 border-amber-200 bg-amber-50">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertCircle size={24} className="text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900">Setup Partially Complete</h3>
              <p className="text-sm text-amber-700 mt-1">
                Meta signup completed but WABA configuration is pending.
                You can complete it manually below.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="card p-6 border-amber-200 bg-amber-50">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
              <Clock size={24} className="text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-900">Setup Incomplete</h3>
              <p className="text-sm text-amber-700 mt-1">
                Complete the Meta Embedded Signup to activate your ordering chatbot.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Config Details */}
      <div className="card p-6 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Wifi size={16} className="text-orange-500" />
          <h3 className="font-semibold text-zinc-900">Configuration Details</h3>
        </div>

        <Row label="Target Business Number" value={wa?.targetBusinessNumber} />
        <Row label="Signup Status" value={wa?.signupStatus?.replace(/_/g, ' ')} />
        <Row label="WABA ID" value={wa?.wabaId} mono warn={!wa?.wabaId || wa?.wabaId === 'PENDING'} />
        <Row label="Phone Number ID" value={wa?.phoneNumberId} mono warn={!wa?.phoneNumberId || wa?.phoneNumberId === 'PENDING'} />
        <Row label="Configured At" value={wa?.configuredAt ? new Date(wa.configuredAt).toLocaleString() : '—'} />

        {isFullyConfigured && (
          <div className="pt-4 border-t border-zinc-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-zinc-900 text-sm">Bot Status</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {wa.botEnabled ? 'Your chatbot is live and accepting orders' : 'Bot is paused — customers cannot order'}
                </p>
              </div>
              <button onClick={() => toggleBot.mutate(!wa.botEnabled)} disabled={toggleBot.isPending}>
                {toggleBot.isPending
                  ? <Loader2 size={22} className="animate-spin text-zinc-400" />
                  : wa.botEnabled
                    ? <ToggleRight size={36} className="text-green-500 hover:text-green-600 transition-colors" />
                    : <ToggleLeft size={36} className="text-zinc-300 hover:text-zinc-400 transition-colors" />
                }
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Setup Steps — only show when not fully configured */}
      {!isFullyConfigured && (
        <div className="card p-6">
          <h3 className="font-semibold text-zinc-900 mb-5">Complete Your Setup</h3>

          <div className="space-y-5 mb-6">
            {[
              { done: true, title: 'Restaurant details collected', desc: 'Your business info has been saved' },
              { done: !!wa?.targetBusinessNumber, title: 'Target number selected', desc: wa?.targetBusinessNumber || 'Not set' },
              { done: wa?.signupStatus === 'signup_completed' || isConfigured, title: 'Meta Embedded Signup', desc: 'Log into Facebook and verify your WhatsApp number' },
              { done: isFullyConfigured, title: 'WABA & Phone Number configured', desc: hasPendingIds ? 'Pending — use manual setup below' : 'Automatic after signup' },
            ].map((step, i) => (
              <div key={i} className="flex gap-4">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${step.done ? 'bg-green-500' : 'bg-zinc-200'}`}>
                  {step.done
                    ? <CheckCircle2 size={14} className="text-white" />
                    : <span className="text-zinc-500 text-xs font-bold">{i + 1}</span>
                  }
                </div>
                <div>
                  <p className={`text-sm font-medium ${step.done ? 'text-green-700 line-through' : 'text-zinc-900'}`}>{step.title}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {!hasPendingIds && linkData?.signupUrl ? (
            <>
              <a
                href={linkData.signupUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors"
              >
                <ExternalLink size={16} />
                Complete WhatsApp Business Setup
              </a>
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-700">
                  ℹ️ Meta requires the business owner to authenticate via Facebook and verify the phone number. After that, everything is automatic.
                </p>
              </div>
            </>
          ) : !hasPendingIds ? (
            <div className="flex items-center gap-2 text-zinc-500 text-sm">
              <Loader2 size={15} className="animate-spin" />
              Loading setup link...
            </div>
          ) : null}
        </div>
      )}

      {/* Configure Manually Button */}
      <button
        onClick={() => setShowManual(true)}
        className="flex items-center gap-2 px-4 py-2.5 border border-zinc-300 hover:border-orange-400 hover:text-orange-600 text-zinc-700 font-medium text-sm rounded-lg transition-colors"
      >
        <Wrench size={15} />
        Configure WhatsApp Manually
      </button>

      {/* Manual Configure Modal */}
      {showManual && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowManual(false)} />
          <div className="relative bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench size={16} className="text-orange-500" />
                <h3 className="font-semibold text-zinc-900">Configure WhatsApp Manually</h3>
              </div>
              <button onClick={() => setShowManual(false)} className="text-zinc-400 hover:text-zinc-600 text-xl leading-none">&times;</button>
            </div>
            <p className="text-xs text-zinc-500">Enter your credentials from Meta Developer Console → WhatsApp → API Setup</p>
            <div>
              <label className="label">WABA ID *</label>
              <input className="input font-mono" placeholder="e.g. 2448725995583940"
                value={manualForm.wabaId} onChange={e => setManualForm(f => ({ ...f, wabaId: e.target.value }))} />
            </div>
            <div>
              <label className="label">Phone Number ID *</label>
              <input className="input font-mono" placeholder="e.g. 937829752755417"
                value={manualForm.phoneNumberId} onChange={e => setManualForm(f => ({ ...f, phoneNumberId: e.target.value }))} />
            </div>
            <div>
              <label className="label">Access Token (optional — uses platform token if empty)</label>
              <input className="input font-mono text-xs" placeholder="EAAxxxxxxx..."
                value={manualForm.accessToken} onChange={e => setManualForm(f => ({ ...f, accessToken: e.target.value }))} />
            </div>
            <button
              onClick={() => manualActivate.mutate()}
              disabled={!manualForm.wabaId || !manualForm.phoneNumberId || manualActivate.isPending}
              className="btn-primary w-full justify-center">
              {manualActivate.isPending ? <Loader2 size={14} className="animate-spin" /> : <Wrench size={14} />}
              {manualActivate.isPending ? 'Activating...' : 'Activate WhatsApp'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value, mono, warn }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-zinc-50 last:border-0">
      <span className="text-xs text-zinc-500 shrink-0">{label}</span>
      <span className={`text-xs text-right break-all ${
        warn ? 'text-amber-600 font-semibold' :
        mono ? 'font-mono text-zinc-600' : 'font-medium text-zinc-900'
      }`}>
        {value || '—'}
      </span>
    </div>
  )
}
