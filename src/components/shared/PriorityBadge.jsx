export const PRIORIDADE_CFG = {
  alta:  { color: 'var(--color-danger)',  bg: 'rgba(255,92,92,0.12)' },
  media: { color: 'var(--color-warning)', bg: 'rgba(255,184,48,0.12)' },
  baixa: { color: 'var(--color-text-2)',  bg: 'rgba(138,138,138,0.10)' },
}

const LABELS = { alta: 'Alta', media: 'Média', baixa: 'Baixa' }

export function PriorityBadge({ prioridade }) {
  const cfg   = PRIORIDADE_CFG[prioridade] ?? PRIORIDADE_CFG.baixa
  const label = LABELS[prioridade] ?? prioridade
  return (
    <span style={{
      fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 6,
      color: cfg.color, background: cfg.bg, whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}
