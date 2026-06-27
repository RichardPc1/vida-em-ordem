import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ---------------------------------------------------------------------------
// Constantes de categorias
// ---------------------------------------------------------------------------

export const CATEGORIAS_SAIDA = [
  { value: 'alimentacao', label: 'Alimentação' },
  { value: 'transporte',  label: 'Transporte'  },
  { value: 'moradia',     label: 'Moradia'     },
  { value: 'saude',       label: 'Saúde'       },
  { value: 'lazer',       label: 'Lazer'       },
  { value: 'educacao',    label: 'Educação'    },
  { value: 'vestuario',   label: 'Vestuário'   },
  { value: 'outros',      label: 'Outros'      },
]

export const CATEGORIAS_ENTRADA = [
  { value: 'salario',      label: 'Salário'      },
  { value: 'freelance',    label: 'Freelance'    },
  { value: 'investimento', label: 'Investimento' },
  { value: 'aluguel',      label: 'Aluguel'      },
  { value: 'outros',       label: 'Outros'       },
]

// Cores hardcoded para Recharts — CSS vars não funcionam em SVG fill
export const CORES_CATEGORIA = {
  alimentacao:  '#4ECDC4',
  transporte:   '#FFB830',
  moradia:      '#C8F04D',
  saude:        '#FF6B9D',
  lazer:        '#A78BFA',
  educacao:     '#60A5FA',
  vestuario:    '#F97316',
  outros:       '#8A8A8A',
  salario:      '#4ECDC4',
  freelance:    '#A78BFA',
  investimento: '#C8F04D',
  aluguel:      '#60A5FA',
}

// ---------------------------------------------------------------------------
// Helper de data local (CRÍTICO — toISOString() usa UTC e causa bug no Brasil)
// ---------------------------------------------------------------------------

function dataLocalStr(date) {
  const ano = date.getFullYear()
  const mes = String(date.getMonth() + 1).padStart(2, '0')
  const dia = String(date.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

// ---------------------------------------------------------------------------
// Hook principal
// ---------------------------------------------------------------------------

export function useLancamentos() {
  const { user } = useAuth()

  const [lancamentos, setLancamentos] = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)

  // Guarda os últimos filtros usados para refetch pós-mutação
  const filtrosAtivosRef = useRef({ mes: new Date() })

  useEffect(() => {
    if (!user) return
    fetchLancamentos({ mes: new Date() })
    // Apenas reagir a troca de usuário logado
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // -------------------------------------------------------------------------
  // fetchLancamentos
  // -------------------------------------------------------------------------

  async function fetchLancamentos(filtros = {}) {
    try {
      setLoading(true)
      setError(null)

      // Persiste para refetch pós-mutação
      filtrosAtivosRef.current = filtros

      // Se filtros.mes é um Date usa-o; senão usa o mês atual
      const mesRef = filtros.mes instanceof Date ? filtros.mes : new Date()
      const ano    = mesRef.getFullYear()
      const mes    = mesRef.getMonth()

      // Intervalo inclusivo do mês inteiro em data local
      const primeiroDia = dataLocalStr(new Date(ano, mes, 1))
      const ultimoDia   = dataLocalStr(new Date(ano, mes + 1, 0)) // dia 0 = último dia do mês anterior

      let query = supabase
        .from('lancamentos')
        .select('*, profiles(nome)')
        .gte('data', primeiroDia)
        .lte('data', ultimoDia)
        .order('data',       { ascending: false })
        .order('created_at', { ascending: false })

      if (filtros.tipo)      query = query.eq('tipo',      filtros.tipo)
      if (filtros.categoria) query = query.eq('categoria', filtros.categoria)
      if (filtros.pessoa_id) query = query.eq('pessoa_id', filtros.pessoa_id)

      const { data, error: err } = await query
      if (err) throw err

      setLancamentos(data ?? [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // -------------------------------------------------------------------------
  // criarLancamento
  // Lança erro para o caller; fetchLancamentos interno tem seu próprio try/catch
  // -------------------------------------------------------------------------

  async function criarLancamento(dados) {
    // Parsear data com T00:00:00 para evitar deslocamento UTC
    const baseDate = new Date(dados.data + 'T00:00:00')

    if (!dados.eh_parcelado) {
      // --- Lançamento simples ---
      const payload = {
        tipo:             dados.tipo,
        valor:            Number(dados.valor),
        categoria:        dados.categoria,
        descricao:        dados.descricao,
        data:             dados.data,
        pessoa_id:        dados.pessoa_id ?? user.id,
        eh_parcelado:     false,
        id_grupo_parcela: null,
        parcela_atual:    null,
        total_parcelas:   null,
      }

      const { error: err } = await supabase.from('lancamentos').insert(payload)
      if (err) throw err
    } else {
      // --- Lançamento parcelado ---
      const grupoId       = crypto.randomUUID()
      const totalParcelas = Number(dados.total_parcelas)

      const parcelas = Array.from({ length: totalParcelas }, (_, i) => {
        const d = new Date(baseDate)

        // Fixar dia 1 ANTES de avançar o mês para evitar overflow em dias 29/30/31.
        // Exemplo: 31/jan + 1 mês sem fixar = 3/mar (março), não fevereiro.
        d.setDate(1)
        d.setMonth(d.getMonth() + i)

        // Restaurar o dia original com clamp para o último dia do mês destino
        const diaOriginal  = baseDate.getDate()
        const ultimoDiaMes = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
        d.setDate(Math.min(diaOriginal, ultimoDiaMes))

        return {
          tipo:             dados.tipo,
          valor:            Number(dados.valor),
          categoria:        dados.categoria,
          descricao:        dados.descricao,
          data:             dataLocalStr(d),
          pessoa_id:        dados.pessoa_id ?? user.id,
          eh_parcelado:     true,
          id_grupo_parcela: grupoId,
          parcela_atual:    i + 1,
          total_parcelas:   totalParcelas,
        }
      })

      const { error: err } = await supabase.from('lancamentos').insert(parcelas)
      if (err) throw err
    }

    // Exibir o mês onde a primeira parcela/registro foi criado
    await fetchLancamentos({ mes: baseDate })
  }

  // -------------------------------------------------------------------------
  // deletarLancamento
  // apenasEsta = true  → deleta somente este registro
  // apenasEsta = false → deleta todas as parcelas do mesmo grupo
  // -------------------------------------------------------------------------

  async function deletarLancamento(id, apenasEsta = true) {
    if (!apenasEsta) {
      // Buscar o grupo do registro para poder deletar todas as parcelas
      const { data: registro, error: fetchErr } = await supabase
        .from('lancamentos')
        .select('id_grupo_parcela, eh_parcelado')
        .eq('id', id)
        .single()

      if (fetchErr) throw fetchErr

      if (registro?.eh_parcelado && registro?.id_grupo_parcela) {
        // Deletar todas as parcelas do grupo
        const { error: err } = await supabase
          .from('lancamentos')
          .delete()
          .eq('id_grupo_parcela', registro.id_grupo_parcela)
        if (err) throw err
      } else {
        // Registro não é parcelado (defensivo) — deleta só este
        const { error: err } = await supabase
          .from('lancamentos')
          .delete()
          .eq('id', id)
        if (err) throw err
      }
    } else {
      // Deleta somente este registro
      const { error: err } = await supabase
        .from('lancamentos')
        .delete()
        .eq('id', id)
      if (err) throw err
    }

    // Refetch mantendo os filtros que o usuário tinha ativos
    await fetchLancamentos(filtrosAtivosRef.current)
  }

  // -------------------------------------------------------------------------
  // calcularTotaisMes
  // Opera sobre o state local — nenhuma query extra ao banco
  // -------------------------------------------------------------------------

  function calcularTotaisMes(mesDate) {
    const mes = mesDate.getMonth()
    const ano = mesDate.getFullYear()

    const doMes = lancamentos.filter(l => {
      const d = new Date(l.data + 'T00:00:00')
      return d.getMonth() === mes && d.getFullYear() === ano
    })

    const entradas = doMes
      .filter(l => l.tipo === 'entrada')
      .reduce((s, l) => s + Number(l.valor), 0)

    const saidas = doMes
      .filter(l => l.tipo === 'saida')
      .reduce((s, l) => s + Number(l.valor), 0)

    return { entradas, saidas, saldo: entradas - saidas }
  }

  // -------------------------------------------------------------------------
  // prepararDadosPizza
  // Agrupa saídas do mês por categoria para gráfico de pizza (Recharts)
  // -------------------------------------------------------------------------

  function prepararDadosPizza(mesDate) {
    const mes = mesDate.getMonth()
    const ano = mesDate.getFullYear()

    const saidas = lancamentos.filter(l => {
      const d = new Date(l.data + 'T00:00:00')
      return l.tipo === 'saida' && d.getMonth() === mes && d.getFullYear() === ano
    })

    const grupos = {}
    saidas.forEach(l => {
      grupos[l.categoria] = (grupos[l.categoria] ?? 0) + Number(l.valor)
    })

    return Object.entries(grupos).map(([categoria, valor]) => ({
      categoria,
      valor,
      fill: CORES_CATEGORIA[categoria] ?? '#8A8A8A',
    }))
  }

  // -------------------------------------------------------------------------
  // prepararDadosBarras
  // Últimos 6 meses para gráfico de barras (Recharts) — usa dados do state
  // Para funcionar com 6 meses completos, chamar fetchLancamentos com range
  // mais amplo antes de renderizar o gráfico
  // -------------------------------------------------------------------------

  function prepararDadosBarras() {
    return Array.from({ length: 6 }, (_, i) => {
      const ref = new Date()
      // Fixar dia 1 antes de alterar o mês para evitar overflow
      ref.setDate(1)
      ref.setMonth(ref.getMonth() - (5 - i))

      const { entradas, saidas } = calcularTotaisMes(ref)

      return {
        mes: ref.toLocaleDateString('pt-BR', { month: 'short' }),
        entradas,
        saidas,
      }
    })
  }

  // -------------------------------------------------------------------------
  // Retorno público do hook
  // -------------------------------------------------------------------------

  return {
    lancamentos,
    loading,
    error,
    fetchLancamentos,
    criarLancamento,
    deletarLancamento,
    calcularTotaisMes,
    prepararDadosPizza,
    prepararDadosBarras,
  }
}
