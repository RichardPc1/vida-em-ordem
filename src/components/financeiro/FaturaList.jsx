import { useState } from 'react'
import { ChevronDown, ChevronUp, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { fmtCurrency } from '../../lib/utils'
import { CATEGORIAS_SAIDA, CATEGORIAS_ENTRADA } from '../../lib/categoriasFinanceiro'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

/**
 * Classifica uma fatura em relação ao mês atual (0-indexed, igual ao Date.getMonth()).
 * @returns 'atual' | 'futura' | 'passada'
 */
function statusFatura(fatura) {
  const hoje    = new Date()
  const anoHoje = hoje.getFullYear()
  const mesHoje = hoje.getMonth()

  if (fatura.ano === anoHoje && fatura.mes === mesHoje) return 'atual'

  // Fatura está à frente do mês corrente?
  if (
    fatura.ano > anoHoje ||
    (fatura.ano === anoHoje && fatura.mes > mesHoje)
  ) return 'futura'

  return 'passada'
}

// Data local em YYYY-MM-DD — nunca usar toISOString() aqui, ele usa UTC e
// depois das 21h (Brasil, UTC-3) o campo já mostraria o dia seguinte.
function dataLocalStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Formata uma data que pode ser um objeto Date (de agruparPorFatura) ou
 * uma string YYYY-MM-DD (de fatura_pagamentos).
 */
function fmtDataSimples(date) {
  if (!date) return '—'
  if (date instanceof Date) {
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
  }
  // String do banco — appender T00:00:00 para evitar UTC shift
  return new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
  })
}

// ---------------------------------------------------------------------------
// Estilos de input compartilhados (escopo do módulo)
// ---------------------------------------------------------------------------

const inputSmStyle = {
  background:   'var(--color-surface)',
  border:       '1px solid var(--color-border)',
  borderRadius: 10,
  padding:      '7px 10px',
  color:        'var(--color-text-1)',
  fontSize:     13,
  outline:      'none',
  width:        '100%',
  boxSizing:    'border-box',
  transition:   'border-color 0.15s',
}

function focusSm(e)   { e.target.style.borderColor = 'var(--color-accent)' }
function blurSm(e)    { e.target.style.borderColor = 'var(--color-border)' }

// ---------------------------------------------------------------------------
// FaturaItem
// ---------------------------------------------------------------------------

function FaturaItem({ fatura, onPagar }) {
  const [expandido,     setExpandido]     = useState(false)
  const [showFormPagar, setShowFormPagar] = useState(false)
  const [pagando,       setPagando]       = useState(false)
  const [formPagar,     setFormPagar]     = useState({
    valor: fatura.total.toFixed(2),
    data:  dataLocalStr(new Date()),
  })

  const status  = statusFatura(fatura)
  const nomeMes = NOMES_MESES[fatura.mes]

  // Estilo de borda varia por status
  const bordaColor  = status === 'atual' ? 'rgba(200,240,77,0.3)' : 'var(--color-border)'
  const opacidade   = status === 'futura' ? 0.65 : 1

  const LABEL_STATUS = {
    atual:   { text: 'ATUAL',   color: 'var(--color-accent)', bg: 'rgba(200,240,77,0.12)', border: 'rgba(200,240,77,0.2)' },
    futura:  { text: 'FUTURA',  color: 'var(--color-text-3)', bg: 'var(--color-surface-2)', border: 'var(--color-border)'  },
    passada: { text: 'PASSADA', color: 'var(--color-text-3)', bg: 'var(--color-surface-2)', border: 'var(--color-border)'  },
  }
  const labelInfo = LABEL_STATUS[status]

  async function handlePagarConfirm() {
    const valorNum = parseFloat(formPagar.valor.replace(',', '.'))
    if (!valorNum || valorNum <= 0) {
      toast.error('Valor inválido', { style: { borderColor: 'var(--color-danger)' } })
      return
    }
    if (!formPagar.data) {
      toast.error('Data obrigatória', { style: { borderColor: 'var(--color-danger)' } })
      return
    }

    setPagando(true)
    try {
      await onPagar({ ano: fatura.ano, mes: fatura.mes, valor: valorNum, data: formPagar.data })
      setShowFormPagar(false)
      toast.success('Fatura marcada como paga!', { style: { borderColor: 'var(--color-accent)' } })
    } catch {
      toast.error('Erro ao registrar pagamento', { style: { borderColor: 'var(--color-danger)' } })
    } finally {
      setPagando(false)
    }
  }

  return (
    <div style={{
      background:   'var(--color-surface)',
      border:       `1px solid ${bordaColor}`,
      borderRadius: 16,
      overflow:     'hidden',
      opacity:      opacidade,
      transition:   'opacity 0.2s',
    }}>
      {/* ─── Header clicável ────────────────────────────────────────────── */}
      <div
        onClick={() => setExpandido(v => !v)}
        style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          padding:        '14px 20px',
          cursor:         'pointer',
          background:     status === 'atual' ? 'rgba(200,240,77,0.04)' : 'transparent',
          transition:     'background 0.15s',
          userSelect:     'none',
        }}
        onMouseEnter={e => {
          if (status !== 'atual') e.currentTarget.style.background = 'var(--color-surface-2)'
        }}
        onMouseLeave={e => {
          if (status !== 'atual') e.currentTarget.style.background = 'transparent'
        }}
      >
        {/* Mês + badges */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-1)', margin: 0 }}>
              {nomeMes} {fatura.ano}
            </p>

            <span style={{
              fontSize:     10,
              fontWeight:   700,
              letterSpacing: '0.07em',
              padding:      '2px 6px',
              borderRadius: 4,
              color:        labelInfo.color,
              background:   labelInfo.bg,
              border:       `1px solid ${labelInfo.border}`,
            }}>
              {labelInfo.text}
            </span>

            {fatura.paga && (
              <span style={{
                fontSize:     10,
                fontWeight:   700,
                letterSpacing: '0.07em',
                padding:      '2px 6px',
                borderRadius: 4,
                color:        'var(--color-success)',
                background:   'rgba(78,205,196,0.12)',
                border:       '1px solid rgba(78,205,196,0.25)',
              }}>
                PAGA
              </span>
            )}
          </div>

          <p style={{ fontSize: 12, color: 'var(--color-text-3)', margin: 0 }}>
            Fecha {fmtDataSimples(fatura.dataFechamento)} · Vence {fmtDataSimples(fatura.dataVencimento)}
          </p>
        </div>

        {/* Total + chevron */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize:   15,
            fontWeight: 600,
            color:      'var(--color-danger)',
          }}>
            {fmtCurrency(fatura.total)}
          </span>
          {expandido
            ? <ChevronUp size={15} color="var(--color-text-3)" />
            : <ChevronDown size={15} color="var(--color-text-3)" />
          }
        </div>
      </div>

      {/* ─── Corpo expandido ────────────────────────────────────────────── */}
      {expandido && (
        <div style={{ borderTop: '1px solid var(--color-border)' }}>

          {/* Info de pagamento (apenas se paga) */}
          {fatura.paga && fatura.dataPagamento && (
            <div style={{
              display:      'flex',
              alignItems:   'center',
              gap:          8,
              padding:      '10px 20px',
              background:   'rgba(78,205,196,0.06)',
              borderBottom: '1px solid var(--color-border)',
            }}>
              <Check size={13} color="#4ECDC4" />
              <span style={{ fontSize: 13, color: 'var(--color-success)' }}>
                Pago em {fmtDataSimples(fatura.dataPagamento)}
                {fatura.valorPago != null && (
                  <span style={{
                    marginLeft: 6,
                    fontFamily: 'JetBrains Mono, monospace',
                  }}>
                    · {fmtCurrency(fatura.valorPago)}
                  </span>
                )}
              </span>
            </div>
          )}

          {/* Lançamentos da fatura */}
          {fatura.lancamentos.length > 0 ? (
            <div>
              {fatura.lancamentos.map((l, idx) => {
                const isEntrada = l.tipo === 'entrada'
                const cats      = isEntrada ? CATEGORIAS_ENTRADA : CATEGORIAS_SAIDA
                const catLabel  = cats.find(c => c.value === l.categoria)?.label ?? l.categoria
                const dataFmt   = new Date(l.data + 'T00:00:00')
                  .toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

                return (
                  <div
                    key={l.id}
                    style={{
                      display:      'flex',
                      alignItems:   'center',
                      gap:          12,
                      padding:      '10px 20px',
                      borderBottom: idx < fatura.lancamentos.length - 1
                        ? '1px solid var(--color-border)'
                        : 'none',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize:     13,
                        fontWeight:   500,
                        color:        'var(--color-text-1)',
                        margin:       '0 0 2px',
                        overflow:     'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace:   'nowrap',
                      }}>
                        {l.descricao}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--color-text-3)', margin: 0 }}>
                        {catLabel} · {dataFmt}
                        {l.eh_parcelado && (
                          <span style={{ marginLeft: 6, fontFamily: 'JetBrains Mono, monospace' }}>
                            ({l.parcela_atual}/{l.total_parcelas})
                          </span>
                        )}
                      </p>
                    </div>

                    <span style={{
                      fontFamily:  'JetBrains Mono, monospace',
                      fontSize:    13,
                      fontWeight:  500,
                      color:       isEntrada ? 'var(--color-success)' : 'var(--color-danger)',
                      flexShrink:  0,
                      whiteSpace:  'nowrap',
                    }}>
                      {isEntrada ? '+' : '−'}{fmtCurrency(l.valor)}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ padding: '24px 20px', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: 'var(--color-text-3)', margin: 0 }}>
                Nenhum lançamento nesta fatura
              </p>
            </div>
          )}

          {/* Pagar fatura — apenas se não paga */}
          {!fatura.paga && (
            <div style={{
              padding:   '12px 20px',
              borderTop: '1px solid var(--color-border)',
              background: 'var(--color-surface-2)',
            }}>
              {!showFormPagar ? (
                <button
                  onClick={() => {
                    setFormPagar({
                      valor: fatura.total.toFixed(2),
                      data:  dataLocalStr(new Date()),
                    })
                    setShowFormPagar(true)
                  }}
                  style={{
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                    gap:            6,
                    width:          '100%',
                    padding:        '8px 0',
                    borderRadius:   10,
                    border:         '1px solid var(--color-accent)',
                    background:     'transparent',
                    color:          'var(--color-accent)',
                    fontSize:       13,
                    fontWeight:     600,
                    cursor:         'pointer',
                    transition:     'all 0.15s',
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
                  <Check size={14} />
                  Pagar fatura
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-1)', margin: 0 }}>
                    Registrar pagamento
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <label style={{ fontSize: 12, color: 'var(--color-text-2)' }}>
                        Valor pago
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={formPagar.valor}
                        onChange={e => setFormPagar(f => ({ ...f, valor: e.target.value }))}
                        style={{
                          ...inputSmStyle,
                          fontFamily: 'JetBrains Mono, monospace',
                        }}
                        onFocus={focusSm}
                        onBlur={blurSm}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <label style={{ fontSize: 12, color: 'var(--color-text-2)' }}>
                        Data do pagamento
                      </label>
                      <input
                        type="date"
                        value={formPagar.data}
                        onChange={e => setFormPagar(f => ({ ...f, data: e.target.value }))}
                        style={{ ...inputSmStyle, colorScheme: 'dark' }}
                        onFocus={focusSm}
                        onBlur={blurSm}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => setShowFormPagar(false)}
                      style={{
                        flex:         1,
                        padding:      '8px 0',
                        borderRadius: 10,
                        border:       '1px solid var(--color-border)',
                        background:   'transparent',
                        color:        'var(--color-text-2)',
                        fontSize:     13,
                        cursor:       'pointer',
                      }}
                    >
                      Cancelar
                    </button>

                    <button
                      onClick={handlePagarConfirm}
                      disabled={pagando}
                      style={{
                        flex:           1,
                        padding:        '8px 0',
                        borderRadius:   10,
                        border:         'none',
                        background:     pagando ? 'var(--color-surface)' : 'var(--color-accent)',
                        color:          pagando ? 'var(--color-text-2)' : 'var(--color-bg)',
                        fontSize:       13,
                        fontWeight:     600,
                        cursor:         pagando ? 'not-allowed' : 'pointer',
                        display:        'flex',
                        alignItems:     'center',
                        justifyContent: 'center',
                        gap:            6,
                        transition:     'background 0.15s',
                      }}
                    >
                      {pagando
                        ? <Loader2 size={13} className="animate-spin" />
                        : <Check size={13} />
                      }
                      {pagando ? 'Salvando...' : 'Confirmar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// FaturaList (exportado)
//
// Props:
//   faturas  Array de faturas (retorno de calcularFaturas — mais antigo → mais recente)
//   loading  boolean
//   onPagar  async ({ ano, mes, valor, data }) => void
//            (cartaoId já está em closure no pai — Cartoes.jsx)
// ---------------------------------------------------------------------------

export function FaturaList({ faturas, loading, onPagar }) {
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="animate-pulse"
            style={{
              height:       76,
              borderRadius: 16,
              background:   'var(--color-surface-2)',
              border:       '1px solid var(--color-border)',
            }}
          />
        ))}
      </div>
    )
  }

  if (!faturas.length) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center' }}>
        <p style={{ fontSize: 14, color: 'var(--color-text-2)', margin: '0 0 4px' }}>
          Nenhuma fatura encontrada
        </p>
        <p style={{ fontSize: 13, color: 'var(--color-text-3)', margin: 0 }}>
          Os lançamentos vinculados a este cartão aparecerão aqui agrupados por fatura
        </p>
      </div>
    )
  }

  // Exibe mais recentes primeiro: atual/futuras no topo, passadas abaixo
  const faturasOrdenadas = [...faturas].reverse()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {faturasOrdenadas.map(f => (
        <FaturaItem
          key={`${f.ano}-${f.mes}`}
          fatura={f}
          onPagar={onPagar}
        />
      ))}
    </div>
  )
}
