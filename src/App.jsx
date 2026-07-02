import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import AppLayout  from './components/layout/AppLayout'
import Login      from './pages/Login'
import Dashboard  from './pages/Dashboard'
import Tarefas    from './pages/Tarefas'
import Financeiro from './pages/Financeiro'
import Orcamento  from './pages/Orcamento'
import Metas      from './pages/Metas'
import Cartoes    from './pages/Cartoes'
import Perfil     from './pages/Perfil'

function LoadingScreen() {
  return (
    <div
      className="flex items-center justify-center h-screen"
      style={{ background: 'var(--color-bg)' }}
    >
      <div
        className="w-6 h-6 rounded-full border-2 animate-spin"
        style={{
          borderColor:    'var(--color-border)',
          borderTopColor: 'var(--color-accent)',
        }}
      />
    </div>
  )
}

function ProtectedLayout() {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user)   return <Navigate to="/login" replace />
  return <AppLayout />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedLayout />}>
        <Route index                  element={<Dashboard />} />
        <Route path="tarefas"         element={<Tarefas />} />
        <Route path="financeiro"      element={<Financeiro />} />
        <Route path="orcamento"       element={<Orcamento />} />
        <Route path="metas"           element={<Metas />} />
        <Route path="cartoes"         element={<Cartoes />} />
        <Route path="perfil"          element={<Perfil />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
      <Toaster
        position="bottom-right"
        theme="dark"
        gap={8}
        toastOptions={{
          duration: 3000,
          style: {
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-1)',
            fontFamily: 'Inter, sans-serif',
            fontSize: 14,
            borderRadius: 10,
          },
          classNames: {
            toast: 'toast-anim',
          },
        }}
      />
    </AuthProvider>
  )
}
