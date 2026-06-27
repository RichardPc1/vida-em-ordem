import { useState, useEffect, useCallback } from 'react'
import { usePullToRefresh, PullRefreshIndicator } from '../hooks/usePullToRefresh'
import {
  ChevronLeft, ChevronRight, Settings,
  ShoppingCart, Car, Home, Heart, Smile, GraduationCap, Shirt, MoreHorizontal,
  PieChart as PieChartIcon,
} from 'lucide-react'
import { useOrcamento, CATEGORIAS_ORCAMENTO } from '../hooks/useOrcamento'
import { fmtCurrency } from '../lib/utils'
import { Skeleton } from '../components/shared/Skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../components/ui/dialog'

// ─── Constantes ──────────────────────────────────────────────────────────────

const ICONES_CATEGORIA = {
  alimentacao: ShoppingCart,
  transporte:  Car,
  moradia:     Home,
  saude:       Heart,
  lazer:       Smile,
  educacao:    GraduationCap,
  vestuario:   Shirt,
  outros:      MoreHorizontal,
}

const btnNavStyle = {
  background:   'var(--color-surface-2)',
  border:       '1px solid var(--color-border)',
  borderRadius: 6,
  padding:      '4px 8px',
  cursor:       'pointer',
  color:        'var(--color-text-2)',
  display:      'flex',
  alignItems:   'center',
}

// ─── ResumoCard ───────────────────────────────────────────────────────────────

function ResumoCard({ totalPlanejado, totalGasto, loading }) {
  const percentual = totalPlanejado > 0 ? (totalGasto / totalPlanejado) * 100 : 0
  const corBarra =
    percentual >= 100 ? 'var(--color-danger)'  :
    percentual >= 70  ? 'var(--color-warning)' : 'var(--color-accent)'

  return (
    <div style={{
      background:   'var(--color-surface)',
      border:       '1px solid var(--color-border)',
      borderRadius: 16,
      padding:      24,
    }}>
      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-1)', margin: '0 0 16px' }}>
        Resumo do mês
      </p>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Skeleton height={12} width={48} />
              <Skeleton height={28} width={130} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
              <Skeleton height={12} width={64} />
              <Skeleton height={28} width={130} />
            </div>
          </div>
          <Skeleton height={8} width="100%" radius={4} />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Skeleton height={12} width={80} />
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <p style={{ fontSize: 12, color: 'var(--color-text-2)', margin: '0 0 4px' }}>Gasto</p>
              <p style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize:   22,
                fontWeight: 500,
                color:      'var(--color-danger)',
                margin:     0,
              }}>
                {fmtCurrency(totalGasto)}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 12, color: 'var(--color-text-2)', margin: '0 0 4px' }}>Planejado</p>
              <p style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize:   22,
                fontWeight: 500,
                color:      'var(--color-text-1)',
                margin:     0,
              }}>
                {fmtCurrency(totalPlanejado)}
              </p>
            </div>
          </div>

          <div style={{ height: 8, borderRadius: 4, background: 'var(--color-surface-2)' }}>
            <div style={{
              height:       '100%',
              borderRadius: 4,
              width:        `${Math.min(percentual, 100)}%`,
              background:   corBarra,
              transition:   'width 0.3s ease',
            }} />
          </div>
          <p style={{
            fontSize:  12,
            color:     'var(--color-text-2)',
            margin:    '8px 0 0',
            textAlign: 'right',
          }}>
            {percentual.toFixed(1)}% utilizado
          </p>
        </>
      )}
    </div>
  )
}

// ─── EnvelopeCard ─────────────────────────────────────────────────────────────

function EnvelopeCard({ prog }) {
  const { categoria, label, valorLimite, gasto, percentual, status, temOrcamento } = prog
  const Icone = ICONES_CATEGORIA[categoria] ?? MoreHorizontal

  const corBarra =
    status === 'danger'  ? 'var(--color-danger)'  :
    status === 'warning' ? 'var(--color-warning)' : 'var(--color-accent)'

  const borderColor = percentual >= 100 ? 'var(--color-danger)' : 'var(--color-border)'

  return (
    <div
      style={{
        background:    'var(--color-surface)',
        border:        `1px solid ${borderColor}`,
        borderRadius:  16,
        padding:       20,
        display:       'flex',
        flexDirection: 'column',
        gap:           12,
        transition:    'border-color 0.2s, background 0.15s',
        cursor:        'default',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-2)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-surface)')}
    >
      {/* Ícone + nome */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width:          32,
          height:         32,
          borderRadius:   8,
          flexShrink:     0,
          background:     'var(--color-surface-2)',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
        }}>
          <Icone size={16} color="var(--color-text-2)" strokeWidth={1.8} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-1)' }}>
          {label}
        </span>
      </div>

      {/* Valores */}
      <div>
        <p style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize:   20,
          fontWeight: 500,
          color:      'var(--color-text-1)',
          margin:     '0 0 2px',
        }}>
          {fmtCurrency(gasto)}
        </p>
        {temOrcamento ? (
          <p style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize:   12,
            color:      'var(--color-text-2)',
            margin:     0,
          }}>
            de {fmtCurrency(valorLimite)}
          </p>
        ) : (
          <p style={{ fontSize: 12, color: 'var(--color-text-3)', margin: 0 }}>
            sem limite definido
          </p>
        )}
      </div>

      {/* Barra de progresso */}
      {temOrcamento && (
        <div>
          <div style={{
            height:       4,
            borderRadius: 2,
            background:   'var(--color-surface-2)',
            marginBottom: 6,
          }}>
            <div style={{
              height:       '100%',
              borderRadius: 2,
              width:        `${Math.min(percentual, 100)}%`,
              background:   corBarra,
              transition:   'width 0.3s ease',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <span style={{
              fontSize:   11,
              fontFamily: 'JetBrains Mono, monospace',
              color:      corBarra,
              fontWeight: 600,
            }}>
              {percentual.toFixed(0)}%
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── EnvelopeSkeletons ────────────────────────────────────────────────────────

function EnvelopeSkeletons() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          style={{
            background:    'var(--color-surface)',
            border:        '1px solid var(--color-border)',
            borderRadius:  16,
            padding:       20,
            display:       'flex',
            flexDirection: 'column',
            gap:           12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Skeleton height={32} width={32} radius={8} />
            <Skeleton height={13} width="60%" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Skeleton height={20} width="70%" />
            <Skeleton height={12} width="50%" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Skeleton height={4} width="100%" radius={2} />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Skeleton height={11} width={32} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function Orcamento() {
  const [mes,      setMes]      = useState(() => new Date())
  const [modalOpen, setModalOpen] = useState(false)
  const [limites,  setLimites]  = useState({})
  const [salvando, setSalvando] = useState(false)

  const {
    orcamentos, progressos, totalPlanejado, totalGasto,
    loading, error, fetchOrcamentos, salvarOrcamentos,
  } = useOrcamento()

  const refreshOrc = useCallback(() => fetchOrcamentos(mes), [fetchOrcamentos, mes])
  const { isRefreshing, pullY } = usePullToRefresh(refreshOrc)

  // Refetch sempre que o mês selecionado mudar
  useEffect(() => {
    fetchOrcamentos(mes)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes])

  // Preenche os limites com valores existentes ao abrir o modal
  useEffect(() => {
    if (!modalOpen) return
    const vals = {}
    orcamentos.forEach(o => { vals[o.categoria] = String(o.valor_limite) })
    setLimites(vals)
  }, [modalOpen, orcamentos])

  function anteriorMes() {
    setMes(m => { const n = new Date(m); n.setDate(1); n.setMonth(n.getMonth() - 1); return n })
  }

  function proximoMes() {
    setMes(m => { const n = new Date(m); n.setDate(1); n.setMonth(n.getMonth() + 1); return n })
  }

  async function handleSalvar() {
    setSalvando(true)
    try {
      const limitesNumericos = {}
      Object.entries(limites).forEach(([cat, val]) => {
        const n = Number(String(val).replace(',', '.'))
        if (n > 0) limitesNumericos[cat] = n
      })
      await salvarOrcamentos(limitesNumericos, mes)
      setModalOpen(false)
    } catch {
      // erro silencioso — hook já possui tratamento próprio
    } finally {
      setSalvando(false)
    }
  }

  const mesFmt = mes.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-danger)', fontSize: 14, margin: '0 0 12px' }}>
          Erro ao carregar orçamento: {error}
        </p>
        <button
          onClick={() => fetchOrcamentos(mes)}
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

  return (
    <div className="flex flex-col gap-6">
      <PullRefreshIndicator isRefreshing={isRefreshing} pullY={pullY} />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        flexWrap:       'wrap',
        gap:            12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{
            fontSize:   28,
            fontWeight: 700,
            color:      'var(--color-text-1)',
            margin:     0,
          }}>
            Orçamento
          </h1>

          {/* Seletor de mês */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={anteriorMes} style={btnNavStyle} aria-label="Mês anterior">
              <ChevronLeft size={16} />
            </button>
            <span style={{
              fontSize:      14,
              fontWeight:    500,
              color:         'var(--color-text-1)',
              minWidth:      108,
              textAlign:     'center',
              textTransform: 'capitalize',
            }}>
              {mesFmt}
            </span>
            <button onClick={proximoMes} style={btnNavStyle} aria-label="Próximo mês">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          style={{
            display:      'flex',
            alignItems:   'center',
            gap:          6,
            padding:      '8px 16px',
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
          <Settings size={14} />
          Configurar orçamento
        </button>
      </div>

      {/* ── Resumo do mês ──────────────────────────────────────────────────── */}
      <ResumoCard
        totalPlanejado={totalPlanejado}
        totalGasto={totalGasto}
        loading={loading}
      />

      {/* ── Grid de envelopes / estados alternativos ───────────────────────── */}
      {loading ? (
        <EnvelopeSkeletons />
      ) : orcamentos.length === 0 ? (
        /* Empty state */
        <div style={{
          padding:       '64px 24px',
          textAlign:     'center',
          display:       'flex',
          flexDirection: 'column',
          alignItems:    'center',
          gap:           12,
        }}>
          <PieChartIcon size={40} color="var(--color-text-3)" strokeWidth={1.5} />
          <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-text-2)', margin: 0 }}>
            Nenhum orçamento definido
          </p>
          <p style={{ fontSize: 13, color: 'var(--color-text-3)', margin: 0 }}>
            Configure os limites por categoria para acompanhar seus gastos
          </p>
          <button
            onClick={() => setModalOpen(true)}
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
            Configurar agora
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {progressos.map(prog => (
            <EnvelopeCard key={prog.categoria} prog={prog} />
          ))}
        </div>
      )}

      {/* ── Modal de configuração ──────────────────────────────────────────── */}
      <Dialog open={modalOpen} onOpenChange={v => !v && setModalOpen(false)}>
        <DialogContent style={{
          background:   'var(--color-surface)',
          border:       '1px solid var(--color-border)',
          borderRadius: 16,
          maxWidth:     480,
          padding:      28,
        }}>
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--color-text-1)', fontSize: 16, fontWeight: 600 }}>
              Configurar orçamento —{' '}
              <span style={{ textTransform: 'capitalize' }}>{mesFmt}</span>
            </DialogTitle>
          </DialogHeader>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
            {CATEGORIAS_ORCAMENTO.map(({ value: cat, label }) => {
              const Icone = ICONES_CATEGORIA[cat] ?? MoreHorizontal
              return (
                <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width:          32,
                    height:         32,
                    borderRadius:   8,
                    flexShrink:     0,
                    background:     'var(--color-surface-2)',
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                  }}>
                    <Icone size={16} color="var(--color-text-2)" strokeWidth={1.8} />
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--color-text-1)', flex: 1 }}>
                    {label}
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={limites[cat] ?? ''}
                    onChange={e => setLimites(l => ({
                      ...l,
                      [cat]: e.target.value.replace(/[^0-9.,]/g, ''),
                    }))}
                    placeholder="0,00"
                    style={{
                      width:        100,
                      background:   'var(--color-surface-2)',
                      border:       '1px solid var(--color-border)',
                      borderRadius: 8,
                      padding:      '6px 10px',
                      color:        'var(--color-text-1)',
                      fontSize:     13,
                      fontFamily:   'JetBrains Mono, monospace',
                      outline:      'none',
                      textAlign:    'right',
                      transition:   'border-color 0.15s',
                    }}
                    onFocus={e => (e.target.style.borderColor = 'var(--color-accent)')}
                    onBlur={e  => (e.target.style.borderColor = 'var(--color-border)')}
                  />
                </div>
              )
            })}
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
                padding:      '9px 20px',
                borderRadius: 10,
                border:       'none',
                cursor:       salvando ? 'not-allowed' : 'pointer',
                background:   salvando ? 'var(--color-surface-2)' : 'var(--color-accent)',
                color:        salvando ? 'var(--color-text-2)'    : 'var(--color-bg)',
                fontSize:     14,
                fontWeight:   600,
                transition:   'all 0.15s',
              }}
            >
              {salvando ? 'Salvando...' : 'Salvar tudo'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
