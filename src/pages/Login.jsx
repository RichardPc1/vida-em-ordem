import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function LoadingScreen() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
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

function Field({ id, label, type, value, onChange, placeholder, autoComplete }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        style={{ fontSize: 14, fontWeight: 400, color: 'var(--color-text-2)' }}
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        className="login-field"
        style={{
          background:   'var(--color-surface-2)',
          border:       '1px solid var(--color-border)',
          borderRadius: 10,
          padding:      '10px 14px',
          color:        'var(--color-text-1)',
          fontSize:     16,
          outline:      'none',
          width:        '100%',
          transition:   'border-color 0.15s',
        }}
        onFocus={e  => (e.target.style.borderColor = 'var(--color-accent)')}
        onBlur={e   => (e.target.style.borderColor = 'var(--color-border)')}
      />
    </div>
  )
}

export default function Login() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const { user, loading: authLoading, signIn } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!authLoading && user) navigate('/', { replace: true })
  }, [user, authLoading, navigate])

  if (authLoading) return <LoadingScreen />

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
      navigate('/', { replace: true })
    } catch {
      setError('Email ou senha inválidos. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="flex items-center justify-center p-4"
      style={{ background: 'var(--color-bg)', minHeight: '100dvh', overflowY: 'auto' }}
    >
      <div
        className="w-full"
        style={{
          maxWidth:    400,
          background:  'var(--color-surface)',
          border:      '1px solid var(--color-border)',
          borderRadius: 24,
          padding:     40,
        }}
      >
        {/* Cabeçalho */}
        <div className="text-center mb-8">
          <h1
            style={{
              fontSize:    28,
              fontWeight:  700,
              color:       'var(--color-text-1)',
              margin:      0,
              lineHeight:  1.2,
              letterSpacing: '-0.02em',
            }}
          >
            VidaEmOrdem
          </h1>
          <p
            style={{
              fontSize:   14,
              fontWeight: 400,
              color:      'var(--color-text-2)',
              margin:     '8px 0 0',
            }}
          >
            Sua vida organizada em um só lugar
          </p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Field
            id="email"
            label="Email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="seu@email.com"
            autoComplete="email"
          />

          <Field
            id="password"
            label="Senha"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />

          {/* Mensagem de erro */}
          {error && (
            <p style={{ fontSize: 13, color: 'var(--color-danger)', margin: 0 }}>
              {error}
            </p>
          )}

          {/* Botão */}
          <button
            type="submit"
            disabled={loading}
            className="login-btn"
            style={{
              width:        '100%',
              padding:      '12px',
              background:   loading ? 'var(--color-surface-2)' : 'var(--color-accent)',
              color:        loading ? 'var(--color-text-2)'    : '#0F0F0F',
              border:       'none',
              borderRadius: 10,
              fontWeight:   600,
              fontSize:     15,
              cursor:       loading ? 'not-allowed' : 'pointer',
              transition:   'background 0.15s, color 0.15s',
            }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
