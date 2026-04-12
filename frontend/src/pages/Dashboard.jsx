import { useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import TodayView from './TodayView'
import UpcomingView from './UpcomingView'
import StickyWallView from './StickyWallView'
import CalendarView from './CalendarView'

export default function Dashboard({ token, user, onLogout }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex min-h-screen bg-neutral-950 text-white">
      <Sidebar
        user={user}
        onLogout={onLogout}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />
      <div className="flex-1 overflow-y-auto">
        <Routes>
          <Route index element={<TodayView token={token} />} />
          <Route path="upcoming" element={<UpcomingView token={token} />} />
          <Route path="sticky" element={<StickyWallView />} />
          <Route path="calendar" element={<CalendarView token={token} />} />
        </Routes>
      </div>
    </div>
  )
}