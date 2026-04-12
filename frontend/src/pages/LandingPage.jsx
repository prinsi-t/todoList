import { Link } from 'react-router-dom'

const FEATURES = [
  {
    icon: '✦',
    title: 'Today View',
    desc: "See exactly what needs to get done today. No noise, no distractions — just today's priorities.",
  },
  {
    icon: '◎',
    title: 'Sticky Wall',
    desc: 'Capture quick thoughts and ideas as sticky notes. Your digital corkboard, always within reach.',
  },
  {
    icon: '⊟',
    title: 'Calendar Mode',
    desc: 'Visualize your tasks across days and weeks. Plan ahead without losing sight of the present.',
  },
  {
    icon: '↑',
    title: 'Upcoming Tasks',
    desc: 'Stay ahead of deadlines. Upcoming gives you a clean view of everything on the horizon.',
  },
]

const TESTIMONIALS = [
  {
    name: 'Arjun M.',
    role: 'Product Designer',
    text: "TaskFlow completely changed how I work. The sidebar layout makes switching contexts effortless.",
  },
  {
    name: 'Sara K.',
    role: 'Freelance Developer',
    text: "Finally a task app that doesn't try to do too much. The sticky wall is my favorite feature.",
  },
  {
    name: 'Ravi P.',
    role: 'Startup Founder',
    text: "Clean, fast, and beautiful. I've tried a dozen todo apps — this one actually sticks.",
  },
]

const STATS = [
  { value: '14K+', label: 'Active users' },
  { value: '2M+', label: 'Tasks completed' },
  { value: '99.9%', label: 'Uptime' },
  { value: '4.9★', label: 'User rating' },
]

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      {/* Header */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5 sticky top-0 z-10 bg-neutral-950/90 backdrop-blur border-b border-neutral-900">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-black font-bold text-sm">✓</div>
          <span className="text-xl font-bold tracking-tight">TaskFlow</span>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm text-neutral-400">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#testimonials" className="hover:text-white transition-colors">Reviews</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link to="/login" className="hidden md:block text-sm text-neutral-400 hover:text-white transition-colors px-3 py-2">
            Login
          </Link>
          <Link
            to="/register"
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-neutral-200 transition-colors"
          >
            Get started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-neutral-900 border border-neutral-800 px-4 py-1.5 text-xs text-neutral-400 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block"></span>
          Now with Sticky Wall & Calendar — fully free
        </div>
        <h1 className="text-6xl md:text-7xl font-bold leading-none tracking-tight mb-6">
          Less clutter.<br />
          <span className="text-neutral-500">More done.</span>
        </h1>
        <p className="max-w-xl mx-auto text-lg text-neutral-400 mb-10">
          TaskFlow is a minimal, distraction-free task manager built for people who want to focus on what actually matters.
        </p>
        <div className="flex justify-center gap-3 flex-wrap">
          <Link to="/register" className="rounded-xl bg-white px-7 py-3.5 font-semibold text-black hover:bg-neutral-200 transition-colors text-sm">
            Start for free
          </Link>
          <Link to="/login" className="rounded-xl border border-neutral-700 px-7 py-3.5 font-semibold text-neutral-300 hover:bg-neutral-900 transition-colors text-sm">
            Sign in
          </Link>
        </div>
      </section>

      {/* App preview mockup */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 overflow-hidden shadow-2xl">
          {/* Fake browser bar */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-800 bg-neutral-950">
            <span className="w-3 h-3 rounded-full bg-neutral-700"></span>
            <span className="w-3 h-3 rounded-full bg-neutral-700"></span>
            <span className="w-3 h-3 rounded-full bg-neutral-700"></span>
            <div className="flex-1 mx-4 bg-neutral-800 rounded-md h-5 text-xs text-neutral-500 flex items-center px-3">
              app.taskflow.io
            </div>
          </div>
          {/* Fake dashboard UI */}
          <div className="flex min-h-64">
            {/* Sidebar */}
            <div className="w-48 border-r border-neutral-800 p-4 space-y-1 hidden md:block">
              {['Today', 'Upcoming', 'Sticky Wall', 'Calendar'].map((item, i) => (
                <div
                  key={item}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm ${
                    i === 0 ? 'bg-white text-black font-semibold' : 'text-neutral-500'
                  }`}
                >
                  <span className="text-xs">{['✓','↑','◎','⊟'][i]}</span>
                  {item}
                </div>
              ))}
            </div>
            {/* Main content */}
            <div className="flex-1 p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-xs text-neutral-500 mb-0.5">Monday, April 12</p>
                  <h3 className="text-lg font-bold">Today's Tasks</h3>
                </div>
                <span className="text-xs text-neutral-500">3 / 5 done</span>
              </div>
              <div className="space-y-2">
                {[
                  { title: 'Review design mockups', done: true },
                  { title: 'Send client proposal', done: true },
                  { title: 'Fix nav bug on mobile', done: true },
                  { title: 'Write sprint retrospective', done: false },
                  { title: 'Update project docs', done: false },
                ].map((task) => (
                  <div
                    key={task.title}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border ${
                      task.done
                        ? 'border-neutral-800 bg-transparent'
                        : 'border-neutral-700 bg-neutral-800/50'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center text-xs ${
                        task.done ? 'border-neutral-600 bg-neutral-700 text-neutral-400' : 'border-neutral-600'
                      }`}
                    >
                      {task.done && '✓'}
                    </div>
                    <span className={`text-sm ${task.done ? 'text-neutral-600 line-through' : 'text-white'}`}>
                      {task.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-neutral-800 py-12 bg-neutral-900/30">
        <div className="mx-auto max-w-4xl px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {STATS.map((s) => (
            <div key={s.label}>
              <p className="text-3xl font-bold text-white mb-1">{s.value}</p>
              <p className="text-sm text-neutral-500">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Everything you need. Nothing you don't.</h2>
          <p className="text-neutral-400 max-w-xl mx-auto">Four powerful views to help you plan, capture, and execute.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-neutral-800 bg-neutral-900 p-7 hover:border-neutral-600 transition-colors group"
            >
              <div className="text-2xl mb-5 w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center group-hover:bg-neutral-700 transition-colors">
                {f.icon}
              </div>
              <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-neutral-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="bg-neutral-900/40 border-y border-neutral-800 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-3xl font-bold text-center mb-12">Loved by focused people</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="rounded-2xl border border-neutral-800 bg-neutral-900 p-7">
                <p className="text-neutral-300 text-sm leading-relaxed mb-5">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center text-xs font-bold">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{t.name}</p>
                    <p className="text-xs text-neutral-500">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h2 className="text-4xl font-bold mb-4">Ready to get focused?</h2>
        <p className="text-neutral-400 mb-8">Join thousands of users who get more done every day with TaskFlow.</p>
        <Link to="/register" className="rounded-xl bg-white px-8 py-4 font-semibold text-black hover:bg-neutral-200 transition-colors inline-block">
          Start for free — no credit card needed
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-800 py-8">
        <div className="mx-auto max-w-6xl px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-neutral-600">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-white flex items-center justify-center text-black text-xs font-bold">✓</div>
            <span className="font-semibold text-neutral-400">TaskFlow</span>
          </div>
          <p>© 2026 TaskFlow. Built for focused humans.</p>
          <div className="flex gap-5">
            <Link to="/login" className="hover:text-white transition-colors">Login</Link>
            <Link to="/register" className="hover:text-white transition-colors">Register</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}