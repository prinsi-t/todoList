import { NavLink } from 'react-router-dom'

const NAV_ITEMS = [
  {
    to: '/app',
    end: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={1.8}>
        <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="3" y="4" width="18" height="16" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    label: 'Today',
  },
  {
    to: '/app/upcoming',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={1.8}>
        <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    label: 'Upcoming',
  },
  {
    to: '/app/sticky',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={1.8}>
        <path d="M15.5 2H8.6c-.4 0-.8.2-1.1.5-.3.3-.5.7-.5 1.1v12.8c0 .4.2.8.5 1.1l3.5 3.5c.3.3.7.5 1.1.5H19c.4 0 .8-.2 1.1-.5.3-.3.5-.7.5-1.1V8.5L15.5 2z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15 2v6h6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    label: 'Sticky Wall',
  },
  {
    to: '/app/calendar',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={1.8}>
        <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    label: 'Calendar',
  },
]

export default function Sidebar({ user, onLogout, collapsed, setCollapsed }) {
  return (
    <aside
      className={`flex flex-col bg-neutral-900 border-r border-neutral-800 transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-60'
      } min-h-screen sticky top-0`}
    >
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-neutral-800 ${collapsed ? 'justify-center' : ''}`}>
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white flex items-center justify-center text-black font-bold text-sm">
          ✓
        </div>
        {!collapsed && <span className="text-white font-bold text-lg tracking-tight">TaskFlow</span>}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-white text-black'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              } ${collapsed ? 'justify-center' : ''}`
            }
          >
            {item.icon}
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-neutral-800 p-3 space-y-2">
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 text-sm transition-colors ${collapsed ? 'justify-center' : ''}`}
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 flex-shrink-0" stroke="currentColor" strokeWidth={1.8}>
            {collapsed ? (
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            )}
          </svg>
          {!collapsed && <span>Collapse</span>}
        </button>

        {/* User info */}
        <div className={`flex items-center gap-3 px-3 py-2 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-7 h-7 rounded-full bg-neutral-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-medium truncate">{user?.name || 'Account'}</p>
              <p className="text-xs text-neutral-500 truncate">{user?.email || ''}</p>
            </div>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={onLogout}
          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-neutral-800 text-sm transition-colors ${collapsed ? 'justify-center' : ''}`}
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 flex-shrink-0" stroke="currentColor" strokeWidth={1.8}>
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  )
}