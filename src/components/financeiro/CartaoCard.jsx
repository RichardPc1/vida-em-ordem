import { CreditCard, Pencil, Trash2, ChevronRight } from 'lucide-react'
import { fmtCurrency } from '../../lib/utils'

// ---------------------------------------------------------------------------
// CartaoCard
//
// Card visual de um cartão de crédito no grid principal de /cartoes.
// Mostra nome, banco, barra de limite usado/disponível, dias de
// fechamento/vencimento e botões de ação.
//
// Regra de cor da barra (nunca accent — limite usado é custo, não positivo):
//   < 70%  → success (#4ECDC4)
//   70–89% → warning (#FFB830)
//   ≥ 90%  → danger  (#FF5C5C)
//
// Props:
//   cartao     { id, nome, banco, limite_total, dia_fechamento,
//                dia_vencimento, pessoa_id, profiles }
//   limiteInfo { total, usado, disponivel } | null  (null = carregando)
//   isAdmin    boolean
//   onVerFaturas () => void
//   onEditar     () => void
//   onDesativar  () => void  (primeiro clique pede confirmação via `desativandoId`)
// ---------------------------------------------------------------------------

export function CartaoCard({
  cartao,
  limiteInfo,
  isAdmin,
  onVerFaturas,
  onEditar,
  onDesativar,
  desativandoId,
}) {
  const pct = limiteInfo && limiteInfo.total > 0
    ? (limiteInfo.usado / limiteInfo.total) * 100
    : 0

  const corBarra =
    pct >= 90 ? 'var(--color-danger)'  :
    pct >= 70 ? 'var(--color-warning)' :
    'var(--color-success)'

  const aguardandoConfirmacao = desativandoId === cartao.id

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onVerFaturas}
      onKeyDown={e => e.key === 'Enter' && onVerFaturas()}
      style={{
        background:    'var(--color-surface)',
        border:        '1px solid var(--color-border)',
        borderRadius:  16,
        padding:       20,
        display:       'flex',
        flexDirection: 'column',
        gap:           16,
        cursor:        'pointer',
        transition:    'background 0.15s',
        outline:       'none',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-2)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-surface)')}
    >
      {/* ─── Header: nome + ações ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <CreditCard size={15} color="var(--color-text-2)" style={{ flexShrink: 0 }} />
            <p style={{
              fontSize: 15, fontWeight: 600, color: 'var(--color-text-1)', margin: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {cartao.nome}
            </p>
          </div>

          {cartao.banco && (
            <p style={{ fontSize: 12, color: 'var(--color-text-2)', margin: '2px 0 0 23px' }}>
              {cartao.banco}
            </p>
          )}

          {isAdmin && cartao.profiles?.nome && (
            <span style={{
              display:      'inline-block',
              marginTop:    6,
              marginLeft:   23,
              fontSize:     11,
              color:        'var(--color-text-2)',
              background:   'var(--color-surface-2)',
              border:       '1px solid var(--color-border)',
              padding:      '1px 6px',
              borderRadius: 6,
            }}>
              @{cartao.profiles.nome.split(' ')[0].toLowerCase()}
            </span>
          )}
        </div>

        {/* Ações — stopPropagation para não abrir o drawer de faturas */}
        <div
          style={{ display: 'flex', gap: 2, flexShrink: 0 }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={onEditar}
            title="Editar cartão"
            aria-label={`Editar ${cartao.nome}`}
            style={{
              background:  'transparent',
              border:      'none',
              padding:     6,
              borderRadius: 6,
              cursor:      'pointer',
              color:       'var(--color-text-3)',
              display:     'flex',
              alignItems:  'center',
              transition:  'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-2)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-3)')}
          >
            <Pencil size={14} />
          </button>

          <button
            onClick={onDesativar}
            title={aguardandoConfirmacao ? 'Clique novamente para confirmar' : 'Desativar cartão'}
            aria-label={`Desativar ${cartao.nome}`}
            style={{
              background:  aguardandoConfirmacao ? 'rgba(255,92,92,0.1)' : 'transparent',
              border:      'none',
              padding:     6,
              borderRadius: 6,
              cursor:      'pointer',
              color:       aguardandoConfirmacao ? 'var(--color-danger)' : 'var(--color-text-3)',
              display:     'flex',
              alignItems:  'center',
              transition:  'all 0.15s',
            }}
            onMouseEnter={e => {
              if (!aguardandoConfirmacao) e.currentTarget.style.color = 'var(--color-danger)'
            }}
            onMouseLeave={e => {
              if (!aguardandoConfirmacao) e.currentTarget.style.color = 'var(--color-text-3)'
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* ─── Barra de limite ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-2)' }}>Limite em uso</span>
          {limiteInfo ? (
            <span style={{
              fontSize:    12,
              fontFamily:  'JetBrains Mono, monospace',
              color:       'var(--color-text-2)',
            }}>
              {fmtCurrency(limiteInfo.usado)} / {fmtCurrency(limiteInfo.total)}
            </span>
          ) : (
            <div
              className="animate-pulse"
              style={{ width: 110, height: 13, borderRadius: 4, background: 'var(--color-surface-2)' }}
            />
          )}
        </div>

        <div style={{ height: 6, borderRadius: 3, background: 'var(--color-surface-2)' }}>
          {limiteInfo ? (
            <div style={{
              height:      '100%',
              borderRadius: 3,
              width:       `${Math.min(pct, 100)}%`,
              background:  corBarra,
              transition:  'width 0.4s ease',
            }} />
          ) : (
            <div
              className="animate-pulse"
              style={{ height: '100%', borderRadius: 3, width: '50%', background: 'var(--color-border)' }}
            />
          )}
        </div>

        {limiteInfo && (
          <p style={{
            fontSize:   11,
            color:      'var(--color-text-3)',
            margin:     0,
            textAlign:  'right',
            fontFamily: 'JetBrains Mono, monospace',
          }}>
            {pct.toFixed(1)}% utilizado · {fmtCurrency(limiteInfo.disponivel)} disponível
          </p>
        )}
      </div>

      {/* ─── Footer: dias + seta ──────────────────────────────────────────── */}
      <div style={{
        display:      'flex',
        alignItems:   'center',
        gap:          16,
        borderTop:    '1px solid var(--color-border)',
        paddingTop:   12,
      }}>
        <div>
          <p style={{ fontSize: 11, color: 'var(--color-text-3)', margin: '0 0 2px' }}>
            Fechamento
          </p>
          <p style={{
            fontSize:   13,
            fontWeight: 600,
            color:      'var(--color-text-2)',
            margin:     0,
            fontFamily: 'JetBrains Mono, monospace',
          }}>
            Dia {String(cartao.dia_fechamento).padStart(2, '0')}
          </p>
        </div>

        <div>
          <p style={{ fontSize: 11, color: 'var(--color-text-3)', margin: '0 0 2px' }}>
            Vencimento
          </p>
          <p style={{
            fontSize:   13,
            fontWeight: 600,
            color:      'var(--color-text-2)',
            margin:     0,
            fontFamily: 'JetBrains Mono, monospace',
          }}>
            Dia {String(cartao.dia_vencimento).padStart(2, '0')}
          </p>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>Faturas</span>
          <ChevronRight size={14} color="var(--color-text-3)" />
        </div>
      </div>
    </div>
  )
}
