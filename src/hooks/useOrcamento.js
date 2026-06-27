import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

export const CATEGORIAS_ORCAMENTO = [
  { value: 'alimentacao', label: 'Alimentação' },
  { value: 'transporte',  label: 'Transporte'  },
  { value: 'moradia',     label: 'Moradia'     },
  { value: 'saude',       label: 'Saúde'       },
  { value: 'lazer',       label: 'Lazer'       },
  { value: 'educacao',    label: 'Educação'    },
  { value: 'vestuario',   label: 'Vestuário'   },
  { value: 'outros',      label: 'Outros'      },
]

// ---------------------------------------------------------------------------
// Helpers de data local (nunca usar toISOString — bug de fuso UTC)
// ---------------------------------------------------------------------------

function primeiroDiaMes(date) {
  const ano = date.getFullYear()
  const mes = String(date.getMonth() + 1).padStart(2, '0')
  return `${ano}-${mes}-01`
}

function ultimoDiaMes(date) {
  // new Date(ano, mes+1, 0) retorna o último dia do mês corrente
  const ultimo = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  return primeiroDiaMes(ultimo).slice(0, 7) + `-${String(ultimo.getDate()).padStart(2, '0')}`
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useOrcamento() {
  const { user } = useAuth()

  const [orcamentos,     setOrcamentos]     = useState([])
  const [lancamentosMes, setLancamentosMes] = useState([])
  const [loading,        setLoading]        = useState(true)
  const [error,          setError]          = useState(null)

  // Carrega orçamentos e lançamentos do mês atual ao montar
  useEffect(() => {
    if (!user) return
    fetchOrcamentos(new Date())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // ---------------------------------------------------------------------------
  // Fetch
  // ---------------------------------------------------------------------------

  async function fetchOrcamentos(mesDate) {
    setLoading(true)
    setError(null)
    try {
      const mesStr = primeiroDiaMes(mesDate)
      const fimStr = ultimoDiaMes(mesDate)

      // Queries paralelas: orçamentos cadastrados + lançamentos de saída do mês
      const [orcResult, lancResult] = await Promise.all([
        supabase
          .from('orcamento_mensal')
          .select('*')
          .eq('mes_referencia', mesStr),

        supabase
          .from('lancamentos')
          .select('valor, categoria, tipo')
          .eq('tipo', 'saida')
          .gte('data', mesStr)
          .lte('data', fimStr),
      ])

      if (orcResult.error)  throw orcResult.error
      if (lancResult.error) throw lancResult.error

      setOrcamentos(orcResult.data ?? [])
      setLancamentosMes(lancResult.data ?? [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Upsert
  // ---------------------------------------------------------------------------

  async function salvarOrcamentos(limites, mesDate) {
    // limites = { alimentacao: 1500, transporte: 300, ... }
    // Apenas categorias com valor > 0 são persistidas
    const mesStr = primeiroDiaMes(mesDate)

    const registros = Object.entries(limites)
      .filter(([, val]) => Number(val) > 0)
      .map(([categoria, valor_limite]) => ({
        mes_referencia: mesStr,
        categoria,
        valor_limite: Number(valor_limite),
        pessoa_id: user.id,
      }))

    const { error: err } = await supabase
      .from('orcamento_mensal')
      .upsert(registros, { onConflict: 'mes_referencia,categoria,pessoa_id' })

    if (err) throw err
    await fetchOrcamentos(mesDate)
  }

  // ---------------------------------------------------------------------------
  // Cálculo de progresso (puro — cruza state interno, sem efeitos)
  // ---------------------------------------------------------------------------

  function calcularProgressoPorCategoria() {
    return CATEGORIAS_ORCAMENTO.map(({ value: categoria, label }) => {
      const orc        = orcamentos.find(o => o.categoria === categoria)
      const valorLimite = orc?.valor_limite ?? 0

      const gasto = lancamentosMes
        .filter(l => l.categoria === categoria)
        .reduce((sum, l) => sum + Number(l.valor), 0)

      const percentual = valorLimite > 0 ? (gasto / valorLimite) * 100 : 0

      const status =
        percentual >= 100 ? 'danger'  :
        percentual >= 70  ? 'warning' : 'ok'

      return {
        categoria,
        label,
        valorLimite,
        gasto,
        percentual,
        status,
        temOrcamento: valorLimite > 0,
      }
    })
  }

  // ---------------------------------------------------------------------------
  // Derivações automáticas via useMemo
  // ---------------------------------------------------------------------------

  const progressos = useMemo(
    () => calcularProgressoPorCategoria(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orcamentos, lancamentosMes],
  )

  const totalPlanejado = useMemo(
    () => orcamentos.reduce((s, o) => s + Number(o.valor_limite), 0),
    [orcamentos],
  )

  const totalGasto = useMemo(
    () => lancamentosMes.reduce((s, l) => s + Number(l.valor), 0),
    [lancamentosMes],
  )

  // ---------------------------------------------------------------------------
  // Interface pública
  // ---------------------------------------------------------------------------

  return {
    orcamentos,
    progressos,
    totalPlanejado,
    totalGasto,
    loading,
    error,
    fetchOrcamentos,
    salvarOrcamentos,
    calcularProgressoPorCategoria,
  }
}
