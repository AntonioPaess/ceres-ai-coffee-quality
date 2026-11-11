import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider, useAuth } from '@/hooks/use-auth'
import { AppStoreProvider } from '@/stores/app'
import Layout from './components/Layout'
import Index from './pages/Index'
import NotFound from './pages/NotFound'

import ProducerDashboard from './pages/producer/Dashboard'
import NewAnalysis from './pages/producer/NewAnalysis'
import History from './pages/producer/History'
import Result from './pages/producer/Result'
import Report from './pages/producer/Report'
import AgentsPage from './pages/producer/Agents'
import WeatherPage from './pages/producer/Weather'
import Settings from './pages/Settings'

const ProtectedRoute = ({ children }: { children: any }) => {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return null
  if (!isAuthenticated) return <Navigate to="/" />
  return children
}

const App = () => (
  <AuthProvider>
    <AppStoreProvider>
      <BrowserRouter>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route element={<Layout />}>
              <Route
                path="/producer/dashboard"
                element={
                  <ProtectedRoute>
                    <ProducerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/producer/new"
                element={
                  <ProtectedRoute>
                    <NewAnalysis />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/producer/history"
                element={
                  <ProtectedRoute>
                    <History />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/producer/result/:id"
                element={
                  <ProtectedRoute>
                    <Result />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/producer/report/:id"
                element={
                  <ProtectedRoute>
                    <Report />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/producer/agents"
                element={
                  <ProtectedRoute>
                    <AgentsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/producer/weather"
                element={
                  <ProtectedRoute>
                    <WeatherPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                }
              />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </BrowserRouter>
    </AppStoreProvider>
  </AuthProvider>
)

export default App
