import { useState } from 'react'
import { Route, Routes, Link, useLocation } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import TodayView from './TodayView'
import UpcomingView from './UpcomingView'
import StickyWallView from './StickyWallView'
import CalendarView from './CalendarView'

const DEFAULT_SIDEBAR_WIDTH = 240

export default function Dashboard({ token, user, onLogout }) {
  const [collapsed, setCollapsed] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()

  // Close mobile menu when navigating
  const handleNavClick = () => {
    setMobileMenuOpen(false)
  }

  return (
    <div className="flex min-h-screen bg-neutral-950 text-white">
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:static z-50 h-full transition-transform duration-300
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <Sidebar
          user={user}
          onLogout={onLogout}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          width={sidebarWidth}
          onWidthChange={setSidebarWidth}
          onNavClick={handleNavClick}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 bg-neutral-900/95 backdrop-blur border-b border-neutral-800 px-4 py-3">
          <div className="flex items-center justify-between">
            <Link to="/app" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-black font-bold text-sm">
                ✓
              </div>
              <span className="text-white font-bold text-lg tracking-tight">TaskFlow</span>
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="currentColor" strokeWidth={2}>
                {mobileMenuOpen ? (
                  <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
                )}
              </svg>
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <Routes>
            <Route index element={<TodayView token={token} />} />
            <Route path="upcoming" element={<UpcomingView token={token} />} />
            <Route path="sticky" element={<StickyWallView token={token} />} />
            <Route path="calendar" element={<CalendarView token={token} />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}