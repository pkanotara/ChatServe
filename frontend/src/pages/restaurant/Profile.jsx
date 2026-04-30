import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { Save, Loader2, Camera, RefreshCw, Copy } from 'lucide-react'
import toast from 'react-hot-toast'

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']

export default function RestaurantProfile() {
  const qc = useQueryClient()
  const [form, setForm] = useState(null)
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)

  const { data: profile, isLoading } = useQuery({
    queryKey: ['restaurant-profile'],
    queryFn: () => api.get('/restaurant/profile').then(r => r.data),
  })

  useEffect(() => {
    if (profile && !form) {
      setForm({
        name: profile.name || '',
        description: profile.description || '',
        address: profile.address || '',
        email: profile.email || '',
        phone: profile.phone || '',
        categories: profile.categories?.join(', ') || '',
        workingHours: profile.workingHours || DAYS.map(day => ({ day, open: '09:00', close: '22:00', isOpen: true })),
      })
    }
  }, [profile])

  const save = useMutation({
    mutationFn: () => api.patch('/restaurant/profile', {
      ...form,
      categories: form.categories.split(',').map(c => c.trim()).filter(Boolean),
      workingHours: form.workingHours,
    }),
    onSuccess: () => { qc.invalidateQueries(['restaurant-profile']); toast.success('Profile saved!') },
    onError: () => toast.error('Failed to save'),
  })

  const saveAndSync = useMutation({
    mutationFn: async () => {
      await api.patch('/restaurant/profile', {
        ...form,
        categories: form.categories.split(',').map(c => c.trim()).filter(Boolean),
        workingHours: form.workingHours,
      })
      await api.post('/restaurant/sync-whatsapp-profile')
    },
    onSuccess: () => {
      qc.invalidateQueries(['restaurant-profile'])
      toast.success('Saved and synced to WhatsApp Business! ✅')
    },
    onError: () => {
      qc.invalidateQueries(['restaurant-profile'])
      toast.success('Profile saved locally.')
      toast.error('WhatsApp sync failed — configure WhatsApp first')
    },
  })

  const uploadLogo = useMutation({
    mutationFn: () => {
      const fd = new FormData()
      fd.append('logo', logoFile)
      return api.post('/restaurant/logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    },
    onSuccess: () => {
      qc.invalidateQueries(['restaurant-profile'])
      setLogoFile(null); setLogoPreview(null)
      toast.success('Logo updated!')
    },
    onError: () => toast.error('Failed to upload logo'),
  })

  const updateHour = (day, field, value) => {
    setForm(f => ({
      ...f,
      workingHours: f.workingHours.map(h => h.day === day ? { ...h, [field]: value } : h)
    }))
  }

  const copyId = (text) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard!')
  }

  if (isLoading || !form) return (
    <div className="flex justify-center py-12">
      <Loader2 className="animate-spin text-zinc-400" size={24} />
    </div>
  )

  const isWhatsAppConfigured = profile?.whatsappConfig?.signupStatus === 'configured'
    && profile?.whatsappConfig?.wabaId
    && profile?.whatsappConfig?.wabaId !== 'PENDING'
    && profile?.whatsappConfig?.wabaId !== 'DEMO_WABA_ID'

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="font-bold text-xl text-zinc-900">Business Profile</h2>
        <p className="text-zinc-500 text-sm mt-0.5">Manage your business details</p>
      </div>

      {/* Restaurant ID Card */}
      <div className="card p-4">
        <p className="text-xs font-medium text-zinc-500 mb-2">Business ID</p>
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-sm text-zinc-900 break-all">{profile?._id}</p>
          <button
            onClick={() => copyId(profile?._id)}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-orange-600 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-orange-50 shrink-0"
          >
            <Copy size={13} /> Copy
          </button>
        </div>
        <p className="text-xs text-zinc-400 mt-1">Use this ID when contacting platform support</p>
      </div>

      {/* WhatsApp Sync Banner */}
      {isWhatsAppConfigured && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-3">
          <div className="w-2 h-2 bg-green-500 rounded-full shrink-0" />
          <p className="text-green-700 text-sm">
            WhatsApp connected — use <strong>Save & Sync</strong> to update your WhatsApp Business profile automatically.
          </p>
        </div>
      )}

      {/* Logo */}
      <div className="card p-6">
        <h3 className="font-semibold text-zinc-900 mb-4">Business Logo</h3>
        <div className="flex items-center gap-5">
          <div className="relative">
            {(logoPreview || profile?.logoUrl)
              ? <img src={logoPreview || profile.logoUrl} alt="Logo" className="w-20 h-20 rounded-2xl object-cover" />
              : <div className="w-20 h-20 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600 font-bold text-3xl">
                  {profile?.name?.[0]}
                </div>
            }
            <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-orange-600 transition-colors">
              <Camera size={13} className="text-white" />
              <input type="file" accept="image/*" className="hidden" onChange={e => {
                const file = e.target.files[0]
                if (!file) return
                setLogoFile(file)
                setLogoPreview(URL.createObjectURL(file))
              }} />
            </label>
          </div>
          <div>
            {logoFile && (
              <button onClick={() => uploadLogo.mutate()} disabled={uploadLogo.isPending} className="btn-primary mb-2">
                {uploadLogo.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
                Upload Logo
              </button>
            )}
            <p className="text-xs text-zinc-400">
              {isWhatsAppConfigured ? 'Shown on your WhatsApp Business profile' : 'Upload your business logo'}
            </p>
          </div>
        </div>
      </div>

      {/* Basic Info */}
      <div className="card p-6 space-y-4">
        <h3 className="font-semibold text-zinc-900 mb-1">Basic Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">Business Name</label>
            <input className="input" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            {isWhatsAppConfigured && <p className="text-xs text-zinc-400 mt-1">Shown as business name in WhatsApp</p>}
          </div>
          <div className="col-span-2">
            <label className="label">Description</label>
            <textarea className="input min-h-[80px] resize-none" value={form.description} maxLength={512}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            <p className="text-xs text-zinc-400 mt-1">
              {form.description.length}/512
              {isWhatsAppConfigured && ' — Shown in WhatsApp Business profile'}
            </p>
          </div>
          <div className="col-span-2">
            <label className="label">Address</label>
            <input className="input" value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
            {isWhatsAppConfigured && <p className="text-xs text-zinc-400 mt-1">Shown as address in WhatsApp profile</p>}
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            {isWhatsAppConfigured && <p className="text-xs text-zinc-400 mt-1">Shown in WhatsApp profile</p>}
          </div>
          <div>
            <label className="label">Phone (Read Only)</label>
            {/* Phone cannot be edited — it's the WhatsApp Business number */}
            <div className="input bg-zinc-50 text-zinc-500 cursor-not-allowed select-none flex items-center justify-between">
              <span>{form.phone || '—'}</span>
              <span className="text-xs bg-zinc-200 text-zinc-500 px-2 py-0.5 rounded">WhatsApp Number</span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">This is your WhatsApp Business number — cannot be changed here</p>
          </div>
          <div className="col-span-2">
            <label className="label">Categories (comma-separated)</label>
            <input className="input" value={form.categories}
              onChange={e => setForm(f => ({ ...f, categories: e.target.value }))}
              placeholder="Haircare, Skincare, Beverages" />
          </div>
        </div>
      </div>

      {/* Working Hours */}
      <div className="card p-6">
        <h3 className="font-semibold text-zinc-900 mb-1">Working Hours</h3>
        {isWhatsAppConfigured && (
          <p className="text-xs text-zinc-400 mb-4">Included in your WhatsApp Business description</p>
        )}
        <div className="space-y-3">
          {(form.workingHours || []).map(h => (
            <div key={h.day} className="flex items-center gap-3">
              <div className="w-24 shrink-0">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={h.isOpen}
                    onChange={e => updateHour(h.day, 'isOpen', e.target.checked)}
                    className="rounded border-zinc-300 text-orange-500 focus:ring-orange-500" />
                  <span className="text-sm capitalize text-zinc-700">{h.day.slice(0,3)}</span>
                </label>
              </div>
              <input type="time" disabled={!h.isOpen} value={h.open}
                onChange={e => updateHour(h.day, 'open', e.target.value)}
                className="input w-32 disabled:opacity-40" />
              <span className="text-zinc-400 text-sm">to</span>
              <input type="time" disabled={!h.isOpen} value={h.close}
                onChange={e => updateHour(h.day, 'close', e.target.value)}
                className="input w-32 disabled:opacity-40" />
              {!h.isOpen && <span className="text-xs text-zinc-400">Closed</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Save Buttons */}
      <div className="flex gap-3">
        {isWhatsAppConfigured ? (
          <>
            <button onClick={() => saveAndSync.mutate()} disabled={saveAndSync.isPending} className="btn-primary">
              {saveAndSync.isPending ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
              Save & Sync to WhatsApp
            </button>
            <button onClick={() => save.mutate()} disabled={save.isPending} className="btn-secondary">
              {save.isPending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              Save Only
            </button>
          </>
        ) : (
          <button onClick={() => save.mutate()} disabled={save.isPending} className="btn-primary">
            {save.isPending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Save Changes
          </button>
        )}
      </div>
    </div>
  )
}