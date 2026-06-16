import { useCallback, useEffect, useRef, useState } from 'react'

const COLORS = [
  { bg: 'bg-yellow-950/60', border: 'border-yellow-800/60', text: 'text-yellow-200', label: 'Yellow' },
  { bg: 'bg-blue-950/60', border: 'border-blue-800/60', text: 'text-blue-200', label: 'Blue' },
  { bg: 'bg-green-950/60', border: 'border-green-800/60', text: 'text-green-200', label: 'Green' },
  { bg: 'bg-purple-950/60', border: 'border-purple-800/60', text: 'text-purple-200', label: 'Purple' },
  { bg: 'bg-rose-950/60', border: 'border-rose-800/60', text: 'text-rose-200', label: 'Pink' },
]

export default function StickyWallView({ token }) {
  const [stickies, setStickies] = useState([])
  const [colorIdx, setColorIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const saveTimers = useRef({})

  const fetchStickies = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/stickies', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return
      setStickies(await res.json())
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchStickies()
    return () => {
      Object.values(saveTimers.current).forEach(clearTimeout)
    }
  }, [fetchStickies])

  const addSticky = async () => {
    const res = await fetch('/api/stickies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ text: '', colorIdx }),
    })
    if (res.ok) {
      const sticky = await res.json()
      setStickies((prev) => [sticky, ...prev])
    }
  }

  const updateSticky = (id, text) => {
    setStickies((prev) => prev.map((s) => (s._id === id ? { ...s, text } : s)))

    if (saveTimers.current[id]) clearTimeout(saveTimers.current[id])
    saveTimers.current[id] = setTimeout(async () => {
      await fetch(`/api/stickies/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text }),
      })
      delete saveTimers.current[id]
    }, 400)
  }

  const deleteSticky = async (id) => {
    if (saveTimers.current[id]) {
      clearTimeout(saveTimers.current[id])
      delete saveTimers.current[id]
    }

    const res = await fetch(`/api/stickies/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      setStickies((prev) => prev.filter((s) => s._id !== id))
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-8 gap-4">
        <div>
          <p className="text-xs text-neutral-500 uppercase tracking-widest mb-1">Quick notes</p>
          <h1 className="text-3xl font-bold text-white">Sticky Wall</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            {COLORS.map((c, i) => (
              <button
                key={i}
                onClick={() => setColorIdx(i)}
                className={`w-5 h-5 rounded-full border-2 transition-all ${c.bg} ${
                  colorIdx === i ? 'border-white scale-125' : 'border-transparent'
                }`}
                title={c.label}
              />
            ))}
          </div>
          <button
            onClick={addSticky}
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-neutral-200 transition-colors"
          >
            + Add note
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-neutral-600 text-sm">Loading...</div>
      ) : stickies.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-800 p-16 text-center text-neutral-600 text-sm">
          <p className="text-4xl mb-4">📌</p>
          No sticky notes yet. Add your first one!
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stickies.map((s) => {
            const c = COLORS[s.colorIdx ?? 0] ?? COLORS[0]
            return (
              <div
                key={s._id}
                className={`break-inside-avoid rounded-2xl border ${c.bg} ${c.border} p-4 group relative`}
              >
                <textarea
                  value={s.text}
                  onChange={(e) => updateSticky(s._id, e.target.value)}
                  placeholder="Write anything..."
                  rows={4}
                  className={`w-full bg-transparent resize-none outline-none text-sm leading-relaxed placeholder:text-current placeholder:opacity-30 ${c.text}`}
                />
                <button
                  onClick={() => deleteSticky(s._id)}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-60 hover:!opacity-100 text-current transition-opacity text-xs"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 ${c.text}`}>
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
