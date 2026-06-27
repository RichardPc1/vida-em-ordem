import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

function InfoRow({ label, value }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '14px 0', borderBottom: '1px solid var(--color-border)',
    }}>
      <span style={{ fontSize: 14, color: 'var(--color-text-2)' }}>{label}</span>
      <span style={{ fontSize: 14, color: 'var(--color-text-1)', fontWeight: 500 }}>{value}</span>
    </div>
  )
}

export default function Perfil() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [confirmandoSaida, setConfirmandoSaida] = useState(false)

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  const initial = (profile?.nome ?? user?.email ?? '?')[0].toUpperCase()
  const isAdmin = profile?.role === 'admin'

  return (
    <div className="flex flex-col gap-6">
      <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-text-1)', margin: 0 }}>
        Perfil
      </h1>

      {/* Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'var(--color-accent)', color: 'var(--color-bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, fontWeight: 700, flexShrink: 0,
        }}>
          {initial}
        </div>
        <div>
          <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-text-1)', margin: 0 }}>
            {profile?.nome ?? 'Usuário'}
          </p>
          <span style={{
            display: 'inline-block',
            marginTop: 4,
            padding: '2px 10px',
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 600,
            background: isAdmin ? 'rgba(200,240,77,0.12)' : 'rgba(78,205,196,0.1)',
            color:      isAdmin ? 'var(--color-accent)'   : 'var(--color-success)',
            border:     `1px solid ${isAdmin ? 'rgba(200,240,77,0.3)' : 'rgba(78,205,196,0.25)'}`,
          }}>
            {isAdmin ? 'Admin' : 'Membro'}
          </span>
        </div>
      </div>

      {/* Dados */}
      <div style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: 16, padding: '0 24px',
      }}>
        <InfoRow label="Email" value={user?.email ?? '–'} />
        <InfoRow label="Perfil" value={isAdmin ? 'Administrador' : 'Membro'} />
        <InfoRow label="Nome"  value={profile?.nome ?? '–'} />
      </div>

      {/* Logout */}
      {!confirmandoSaida ? (
        <button
          onClick={() => setConfirmandoSaida(true)}
          style={{
            padding: '12px 20px', borderRadius: 10,
            background: 'transparent', border: '1px solid var(--color-danger)',
            color: 'var(--color-danger)', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', transition: 'all 0.15s', width: '100%',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,92,92,0.1)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          Sair da conta
        </button>
      ) : (
        <div style={{
          padding: '16px 20px', borderRadius: 10,
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-2)', textAlign: 'center' }}>
            Tem certeza que deseja sair?
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setConfirmandoSaida(false)}
              style={{
                flex: 1, padding: '10px 16px', borderRadius: 10,
                background: 'transparent', border: '1px solid var(--color-border)',
                color: 'var(--color-text-2)', fontSize: 14, fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-2)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSignOut}
              style={{
                flex: 1, padding: '10px 16px', borderRadius: 10,
                background: 'rgba(255,92,92,0.12)', border: '1px solid var(--color-danger)',
                color: 'var(--color-danger)', fontSize: 14, fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,92,92,0.22)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,92,92,0.12)' }}
            >
              Confirmar saída
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
