import { useQuery, useMutation } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import api from '../../services/api'
import {
  Megaphone, Users, Search, CheckSquare, Square, Send,
  Loader2, CheckCircle2, AlertCircle, X, ChevronDown
} from 'lucide-react'
import toast from 'react-hot-toast'

const TEMPLATES = [
  { label: 'Special Offer', text: '🎉 Special offer just for you! Get 20% off your next order today. Use code SAVE20 at checkout. Valid till midnight!' },
  { label: 'New Menu Item', text: '🍽️ Exciting news! We\'ve added new items to our menu. Check out our latest additions and place your order now!' },
  { label: 'Weekend Deal', text: '🎊 Weekend special! Enjoy free delivery on all orders above ₹299 this weekend only. Order now via WhatsApp!' },
  { label: 'Festive Offer', text: '✨ Celebrating the festive season with you! Enjoy special discounts on all orders today. Happy ordering!' },
]

export default function RestaurantBroadcast() {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [message, setMessage] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const [result, setResult] = useState(null)

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['restaurant-customers'],
    queryFn: () => api.get('/restaurant/customers').then(r => r.data),
  })

  const filtered = useMemo(() =>
    customers.filter(c =>
      !search ||
      c.whatsappNumber?.includes(search) ||
      c.name?.toLowerCase().includes(search.toLowerCase())
    ), [customers, search])

  const allSelected = filtered.length > 0 && filtered.every(c => selected.has(c._id))

  const toggleAll = () => {
    if (allSelected) {
      setSelected(s => { const n = new Set(s); filtered.forEach(c => n.delete(c._id)); return n })
    } else {
      setSelected(s => { const n = new Set(s); filtered.forEach(c => n.add(c._id)); return n })
    }
  }

  const toggle = (id) => setSelected(s => {
    const n = new Set(s)
    n.has(id) ? n.delete(id) : n.add(id)
    return n
  })

  const broadcast = useMutation({
    mutationFn: () => api.post('/restaurant/broadcast', {
      customerIds: [...selected],
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
        <h2 className="font-bold text-xl text-zinc-900">Broadcast Message</h2>
        <p className="text-zinc-500 text-sm mt-0.5">Send WhatsApp messages to your customers directly</p>
      </div>

      {/* Result banner */}
      {result && (
        <div className={`flex items-start gap-3 rounded-xl px-4 py-3 border ${result.failed === 0 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
          {result.failed === 0
            ? <CheckCircle2 size={18} className="text-green-500 shrink-0 mt-0.5" />
            : <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />}
          <div className="flex-1">
            <p className="font-medium text-sm text-zinc-900">
              Sent to {result.sent} customer{result.sent !== 1 ? 's' : ''}
              {result.failed > 0 && `, ${result.failed} failed`}
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">Messages delivered via WhatsApp</p>
          </div>
          <button onClick={() => setResult(null)} className="text-zinc-400 hover:text-zinc-600"><X size={15} /></button>
        </div>
      )}

      <div className="grid grid-cols-5 gap-5">
        {/* Left — Customer selector */}
        <div className="col-span-2 card flex flex-col" style={{ maxHeight: '560px' }}>
          <div className="p-4 border-b border-zinc-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users size={15} className="text-orange-500" />
                <span className="font-semibold text-zinc-900 text-sm">Customers</span>
                {selected.size > 0 && (
                  <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{selected.size}</span>
                )}
              </div>
              <button onClick={toggleAll} className="text-xs text-orange-500 hover:text-orange-600 font-medium">
                {allSelected ? 'Deselect all' : 'Select all'}
              </button>
            </div>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                className="input pl-8 text-xs py-2"
                placeholder="Search by name or number..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-zinc-50">
            {isLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="animate-spin text-zinc-300" size={22} /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-10 text-zinc-400 text-sm">No customers found</div>
            ) : filtered.map(c => (
              <button
                key={c._id}
                onClick={() => toggle(c._id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-50 ${selected.has(c._id) ? 'bg-orange-50' : ''}`}
              >
                {selected.has(c._id)
                  ? <CheckSquare size={16} className="text-orange-500 shrink-0" />
                  : <Square size={16} className="text-zinc-300 shrink-0" />}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-zinc-900 truncate">{c.name || 'Unknown'}</p>
                  <p className="text-xs text-zinc-400 font-mono">{c.whatsappNumber}</p>
                </div>
                <span className="text-xs text-zinc-400 shrink-0">{c.totalOrders} orders</span>
              </button>
            ))}
          </div>

          <div className="p-3 border-t border-zinc-100 bg-zinc-50">
            <p className="text-xs text-zinc-500 text-center">
              {selected.size} of {customers.length} selected
            </p>
          </div>
        </div>

        {/* Right — Compose */}
        <div className="col-span-3 flex flex-col gap-4">
          {/* Templates */}
          <div className="card p-4">
            <button
              onClick={() => setShowTemplates(v => !v)}
              className="flex items-center justify-between w-full"
            >
              <span className="text-sm font-semibold text-zinc-900">Quick Templates</span>
              <ChevronDown size={15} className={`text-zinc-400 transition-transform ${showTemplates ? 'rotate-180' : ''}`} />
            </button>
            {showTemplates && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {TEMPLATES.map(t => (
                  <button
                    key={t.label}
                    onClick={() => { setMessage(t.text); setShowTemplates(false) }}
                    className="text-left p-3 rounded-lg border border-zinc-200 hover:border-orange-300 hover:bg-orange-50 transition-colors"
                  >
                    <p className="text-xs font-semibold text-zinc-800">{t.label}</p>
                    <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">{t.text}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Compose box */}
          <div className="card p-4 flex flex-col gap-3 flex-1">
            <div className="flex items-center gap-2">
              <Megaphone size={15} className="text-orange-500" />
              <span className="text-sm font-semibold text-zinc-900">Compose Message</span>
            </div>
            <textarea
              className="input resize-none flex-1 text-sm leading-relaxed"
              style={{ minHeight: '180px' }}
              placeholder="Type your message here... Use emojis to make it engaging! 🎉"
              value={message}
              onChange={e => setMessage(e.target.value)}
              maxLength={1000}
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-400">{message.length}/1000 characters</p>
              {message.length > 0 && (
                <button onClick={() => setMessage('')} className="text-xs text-zinc-400 hover:text-zinc-600">Clear</button>
              )}
            </div>

            {/* Preview */}
            {message.trim() && (
              <div className="bg-zinc-50 rounded-xl p-3 border border-zinc-100">
                <p className="text-xs text-zinc-400 mb-2 font-medium">Preview</p>
                <div className="bg-white rounded-lg px-3 py-2.5 shadow-sm border border-zinc-100 inline-block max-w-full">
                  <p className="text-sm text-zinc-800 whitespace-pre-wrap break-words">{message}</p>
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
                : <><Send size={15} /> Send to {selected.size > 0 ? `${selected.size} customer${selected.size !== 1 ? 's' : ''}` : 'selected customers'}</>}
            </button>

            {selected.size === 0 && (
              <p className="text-xs text-zinc-400 text-center -mt-1">Select customers from the left panel to enable sending</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
