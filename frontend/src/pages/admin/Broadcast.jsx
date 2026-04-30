import { useQuery, useMutation } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import api from '../../services/api'
import {
  Megaphone, Store, Search, CheckSquare, Square, Send,
  Loader2, CheckCircle2, AlertCircle, X, ChevronDown, Globe
} from 'lucide-react'
import toast from 'react-hot-toast'

const TEMPLATES = [
  { label: 'Platform Update', text: '🚀 We\'ve just rolled out exciting new features to ChatServe! Check your dashboard for the latest improvements and enhancements.' },
  { label: 'Maintenance Notice', text: '🔧 Scheduled maintenance on ChatServe this weekend. The platform will be briefly unavailable on Sunday from 2 AM – 4 AM IST. We apologize for the inconvenience.' },
  { label: 'New Feature', text: '✨ Great news! A new feature is now available on your dashboard. Log in to explore it and boost your business operations!' },
  { label: 'Festive Greeting', text: '🎉 Happy holidays from the ChatServe team! Wishing you and your business a joyful season. Enjoy special offers coming your way soon!' },
]

export default function AdminBroadcast() {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [message, setMessage] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const [result, setResult] = useState(null)

  const { data: restaurantsData, isLoading } = useQuery({
    queryKey: ['admin-restaurants-broadcast'],
    queryFn: () => api.get('/admin/restaurants?limit=200').then(r => r.data),
  })

  const restaurants = restaurantsData?.data || []

  const filtered = useMemo(() =>
    restaurants.filter(r =>
      !search ||
      r.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.owner?.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.owner?.whatsappNumber?.includes(search)
    ), [restaurants, search])

  const allSelected = filtered.length > 0 && filtered.every(r => selected.has(r._id))

  const toggleAll = () => {
    if (allSelected) {
      setSelected(s => { const n = new Set(s); filtered.forEach(r => n.delete(r._id)); return n })
    } else {
      setSelected(s => { const n = new Set(s); filtered.forEach(r => n.add(r._id)); return n })
    }
  }

  const toggle = (id) => setSelected(s => {
    const n = new Set(s)
    n.has(id) ? n.delete(id) : n.add(id)
    return n
  })

  const broadcast = useMutation({
    mutationFn: () => api.post('/admin/broadcast', {
      restaurantIds: [...selected],
      message,
    }),
    onSuccess: (res) => {
      setResult(res.data)
      setSelected(new Set())
      setMessage('')
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Broadcast failed'),
  })

  const canSend = selected.size > 0 && message.trim().length > 0 && !broadcast.isPending

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="font-display text-xl font-bold text-surface-900">Broadcast Message</h2>
        <p className="text-surface-500 text-sm mt-0.5">Send WhatsApp messages to business owners on the platform</p>
      </div>

      {/* Result banner */}
      {result && (
        <div className={`flex items-start gap-3 rounded-xl px-4 py-3 border ${result.failed === 0 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
          {result.failed === 0
            ? <CheckCircle2 size={18} className="text-green-500 shrink-0 mt-0.5" />
            : <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />}
          <div className="flex-1">
            <p className="font-medium text-sm text-surface-900">
              Sent to {result.sent} business owner{result.sent !== 1 ? 's' : ''}
              {result.failed > 0 && `, ${result.failed} failed`}
            </p>
            <p className="text-xs text-surface-500 mt-0.5">Messages delivered via ChatServe WhatsApp bot</p>
          </div>
          <button onClick={() => setResult(null)} className="text-surface-400 hover:text-surface-600"><X size={15} /></button>
        </div>
      )}

      <div className="grid grid-cols-5 gap-5">
        {/* Left — Business selector */}
        <div className="col-span-2 card flex flex-col" style={{ maxHeight: '560px' }}>
          <div className="p-4 border-b border-surface-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Store size={15} className="text-brand-500" />
                <span className="font-semibold text-surface-900 text-sm">Businesses</span>
                {selected.size > 0 && (
                  <span className="bg-brand-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{selected.size}</span>
                )}
              </div>
              <button onClick={toggleAll} className="text-xs text-brand-500 hover:text-brand-600 font-medium">
                {allSelected ? 'Deselect all' : 'Select all'}
              </button>
            </div>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
              <input
                className="input pl-8 text-xs py-2"
                placeholder="Search by business or owner name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-surface-50">
            {isLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="animate-spin text-surface-300" size={22} /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-10 text-surface-400 text-sm">No businesses found</div>
            ) : filtered.map(r => (
              <button
                key={r._id}
                onClick={() => toggle(r._id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-50 ${selected.has(r._id) ? 'bg-brand-50' : ''}`}
              >
                {selected.has(r._id)
                  ? <CheckSquare size={16} className="text-brand-500 shrink-0" />
                  : <Square size={16} className="text-surface-300 shrink-0" />}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-surface-900 truncate">{r.name}</p>
                  <p className="text-xs text-surface-400 truncate">
                    {r.owner?.name || 'No owner'}{r.owner?.whatsappNumber ? ` · ${r.owner.whatsappNumber}` : ''}
                  </p>
                </div>
                <span className={`text-xs shrink-0 px-1.5 py-0.5 rounded font-medium ${
                  r.status === 'active' ? 'text-green-600 bg-green-50' :
                  r.status === 'inactive' ? 'text-surface-400 bg-surface-100' :
                  'text-amber-600 bg-amber-50'
                }`}>
                  {r.status}
                </span>
              </button>
            ))}
          </div>

          <div className="p-3 border-t border-surface-100 bg-surface-50">
            <p className="text-xs text-surface-500 text-center">
              {selected.size} of {restaurants.length} selected
            </p>
          </div>
        </div>

        {/* Right — Compose */}
        <div className="col-span-3 flex flex-col gap-4">
          {/* Info banner */}
          <div className="flex items-center gap-3 p-4 bg-brand-50 rounded-xl border border-brand-100">
            <Globe size={18} className="text-brand-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-surface-900">Platform Broadcast</p>
              <p className="text-xs text-surface-500">Messages will be sent to business owners via the main ChatServe WhatsApp bot</p>
            </div>
          </div>

          {/* Templates */}
          <div className="card p-4">
            <button
              onClick={() => setShowTemplates(v => !v)}
              className="flex items-center justify-between w-full"
            >
              <span className="text-sm font-semibold text-surface-900">Quick Templates</span>
              <ChevronDown size={15} className={`text-surface-400 transition-transform ${showTemplates ? 'rotate-180' : ''}`} />
            </button>
            {showTemplates && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {TEMPLATES.map(t => (
                  <button
                    key={t.label}
                    onClick={() => { setMessage(t.text); setShowTemplates(false) }}
                    className="text-left p-3 rounded-lg border border-surface-200 hover:border-brand-300 hover:bg-brand-50 transition-colors"
                  >
                    <p className="text-xs font-semibold text-surface-800">{t.label}</p>
                    <p className="text-xs text-surface-400 mt-0.5 line-clamp-2">{t.text}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Compose box */}
          <div className="card p-4 flex flex-col gap-3 flex-1">
            <div className="flex items-center gap-2">
              <Megaphone size={15} className="text-brand-500" />
              <span className="text-sm font-semibold text-surface-900">Compose Message</span>
            </div>
            <textarea
              className="input resize-none flex-1 text-sm leading-relaxed"
              style={{ minHeight: '180px' }}
              placeholder="Type your announcement here... Use emojis to make it engaging! 🎉"
              value={message}
              onChange={e => setMessage(e.target.value)}
              maxLength={1000}
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-surface-400">{message.length}/1000 characters</p>
              {message.length > 0 && (
                <button onClick={() => setMessage('')} className="text-xs text-surface-400 hover:text-surface-600">Clear</button>
              )}
            </div>

            {/* Preview */}
            {message.trim() && (
              <div className="bg-surface-50 rounded-xl p-3 border border-surface-100">
                <p className="text-xs text-surface-400 mb-2 font-medium">Preview (WhatsApp format)</p>
                <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2.5 inline-block max-w-full">
                  <p className="text-xs font-semibold text-green-800 mb-1">📢 ChatServe Update</p>
                  <p className="text-sm text-surface-800 whitespace-pre-wrap break-words">{message}</p>
                </div>
              </div>
            )}

            {/* Send button */}
            <button
              onClick={() => broadcast.mutate()}
              disabled={!canSend}
              className="btn-primary justify-center w-full mt-1"
            >
              {broadcast.isPending
                ? <><Loader2 size={15} className="animate-spin" /> Sending...</>
                : <><Send size={15} /> Send to {selected.size > 0 ? `${selected.size} business${selected.size !== 1 ? 'es' : ''}` : 'selected businesses'}</>}
            </button>

            {selected.size === 0 && (
              <p className="text-xs text-surface-400 text-center -mt-1">Select businesses from the left panel to enable sending</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
