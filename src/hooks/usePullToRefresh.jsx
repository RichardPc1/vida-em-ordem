import { useState, useEffect, useRef } from 'react'

const THRESHOLD = 80

export function usePullToRefresh(onRefresh) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullY, setPullY]               = useState(0)

  const startYRef   = useRef(0)
  const pullYRef    = useRef(0)
  const activeRef   = useRef(false)
  const busyRef     = useRef(false)
  const callbackRef = useRef(onRefresh)

  // Sempre atualiza a referência sem re-registrar os listeners
  useEffect(() => { callbackRef.current = onRefresh })

  useEffect(() => {
    function onTouchStart(e) {
      if (window.scrollY > 0 || busyRef.current) return
      startYRef.current = e.touches[0].clientY
      activeRef.current = true
    }

    function onTouchMove(e) {
      if (!activeRef.current) return
      const delta = e.touches[0].clientY - startYRef.current
      if (delta > 0) {
        const y = Math.min(delta, THRESHOLD + 24)
        pullYRef.current = y
        setPullY(y)
      }
    }

    function onTouchEnd() {
      if (!activeRef.current) return
      activeRef.current = false
      const y = pullYRef.current
      pullYRef.current = 0
      setPullY(0)
      if (y >= THRESHOLD && !busyRef.current) {
        busyRef.current = true
        setIsRefreshing(true)
        Promise.resolve(callbackRef.current()).finally(() => {
          setTimeout(() => {
            setIsRefreshing(false)
            busyRef.current = false
          }, 600)
        })
      }
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove',  onTouchMove,  { passive: true })
    document.addEventListener('touchend',   onTouchEnd)

    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove',  onTouchMove)
      document.removeEventListener('touchend',   onTouchEnd)
    }
  }, []) // registra uma vez, callbackRef mantém a referência atualizada

  return { isRefreshing, pullY }
}

export function PullRefreshIndicator({ isRefreshing, pullY }) {
  if (!isRefreshing && pullY <= 10) return null

  const progress = Math.min(pullY / THRESHOLD, 1)
  const opacity  = isRefreshing ? 1 : progress

  return (
    <div
      style={{
        position:       'fixed',
        top:            20,
        left:           '50%',
        transform:      'translateX(-50%)',
        zIndex:         100,
        width:          36,
        height:         36,
        borderRadius:   '50%',
        background:     'var(--color-surface)',
        border:         '1px solid var(--color-border)',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        opacity,
        transition:     isRefreshing ? 'opacity 0.3s' : 'none',
        pointerEvents:  'none',
      }}
    >
      <div
        className={isRefreshing ? 'animate-spin' : ''}
        style={{
          width:          18,
          height:         18,
          borderRadius:   '50%',
          border:         '2.5px solid var(--color-accent)',
          borderTopColor: 'transparent',
          transform:      !isRefreshing ? `rotate(${progress * 360}deg)` : undefined,
        }}
      />
    </div>
  )
}
