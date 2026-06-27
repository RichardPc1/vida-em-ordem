export function PersonBadge({ nome }) {
  if (!nome) return null
  return (
    <span style={{
      fontSize: 11, color: 'var(--color-text-2)',
      background: 'var(--color-surface-2)',
      border: '1px solid var(--color-border)',
      padding: '2px 8px', borderRadius: 6, whiteSpace: 'nowrap',
    }}>
      @{nome.split(' ')[0].toLowerCase()}
    </span>
  )
}
