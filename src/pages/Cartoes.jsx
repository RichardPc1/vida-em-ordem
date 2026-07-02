import { useState, useEffect, useMemo, useRef } from 'react'
import { toast } from 'sonner'
import { Plus, CreditCard, Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useCartoes } from '../hooks/useCartoes'
import { useOutroProfile } from '../hooks/useOutroProfile'
import { fmtCurrency } from '../lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import { CartaoCard } from '../components/financeiro/CartaoCard'
import { FaturaList } from '../components/financeiro/FaturaList'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FORM_INICIAL = {
  nome:           '',
  banco:          '',
  limite_total:   '',
  dia_fechamento: '',
  dia_vencimento: '',
  pessoa_id:      '',
}

// ---------------------------------------------------------------------------
// Estilos de input — escopo do módulo
// ---------------------------------------------------------------------------

const inputStyle = {
  background:   'var(--color-surface-2)',
  border:       '1px solid var(--color-border)',
  borderRadius: 10,
  padding:      '9px 12px',
  color:        'var(--color-text-1)',
  fontSize:     14,
  width:        '100%',
  outline:      'none',
  fontFamily:   'inherit',
  transition:   'border-color 0.15s',
  boxSizing:    'border-box',
}

function focusAcc(e)   { e.target.style.borderColor = 'var(--color-accent)' }
function blurBorder(e) { e.target.style.borderColor = 'var(--color-border)' }

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
// CartaoSkeletons — loading state do grid
// ---------------------------------------------------------------------------

function CartaoSkeletons() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3].map(i => (
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="animate-pulse" style={{ width: 15, height: 15, borderRadius: 3, background: 'var(--color-surface-2)' }} />
            <div className="animate-pulse" style={{ height: 16, width: '55%', borderRadius: 4, background: 'var(--color-surface-2)' }} />
          </div>
          <div className="animate-pulse" style={{ height: 13, width: '35%', borderRadius: 4, background: 'var(--color-surface-2)' }} />
          <div>
            <div className="animate-pulse" style={{ height: 6, borderRadius: 3, background: 'var(--color-surface-2)' }} />
          </div>
          <div style={{ display: 'flex', gap: 16, borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
            <div className="animate-pulse" style={{ height: 32, width: 64, borderRadius: 4, background: 'var(--color-surface-2)' }} />
            <div className="animate-pulse" style={{ height: 32, width: 64, borderRadius: 4, background: 'var(--color-surface-2)' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// EmptyState — nenhum cartão cadastrado
// ---------------------------------------------------------------------------

function EmptyState({ onNovo }) {
  return (
    <div style={{
      padding:        '64px 24px',
      textAlign:      'center',
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      gap:            12,
    }}>
      <CreditCard size={40} color="var(--color-text-3)" strokeWidth={1.5} />
      <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-text-2)', margin: 0 }}>
        Nenhum cartão cadastrado
      </p>
      <p style={{ fontSize: 13, color: 'var(--color-text-3)', margin: 0 }}>
        Adicione seus cartões de crédito para acompanhar faturas e limite
      </p>
      <button
        onClick={onNovo}
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
          transition:   'background 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-accent-2)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-accent)')}
      >
        Adicionar cartão
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Cartoes — componente principal
// ---------------------------------------------------------------------------

export default function Cartoes() {
  const { user, isAdmin } = useAuth()
  const {
    cartoes,
    loading,
    error,
    fetchCartoes,
    criarCartao,
    atualizarCartao,
    calcularFaturas,
    calcularLimite,
    pagarFatura,
  } = useCartoes()

  // ── Limites por cartão (carregados de forma assíncrona pós-fetch) ──────────
  const [limites, setLimites] = useState({})

  // ── Cartão selecionado para ver faturas ───────────────────────────────────
  const [cartaoSelecionado, setCartaoSelecionado] = useState(null)
  const [faturas,           setFaturas]           = useState([])
  const [carregandoFaturas, setCarregandoFaturas] = useState(false)

  // ── Modal criar / editar ──────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false)
  const [editando,  setEditando]  = useState(null)
  const [form,      setForm]      = useState(FORM_INICIAL)
  const [salvando,  setSalvando]  = useState(false)
  const [erro,      setErro]      = useState('')

  // ── Outro perfil (para admin atribuir cartão à esposa) ────────────────────
  const outroProfile = useOutroProfile()

  // ── Mostrar inativos ──────────────────────────────────────────────────────
  const [mostrarInativos, setMostrarInativos] = useState(false)

  // ── Double-click para desativar ───────────────────────────────────────────
  const [desativandoId, setDesativandoId] = useState(null)
  const desativandoTimeoutRef = useRef(null)

  useEffect(() => () => clearTimeout(desativandoTimeoutRef.current), [])

  // ── Computed ──────────────────────────────────────────────────────────────
  const cartoesAtivos   = useMemo(() => cartoes.filter(c =>  c.ativo), [cartoes])
  const cartoesInativos = useMemo(() => cartoes.filter(c => !c.ativo), [cartoes])

  // IDs + limite_total serializados para dependência estável do useEffect de
  // limites — inclui limite_total para recalcular quando o usuário editar o
  // limite de um cartão existente (mesmos IDs, valor diferente).
  const idsAtivos = useMemo(
    () => cartoesAtivos.map(c => `${c.id}:${c.limite_total}`).sort().join(','),
    [cartoesAtivos],
  )

  // ── Carrega limites quando a lista de ativos muda ─────────────────────────
  useEffect(() => {
    if (!idsAtivos || loading) return
    if (!cartoesAtivos.length) return

    Promise.all(
      cartoesAtivos.map(c =>
        calcularLimite(c.id)
          .then(lim => ({ id: c.id, lim }))
          .catch(() => ({ id: c.id, lim: null })),
      ),
    ).then(results => {
      const mapa = {}
      results.forEach(({ id, lim }) => { mapa[id] = lim })
      setLimites(mapa)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsAtivos])

  // ── Reset do form modal ────────────────────────────────────────────────────
  useEffect(() => {
    if (modalOpen) {
      setErro('')
      if (!editando) {
        setForm({ ...FORM_INICIAL, pessoa_id: user?.id ?? '' })
      }
    } else {
      setEditando(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalOpen])

  // ── Abrir detalhe de faturas ──────────────────────────────────────────────

  async function abrirFaturas(cartao) {
    setCartaoSelecionado(cartao)
    setFaturas([])
    setCarregandoFaturas(true)
    try {
      const resultado = await calcularFaturas(cartao.id)
      setFaturas(resultado)
    } catch {
      toast.error('Erro ao carregar faturas', { style: { borderColor: 'var(--color-danger)' } })
    } finally {
      setCarregandoFaturas(false)
    }
  }

  function fecharFaturas() {
    setCartaoSelecionado(null)
    setFaturas([])
  }

  // ── Pagar fatura ──────────────────────────────────────────────────────────

  async function handlePagarFatura(params) {
    await pagarFatura(cartaoSelecionado.id, params)

    // Recarrega faturas e atualiza limite do cartão
    const [novasFaturas, novoLimite] = await Promise.all([
      calcularFaturas(cartaoSelecionado.id),
      calcularLimite(cartaoSelecionado.id),
    ])
    setFaturas(novasFaturas)
    setLimites(m => ({ ...m, [cartaoSelecionado.id]: novoLimite }))
  }

  // ── Editar cartão ─────────────────────────────────────────────────────────

  function handleEditar(cartao) {
    setForm({
      nome:           cartao.nome,
      banco:          cartao.banco ?? '',
      limite_total:   String(cartao.limite_total),
      dia_fechamento: String(cartao.dia_fechamento),
      dia_vencimento: String(cartao.dia_vencimento),
      pessoa_id:      cartao.pessoa_id,
    })
    setEditando(cartao)
    setModalOpen(true)
  }

  // ── Desativar cartão (double-click como confirmação) ─────────────────────

  function handleDesativar(cartao) {
    if (desativandoId === cartao.id) {
      // Segundo clique: confirma
      setDesativandoId(null)
      atualizarCartao(cartao.id, { ativo: false })
        .then(() => {
          toast.success(`Cartão "${cartao.nome}" desativado`, {
            style: { borderColor: 'var(--color-accent)' },
          })
          setLimites(m => { const c = { ...m }; delete c[cartao.id]; return c })
        })
        .catch(() => {
          toast.error('Erro ao desativar cartão', { style: { borderColor: 'var(--color-danger)' } })
        })
    } else {
      // Primeiro clique: aguarda confirmação por 3 s
      setDesativandoId(cartao.id)
      clearTimeout(desativandoTimeoutRef.current)
      desativandoTimeoutRef.current = setTimeout(() => {
        setDesativandoId(prev => prev === cartao.id ? null : prev)
      }, 3000)
    }
  }

  // ── Reativar cartão inativo ───────────────────────────────────────────────

  async function handleReativar(cartao) {
    try {
      await atualizarCartao(cartao.id, { ativo: true })
      toast.success(`Cartão "${cartao.nome}" reativado`, {
        style: { borderColor: 'var(--color-accent)' },
      })
    } catch {
      toast.error('Erro ao reativar cartão', { style: { borderColor: 'var(--color-danger)' } })
    }
  }

  // ── Salvar (criar / editar) ────────────────────────────────────────────────

  async function handleSalvar() {
    if (!form.nome.trim()) { setErro('Nome obrigatório'); return }

    const limite = parseFloat(String(form.limite_total).replace(',', '.'))
    if (!limite || limite <= 0) { setErro('Limite inválido'); return }

    const diaFech = Number(form.dia_fechamento)
    if (!diaFech || diaFech < 1 || diaFech > 31) {
      setErro('Dia de fechamento inválido (1–31)'); return
    }

    const diaVenc = Number(form.dia_vencimento)
    if (!diaVenc || diaVenc < 1 || diaVenc > 31) {
      setErro('Dia de vencimento inválido (1–31)'); return
    }

    const dados = {
      nome:           form.nome.trim(),
      banco:          form.banco.trim() || null,
      limite_total:   limite,
      dia_fechamento: diaFech,
      dia_vencimento: diaVenc,
      pessoa_id:      form.pessoa_id || user.id,
    }

    setSalvando(true)
    setErro('')
    try {
      if (editando) {
        await atualizarCartao(editando.id, dados)
        toast.success('Cartão atualizado!', { style: { borderColor: 'var(--color-accent)' } })
      } else {
        await criarCartao(dados)
        toast.success('Cartão criado!', { style: { borderColor: 'var(--color-accent)' } })
      }
      setModalOpen(false)
    } catch {
      setErro('Erro ao salvar. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  // ── Error state ───────────────────────────────────────────────────────────

  if (error) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-danger)', fontSize: 14, margin: '0 0 12px' }}>
          Erro ao carregar cartões: {error}
        </p>
        <button
          onClick={fetchCartoes}
          style={{
            padding:      '8px 16px',
            borderRadius: 10,
            border:       '1px solid var(--color-border)',
            background:   'transparent',
            color:        'var(--color-text-2)',
            fontSize:     13,
            cursor:       'pointer',
          }}
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        flexWrap:       'wrap',
        gap:            12,
      }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-1)', margin: '0 0 2px' }}>
            Cartões
          </h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-2)', margin: 0 }}>
            Controle de limite e faturas de crédito
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          style={{
            display:    'flex',
            alignItems: 'center',
            gap:        6,
            padding:    '8px 16px',
            borderRadius: 10,
            border:     'none',
            background: 'var(--color-accent)',
            color:      'var(--color-bg)',
            fontSize:   13,
            fontWeight: 600,
            cursor:     'pointer',
            transition: 'background 0.15s',
            flexShrink: 0,
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-accent-2)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-accent)')}
        >
          <Plus size={16} />
          Novo cartão
        </button>
      </div>

      {/* Loading skeletons */}
      {loading && <CartaoSkeletons />}

      {/* Empty state */}
      {!loading && cartoesAtivos.length === 0 && cartoesInativos.length === 0 && (
        <EmptyState onNovo={() => setModalOpen(true)} />
      )}

      {/* Grid de cartões ativos */}
      {!loading && cartoesAtivos.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cartoesAtivos.map(cartao => (
            <CartaoCard
              key={cartao.id}
              cartao={cartao}
              limiteInfo={limites[cartao.id] ?? null}
              isAdmin={isAdmin}
              desativandoId={desativandoId}
              onVerFaturas={() => abrirFaturas(cartao)}
              onEditar={() => handleEditar(cartao)}
              onDesativar={() => handleDesativar(cartao)}
            />
          ))}
        </div>
      )}

      {/* Cartões inativos (toggle) */}
      {!loading && cartoesInativos.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            onClick={() => setMostrarInativos(v => !v)}
            style={{
              alignSelf:    'flex-start',
              display:      'flex',
              alignItems:   'center',
              gap:          6,
              padding:      '6px 12px',
              borderRadius: 8,
              border:       '1px solid var(--color-border)',
              background:   'transparent',
              color:        'var(--color-text-3)',
              fontSize:     12,
              fontWeight:   500,
              cursor:       'pointer',
              transition:   'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-2)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-3)')}
          >
            {mostrarInativos ? '▲' : '▼'} {cartoesInativos.length} cartão{cartoesInativos.length !== 1 ? 's' : ''} inativo{cartoesInativos.length !== 1 ? 's' : ''}
          </button>

          {mostrarInativos && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, opacity: 0.55 }}>
              {cartoesInativos.map(cartao => (
                <div
                  key={cartao.id}
                  style={{
                    background:   'var(--color-surface)',
                    border:       '1px solid var(--color-border)',
                    borderRadius: 12,
                    padding:      '12px 16px',
                    display:      'flex',
                    alignItems:   'center',
                    gap:          12,
                  }}
                >
                  <CreditCard size={15} color="var(--color-text-3)" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize:     13,
                      fontWeight:   500,
                      color:        'var(--color-text-2)',
                      margin:       0,
                      overflow:     'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace:   'nowrap',
                    }}>
                      {cartao.nome}
                    </p>
                    {cartao.banco && (
                      <p style={{ fontSize: 11, color: 'var(--color-text-3)', margin: '2px 0 0' }}>
                        {cartao.banco}
                      </p>
                    )}
                  </div>
                  <span style={{
                    fontSize:     11,
                    padding:      '2px 8px',
                    borderRadius: 6,
                    background:   'var(--color-surface-2)',
                    color:        'var(--color-text-3)',
                    border:       '1px solid var(--color-border)',
                    flexShrink:   0,
                  }}>
                    Inativo
                  </span>
                  <button
                    onClick={() => handleReativar(cartao)}
                    style={{
                      padding:      '5px 10px',
                      borderRadius: 8,
                      border:       '1px solid var(--color-border)',
                      background:   'transparent',
                      color:        'var(--color-text-2)',
                      fontSize:     12,
                      cursor:       'pointer',
                      flexShrink:   0,
                      transition:   'border-color 0.15s, color 0.15s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'var(--color-accent)'
                      e.currentTarget.style.color       = 'var(--color-accent)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--color-border)'
                      e.currentTarget.style.color       = 'var(--color-text-2)'
                    }}
                  >
                    Reativar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Dialog: Faturas do cartão ──────────────────────────────────── */}
      <Dialog
        open={!!cartaoSelecionado}
        onOpenChange={v => { if (!v) fecharFaturas() }}
      >
        <DialogContent style={{
          background:    'var(--color-surface)',
          border:        '1px solid var(--color-border)',
          borderRadius:  16,
          maxWidth:      600,
          padding:       0,
          maxHeight:     '88vh',
          overflow:      'hidden',
          display:       'flex',
          flexDirection: 'column',
        }}>
          {/* Header fixo */}
          <div style={{
            padding:      '22px 28px 18px',
            borderBottom: '1px solid var(--color-border)',
            flexShrink:   0,
            paddingRight: 52, // espaço para o X do shadcn
          }}>
            <DialogHeader>
              <DialogTitle style={{ color: 'var(--color-text-1)', fontSize: 16, fontWeight: 600 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CreditCard size={15} color="var(--color-text-2)" />
                  <span>{cartaoSelecionado?.nome}</span>
                  {cartaoSelecionado?.banco && (
                    <span style={{ fontSize: 13, color: 'var(--color-text-3)', fontWeight: 400 }}>
                      · {cartaoSelecionado.banco}
                    </span>
                  )}
                </div>
              </DialogTitle>

              {cartaoSelecionado && limites[cartaoSelecionado.id] && (
                <p style={{
                  fontSize: 13,
                  color:    'var(--color-text-2)',
                  margin:   '6px 0 0',
                }}>
                  {'Limite: '}
                  <span style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    color:      'var(--color-text-1)',
                  }}>
                    {fmtCurrency(limites[cartaoSelecionado.id].disponivel)}
                  </span>
                  {' disponível de '}
                  <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    {fmtCurrency(limites[cartaoSelecionado.id].total)}
                  </span>
                </p>
              )}
            </DialogHeader>
          </div>

          {/* Lista de faturas — scrollável */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px 28px' }}>
            <FaturaList
              faturas={faturas}
              loading={carregandoFaturas}
              onPagar={handlePagarFatura}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog: Novo / Editar cartão ───────────────────────────────── */}
      <Dialog open={modalOpen} onOpenChange={v => !v && setModalOpen(false)}>
        <DialogContent style={{
          background:   'var(--color-surface)',
          border:       '1px solid var(--color-border)',
          borderRadius: 16,
          maxWidth:     440,
          padding:      28,
        }}>
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--color-text-1)', fontSize: 16, fontWeight: 600 }}>
              {editando ? 'Editar cartão' : 'Novo cartão'}
            </DialogTitle>
          </DialogHeader>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>

            <FormField label="Nome do cartão *">
              <input
                type="text"
                autoFocus
                value={form.nome}
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: Nubank Gold"
                style={inputStyle}
                onFocus={focusAcc}
                onBlur={blurBorder}
              />
            </FormField>

            <FormField label="Banco / Instituição">
              <input
                type="text"
                value={form.banco}
                onChange={e => setForm(f => ({ ...f, banco: e.target.value }))}
                placeholder="Ex: Nubank, Itaú, Caixa..."
                style={inputStyle}
                onFocus={focusAcc}
                onBlur={blurBorder}
              />
            </FormField>

            <FormField label="Limite total *">
              <input
                type="text"
                inputMode="decimal"
                value={form.limite_total}
                onChange={e => setForm(f => ({ ...f, limite_total: e.target.value }))}
                placeholder="0,00"
                style={{ ...inputStyle, fontFamily: 'JetBrains Mono, monospace' }}
                onFocus={focusAcc}
                onBlur={blurBorder}
              />
            </FormField>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FormField label="Dia de fechamento *">
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={form.dia_fechamento}
                  onChange={e => setForm(f => ({ ...f, dia_fechamento: e.target.value }))}
                  placeholder="Ex: 5"
                  style={{ ...inputStyle, fontFamily: 'JetBrains Mono, monospace' }}
                  onFocus={focusAcc}
                  onBlur={blurBorder}
                />
              </FormField>

              <FormField label="Dia de vencimento *">
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={form.dia_vencimento}
                  onChange={e => setForm(f => ({ ...f, dia_vencimento: e.target.value }))}
                  placeholder="Ex: 12"
                  style={{ ...inputStyle, fontFamily: 'JetBrains Mono, monospace' }}
                  onFocus={focusAcc}
                  onBlur={blurBorder}
                />
              </FormField>
            </div>

            {/* De quem? — admin only */}
            {isAdmin && outroProfile && (
              <FormField label="De quem?">
                <Select
                  value={form.pessoa_id}
                  onValueChange={v => setForm(f => ({ ...f, pessoa_id: v }))}
                >
                  <SelectTrigger style={{
                    background:   'var(--color-surface-2)',
                    border:       '1px solid var(--color-border)',
                    borderRadius: 10,
                    color:        'var(--color-text-1)',
                    fontSize:     14,
                    height:       38,
                  }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{
                    background:   'var(--color-surface)',
                    border:       '1px solid var(--color-border)',
                    borderRadius: 10,
                  }}>
                    <SelectItem
                      value={user.id}
                      style={{ color: 'var(--color-text-1)', fontSize: 14 }}
                    >
                      Eu
                    </SelectItem>
                    <SelectItem
                      value={outroProfile.id}
                      style={{ color: 'var(--color-text-1)', fontSize: 14 }}
                    >
                      {outroProfile.nome.split(' ')[0]}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            )}

            {erro && (
              <p style={{ fontSize: 13, color: 'var(--color-danger)', margin: 0 }}>
                {erro}
              </p>
            )}
          </div>

          <DialogFooter style={{ marginTop: 24, gap: 8 }}>
            <button
              onClick={() => setModalOpen(false)}
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
              onClick={handleSalvar}
              disabled={salvando}
              style={{
                padding:        '9px 20px',
                borderRadius:   10,
                cursor:         salvando ? 'not-allowed' : 'pointer',
                background:     salvando ? 'var(--color-surface-2)' : 'var(--color-accent)',
                color:          salvando ? 'var(--color-text-2)' : 'var(--color-bg)',
                border:         'none',
                fontSize:       14,
                fontWeight:     600,
                transition:     'all 0.15s',
                display:        'flex',
                alignItems:     'center',
                gap:            6,
              }}
            >
              {salvando && <Loader2 size={14} className="animate-spin" />}
              {salvando ? 'Salvando...' : editando ? 'Salvar alterações' : 'Criar cartão'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
