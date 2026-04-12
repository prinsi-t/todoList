import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function AuthPage({ mode, onSubmit, loading, error }) {
  const isLogin = mode === 'login'
  const [form, setForm] = useState({ name: '', email: '', password: '' })

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
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                placeholder="••••••••"
                className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm outline-none focus:border-white transition-colors placeholder:text-neutral-600"
                required
              />
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