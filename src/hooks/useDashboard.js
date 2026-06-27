import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

function primeiroDiaMes(mesesAtras = 0) {
  const d = new Date()
  d.setDate(1)                          // primeiro: fixar dia 1 para evitar overflow
  d.setMonth(d.getMonth() - mesesAtras)
  // formatar com data local (não UTC)
  const ano = d.getFullYear()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  return `${ano}-${mes}-01`
}

function calcularTotaisMes(lancamentos, mesRef) {
  const mes = mesRef.getMonth()
  const ano = mesRef.getFullYear()

  const doMes = lancamentos.filter(l => {
    const d = new Date(l.data + 'T00:00:00')
    return d.getMonth() === mes && d.getFullYear() === ano
  })

  const entradas = doMes
    .filter(l => l.tipo === 'entrada')
    .reduce((sum, l) => sum + Number(l.valor), 0)

  const saidas = doMes
    .filter(l => l.tipo === 'saida')
    .reduce((sum, l) => sum + Number(l.valor), 0)

  return { entradas, saidas, saldo: entradas - saidas }
}

export function useDashboard() {
  const { user } = useAuth()
  const [state, setState] = useState({
    entradas:          0,
    saidas:            0,
    saldo:             0,
    tarefasPendentes:  0,
    proximasTarefas:   [],
    dadosGrafico:      [],
    loading:           true,
    error:             null,
  })

  useEffect(() => {
    if (!user) return
    fetchData()
  }, [user?.id])

  async function fetchData() {
    setState(s => ({ ...s, loading: true, error: null }))
    try {
      const inicioRange = primeiroDiaMes(5) // 6 meses incluindo o atual

      const [lancResult, tarefasResult, countResult] = await Promise.all([
        supabase
          .from('lancamentos')
          .select('valor, tipo, data')
          .gte('data', inicioRange)
          .order('data', { ascending: true }),

        supabase
          .from('tarefas')
          .select('id, titulo, data_vencimento, prioridade, profiles(nome)')
          .eq('status', 'pendente')
          .not('data_vencimento', 'is', null)
          .gte('data_vencimento', (() => {
            const hoje = new Date()
            const ano = hoje.getFullYear()
            const mes = String(hoje.getMonth() + 1).padStart(2, '0')
            const dia = String(hoje.getDate()).padStart(2, '0')
            return `${ano}-${mes}-${dia}`
          })())
          .order('data_vencimento', { ascending: true })
          .limit(3),

        supabase
          .from('tarefas')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pendente'),
      ])

      if (lancResult.error)   throw lancResult.error
      if (tarefasResult.error) throw tarefasResult.error
      if (countResult.error)  throw countResult.error

      const lancamentos = lancResult.data ?? []
      const agora       = new Date()

      const { entradas, saidas, saldo } = calcularTotaisMes(lancamentos, agora)

      // Últimos 6 meses para o gráfico (do mais antigo ao mais recente)
      const dadosGrafico = Array.from({ length: 6 }, (_, i) => {
        const mesRef = new Date()
        mesRef.setDate(1)                            // fixar dia 1 antes de mudar o mês
        mesRef.setMonth(mesRef.getMonth() - (5 - i))
        const totais = calcularTotaisMes(lancamentos, mesRef)
        return {
          mes:      mesRef.toLocaleDateString('pt-BR', { month: 'short' }),
          entradas: totais.entradas,
          saidas:   totais.saidas,
        }
      })

      setState({
        entradas,
        saidas,
        saldo,
        tarefasPendentes: countResult.count ?? 0,
        proximasTarefas:  tarefasResult.data ?? [],
        dadosGrafico,
        loading: false,
        error:   null,
      })
    } catch (err) {
      setState(s => ({ ...s, loading: false, error: err.message }))
    }
  }

  return { ...state, refetch: fetchData }
}
