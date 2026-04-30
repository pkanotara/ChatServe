import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { useState } from 'react'
import {
  LayoutDashboard, Package, ShoppingBag,
  Users, MessageCircle, UserCircle, LogOut, Copy, KeyRound, Eye, EyeOff, X, Loader2, Megaphone
} from 'lucide-react'
import toast from 'react-hot-toast'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/dashboard/orders', icon: ShoppingBag, label: 'Orders' },
  { to: '/dashboard/catalog', icon: Package, label: 'Catalog' },
  { to: '/dashboard/customers', icon: Users, label: 'Customers' },
  { to: '/dashboard/broadcast', icon: Megaphone, label: 'Broadcast' },
  { to: '/dashboard/whatsapp', icon: MessageCircle, label: 'WhatsApp Setup' },
  { to: '/dashboard/profile', icon: UserCircle, label: 'Business Profile' },
]

const getStrength = (pw) => {
  if (!pw) return { score: 0, label: '', color: '' }
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (score <= 1) return { score, label: 'Weak', color: 'bg-red-500', text: 'text-red-500' }
  if (score <= 3) return { score, label: 'Fair', color: 'bg-yellow-400', text: 'text-yellow-500' }
  return { score, label: 'Strong', color: 'bg-green-500', text: 'text-green-600' }
}

function ChangePasswordDrawer({ onClose }) {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [show, setShow] = useState({ current: false, new: false, confirm: false })
  const [done, setDone] = useState(false)
  const strength = getStrength(form.newPassword)

  const mutation = useMutation({
    mutationFn: () => api.post('/auth/change-password', {
      currentPassword: form.currentPassword,
      newPassword: form.newPassword,
    }),
    onSuccess: () => setDone(true),
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to change password'),
  })

  const handleSubmit = () => {
    if (form.newPassword.length < 8) return toast.error('New password must be at least 8 characters')
    if (form.newPassword !== form.confirmPassword) return toast.error('Passwords do not match')
    mutation.mutate()
  }

  const fields = [
    { field: 'currentPassword', label: 'Current Password', key: 'current' },
    { field: 'newPassword', label: 'New Password', key: 'new' },
    { field: 'confirmPassword', label: 'Confirm New Password', key: 'confirm' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto w-96 h-full bg-white shadow-2xl flex flex-col">

        {/* Top accent */}
        <div className="h-1 w-full bg-gradient-to-r from-orange-400 to-orange-600" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center">
              <KeyRound size={17} className="text-orange-500" />
            </div>
            <div>
              <h3 className="font-semibold text-zinc-900">Change Password</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Update your account password</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        {done ? (
          /* Success state */
          <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6 text-center">
            <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-10 h-10 text-green-500" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-zinc-900 text-lg">Password Updated!</p>
              <p className="text-sm text-zinc-500 mt-1 leading-relaxed">
                Your password has been changed successfully.
              </p>
            </div>
            <button onClick={onClose} className="btn-primary px-8 mt-2">Done</button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">

              {/* Security tip */}
              <div className="flex gap-2.5 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 8v4m0 4h.01" />
                </svg>
                <p className="text-xs text-blue-700 leading-relaxed">
                  Use a strong password with uppercase, numbers and special characters.
                </p>
              </div>

              {/* Fields */}
              {fields.map(({ field, label, key }) => (
                <div key={field}>
                  <label className="block text-xs font-medium text-zinc-600 mb-1.5">{label}</label>
                  <div className="relative">
                    <input
                      type={show[key] ? 'text' : 'password'}
                      className="input pr-10 bg-zinc-50 focus:bg-white transition-colors"
                      placeholder={key === 'current' ? 'Enter current password' : key === 'new' ? 'Min 8 characters' : 'Re-enter new password'}
                      value={form[field]}
                      onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                      autoComplete={key === 'current' ? 'current-password' : 'new-password'}
                    />
                    <button type="button"
                      onClick={() => setShow(s => ({ ...s, [key]: !s[key] }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors">
                      {show[key] ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>

                  {/* Strength bar — only under new password */}
                  {key === 'new' && form.newPassword.length > 0 && (
                    <div className="mt-2.5 space-y-1.5">
                      <div className="flex gap-1">
                        {[1,2,3,4,5].map(i => (
                          <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                            i <= strength.score ? strength.color : 'bg-zinc-100'
                          }`} />
                        ))}
                      </div>
                      <div className="flex justify-between">
                        <p className="text-xs text-zinc-400">Strength</p>
                        <p className={`text-xs font-semibold ${strength.text}`}>{strength.label}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-0.5">
                        {[
                          ['8+ characters', form.newPassword.length >= 8],
                          ['Uppercase', /[A-Z]/.test(form.newPassword)],
                          ['Number', /[0-9]/.test(form.newPassword)],
                          ['Special char', /[^A-Za-z0-9]/.test(form.newPassword)],
                        ].map(([hint, met]) => (
                          <span key={hint} className={`text-xs flex items-center gap-1.5 ${
                            met ? 'text-green-600' : 'text-zinc-400'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              met ? 'bg-green-500' : 'bg-zinc-300'
                            }`} />
                            {hint}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Match indicator — under confirm */}
                  {key === 'confirm' && form.confirmPassword.length > 0 && (
                    <p className={`text-xs mt-1.5 flex items-center gap-1 ${
                      form.newPassword === form.confirmPassword ? 'text-green-600' : 'text-red-500'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        form.newPassword === form.confirmPassword ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      {form.newPassword === form.confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-6 py-5 border-t border-zinc-100 bg-zinc-50 space-y-2">
              <button
                onClick={handleSubmit}
                disabled={!form.currentPassword || !form.newPassword || !form.confirmPassword || mutation.isPending}
                className="btn-primary w-full justify-center">
                {mutation.isPending
                  ? <><Loader2 size={14} className="animate-spin" /> Updating...</>
                  : <><KeyRound size={14} /> Update Password</>}
              </button>
              <button onClick={onClose} className="btn-secondary w-full justify-center text-sm">
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function RestaurantLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [showChangePw, setShowChangePw] = useState(false)

  const { data: profile } = useQuery({
    queryKey: ['restaurant-profile'],
    queryFn: () => api.get('/restaurant/profile').then(r => r.data),
    staleTime: 60000,
  })

  const restaurantName = profile?.name || 'My Business'
  const restaurantId = profile?._id

  const copyRestaurantId = () => {
    if (restaurantId) {
      navigator.clipboard.writeText(restaurantId)
      toast.success('Business ID copied!')
    }
  }

  return (
    <div className="flex h-screen bg-zinc-50 overflow-hidden">
      <aside className="w-60 bg-white border-r border-zinc-200 flex flex-col shrink-0">
        {/* Brand — shows restaurant name */}
        <div className="px-5 py-4 border-b border-zinc-200">
          <div className="flex items-center gap-3 mb-2">
            {profile?.logoUrl
              ? <img src={profile.logoUrl} alt="Logo" className="w-9 h-9 rounded-xl object-cover shrink-0" />
              : <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center shrink-0">
                  <span className="text-white font-bold text-sm">{restaurantName[0]}</span>
                </div>
            }
            <div className="min-w-0">
              <p className="font-semibold text-zinc-900 text-sm leading-tight truncate">{restaurantName}</p>
              <p className="text-zinc-400 text-xs">Business Panel</p>
            </div>
          </div>
          {/* Restaurant ID */}
          {restaurantId && (
            <button
              onClick={copyRestaurantId}
              className="w-full flex items-center justify-between px-2 py-1.5 bg-zinc-50 hover:bg-zinc-100 rounded-lg transition-colors group"
            >
              <div className="min-w-0">
                <p className="text-xs text-zinc-400">Business ID</p>
                <p className="font-mono text-xs text-zinc-600 truncate">{restaurantId}</p>
              </div>
              <Copy size={11} className="text-zinc-400 group-hover:text-orange-500 shrink-0 ml-2 transition-colors" />
            </button>
          )}
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-orange-50 text-orange-600 border border-orange-100'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`
            }>
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
          <button
            onClick={() => setShowChangePw(true)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 w-full text-left">
            <KeyRound size={17} />
            Change Password
          </button>
        </nav>

        <div className="p-4 border-t border-zinc-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
              <span className="text-orange-600 text-xs font-semibold">
                {user?.name?.charAt(0)?.toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-zinc-900 text-xs font-medium truncate">{user?.name}</p>
              <p className="text-zinc-400 text-xs truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={async () => { await logout(); navigate('/login') }}
            className="flex items-center gap-2 text-zinc-400 hover:text-red-500 text-xs transition-colors"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header shows restaurant name */}
        <header className="bg-white border-b border-zinc-200 px-6 py-4 shrink-0 flex items-center justify-between">
          <div>
            <p className="font-semibold text-zinc-900 text-base">{restaurantName}</p>
            <p className="text-zinc-400 text-xs">Powered by ChatServe</p>
          </div>
          {profile?.whatsappConfig?.botEnabled && (
            <span className="badge-active">● Bot Live</span>
          )}
        </header>
        <main className="flex-1 overflow-y-auto p-6 page-enter">
          <Outlet />
        </main>
      </div>
      {showChangePw && <ChangePasswordDrawer onClose={() => setShowChangePw(false)} />}
    </div>
  )
}