export function FilterPill({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      style={{
        padding:      '6px 14px',
        borderRadius: 24,
        border:       'none',
        cursor:       'pointer',
        fontSize:     13,
        fontWeight:   active ? 600 : 400,
        whiteSpace:   'nowrap',
        transition:   'all 0.15s',
        background:   active ? 'var(--color-accent)'    : 'var(--color-surface-2)',
        color:        active ? 'var(--color-bg)'        : 'var(--color-text-2)',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--color-text-1)' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--color-text-2)' }}
    >
      {label}
    </button>
  )
}
