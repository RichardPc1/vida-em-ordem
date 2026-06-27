import { ClipboardList } from 'lucide-react'
import { Skeleton } from '../shared/Skeleton'

export function TaskSkeletons() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[0.85, 0.6, 0.75].map((w, i) => (
        <div key={i} style={{
          background:   'var(--color-surface)',
          border:       '1px solid var(--color-border)',
          borderRadius: 16,
          padding:      '14px 16px',
          display:      'flex',
          gap:          12,
          alignItems:   'center',
        }}>
          <Skeleton height={20} width={20} radius="50%" />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Skeleton height={14} width={`${w * 100}%`} />
            <Skeleton height={11} width="45%" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function EmptyState({ onNova }) {
  return (
    <div style={{
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      padding:        '64px 24px',
      gap:            12,
      textAlign:      'center',
    }}>
      <ClipboardList size={40} color="var(--color-text-3)" strokeWidth={1.5} />
      <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-text-2)', margin: 0 }}>
        Nenhuma tarefa encontrada
      </p>
      <p style={{ fontSize: 13, color: 'var(--color-text-3)', margin: 0 }}>
        Crie sua primeira tarefa para começar
      </p>
      <button
        onClick={onNova}
        style={{
          marginTop:    8,
          padding:      '8px 20px',
          background:   'var(--color-accent)',
          color:        'var(--color-bg)',
          border:       'none',
          borderRadius: 10,
          fontSize:     13,
          fontWeight:   600,
          cursor:       'pointer',
        }}
      >
        Nova tarefa
      </button>
    </div>
  )
}
