// UpcomingView.jsx
// Shows tasks grouped into "Next 7 Days" buckets.
// Since the API may not have due dates, we show the todo list
// with the ability to set a due date.

import { useCallback, useEffect, useState } from 'react'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function getDayLabel(dateStr) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(dateStr)
  d.setHours(0, 0, 0, 0)
  const diff = Math.round((d - today) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  if (diff > 0 && diff < 7) return DAYS[d.getDay()]
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`
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

  // Group todos with a due_date; show undated separately
  const withDate = todos.filter((t) => t.due_date).sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
  const undated = todos.filter((t) => !t.due_date && !t.completed)

  // Group withDate by date string
  const groups = withDate.reduce((acc, todo) => {
    const key = new Date(todo.due_date).toDateString()
    if (!acc[key]) acc[key] = { label: getDayLabel(todo.due_date), date: todo.due_date, items: [] }
    acc[key].items.push(todo)
    return acc
  }, {})

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="mb-8">
        <p className="text-xs text-neutral-500 uppercase tracking-widest mb-1">What's ahead</p>
        <h1 className="text-3xl font-bold text-white">Upcoming</h1>
      </div>

      {loading ? (
        <div className="text-center py-16 text-neutral-600 text-sm">Loading...</div>
      ) : (
        <>
          {/* Grouped by date */}
          {Object.keys(groups).length > 0 ? (
            <div className="space-y-6 mb-8">
              {Object.values(groups).map((group) => (
                <div key={group.date}>
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-widest mb-2">{group.label}</p>
                  <ul className="space-y-2">
                    {group.items.map((todo) => (
                      <li key={todo._id} className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-neutral-800 bg-neutral-900">
                        <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 ${todo.completed ? 'border-neutral-600 bg-neutral-700' : 'border-neutral-600'}`} />
                        <span className={`text-sm flex-1 ${todo.completed ? 'line-through text-neutral-600' : 'text-white'}`}>{todo.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : null}

          {/* Undated tasks */}
          {undated.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-widest mb-2">No date set</p>
              <ul className="space-y-2">
                {undated.map((todo) => (
                  <li key={todo._id} className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-neutral-800 bg-neutral-900">
                    <div className="w-5 h-5 rounded-full border-2 border-neutral-600 flex-shrink-0" />
                    <span className="text-sm text-white flex-1">{todo.title}</span>
                    <span className="text-xs text-neutral-600">No due date</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {todos.length === 0 && (
            <div className="rounded-xl border border-dashed border-neutral-800 p-12 text-center text-neutral-600 text-sm">
              No upcoming tasks. Add tasks from the Today view.
            </div>
          )}
        </>
      )}
    </div>
  )
}