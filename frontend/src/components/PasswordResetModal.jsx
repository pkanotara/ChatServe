import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { X, KeyRound, Eye, EyeOff, Loader2, ShieldAlert, CheckCircle2, User, Mail } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'

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

export default function PasswordResetModal({ ownerId, ownerName, ownerEmail, onClose }) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [done, setDone] = useState(false)

  const strength = getStrength(password)
  const canSubmit = password.length >= 8 && confirmed

  const resetPassword = useMutation({
    mutationFn: () => api.post(`/admin/restaurants/${ownerId}/reset-password`, { newPassword: password }),
    onSuccess: () => setDone(true),
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to reset password'),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-zinc-100 overflow-hidden">

        {/* Top accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-orange-400 to-orange-600" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center">
              <KeyRound size={17} className="text-orange-500" />
            </div>
            <div>
              <h2 className="font-semibold text-zinc-900 text-base">Reset Password</h2>
              <p className="text-xs text-zinc-400">Admin action — owner will be notified</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        {done ? (
          /* ── Success state ── */
          <div className="px-6 pb-6 flex flex-col items-center text-center gap-4 pt-4">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle2 size={32} className="text-green-500" />
            </div>
            <div>
              <p className="font-semibold text-zinc-900 text-lg">Password Reset!</p>
              <p className="text-sm text-zinc-500 mt-1">
                A notification email has been sent to <span className="font-medium text-zinc-700">{ownerEmail}</span>.
                Their session has been invalidated.
              </p>
            </div>
            <button onClick={onClose} className="btn-primary mt-2 px-8">Done</button>
          </div>
        ) : (
          <>
            <div className="px-6 pb-6 space-y-5">
              {/* Owner card */}
              <div className="flex items-center gap-3 bg-zinc-50 rounded-xl px-4 py-3 border border-zinc-100">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                  <span className="text-orange-600 font-bold text-sm">{ownerName?.[0]?.toUpperCase()}</span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <User size={11} className="text-zinc-400" />
                    <p className="font-medium text-zinc-900 text-sm truncate">{ownerName}</p>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Mail size={11} className="text-zinc-400" />
                    <p className="text-zinc-500 text-xs truncate">{ownerEmail}</p>
                  </div>
                </div>
              </div>

              {/* Warning */}
              <div className="flex gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <ShieldAlert size={15} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 leading-relaxed">
                  This will <strong>immediately log out</strong> the owner from all active sessions.
                  They'll receive an email notification about this change.
                </p>
              </div>

              {/* Password field */}
              <div>
                <label className="label">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="input pr-10"
                    placeholder="Minimum 8 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 transition-colors">
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>

                {/* Strength bar */}
                {password.length > 0 && (
                  <div className="mt-2.5 space-y-1.5">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= strength.score ? strength.color : 'bg-zinc-100'}`} />
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-zinc-400">Password strength</p>
                      <p className={`text-xs font-semibold ${strength.text}`}>{strength.label}</p>
                    </div>
                    <ul className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-1">
                      {[
                        ['8+ characters', password.length >= 8],
                        ['Uppercase letter', /[A-Z]/.test(password)],
                        ['Number', /[0-9]/.test(password)],
                        ['Special character', /[^A-Za-z0-9]/.test(password)],
                      ].map(([label, met]) => (
                        <li key={label} className={`text-xs flex items-center gap-1 ${met ? 'text-green-600' : 'text-zinc-400'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${met ? 'bg-green-500' : 'bg-zinc-300'}`} />
                          {label}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Confirm checkbox */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${confirmed ? 'bg-orange-500 border-orange-500' : 'border-zinc-300 group-hover:border-orange-400'}`}>
                  {confirmed && <CheckCircle2 size={10} className="text-white" />}
                  <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="sr-only" />
                </div>
                <span className="text-xs text-zinc-600 leading-relaxed">
                  I confirm this will reset the owner's password and invalidate all their active sessions.
                </span>
              </label>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 bg-zinc-50 border-t border-zinc-100">
              <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button
                onClick={() => resetPassword.mutate()}
                disabled={!canSubmit || resetPassword.isPending}
                className="btn-primary flex-1 justify-center">
                {resetPassword.isPending
                  ? <><Loader2 size={14} className="animate-spin" /> Resetting...</>
                  : <><KeyRound size={14} /> Reset Password</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
