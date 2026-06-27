import { Check, Trash2, RefreshCw } from 'lucide-react'
import { PriorityBadge } from '../shared/PriorityBadge'
import { PersonBadge }   from '../shared/PersonBadge'
import { fmtDate, isAtrasada } from '../../lib/utils'
import { CATEGORIAS } from './constants'

function TaskCheckbox({ checked, onChange, disabled }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onChange() }}
      disabled={disabled}
      role="checkbox"
      aria-checked={checked}
      aria-label={`Marcar como ${checked ? 'pendente' : 'concluída'}`}
      style={{
        flexShrink:  0,
        width:       20,
        height:      20,
        borderRadius:'50%',
        border:      `2px solid ${checked ? 'var(--color-accent)' : 'var(--color-border)'}`,
        background:  checked ? 'var(--color-accent)' : 'transparent',
        display:     'flex',
        alignItems:  'center',
        justifyContent: 'center',
        cursor:      disabled ? 'not-allowed' : 'pointer',
        transition:  'all 0.2s',
        padding:     0,
      }}
    >
      {checked && (
        <Check
          size={11}
          color="var(--color-bg)"
          strokeWidth={3}
          className="check-icon-anim"
        />
      )}
    </button>
  )
}

export function TaskCard({ tarefa, isAdmin, userId, onToggle, onEdit, onDelete, toggling, confirmando }) {
  const concluida    = tarefa.status === 'concluida'
  const atrasada     = isAtrasada(tarefa)
  const outroUsuario = isAdmin && tarefa.pessoa_id !== userId
  const catLabel     = CATEGORIAS.find(c => c.value === tarefa.categoria)?.label ?? tarefa.categoria

  return (
    <div
      style={{
        background:   'var(--color-surface)',
        border:       '1px solid var(--color-border)',
        borderRadius: 16,
        padding:      '14px 16px',
        display:      'flex',
        alignItems:   'flex-start',
        gap:          12,
        opacity:      concluida ? 0.6 : 1,
        transition:   'opacity 0.2s, background 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-2)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-surface)')}
    >
      <div style={{ paddingTop: 1 }}>
        <TaskCheckbox checked={concluida} onChange={onToggle} disabled={toggling} />
      </div>

      <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={onEdit}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, minWidth: 0 }}>
          <p style={{
            fontSize:       14,
            fontWeight:     500,
            margin:         0,
            color:          'var(--color-text-1)',
            textDecoration: concluida ? 'line-through' : 'none',
            overflow:       'hidden',
            textOverflow:   'ellipsis',
            whiteSpace:     'nowrap',
            flex:           1,
            minWidth:       0,
          }}>
            {tarefa.titulo}
          </p>
          {tarefa.recorrencia && (
            <RefreshCw
              size={14}
              color="var(--color-text-2)"
              strokeWidth={2}
              style={{ flexShrink: 0 }}
              title={`Recorrência: ${tarefa.recorrencia}`}
            />
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-2)' }}>
            {catLabel}
          </span>

          {tarefa.data_vencimento && (
            <>
              <span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>·</span>
              <span style={{
                fontSize:   12,
                color:      atrasada ? 'var(--color-danger)' : 'var(--color-text-2)',
                fontWeight: atrasada ? 500 : 400,
              }}>
                {fmtDate(tarefa.data_vencimento)}{atrasada && ' · atrasada'}
              </span>
            </>
          )}

          <PriorityBadge prioridade={tarefa.prioridade} />
          {outroUsuario && <PersonBadge nome={tarefa.profiles?.nome} />}
        </div>
      </div>

      <button
        onClick={e => { e.stopPropagation(); onDelete() }}
        title={confirmando ? 'Clique novamente para confirmar' : 'Deletar tarefa'}
        style={{
          flexShrink:  0,
          background:  confirmando ? 'rgba(255,92,92,0.1)' : 'transparent',
          border:      'none',
          padding:     6,
          borderRadius:6,
          cursor:      'pointer',
          color:       confirmando ? 'var(--color-danger)' : 'var(--color-text-3)',
          display:     'flex',
          alignItems:  'center',
          transition:  'color 0.15s, background 0.15s',
          position:    'relative',
          zIndex:      50,
        }}
        onMouseEnter={e => { if (!confirmando) e.currentTarget.style.color = 'var(--color-danger)' }}
        onMouseLeave={e => { if (!confirmando) e.currentTarget.style.color = 'var(--color-text-3)' }}
        aria-label={`Deletar: ${tarefa.titulo}`}
      >
        <Trash2 size={15} />
      </button>
    </div>
  )
}
