import { useCallback, useEffect, useState } from 'react'

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function buildCalendar(year, month) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  return cells
}

export default function CalendarView({ token }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [todos, setTodos] = useState([])
  const [selected, setSelected] = useState(null)

  const fetchTodos = useCallback(async () => {
    const res = await fetch('/api/todos', { headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) setTodos(await res.json())
  }, [token])

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

  useEffect(() => { fetchTodos() }, [fetchTodos])

  // Refetch todos when calendar comes into view
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTodos()
    }, 1000)
    return () => clearInterval(interval)
  }, [fetchTodos])

  const cells = buildCalendar(year, month)

  const prev = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
    fetchTodos()
  }
  const next = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
    fetchTodos()
  }

  // Map todos by due_date day
  const todosByDay = todos.reduce((acc, t) => {
    if (!t.due_date) return acc
    // Handle both formats: "2026-04-16" and "2026-04-16T00:00:00Z"
    const dateStr = t.due_date.split('T')[0]
    const [dateYear, dateMonth, dateDay] = dateStr.split('-').map(Number)
    if (dateYear === year && dateMonth - 1 === month) {
      const day = dateDay
      if (!acc[day]) acc[day] = []
      acc[day].push(t)
    }
    return acc
  }, {})

  const selectedTodos = selected ? (todosByDay[selected] || []) : []

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="mb-8">
        <p className="text-xs text-neutral-500 uppercase tracking-widest mb-1">Plan ahead</p>
        <h1 className="text-3xl font-bold text-white">Calendar</h1>
      </div>

      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 overflow-hidden">
        {/* Month nav */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
          <button onClick={prev} className="w-8 h-8 rounded-lg hover:bg-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white transition-colors">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          <span className="font-semibold text-white">{MONTHS[month]} {year}</span>
          <button onClick={next} className="w-8 h-8 rounded-lg hover:bg-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white transition-colors">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-7 border-b border-neutral-800">
          {DAYS_SHORT.map((d) => (
            <div key={d} className="py-2 text-center text-xs font-medium text-neutral-600 uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {cells.map((day, idx) => {
            const isToday = day === now.getDate() && month === now.getMonth() && year === now.getFullYear()
            const isSelected = day === selected
            const hasTodos = day && todosByDay[day]?.length > 0

            return (
              <button
                key={idx}
                onClick={() => day && setSelected(isSelected ? null : day)}
                disabled={!day}
                className={`min-h-16 p-2 border-b border-r border-neutral-800 flex flex-col items-start gap-1 text-sm transition-colors ${
                  !day ? 'bg-transparent cursor-default' :
                  isSelected ? 'bg-white' :
                  isToday ? 'bg-neutral-800' :
                  'hover:bg-neutral-800/60'
                }`}
              >
                {day && (
                  <>
                    <span className={`font-medium text-xs ${
                      isSelected ? 'text-black' :
                      isToday ? 'text-white' :
                      'text-neutral-400'
                    }`}>
                      {day}
                    </span>
                    {hasTodos && (
                      <div className="flex gap-0.5 flex-wrap">
                        {todosByDay[day].slice(0, 3).map((t) => (
                          <div key={t._id} className={`h-1 w-1 rounded-full ${isSelected ? 'bg-black/40' : 'bg-neutral-400'}`} />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected day tasks */}
      {selected && (
        <div className="mt-5">
          <p className="text-sm font-semibold text-neutral-400 mb-3">
            {MONTHS[month]} {selected}
          </p>
          {selectedTodos.length > 0 ? (
            <ul className="space-y-2">
              {selectedTodos.map((t) => (
                <li key={t._id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-neutral-800 bg-neutral-900 text-sm text-white group hover:border-neutral-700 transition-colors">
                  <button
                    type="button"
                    onClick={() => toggleTodo(t._id)}
                    className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                      t.completed
                        ? 'border-neutral-500 bg-neutral-700 text-neutral-400'
                        : 'border-neutral-600 hover:border-white'
                    }`}
                  >
                    {t.completed && (
                      <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                  <span className={t.completed ? 'line-through text-neutral-600' : ''}>{t.title}</span>
                  <button
                    type="button"
                    onClick={() => deleteTodo(t._id)}
                    className="opacity-0 group-hover:opacity-100 text-neutral-600 hover:text-red-400 transition-all ml-auto"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-neutral-600 py-3">No tasks on this day.</p>
          )}
        </div>
      )}
    </div>
  )
}