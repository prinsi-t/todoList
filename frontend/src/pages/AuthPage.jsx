import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function AuthPage({ mode, onSubmit, loading, error }) {
  const isLogin = mode === 'login'
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)

  const submit = (e) => {
    e.preventDefault()
    onSubmit(mode, form)
  }

  return (
    <main className="flex min-h-screen bg-neutral-950 text-white">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-neutral-900 border-r border-neutral-800 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-black font-bold">✓</div>
          <span className="text-2xl font-bold tracking-tight">TaskFlow</span>
        </div>
        <div>
          <blockquote className="text-3xl font-semibold leading-snug text-white mb-6">
            "Organize your day. Own your week. Master your life."
          </blockquote>
          <div className="flex gap-3">
            {['Focus', 'Clarity', 'Progress'].map((tag) => (
              <span key={tag} className="px-3 py-1 rounded-full border border-neutral-700 text-sm text-neutral-400">
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          {[
            { label: 'Tasks completed today', value: '2,481' },
            { label: 'Active users', value: '14,200+' },
          ].map((stat) => (
            <div key={stat.label} className="flex justify-between text-sm">
              <span className="text-neutral-500">{stat.label}</span>
              <span className="text-white font-semibold">{stat.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">{isLogin ? 'Welcome back' : 'Create account'}</h1>
            <p className="text-neutral-400 text-sm">
              {isLogin
                ? 'Sign in to pick up where you left off.'
                : 'Start organizing your life — it only takes a moment.'}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5 uppercase tracking-wider">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Your full name"
                  className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm outline-none focus:border-white transition-colors placeholder:text-neutral-600"
                  required
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5 uppercase tracking-wider">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm outline-none focus:border-white transition-colors placeholder:text-neutral-600"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5 uppercase tracking-wider">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 pr-11 text-sm outline-none focus:border-white transition-colors placeholder:text-neutral-600"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={1.8}>
                      <path d="M3 3l18 18M10.58 10.58A2 2 0 0012 14a2 2 0 001.41-3.41M9.88 4.24A10.94 10.94 0 0112 5c4.5 0 7.5 3 9 5.5a11.62 11.62 0 01-4.12 4.12M6.1 6.1A11.6 11.6 0 003 10.5C4.5 13 7.5 16 12 16a10.9 10.9 0 003.88-.72" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={1.8}>
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-950 border border-red-800 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-white px-4 py-3 font-semibold text-black hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm mt-2"
            >
              {loading ? 'Please wait...' : isLogin ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-sm text-neutral-500 text-center">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <Link
              to={isLogin ? '/register' : '/login'}
              className="text-white hover:underline font-medium"
            >
              {isLogin ? 'Register' : 'Login'}
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}