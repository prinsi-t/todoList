import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import LandingPage from './pages/LandingPage'

function AuthLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-neutral-500 text-sm">
      Checking session...
    </div>
  )
}

export default function App() {
  const navigate = useNavigate()
  const [token, setToken] = useState(localStorage.getItem('token') || '')
  const [user, setUser] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')

  const isAuthenticated = Boolean(token && user)

  useEffect(() => {
    const fetchMe = async () => {
      if (!token) {
        setUser(null)
        setAuthChecked(true)
        return
      }

      try {
        const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        if (!res.ok) {
          localStorage.removeItem('token')
          setToken('')
          setUser(null)
          return
        }
        const data = await res.json()
        setUser(data.user)
      } catch {
        localStorage.removeItem('token')
        setToken('')
        setUser(null)
      } finally {
        setAuthChecked(true)
      }
    }

    setAuthChecked(false)
    fetchMe()
  }, [token])

  const handleAuthSubmit = async (mode, form) => {
    setAuthError('')
    setAuthLoading(true)
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register'
      const body =
        mode === 'login'
          ? { email: form.email, password: form.password }
          : { name: form.name, email: form.email, password: form.password }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setAuthError(data.error || 'Authentication failed')
        return
      }

      localStorage.setItem('token', data.token)
      setToken(data.token)
      setUser(data.user)
      setAuthChecked(true)
      navigate('/app')
    } catch {
      setAuthError('Something went wrong. Try again.')
    } finally {
      setAuthLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken('')
    setUser(null)
    setAuthChecked(true)
    navigate('/login')
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/login"
        element={
          !authChecked ? (
            <AuthLoading />
          ) : isAuthenticated ? (
            <Navigate to="/app" replace />
          ) : (
            <AuthPage mode="login" onSubmit={handleAuthSubmit} loading={authLoading} error={authError} />
          )
        }
      />
      <Route
        path="/register"
        element={
          !authChecked ? (
            <AuthLoading />
          ) : isAuthenticated ? (
            <Navigate to="/app" replace />
          ) : (
            <AuthPage mode="register" onSubmit={handleAuthSubmit} loading={authLoading} error={authError} />
          )
        }
      />
      <Route
        path="/app/*"
        element={
          !authChecked ? (
            <AuthLoading />
          ) : isAuthenticated ? (
            <Dashboard token={token} user={user} onLogout={logout} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}