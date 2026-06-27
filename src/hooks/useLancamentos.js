import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { classificarSituacao, recalcularSituacoes } from '../lib/classificador'

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // -------------------------------------------------------------------------
  // fetchLancamentos
  // -------------------------------------------------------------------------

  async function fetchLancamentos(filtros = {}) {
    try {
      setLoading(true)
      setError(null)

      filtrosAtivosRef.current = filtros

      const mesRef = filtros.mes instanceof Date ? filtros.mes : new Date()
      const ano    = mesRef.getFullYear()
      const mes    = mesRef.getMonth()

      const primeiroDia = dataLocalStr(new Date(ano, mes, 1))
      const ultimoDia   = dataLocalStr(new Date(ano, mes + 1, 0))

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

      const raw          = data ?? []
      const recalculados = recalcularSituacoes(raw)

      // Sincronizar no banco os que passaram de 'previsto' para 'pendente'
      // (o mês chegou mas o usuário ainda não confirmou)
      const mudaram = recalculados
        .filter((l, i) => raw[i].situacao === 'previsto' && l.situacao === 'pendente')
        .map(l => l.id)

      if (mudaram.length > 0) {
        await supabase
          .from('lancamentos')
          .update({ situacao: 'pendente' })
          .in('id', mudaram)
      }

      setLancamentos(recalculados)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // -------------------------------------------------------------------------
  // confirmarLancamento — confirma um único lançamento (permanece no mês original)
  // -------------------------------------------------------------------------

  async function confirmarLancamento(id) {
    const { error: err } = await supabase
      .from('lancamentos')
      .update({ situacao: 'realizado', confirmado_em: new Date().toISOString() })
      .eq('id', id)

    if (err) throw err
    await fetchLancamentos(filtrosAtivosRef.current)
  }

  // -------------------------------------------------------------------------
  // confirmarVarios — confirma array de ids em batch
  // -------------------------------------------------------------------------

  async function confirmarVarios(ids) {
    if (!ids?.length) return
    const { error: err } = await supabase
      .from('lancamentos')
      .update({ situacao: 'realizado', confirmado_em: new Date().toISOString() })
      .in('id', ids)

    if (err) throw err
    await fetchLancamentos(filtrosAtivosRef.current)
  }

  // -------------------------------------------------------------------------
  // confirmarPorTipo — confirma todos pendentes/previstos do tipo no mês
  // -------------------------------------------------------------------------

  async function confirmarPorTipo(tipo, mesDate) {
    const ano         = mesDate.getFullYear()
    const mes         = mesDate.getMonth()
    const primeiroDia = dataLocalStr(new Date(ano, mes, 1))
    const ultimoDia   = dataLocalStr(new Date(ano, mes + 1, 0))

    const { error: err } = await supabase
      .from('lancamentos')
      .update({ situacao: 'realizado', confirmado_em: new Date().toISOString() })
      .eq('tipo', tipo)
      .in('situacao', ['pendente', 'previsto'])
      .gte('data', primeiroDia)
      .lte('data', ultimoDia)

    if (err) throw err
    await fetchLancamentos(filtrosAtivosRef.current)
  }

  // -------------------------------------------------------------------------
  // criarLancamento — situacao calculada automaticamente
  // -------------------------------------------------------------------------

  async function criarLancamento(dados) {
    const baseDate = new Date(dados.data + 'T00:00:00')

    if (!dados.eh_parcelado) {
      const payload = {
        tipo:             dados.tipo,
        valor:            Number(dados.valor),
        categoria:        dados.categoria,
        descricao:        dados.descricao,
        data:             dados.data,
        situacao:         classificarSituacao(dados.data),
        pessoa_id:        dados.pessoa_id ?? user.id,
        eh_parcelado:     false,
        id_grupo_parcela: null,
        parcela_atual:    null,
        total_parcelas:   null,
      }

      const { error: err } = await supabase.from('lancamentos').insert(payload)
      if (err) throw err
    } else {
      const grupoId       = crypto.randomUUID()
      const totalParcelas = Number(dados.total_parcelas)

      const parcelas = Array.from({ length: totalParcelas }, (_, i) => {
        const d = new Date(baseDate)

        d.setDate(1)
        d.setMonth(d.getMonth() + i)

        const diaOriginal  = baseDate.getDate()
        const ultimoDiaMes = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
        d.setDate(Math.min(diaOriginal, ultimoDiaMes))

        const dataStr = dataLocalStr(d)

        return {
          tipo:             dados.tipo,
          valor:            Number(dados.valor),
          categoria:        dados.categoria,
          descricao:        dados.descricao,
          data:             dataStr,
          situacao:         classificarSituacao(dataStr),
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

    await fetchLancamentos({ mes: baseDate })
  }

  // -------------------------------------------------------------------------
  // deletarLancamento
  // -------------------------------------------------------------------------

  async function deletarLancamento(id, apenasEsta = true) {
    if (!apenasEsta) {
      const { data: registro, error: fetchErr } = await supabase
        .from('lancamentos')
        .select('id_grupo_parcela, eh_parcelado')
        .eq('id', id)
        .single()

      if (fetchErr) throw fetchErr

      if (registro?.eh_parcelado && registro?.id_grupo_parcela) {
        const { error: err } = await supabase
          .from('lancamentos')
          .delete()
          .eq('id_grupo_parcela', registro.id_grupo_parcela)
        if (err) throw err
      } else {
        const { error: err } = await supabase.from('lancamentos').delete().eq('id', id)
        if (err) throw err
      }
    } else {
      const { error: err } = await supabase.from('lancamentos').delete().eq('id', id)
      if (err) throw err
    }

    await fetchLancamentos(filtrosAtivosRef.current)
  }

  // -------------------------------------------------------------------------
  // calcularTotaisMes — retorna { realizado, previsto, total }
  // -------------------------------------------------------------------------

  function calcularTotaisMes(mesDate) {
    const mes = mesDate.getMonth()
    const ano = mesDate.getFullYear()

    const doMes = lancamentos.filter(l => {
      const d = new Date(l.data + 'T00:00:00')
      return d.getMonth() === mes && d.getFullYear() === ano
    })

    const soma = (lista, tipo) =>
      lista.filter(l => l.tipo === tipo).reduce((s, l) => s + Number(l.valor), 0)

    const realizados    = doMes.filter(l => l.situacao === 'realizado')
    const naoRealizados = doMes.filter(l => l.situacao !== 'realizado')

    const reEnt = soma(realizados, 'entrada')
    const reSai = soma(realizados, 'saida')
    const pvEnt = soma(naoRealizados, 'entrada')
    const pvSai = soma(naoRealizados, 'saida')

    return {
      realizado: { entradas: reEnt, saidas: reSai, saldo: reEnt - reSai },
      previsto:  { entradas: pvEnt, saidas: pvSai, saldo: pvEnt - pvSai },
      total:     {
        entradas: reEnt + pvEnt,
        saidas:   reSai + pvSai,
        saldo:    (reEnt + pvEnt) - (reSai + pvSai),
      },
    }
  }

  // -------------------------------------------------------------------------
  // prepararDadosPizza — usa apenas realizados (histórico real)
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
  // prepararDadosBarras — usa total (realizado + previsto) para os 6 meses
  // -------------------------------------------------------------------------

  function prepararDadosBarras() {
    return Array.from({ length: 6 }, (_, i) => {
      const ref = new Date()
      ref.setDate(1)
      ref.setMonth(ref.getMonth() - (5 - i))

      const { total: { entradas, saidas } } = calcularTotaisMes(ref)

      return {
        mes: ref.toLocaleDateString('pt-BR', { month: 'short' }),
        entradas,
        saidas,
      }
    })
  }

  // -------------------------------------------------------------------------
  // Retorno público
  // -------------------------------------------------------------------------

  return {
    lancamentos,
    loading,
    error,
    fetchLancamentos,
    criarLancamento,
    deletarLancamento,
    confirmarLancamento,
    confirmarVarios,
    confirmarPorTipo,
    calcularTotaisMes,
    prepararDadosPizza,
    prepararDadosBarras,
  }
}
