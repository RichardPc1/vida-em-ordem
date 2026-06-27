export function Skeleton({ height = 16, width = '100%', radius = 6 }) {
  return (
    <div
      className="animate-pulse"
      style={{
        height, width, borderRadius: radius,
        background: 'var(--color-surface-2)',
        flexShrink: 0,
      }}
    />
  )
}
