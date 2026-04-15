import { useCallback, useEffect, useMemo, useState } from 'react'

export default function TodayView({ token }) {
  const [todos, setTodos] = useState([])
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  const completedCount = useMemo(() => todos.filter((t) => t.completed).length, [todos])
  const percent = todos.length ? Math.round((completedCount / todos.length) * 100) : 0

  const filtered = useMemo(() => {
    if (filter === 'active') return todos.filter((t) => !t.completed)
    if (filter === 'done') return todos.filter((t) => t.completed)
    return todos
  }, [todos, filter])

  const fetchTodos = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/todos', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return
      setTodos(await res.json())
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { fetchTodos() }, [fetchTodos])

  const addTodo = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    const body = { title }
    if (dueDate) body.due_date = dueDate
    try {
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      console.log('Add todo response:', res.status, data)
      if (res.ok) { 
        setTitle(''); 
        setDueDate(''); 
        fetchTodos() 
      } else {
        console.error('Failed to add todo:', data)
      }
    } catch (err) {
      console.error('Error adding todo:', err)
    }
  }

  const toggleTodo = async (id) => {
    const res = await fetch(`/api/todos/${id}/toggle`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) fetchTodos()
  }

  const deleteTodo = async (id) => {
    const res = await fetch(`/api/todos/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) fetchTodos()
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return null
    const d = new Date(dateStr)
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    d.setHours(0, 0, 0, 0)
    const diff = Math.round((d - now) / 86400000)
    if (diff === 0) return { label: 'Today', color: 'text-green-400' }
    if (diff === 1) return { label: 'Tomorrow', color: 'text-blue-400' }
    if (diff === -1) return { label: 'Yesterday', color: 'text-red-400' }
    if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, color: 'text-red-400' }
    if (diff < 7) return { label: `In ${diff} days`, color: 'text-yellow-400' }
    return {
      label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      color: 'text-neutral-400',
    }
  }

  const todayStr = new Date().toISOString().split('T')[0]
  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="mb-8">
        <p className="text-xs text-neutral-500 uppercase tracking-widest mb-1">{todayLabel}</p>
        <h1 className="text-3xl font-bold text-white">Today</h1>
      </div>

      {/* Progress bar */}
      {todos.length > 0 && (
        <div className="mb-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
          <div className="flex justify-between items-end mb-3">
            <p className="text-sm text-neutral-400">Daily progress</p>
            <p className="text-sm font-bold text-white">{completedCount}/{todos.length} tasks</p>
          </div>
          <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="text-right text-xs text-neutral-600 mt-2">{percent}% complete</p>
        </div>
      )}

      {/* Add task form */}
      <form onSubmit={addTodo} className="mb-5 space-y-2">
        <div className="flex gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add a new task..."
            className="flex-1 rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm text-white outline-none focus:border-neutral-500 transition-colors placeholder:text-neutral-600"
          />
          <button
            type="submit"
            className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-neutral-200 transition-colors flex-shrink-0"
          >
            Add
          </button>
        </div>

        {/* Due date picker */}
        <div className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-2.5">
          <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 text-neutral-500 flex-shrink-0" stroke="currentColor" strokeWidth={1.5}>
            <rect x="3" y="4" width="14" height="14" rx="2" />
            <path d="M7 2v4M13 2v4M3 9h14" strokeLinecap="round" />
          </svg>
          <label className="text-xs text-neutral-500 flex-shrink-0">Due date</label>
          <input
            type="date"
            value={dueDate}
            min={todayStr}
            onChange={(e) => setDueDate(e.target.value)}
            className="flex-1 bg-transparent text-xs text-white outline-none [color-scheme:dark] cursor-pointer"
          />
          {dueDate && (
            <button
              type="button"
              onClick={() => setDueDate('')}
              className="text-xs text-neutral-600 hover:text-red-400 transition-colors flex-shrink-0"
            >
              ✕ Clear
            </button>
          )}
          {!dueDate && (
            <span className="text-xs text-neutral-700 flex-shrink-0">Optional</span>
          )}
        </div>
      </form>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-5 bg-neutral-900 border border-neutral-800 rounded-xl p-1 w-fit">
        {['all', 'active', 'done'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
              filter === f ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Todo list */}
      {loading ? (
        <div className="text-center py-16 text-neutral-600 text-sm">Loading...</div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((todo) => {
            const dateInfo = formatDate(todo.due_date)
            return (
              <li
                key={todo._id}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-neutral-800 bg-neutral-900 group hover:border-neutral-700 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggleTodo(todo._id)}
                  className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                    todo.completed
                      ? 'border-neutral-500 bg-neutral-700 text-neutral-400'
                      : 'border-neutral-600 hover:border-white'
                  }`}
                >
                  {todo.completed && (
                    <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${todo.completed ? 'line-through text-neutral-600' : 'text-white'}`}>
                    {todo.title}
                  </p>
                  {dateInfo && (
                    <p className={`text-xs mt-0.5 flex items-center gap-1 ${dateInfo.color}`}>
                      <svg viewBox="0 0 16 16" fill="none" className="w-3 h-3" stroke="currentColor" strokeWidth={1.5}>
                        <rect x="2" y="3" width="12" height="12" rx="1.5" />
                        <path d="M5 1.5v3M11 1.5v3M2 7.5h12" strokeLinecap="round" />
                      </svg>
                      {dateInfo.label}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => deleteTodo(todo._id)}
                  className="opacity-0 group-hover:opacity-100 text-neutral-600 hover:text-red-400 transition-all"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </li>
            )
          })}
          {!filtered.length && (
            <li className="rounded-xl border border-dashed border-neutral-800 p-10 text-center text-neutral-600 text-sm">
              {filter === 'done'
                ? 'No completed tasks yet.'
                : filter === 'active'
                ? 'No active tasks — enjoy the break!'
                : 'No tasks yet. Add your first one above.'}
            </li>
          )}
        </ul>
      )}
    </div>
  )
}