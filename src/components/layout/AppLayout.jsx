import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { LayoutDashboard, ListChecks, Wallet, PieChart, Target, User, LogOut } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { Assistente } from '../shared/Assistente'

const navItems = [
  { to: '/',           label: 'Dashboard',  icon: LayoutDashboard },
  { to: '/tarefas',    label: 'Tarefas',    icon: ListChecks },
  { to: '/financeiro', label: 'Financeiro', icon: Wallet },
  { to: '/orcamento',  label: 'Orçamento',  icon: PieChart },
  { to: '/metas',      label: 'Metas',      icon: Target },
  { to: '/perfil',     label: 'Perfil',     icon: User },
]

const bottomNavItems = navItems.slice(0, 5)

const pageTitles = {
  '/':           'Dashboard',
  '/tarefas':    'Tarefas',
  '/financeiro': 'Financeiro',
  '/orcamento':  'Orçamento',
  '/metas':      'Metas',
  '/perfil':     'Perfil',
}

function UserAvatar({ profile, size = 32 }) {
  const initial = (profile?.nome ?? profile?.email ?? '?')[0].toUpperCase()
  return (
    <div
      className="flex items-center justify-center rounded-full font-bold shrink-0 select-none"
      style={{
        width: size,
        height: size,
        background: 'var(--color-accent)',
        color: 'var(--color-bg)',
        fontSize: size * 0.4,
      }}
    >
      {initial}
    </div>
  )
}

function Sidebar({ profile, signOut }) {
  return (
    <aside
      className="hidden md:flex flex-col fixed inset-y-0 left-0 z-40"
      style={{
        width: 240,
        background: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border)',
      }}
    >
      {/* Logo */}
      <div className="px-5 pt-6 pb-5">
        <span
          className="font-bold text-lg tracking-tight"
          style={{ color: 'var(--color-accent)' }}
        >
          VidaEmOrdem
        </span>
      </div>

      {/* Navegação */}
      <nav className="flex-1 px-3 flex flex-col gap-1 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className="sidebar-nav-item"
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 12px',
              borderRadius: 10,
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 500,
              color:      isActive ? 'var(--color-accent)'    : 'var(--color-text-2)',
              background: isActive ? 'var(--color-surface-2)' : 'transparent',
              transition: 'background 0.15s, color 0.15s',
            })}
          >
            <Icon size={18} strokeWidth={1.8} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Rodapé — usuário */}
      <div
        className="flex flex-col px-4 py-4"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center gap-3">
          <UserAvatar profile={profile} size={32} />
          <div className="flex-1 min-w-0">
            <p
              className="text-sm font-medium truncate"
              style={{ color: 'var(--color-text-1)' }}
            >
              {profile?.nome ?? 'Usuário'}
            </p>
            <p className="text-xs truncate" style={{ color: 'var(--color-text-2)' }}>
              {profile?.role === 'admin' ? 'Admin' : 'Membro'}
            </p>
          </div>
        </div>

        <button
          onClick={signOut}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            width: '100%', padding: '8px 12px', marginTop: 4,
            background: 'transparent', border: 'none',
            borderRadius: 10, cursor: 'pointer',
            fontSize: 13, color: 'var(--color-text-2)',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-danger)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-2)')}
        >
          <LogOut size={15} strokeWidth={1.8} />
          Sair
        </button>
      </div>
    </aside>
  )
}

function MobileHeader({ title, profile, signOut }) {
  return (
    <header
      className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4"
      style={{
        height: 56,
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      <span className="font-semibold text-base" style={{ color: 'var(--color-text-1)' }}>
        {title}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <UserAvatar profile={profile} size={32} />
        <button
          onClick={signOut}
          style={{
            background: 'transparent', border: 'none',
            padding: 6, borderRadius: 6, cursor: 'pointer',
            color: 'var(--color-text-2)', display: 'flex', alignItems: 'center',
          }}
          aria-label="Sair"
        >
          <LogOut size={16} strokeWidth={1.8} />
        </button>
      </div>
    </header>
  )
}

function BottomNav() {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex"
      style={{
        height: 60,
        background: 'var(--color-surface)',
        borderTop: '1px solid var(--color-border)',
      }}
    >
      {bottomNavItems.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className="flex-1 flex items-center justify-center"
          style={({ isActive }) => ({
            color:          isActive ? 'var(--color-accent)' : 'var(--color-text-2)',
            textDecoration: 'none',
            transition:     'color 0.15s',
          })}
          aria-label={label}
        >
          <Icon size={22} strokeWidth={1.8} />
        </NavLink>
      ))}
    </nav>
  )
}

export default function AppLayout() {
  const { profile, signOut } = useAuth()
  const { pathname } = useLocation()
  const pageTitle = pageTitles[pathname] ?? 'Vida em Ordem'

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      <Sidebar profile={profile} signOut={signOut} />
      <MobileHeader title={pageTitle} profile={profile} signOut={signOut} />

      <main className="md:ml-[240px]">
        {/* Mobile: compensa header (56px) e BottomNav (60px) */}
        {/* Desktop: padding 32px em todas as direções */}
        <div className="px-4 pt-[72px] pb-[76px] md:p-8">
          <Outlet />
        </div>
      </main>

      <BottomNav />
      <Assistente />
    </div>
  )
}
