import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Briefcase, Eye, EyeOff, Loader2, ShieldCheck, Store } from 'lucide-react'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '', role: 'restaurant_owner' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const user = await login(form.email, form.password, form.role)
      toast.success(`Welcome back, ${user.name}!`)
      navigate(user.role === 'super_admin' ? '/admin' : '/dashboard', { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#070708] px-4 py-5">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 h-[520px] w-[520px] rounded-full bg-orange-500/20 blur-[110px]" />
        <div className="absolute -right-32 top-10 h-[560px] w-[560px] rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="absolute bottom-0 left-1/2 h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-white/5 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(249,115,22,0.12),transparent_55%),radial-gradient(circle_at_70%_70%,rgba(16,185,129,0.09),transparent_55%)]" />
      </div>

      <div className="relative mx-auto grid min-h-[calc(100vh-2.5rem)] w-full max-w-[1200px] overflow-hidden rounded-[34px] border border-white/10 bg-white/5 shadow-[0_30px_120px_rgba(0,0,0,0.55)] backdrop-blur-2xl lg:grid-cols-[0.9fr_1.1fr]">
        {/* Left: Brand / Value prop */}
        <div className="relative hidden overflow-hidden lg:block">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(249,115,22,0.20),rgba(0,0,0,0)_45%),linear-gradient(225deg,rgba(16,185,129,0.10),rgba(0,0,0,0)_55%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.10),transparent_45%)]" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          <div className="relative z-10 flex h-full flex-col justify-between p-10 xl:p-12">
            <div>
              <div className="inline-flex items-center gap-4 rounded-[22px] border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-xl">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-[0_18px_50px_rgba(249,115,22,0.35)]">
                  <Briefcase size={28} className="text-white" />
                </div>
                <div>
                  <h1 className="text-[2.05rem] font-semibold leading-none tracking-tight text-white">
                    ChatServe
                  </h1>
                  <p className="mt-1 text-sm text-white/70">WhatsApp Restaurant Platform</p>
                </div>
              </div>

              <div className="mt-14 max-w-[520px]">
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-orange-300/90">
                  Secure access • Role-based
                </p>

                <h2 className="mt-6 text-5xl font-bold leading-[1.07] tracking-tight text-white">
                  Sign in and run your business like a pro.
                </h2>

                <p className="mt-6 text-[15px] leading-7 text-white/70">
                  Built for business owners and platform admins to handle onboarding, automation,
                  WhatsApp integrations, and day-to-day operations with confidence.
                </p>
              </div>

              <div className="mt-10 grid grid-cols-2 gap-4">
                <div className="rounded-[22px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-200 ring-1 ring-orange-500/15">
                    <Store size={18} />
                  </div>
                  <h3 className="text-sm font-semibold text-white">Business Access</h3>
                  <p className="mt-2 text-sm leading-6 text-white/70">
                    Dedicated workspace for each business.
                  </p>
                </div>

                <div className="rounded-[22px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-200 ring-1 ring-emerald-500/15">
                    <ShieldCheck size={18} />
                  </div>
                  <h3 className="text-sm font-semibold text-white">Admin Control</h3>
                  <p className="mt-2 text-sm leading-6 text-white/70">
                    Centralized management with secure role-based authentication.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Form */}
        <div className="flex items-center justify-center p-4 sm:p-6 lg:p-10">
          <div className="w-full max-w-[520px]">
            {/* Mobile brand */}
            <div className="mb-7 text-center lg:hidden">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-[0_18px_50px_rgba(249,115,22,0.35)]">
                <Briefcase size={28} className="text-white" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white">ChatServe</h1>
              <p className="mt-1 text-sm text-white/70">WhatsApp Business Platform</p>
            </div>

            <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.06] p-6 shadow-[0_18px_70px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-7 lg:p-8">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(249,115,22,0.10),transparent_45%),radial-gradient(circle_at_90%_30%,rgba(255,255,255,0.06),transparent_55%)]" />
              <div className="relative">
                <div className="mb-6">
                  <p className="text-sm font-semibold text-orange-300">Welcome back</p>
                  <h2 className="mt-2 text-[2rem] font-bold leading-tight tracking-tight text-white">
                    Sign in
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-white/70">
                    Choose your role, enter your credentials, and continue to your dashboard.
                  </p>
                </div>

                {/* Role Selector */}
                <div className="mb-6">
                  <div className="relative grid grid-cols-2 rounded-2xl bg-white/5 p-1.5 ring-1 ring-white/10">
                    <div
                      className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] rounded-xl bg-white/10 shadow-sm ring-1 ring-white/15 transition-all duration-300 ease-out ${
                        form.role === 'restaurant_owner'
                          ? 'left-1.5'
                          : 'left-[calc(50%+4px)]'
                      }`}
                    />

                    {[
                      { value: 'restaurant_owner', label: 'Business Owner', icon: Store },
                      { value: 'super_admin', label: 'Platform Admin', icon: ShieldCheck },
                    ].map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, role: value }))}
                        className={`relative z-10 flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition-all duration-300 ${
                          form.role === value
                            ? 'text-white'
                            : 'text-white/60 hover:text-white'
                        }`}
                      >
                        <Icon
                          size={16}
                          className={`transition-all duration-300 ${
                            form.role === value ? 'text-orange-300' : 'text-white/40'
                          }`}
                        />
                        <span className="whitespace-nowrap">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-white/80">
                      Email address
                    </label>
                    <input
                      type="email"
                      required
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm text-white placeholder:text-white/35 outline-none transition-all focus:border-orange-400/60 focus:bg-white/10 focus:ring-4 focus:ring-orange-500/10"
                      placeholder="you@business.com"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-white/80">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPass ? 'text' : 'password'}
                        required
                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 pr-12 text-sm text-white placeholder:text-white/35 outline-none transition-all focus:border-orange-400/60 focus:bg-white/10 focus:ring-4 focus:ring-orange-500/10"
                        placeholder="Enter your password"
                        value={form.password}
                        onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(p => !p)}
                        className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                      >
                        {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-3.5 text-sm font-bold text-white shadow-[0_14px_40px_rgba(249,115,22,0.25)] transition-all hover:brightness-110 active:scale-[0.995] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading && <Loader2 size={17} className="animate-spin" />}
                    {loading ? 'Signing in...' : 'Sign In'}
                  </button>
                </form>

                {/* Compact Demo Credentials */}
                <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-orange-200">
                      Demo credentials
                    </p>
                    <div className="hidden h-px flex-1 bg-white/10 sm:block" />
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <p className="text-xs font-semibold text-white">Business Owner</p>
                      <p className="mt-2 text-xs leading-6 text-white/70">
                        <span className="font-medium text-white">Email:</span> demo@spicegarden.com
                      </p>
                      <p className="text-xs leading-6 text-white/70">
                        <span className="font-medium text-white">Password:</span> Demo@1234!
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <p className="text-xs font-semibold text-white">Platform Admin</p>
                      <p className="mt-2 text-xs leading-6 text-white/70">
                        <span className="font-medium text-white">Email:</span> admin@ChatServe.com
                      </p>
                      <p className="text-xs leading-6 text-white/70">
                        <span className="font-medium text-white">Password:</span> Admin@1234!
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            <p className="mt-6 text-center text-xs text-white/50">
              By continuing, you agree to the platform’s terms and privacy policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}