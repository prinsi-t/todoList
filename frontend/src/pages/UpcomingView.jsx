import { useCallback, useEffect, useState } from 'react'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const WEEKDAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

function getGroupLabel(dateStr) {
  const d = new Date(dateStr)
  d.setHours(0, 0, 0, 0)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const diff = Math.round((d - now) / 86400000)

  if (diff < 0) return { label: 'Overdue', color: 'text-red-400', border: 'border-red-900/40', bg: 'bg-red-950/20' }
  if (diff === 0) return { label: 'Today', color: 'text-green-400', border: 'border-green-900/40', bg: 'bg-green-950/20' }
  if (diff === 1) return { label: 'Tomorrow', color: 'text-blue-400', border: 'border-blue-900/40', bg: 'bg-blue-950/20' }
  if (diff < 7) return { label: WEEKDAYS[d.getDay()], color: 'text-yellow-400', border: 'border-yellow-900/40', bg: 'bg-yellow-950/20' }
  return {
    label: `${MONTHS[d.getMonth()]} ${d.getDate()}`,
    color: 'text-neutral-400',
    border: 'border-neutral-800',
    bg: 'bg-neutral-900/40',
  }
}

function DateBadge({ dateStr }) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  return (
    <span className="text-xs text-neutral-500">
      {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
    </span>
  )
}

export default function UpcomingView({ token }) {
  const [todos, setTodos] = useState([])
  const [loading, setLoading] = useState(true)

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

  // Separate tasks with and without due dates
  const withDate = todos
    .filter((t) => t.due_date)
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))

  const undated = todos.filter((t) => !t.due_date)

  // Group by date bucket label
  const groups = withDate.reduce((acc, todo) => {
    const info = getGroupLabel(todo.due_date)
    const key = info.label
    if (!acc[key]) acc[key] = { ...info, items: [] }
    acc[key].items.push(todo)
    return acc
  }, {})

  // Keep overdue first, then chronological
  const groupOrder = ['Overdue', 'Today', 'Tomorrow', ...Object.keys(groups).filter(
    (k) => !['Overdue', 'Today', 'Tomorrow'].includes(k)
  )]

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="mb-8">
        <p className="text-xs text-neutral-500 uppercase tracking-widest mb-1">What's ahead</p>
        <h1 className="text-3xl font-bold text-white">Upcoming</h1>
      </div>

      {loading ? (
        <div className="text-center py-16 text-neutral-600 text-sm">Loading...</div>
      ) : (
        <div className="space-y-6">
          {/* Dated groups */}
          {groupOrder.map((key) => {
            const group = groups[key]
            if (!group) return null
            return (
              <div key={key}>
                {/* Group header */}
                <div className={`flex items-center gap-3 mb-3 px-3 py-2 rounded-xl border ${group.border} ${group.bg}`}>
                  <span className={`text-xs font-bold uppercase tracking-widest ${group.color}`}>
                    {group.label}
                  </span>
                  <span className="text-xs text-neutral-600">{group.items.length} task{group.items.length !== 1 ? 's' : ''}</span>
                </div>

                <ul className="space-y-2">
                  {group.items.map((todo) => (
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
                        <DateBadge dateStr={todo.due_date} />
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
                  ))}
                </ul>
              </div>
            )
          })}

          {/* Undated tasks */}
          {undated.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-3 px-3 py-2 rounded-xl border border-neutral-800 bg-neutral-900/40">
                <span className="text-xs font-bold uppercase tracking-widest text-neutral-500">No due date</span>
                <span className="text-xs text-neutral-600">{undated.length} task{undated.length !== 1 ? 's' : ''}</span>
              </div>
              <ul className="space-y-2">
                {undated.map((todo) => (
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
                    <p className={`flex-1 text-sm truncate ${todo.completed ? 'line-through text-neutral-600' : 'text-white'}`}>
                      {todo.title}
                    </p>
                    <span className="text-xs text-neutral-700 mr-2">No date</span>
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
                ))}
              </ul>
            </div>
          )}

          {/* Empty state */}
          {withDate.length === 0 && undated.length === 0 && (
            <div className="rounded-xl border border-dashed border-neutral-800 p-12 text-center text-neutral-600 text-sm">
              <p className="text-4xl mb-4">📅</p>
              No tasks yet. Add tasks with a due date from the Today view.
            </div>
          )}
        </div>
      )}
    </div>
  )
}