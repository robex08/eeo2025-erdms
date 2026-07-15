import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import LoginPage from './components/LoginPage'
import Dashboard from './components/Dashboard'
import authService from './services/authService'
import './App.css'

function App() {
  const location = useLocation()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const loginErrorParam = new URLSearchParams(location.search).get('error')
  const forceLoginScreen = location.pathname === '/dashboard/login' && loginErrorParam === 'session_expired'

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const user = await authService.getCurrentUser()
      setIsAuthenticated(!!user)
    } catch (error) {
      setIsAuthenticated(false)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="app-loading-content">
          <div className="spinner-circle"></div>
          <p>Ověřování přihlášení...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="App">
      <Routes>
        <Route path="/dashboard/login" element={
          (isAuthenticated && !forceLoginScreen) ? <Navigate to="/dashboard" replace /> : <LoginPage />
        } />
        <Route path="/dashboard" element={
          isAuthenticated ? <Dashboard /> : <Navigate to="/dashboard/login" replace />
        } />
        <Route path="/login" element={
          <Navigate to="/dashboard/login" replace />
        } />
        <Route path="/" element={
          <Navigate to={isAuthenticated ? "/dashboard" : "/dashboard/login"} replace />
        } />
        <Route path="*" element={
          <Navigate to={isAuthenticated ? "/dashboard" : "/dashboard/login"} replace />
        } />
      </Routes>
    </div>
  )
}

export default App
