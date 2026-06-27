import { useState, useEffect } from 'react'
import { usePullToRefresh, PullRefreshIndicator } from '../hooks/usePullToRefresh'
import { toast } from 'sonner'
import { Plus, MoreVertical, Rocket } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useMetas } from '../hooks/useMetas'
import { supabase } from '../lib/supabase'
import { fmtCurrency } from '../lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TABS = [
  { value: 'ativa',     label: 'Ativas'     },
  { value: 'concluida', label: 'Concluídas' },
  { value: 'cancelada', label: 'Canceladas' },
]

const FORM_META_INICIAL = {
  titulo:        '',
  descricao:     '',
  valor_alvo:    '',
  valor_atual:   '0',
  prazo:         '',
  pessoa_id:     '',
  compartilhada: false,
}

// ---------------------------------------------------------------------------
// Shared style helpers — module-level (não dependem de estado)
// ---------------------------------------------------------------------------

const inputStyle = {
  background:    'var(--color-surface-2)',
  border:        '1px solid var(--color-border)',
  borderRadius:  10,
  padding:       '9px 12px',
  color:         'var(--color-text-1)',
  fontSize:      16,
  width:         '100%',
  outline:       'none',
  fontFamily:    'inherit',
  transition:    'border-color 0.15s',
  boxSizing:     'border-box',
}

function focusAcc(e)   { e.target.style.borderColor = 'var(--color-accent)' }
function blurBorder(e) { e.target.style.borderColor = 'var(--color-border)' }

// ---------------------------------------------------------------------------
// TabBar
// ---------------------------------------------------------------------------

function TabBar({ tab, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--color-border)' }}>
      {TABS.map(t => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          style={{
            padding:      '10px 16px',
            background:   'transparent',
            border:       'none',
            cursor:       'pointer',
            fontSize:     14,
            fontWeight:   tab === t.value ? 600 : 400,
            color:        tab === t.value ? 'var(--color-text-1)' : 'var(--color-text-2)',
            borderBottom: tab === t.value ? '2px solid var(--color-accent)' : '2px solid transparent',
            marginBottom: -1,
            transition:   'all 0.15s',
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ProgressBar
// ---------------------------------------------------------------------------

function ProgressBar({ percentual, height = 6 }) {
  const cor = percentual >= 100 ? 'var(--color-success)' : 'var(--color-accent)'
  return (
    <div style={{ height, borderRadius: 3, background: 'var(--color-surface-2)' }}>
      <div
        style={{
          height:     '100%',
          borderRadius: 3,
          width:      `${Math.min(percentual, 100)}%`,
          background: cor,
          transition: 'width 0.4s ease',
        }}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// ContribuicoesSplit
// ---------------------------------------------------------------------------

function ContribuicoesSplit({ euTotal, outroTotal, meuNome, outroNome, valorAlvo }) {
  const total    = Number(valorAlvo)
  const euPct    = total > 0 ? Math.min(100, (euTotal / total) * 100) : 0
  const outroPct = total > 0 ? Math.min(100 - euPct, (outroTotal / total) * 100) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* Barra dividida em duas cores proporcionais */}
      <div style={{
        height:     6,
        borderRadius: 3,
        background: 'var(--color-surface-2)',
        display:    'flex',
        overflow:   'hidden',
      }}>
        {euPct > 0 && (
          <div style={{
            width:      `${euPct}%`,
            background: 'var(--color-accent)',
            transition: 'width 0.4s ease',
          }} />
        )}
        {outroPct > 0 && (
          <div style={{
            width:      `${outroPct}%`,
            background: 'var(--color-success)',
            transition: 'width 0.4s ease',
          }} />
        )}
      </div>
      {/* Labels de contribuição */}
      <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, margin: 0, color: 'var(--color-text-2)' }}>
        <span style={{ color: 'var(--color-accent)' }}>{meuNome}: {fmtCurrency(euTotal)}</span>
        {' · '}
        <span style={{ color: 'var(--color-success)' }}>{outroNome}: {fmtCurrency(outroTotal)}</span>
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// FormField helper
// ---------------------------------------------------------------------------

function FormField({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-2)' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// MetaCard
// calcularProgresso e calcularCountdown chegam via props para evitar que
// cada card instancie o hook e dispare fetchMetas redundante.
// ---------------------------------------------------------------------------

function MetaCard({
  meta, isAdmin, userId, contribuicoesInfo, meuNome, outroNome,
  onDepositar, onEditar, onConcluir, onCancelar,
  calcularProgresso, calcularCountdown,
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  const progresso        = calcularProgresso(meta.valor_atual, meta.valor_alvo)
  const countdown        = calcularCountdown(meta.prazo)
  const isCompartilhada  = meta.pessoa_id === null
  const isOutroUsuario   = isAdmin && meta.pessoa_id !== null && meta.pessoa_id !== userId

  const corCountdown =
    countdown.vencido ? 'var(--color-danger)'  :
    countdown.urgente ? 'var(--color-warning)' : 'var(--color-text-2)'

  return (
    <div
      style={{
        background:     'var(--color-surface)',
        border:         '1px solid var(--color-border)',
        borderRadius:   16,
        padding:        20,
        display:        'flex',
        flexDirection:  'column',
        gap:            16,
        transition:     'border-color 0.2s',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-surface-2)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
    >
      {/* Linha 1: título + badges + menu */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-1)', margin: 0 }}>
              {meta.titulo}
            </p>

            {isCompartilhada && (
              <span style={{
                fontSize:   11,
                fontWeight: 600,
                padding:    '2px 8px',
                borderRadius: 6,
                background: 'rgba(200,240,77,0.12)',
                color:      'var(--color-accent)',
                border:     '1px solid rgba(200,240,77,0.25)',
              }}>
                Casal
              </span>
            )}

            {isOutroUsuario && meta.profiles?.nome && (
              <span style={{
                fontSize:     11,
                color:        'var(--color-text-2)',
                background:   'var(--color-surface-2)',
                border:       '1px solid var(--color-border)',
                padding:      '2px 8px',
                borderRadius: 6,
              }}>
                @{meta.profiles.nome.split(' ')[0].toLowerCase()}
              </span>
            )}
          </div>

          {meta.descricao && (
            <p style={{ fontSize: 13, color: 'var(--color-text-2)', margin: 0, lineHeight: 1.4 }}>
              {meta.descricao}
            </p>
          )}
        </div>

        {/* Menu ⋮ — somente metas ativas */}
        {meta.status === 'ativa' && (
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={() => setMenuOpen(v => !v)}
              onBlur={() => setTimeout(() => setMenuOpen(false), 150)}
              style={{
                background: 'transparent',
                border:     'none',
                padding:    6,
                borderRadius: 6,
                cursor:     'pointer',
                color:      'var(--color-text-3)',
                display:    'flex',
                alignItems: 'center',
              }}
            >
              <MoreVertical size={16} />
            </button>

            {menuOpen && (
              <div style={{
                position:   'absolute',
                right:      0,
                top:        '100%',
                zIndex:     50,
                minWidth:   140,
                background: 'var(--color-surface)',
                border:     '1px solid var(--color-border)',
                borderRadius: 10,
                overflow:   'hidden',
              }}>
                {[
                  { label: 'Editar',   action: onEditar,   color: 'var(--color-text-1)'  },
                  { label: 'Concluir', action: onConcluir, color: 'var(--color-success)'  },
                  { label: 'Cancelar', action: onCancelar, color: 'var(--color-danger)'   },
                ].map(item => (
                  <button
                    key={item.label}
                    onClick={() => { item.action(); setMenuOpen(false) }}
                    style={{
                      display:    'block',
                      width:      '100%',
                      padding:    '10px 14px',
                      background: 'transparent',
                      border:     'none',
                      cursor:     'pointer',
                      fontSize:   13,
                      color:      item.color,
                      textAlign:  'left',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Valores: atual / alvo */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize:   24,
          fontWeight: 500,
          color:      'var(--color-accent)',
        }}>
          {fmtCurrency(meta.valor_atual)}
        </span>
        <span style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize:   13,
          color:      'var(--color-text-2)',
        }}>
          de {fmtCurrency(meta.valor_alvo)}
        </span>
      </div>

      {/* Barra de progresso + countdown + percentual */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {isCompartilhada && contribuicoesInfo ? (
          <ContribuicoesSplit
            euTotal={contribuicoesInfo.eu}
            outroTotal={contribuicoesInfo.outro}
            meuNome={meuNome}
            outroNome={outroNome}
            valorAlvo={meta.valor_alvo}
          />
        ) : (
          <ProgressBar percentual={progresso} />
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {meta.prazo && (
            <span style={{ fontSize: 12, color: corCountdown }}>
              {countdown.texto}
            </span>
          )}
          <span style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize:   12,
            fontWeight: 600,
            color:      'var(--color-accent)',
            marginLeft: 'auto',
          }}>
            {progresso.toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Botão Depositar — somente metas ativas */}
      {meta.status === 'ativa' && (
        <button
          onClick={onDepositar}
          style={{
            padding:      '8px 0',
            borderRadius: 10,
            border:       '1px solid var(--color-accent)',
            background:   'transparent',
            color:        'var(--color-accent)',
            fontSize:     13,
            fontWeight:   600,
            cursor:       'pointer',
            width:        '100%',
            transition:   'all 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--color-accent)'
            e.currentTarget.style.color      = 'var(--color-bg)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color      = 'var(--color-accent)'
          }}
        >
          Depositar
        </button>
      )}

      {/* Badge de status para concluídas / canceladas */}
      {meta.status !== 'ativa' && (
        <div style={{
          padding:      '6px 12px',
          borderRadius: 8,
          textAlign:    'center',
          background:   meta.status === 'concluida' ? 'rgba(78,205,196,0.1)' : 'rgba(255,92,92,0.08)',
          color:        meta.status === 'concluida' ? 'var(--color-success)' : 'var(--color-danger)',
          fontSize:     12,
          fontWeight:   600,
        }}>
          {meta.status === 'concluida' ? 'Meta concluída ✓' : 'Cancelada'}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------

function EmptyState({ tab, onNova }) {
  const msgs = {
    ativa:     { titulo: 'Nenhuma meta ativa',     sub: 'Crie sua primeira meta financeira' },
    concluida: { titulo: 'Nenhuma meta concluída', sub: 'Metas concluídas aparecerão aqui'  },
    cancelada: { titulo: 'Nenhuma meta cancelada', sub: 'Esperamos que continue assim!'      },
  }
  const { titulo, sub } = msgs[tab] ?? msgs.ativa

  return (
    <div style={{
      padding:        '64px 24px',
      textAlign:      'center',
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      gap:            12,
    }}>
      <Rocket size={40} color="var(--color-text-3)" strokeWidth={1.5} />
      <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-text-2)', margin: 0 }}>
        {titulo}
      </p>
      <p style={{ fontSize: 13, color: 'var(--color-text-3)', margin: 0 }}>
        {sub}
      </p>
      {tab === 'ativa' && (
        <button
          onClick={onNova}
          style={{
            marginTop:    8,
            padding:      '10px 20px',
            borderRadius: 10,
            border:       'none',
            background:   'var(--color-accent)',
            color:        'var(--color-bg)',
            fontSize:     13,
            fontWeight:   600,
            cursor:       'pointer',
          }}
        >
          Criar meta
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// MetaSkeletons
// ---------------------------------------------------------------------------

function MetaSkeletons() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[1, 2, 3, 4].map(i => (
        <div
          key={i}
          style={{
            background:    'var(--color-surface)',
            border:        '1px solid var(--color-border)',
            borderRadius:  16,
            padding:       20,
            display:       'flex',
            flexDirection: 'column',
            gap:           16,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div
              className="animate-pulse"
              style={{ height: 16, width: '60%', borderRadius: 4, background: 'var(--color-surface-2)' }}
            />
            <div
              className="animate-pulse"
              style={{ height: 12, width: '80%', borderRadius: 4, background: 'var(--color-surface-2)' }}
            />
          </div>
          <div
            className="animate-pulse"
            style={{ height: 28, width: '45%', borderRadius: 4, background: 'var(--color-surface-2)' }}
          />
          <div
            className="animate-pulse"
            style={{ height: 6, borderRadius: 3, background: 'var(--color-surface-2)' }}
          />
          <div
            className="animate-pulse"
            style={{ height: 34, borderRadius: 10, background: 'var(--color-surface-2)' }}
          />
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Metas — componente principal
// ---------------------------------------------------------------------------

export default function Metas() {
  const { user, profile, isAdmin } = useAuth()
  const {
    metas,
    loading,
    error,
    criarMeta,
    atualizarMeta,
    depositarNaMeta,
    concluirMeta,
    cancelarMeta,
    calcularProgresso,
    calcularCountdown,
    fetchContribuicoes,
    fetchMetas,
  } = useMetas()

  const { isRefreshing, pullY } = usePullToRefresh(fetchMetas)

  const [tab, setTab] = useState('ativa')

  // --- estado: modal meta ---
  const [modalMetaOpen, setModalMetaOpen] = useState(false)
  const [editandoMeta,  setEditandoMeta]  = useState(null)
  const [formMeta,      setFormMeta]      = useState(FORM_META_INICIAL)
  const [salvando,      setSalvando]      = useState(false)
  const [erroMeta,      setErroMeta]      = useState('')

  // --- estado: modal depositar ---
  const [modalDepositarOpen, setModalDepositarOpen] = useState(false)
  const [depositandoMeta,    setDepositandoMeta]    = useState(null)
  const [valorDeposito,      setValorDeposito]      = useState('')
  const [depositando,        setDepositando]        = useState(false)
  const [erroDeposito,       setErroDeposito]       = useState('')

  // --- outro perfil (admin) ---
  const [outroProfile, setOutroProfile] = useState(null)

  // --- contribuições ---
  const [contribuicoesPorMeta,  setContribuicoesPorMeta]  = useState({})
  const [contribuicoesModal,    setContribuicoesModal]    = useState([])
  const [loadingContribuicoes,  setLoadingContribuicoes]  = useState(false)
  const [descricaoDeposito,     setDescricaoDeposito]     = useState('')

  // Busca o segundo perfil para o admin poder atribuir metas
  useEffect(() => {
    if (!isAdmin || !user) return
    supabase
      .from('profiles')
      .select('id, nome')
      .neq('id', user.id)
      .maybeSingle()
      .then(({ data }) => setOutroProfile(data))
      .catch(err => console.error('[Metas] outroProfile:', err.message))
  }, [isAdmin, user?.id])

  // Reseta o form toda vez que o modal de meta abre
  useEffect(() => {
    if (!modalMetaOpen) return
    setErroMeta('')
    if (editandoMeta) {
      setFormMeta({
        titulo:        editandoMeta.titulo,
        descricao:     editandoMeta.descricao ?? '',
        valor_alvo:    String(editandoMeta.valor_alvo),
        valor_atual:   String(editandoMeta.valor_atual),
        prazo:         editandoMeta.prazo ?? '',
        pessoa_id:     editandoMeta.pessoa_id ?? '',
        compartilhada: editandoMeta.pessoa_id === null,
      })
    } else {
      setFormMeta({ ...FORM_META_INICIAL, pessoa_id: user?.id ?? '' })
    }
  }, [modalMetaOpen, editandoMeta])

  // Reseta o campo de depósito toda vez que o modal abre
  useEffect(() => {
    if (!modalDepositarOpen) return
    setValorDeposito('')
    setErroDeposito('')
    setDescricaoDeposito('')
    setContribuicoesModal([])
  }, [modalDepositarOpen])

  // Carrega totais por pessoa para cada meta compartilhada (para a barra dividida)
  useEffect(() => {
    const compartilhadas = metas.filter(m => m.pessoa_id === null)
    if (!compartilhadas.length || !user) return
    const ids = compartilhadas.map(m => m.id)
    supabase
      .from('meta_contribuicoes')
      .select('meta_id, pessoa_id, valor')
      .in('meta_id', ids)
      .then(({ data }) => {
        if (!data) return
        // Agrupa por meta e por pessoa
        const porMeta = {}
        data.forEach(c => {
          if (!porMeta[c.meta_id]) porMeta[c.meta_id] = {}
          if (!porMeta[c.meta_id][c.pessoa_id]) porMeta[c.meta_id][c.pessoa_id] = 0
          porMeta[c.meta_id][c.pessoa_id] += Number(c.valor)
        })
        // Converte para { eu, outro } por meta
        const resultado = {}
        compartilhadas.forEach(m => {
          const porPessoa = porMeta[m.id] ?? {}
          const eu = porPessoa[user.id] ?? 0
          resultado[m.id] = { eu, outro: Math.max(0, Number(m.valor_atual) - eu) }
        })
        setContribuicoesPorMeta(resultado)
      })
  }, [metas, user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // Derivados
  // ---------------------------------------------------------------------------

  const metasFiltradas = metas.filter(m => m.status === tab)

  const meuNomeExibicao   = profile?.nome?.split(' ')[0] ?? 'Eu'
  const outroNomeExibicao = outroProfile?.nome?.split(' ')[0] ?? 'Outro'

  // ---------------------------------------------------------------------------
  // Handlers de navegação / abertura de modais
  // ---------------------------------------------------------------------------

  function abrirDepositar(meta) {
    setDepositandoMeta(meta)
    setModalDepositarOpen(true)
    // Carrega histórico para metas compartilhadas
    if (meta.pessoa_id === null) {
      setLoadingContribuicoes(true)
      setContribuicoesModal([])
      fetchContribuicoes(meta.id)
        .then(data => setContribuicoesModal(data))
        .catch(err => console.error('[Metas] fetchContribuicoes:', err.message))
        .finally(() => setLoadingContribuicoes(false))
    }
  }

  function abrirEditar(meta) {
    setEditandoMeta(meta)
    setModalMetaOpen(true)
  }

  function abrirNova() {
    setEditandoMeta(null)
    setModalMetaOpen(true)
  }

  function fecharModalMeta() {
    setModalMetaOpen(false)
    setEditandoMeta(null)
  }

  // ---------------------------------------------------------------------------
  // Submit: salvar meta (criar ou atualizar)
  // ---------------------------------------------------------------------------

  async function handleSalvarMeta() {
    if (!formMeta.titulo.trim()) {
      setErroMeta('Título obrigatório')
      return
    }
    const valorAlvo = Number(String(formMeta.valor_alvo).replace(',', '.'))
    if (!valorAlvo || valorAlvo <= 0) {
      setErroMeta('Valor alvo inválido')
      return
    }

    setSalvando(true)
    setErroMeta('')
    try {
      const dados = {
        titulo:      formMeta.titulo.trim(),
        descricao:   formMeta.descricao || null,
        valor_alvo:  valorAlvo,
        valor_atual: Number(String(formMeta.valor_atual || '0').replace(',', '.')),
        prazo:       formMeta.prazo || null,
        pessoa_id:   formMeta.compartilhada ? null : (formMeta.pessoa_id || user.id),
      }
      if (editandoMeta) {
        await atualizarMeta(editandoMeta.id, dados)
        toast.success('Meta atualizada', { style: { borderColor: 'var(--color-accent)' } })
      } else {
        await criarMeta(dados)
        toast.success('Meta criada', { style: { borderColor: 'var(--color-accent)' } })
      }
      fecharModalMeta()
    } catch {
      setErroMeta('Erro ao salvar. Tente novamente.')
      toast.error('Erro ao salvar meta', { style: { borderColor: 'var(--color-danger)' } })
    } finally {
      setSalvando(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Submit: depositar na meta
  // ---------------------------------------------------------------------------

  async function handleDepositar() {
    const valor = Number(String(valorDeposito).replace(',', '.'))
    if (!valor || valor <= 0) {
      setErroDeposito('Valor inválido')
      return
    }
    setDepositando(true)
    setErroDeposito('')
    try {
      await depositarNaMeta(depositandoMeta.id, valor, descricaoDeposito || null)
      setModalDepositarOpen(false)
      toast.success(`Depósito de ${fmtCurrency(valor)} registrado na meta!`, {
        style: { borderColor: 'var(--color-accent)' },
      })
    } catch {
      setErroDeposito('Erro ao registrar depósito.')
      toast.error('Erro ao registrar depósito', { style: { borderColor: 'var(--color-danger)' } })
    } finally {
      setDepositando(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Error state
  // ---------------------------------------------------------------------------

  if (error) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-danger)', fontSize: 14, margin: '0 0 12px' }}>
          Erro ao carregar metas: {error}
        </p>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col gap-6">
      <PullRefreshIndicator isRefreshing={isRefreshing} pullY={pullY} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-text-1)', margin: 0 }}>
          Metas
        </h1>
        <button
          onClick={abrirNova}
          style={{
            display:      'flex',
            alignItems:   'center',
            gap:          6,
            padding:      '8px 16px',
            borderRadius: 10,
            border:       'none',
            background:   'var(--color-accent)',
            color:        'var(--color-bg)',
            fontSize:     14,
            fontWeight:   600,
            cursor:       'pointer',
            transition:   'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-accent-2)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-accent)')}
        >
          <Plus size={16} strokeWidth={2.5} />
          Nova meta
        </button>
      </div>

      {/* Tabs */}
      <TabBar tab={tab} onChange={setTab} />

      {/* Grid de metas / skeleton / empty */}
      {loading ? (
        <MetaSkeletons />
      ) : metasFiltradas.length === 0 ? (
        <EmptyState tab={tab} onNova={abrirNova} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {metasFiltradas.map(meta => (
            <MetaCard
              key={meta.id}
              meta={meta}
              isAdmin={isAdmin}
              userId={user?.id}
              contribuicoesInfo={meta.pessoa_id === null ? contribuicoesPorMeta[meta.id] : null}
              meuNome={meuNomeExibicao}
              outroNome={outroNomeExibicao}
              calcularProgresso={calcularProgresso}
              calcularCountdown={calcularCountdown}
              onDepositar={() => abrirDepositar(meta)}
              onEditar={() => abrirEditar(meta)}
              onConcluir={() => concluirMeta(meta.id)
                .then(() => toast.success('Meta concluída!', { style: { borderColor: 'var(--color-accent)' } }))
                .catch(() => toast.error('Erro ao concluir meta', { style: { borderColor: 'var(--color-danger)' } }))
              }
              onCancelar={() => cancelarMeta(meta.id)
                .then(() => toast('Meta cancelada', { style: { borderColor: 'var(--color-border)' } }))
                .catch(() => toast.error('Erro ao cancelar meta', { style: { borderColor: 'var(--color-danger)' } }))
              }
            />
          ))}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Modal: Nova meta / Editar meta                                      */}
      {/* ------------------------------------------------------------------ */}
      <Dialog open={modalMetaOpen} onOpenChange={v => !v && fecharModalMeta()}>
        <DialogContent
          style={{
            background:   'var(--color-surface)',
            border:       '1px solid var(--color-border)',
            borderRadius: 16,
            maxWidth:     480,
            padding:      28,
          }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--color-text-1)', fontSize: 16, fontWeight: 600 }}>
              {editandoMeta ? 'Editar meta' : 'Nova meta'}
            </DialogTitle>
          </DialogHeader>

          {/* Campos do formulário */}
          <div
            style={{
              display:       'flex',
              flexDirection: 'column',
              gap:           16,
              marginTop:     8,
              maxHeight:     '60vh',
              overflowY:     'auto',
              paddingRight:  2,
            }}
          >
            {/* Título */}
            <FormField label="Título *">
              <input
                type="text"
                value={formMeta.titulo}
                onChange={e => setFormMeta(f => ({ ...f, titulo: e.target.value }))}
                placeholder="Ex: Viagem para Europa"
                style={inputStyle}
                onFocus={focusAcc}
                onBlur={blurBorder}
              />
            </FormField>

            {/* Descrição */}
            <FormField label="Descrição">
              <textarea
                value={formMeta.descricao}
                onChange={e => setFormMeta(f => ({ ...f, descricao: e.target.value }))}
                placeholder="Detalhes da meta (opcional)"
                rows={3}
                style={{
                  ...inputStyle,
                  resize:     'vertical',
                  minHeight:  72,
                  lineHeight: 1.5,
                }}
                onFocus={focusAcc}
                onBlur={blurBorder}
              />
            </FormField>

            {/* Valor alvo + Valor inicial — grid 2 colunas */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FormField label="Valor alvo *">
                <input
                  type="text"
                  inputMode="decimal"
                  value={formMeta.valor_alvo}
                  onChange={e =>
                    setFormMeta(f => ({
                      ...f,
                      valor_alvo: e.target.value.replace(/[^0-9.,]/g, ''),
                    }))
                  }
                  placeholder="0,00"
                  style={{ ...inputStyle, fontFamily: 'JetBrains Mono, monospace' }}
                  onFocus={focusAcc}
                  onBlur={blurBorder}
                />
              </FormField>

              <FormField label="Valor inicial">
                <input
                  type="text"
                  inputMode="decimal"
                  value={formMeta.valor_atual}
                  onChange={e =>
                    setFormMeta(f => ({
                      ...f,
                      valor_atual: e.target.value.replace(/[^0-9.,]/g, ''),
                    }))
                  }
                  placeholder="0,00"
                  style={{ ...inputStyle, fontFamily: 'JetBrains Mono, monospace' }}
                  onFocus={focusAcc}
                  onBlur={blurBorder}
                />
              </FormField>
            </div>

            {/* Prazo */}
            <FormField label="Prazo">
              <input
                type="date"
                value={formMeta.prazo}
                onChange={e => setFormMeta(f => ({ ...f, prazo: e.target.value }))}
                style={{ ...inputStyle, colorScheme: 'dark' }}
                onFocus={focusAcc}
                onBlur={blurBorder}
              />
            </FormField>

            {/* Toggle: Meta do casal */}
            <div style={{
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'space-between',
              padding:        '12px 0',
              borderTop:      '1px solid var(--color-border)',
            }}>
              <div>
                <span style={{ fontSize: 14, color: 'var(--color-text-1)' }}>
                  Meta do casal
                </span>
                <p style={{ fontSize: 12, color: 'var(--color-text-3)', margin: '2px 0 0' }}>
                  Visível para ambos os perfis
                </p>
              </div>

              <button
                onClick={() =>
                  setFormMeta(f => ({
                    ...f,
                    compartilhada: !f.compartilhada,
                    pessoa_id:     f.compartilhada ? (user?.id ?? '') : '',
                  }))
                }
                style={{
                  width:        40,
                  height:       22,
                  borderRadius: 11,
                  border:       'none',
                  cursor:       'pointer',
                  background:   formMeta.compartilhada ? 'var(--color-accent)' : 'var(--color-surface-2)',
                  position:     'relative',
                  transition:   'background 0.2s',
                  flexShrink:   0,
                }}
              >
                <div style={{
                  position:     'absolute',
                  top:          3,
                  width:        16,
                  height:       16,
                  borderRadius: '50%',
                  background:   formMeta.compartilhada ? 'var(--color-bg)' : 'var(--color-text-3)',
                  transition:   'left 0.2s',
                  left:         formMeta.compartilhada ? 21 : 3,
                }} />
              </button>
            </div>

            {/* De quem? — admin + outro perfil + não compartilhada */}
            {isAdmin && outroProfile && !formMeta.compartilhada && (
              <FormField label="De quem?">
                <select
                  value={formMeta.pessoa_id}
                  onChange={e => setFormMeta(f => ({ ...f, pessoa_id: e.target.value }))}
                  style={{
                    ...inputStyle,
                    appearance:        'none',
                    WebkitAppearance:  'none',
                    cursor:            'pointer',
                    colorScheme:       'dark',
                  }}
                  onFocus={focusAcc}
                  onBlur={blurBorder}
                >
                  <option value={user?.id ?? ''}>Eu</option>
                  <option value={outroProfile.id}>{outroProfile.nome}</option>
                </select>
              </FormField>
            )}

            {/* Mensagem de erro */}
            {erroMeta && (
              <p style={{ fontSize: 13, color: 'var(--color-danger)', margin: 0 }}>
                {erroMeta}
              </p>
            )}
          </div>

          <DialogFooter style={{ marginTop: 24, gap: 8 }}>
            <button
              onClick={fecharModalMeta}
              style={{
                padding:      '9px 20px',
                borderRadius: 10,
                cursor:       'pointer',
                background:   'transparent',
                border:       '1px solid var(--color-border)',
                color:        'var(--color-text-2)',
                fontSize:     14,
                fontWeight:   500,
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSalvarMeta}
              disabled={salvando}
              style={{
                padding:      '9px 20px',
                borderRadius: 10,
                border:       'none',
                cursor:       salvando ? 'not-allowed' : 'pointer',
                background:   salvando ? 'var(--color-surface-2)' : 'var(--color-accent)',
                color:        salvando ? 'var(--color-text-2)' : 'var(--color-bg)',
                fontSize:     14,
                fontWeight:   600,
                transition:   'all 0.15s',
              }}
            >
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------------ */}
      {/* Modal: Depositar na meta                                            */}
      {/* ------------------------------------------------------------------ */}
      <Dialog open={modalDepositarOpen} onOpenChange={v => !v && setModalDepositarOpen(false)}>
        <DialogContent
          style={{
            background:   'var(--color-surface)',
            border:       '1px solid var(--color-border)',
            borderRadius: 16,
            maxWidth:     400,
            padding:      28,
          }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--color-text-1)', fontSize: 16, fontWeight: 600 }}>
              Depositar na meta
            </DialogTitle>
          </DialogHeader>

          {depositandoMeta && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Título da meta */}
              <p style={{ fontSize: 13, color: 'var(--color-text-2)', margin: 0 }}>
                {depositandoMeta.titulo}
              </p>

              {/* Histórico — só para metas compartilhadas */}
              {depositandoMeta.pessoa_id === null && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-2)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Últimas contribuições
                  </p>
                  {loadingContribuicoes ? (
                    <p style={{ fontSize: 12, color: 'var(--color-text-3)', margin: 0 }}>Carregando...</p>
                  ) : contribuicoesModal.length === 0 ? (
                    <p style={{ fontSize: 12, color: 'var(--color-text-3)', margin: 0, fontStyle: 'italic' }}>
                      Nenhuma contribuição ainda
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {contribuicoesModal.map(c => (
                        <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {/* Avatar com iniciais */}
                          <div style={{
                            width:           28,
                            height:          28,
                            borderRadius:    '50%',
                            background:      'var(--color-surface-2)',
                            border:          '1px solid var(--color-border)',
                            display:         'flex',
                            alignItems:      'center',
                            justifyContent:  'center',
                            fontSize:        11,
                            fontWeight:      700,
                            color:           'var(--color-text-2)',
                            flexShrink:      0,
                          }}>
                            {(c.profiles?.nome ?? '?').charAt(0).toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                              <span style={{ fontSize: 13, color: 'var(--color-text-1)', fontWeight: 500 }}>
                                {(c.profiles?.nome ?? 'Desconhecido').split(' ')[0]}
                              </span>
                              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--color-accent)', flexShrink: 0 }}>
                                {fmtCurrency(c.valor)}
                              </span>
                            </div>
                            {c.descricao && (
                              <p style={{ fontSize: 11, color: 'var(--color-text-3)', margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {c.descricao}
                              </p>
                            )}
                            <p style={{ fontSize: 11, color: 'var(--color-text-3)', margin: '1px 0 0' }}>
                              {new Date(c.created_at).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ height: 1, background: 'var(--color-border)' }} />
                </div>
              )}

              {/* Quanto falta */}
              <div style={{
                background:     'var(--color-surface-2)',
                borderRadius:   10,
                padding:        '12px 16px',
                display:        'flex',
                justifyContent: 'space-between',
                alignItems:     'center',
              }}>
                <span style={{ fontSize: 13, color: 'var(--color-text-2)' }}>Faltam</span>
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize:   16,
                  fontWeight: 600,
                  color:      'var(--color-accent)',
                }}>
                  {fmtCurrency(
                    Math.max(
                      0,
                      Number(depositandoMeta.valor_alvo) - Number(depositandoMeta.valor_atual),
                    ),
                  )}
                </span>
              </div>

              {/* Input do valor do depósito */}
              <FormField label="Valor do depósito">
                <input
                  type="text"
                  inputMode="decimal"
                  autoFocus
                  value={valorDeposito}
                  onChange={e =>
                    setValorDeposito(e.target.value.replace(/[^0-9.,]/g, ''))
                  }
                  placeholder="0,00"
                  style={{
                    ...inputStyle,
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize:   18,
                    textAlign:  'center',
                  }}
                  onFocus={focusAcc}
                  onBlur={blurBorder}
                />
              </FormField>

              {/* Descrição opcional */}
              <FormField label="Descrição (opcional)">
                <input
                  type="text"
                  value={descricaoDeposito}
                  onChange={e => setDescricaoDeposito(e.target.value)}
                  placeholder="Ex: salário de junho"
                  style={inputStyle}
                  onFocus={focusAcc}
                  onBlur={blurBorder}
                />
              </FormField>

              {/* Erro depósito */}
              {erroDeposito && (
                <p style={{ fontSize: 13, color: 'var(--color-danger)', margin: 0 }}>
                  {erroDeposito}
                </p>
              )}
            </div>
          )}

          <DialogFooter style={{ marginTop: 24, gap: 8 }}>
            <button
              onClick={() => setModalDepositarOpen(false)}
              style={{
                padding:      '9px 20px',
                borderRadius: 10,
                cursor:       'pointer',
                background:   'transparent',
                border:       '1px solid var(--color-border)',
                color:        'var(--color-text-2)',
                fontSize:     14,
                fontWeight:   500,
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleDepositar}
              disabled={depositando}
              style={{
                padding:      '9px 20px',
                borderRadius: 10,
                border:       'none',
                cursor:       depositando ? 'not-allowed' : 'pointer',
                background:   depositando ? 'var(--color-surface-2)' : 'var(--color-accent)',
                color:        depositando ? 'var(--color-text-2)' : 'var(--color-bg)',
                fontSize:     14,
                fontWeight:   600,
                transition:   'all 0.15s',
              }}
            >
              {depositando ? 'Confirmando...' : 'Confirmar depósito'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
