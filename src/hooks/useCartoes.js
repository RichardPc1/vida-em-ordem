import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { agruparPorFatura } from '../lib/fatura'

// ---------------------------------------------------------------------------
// useCartoes
//
// Gerencia cartões de crédito, cálculo de faturas e controle de limite.
//
// REGRA DE OURO: o lançamento individual é o gasto real; a fatura é derivada
// (agrupamento por competência); pagar a fatura é apenas uma baixa que libera
// limite — nunca um novo lançamento de saída.
//
// Convenção de mês em JS: 0-indexed (getMonth()).
// Convenção no banco (fatura_pagamentos.competencia_mes): 1-indexed (CHECK 1–12).
// A conversão +1/-1 acontece EXCLUSIVAMENTE nos pontos de fronteira com o
// Supabase dentro deste hook (pagarFatura / calcularFaturas).
// ---------------------------------------------------------------------------

export function useCartoes() {
  const { user } = useAuth()

  const [cartoes, setCartoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  // -------------------------------------------------------------------------
  // fetchCartoes
  // RLS filtra no banco — membro vê apenas seus cartões, admin vê todos.
  // profiles(nome) permite exibir o dono do cartão quando admin está listando.
  // useCallback garante referência estável para as mutações chamarem após
  // o refetch sem capturar closure obsoleta.
  // -------------------------------------------------------------------------

  const fetchCartoes = useCallback(async function fetchCartoes() {
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('cartoes')
        .select('*, profiles(nome)')
        .order('created_at', { ascending: true })
      if (err) throw err
      setCartoes(data ?? [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user) return
    fetchCartoes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // -------------------------------------------------------------------------
  // criarCartao
  // pessoa_id deve vir nos dados (a UI passa user.id para o próprio ou
  // qualquer id quando admin cadastra cartão da esposa).
  // ativo=true por padrão — o campo é obrigatório no schema mas tem default.
  // -------------------------------------------------------------------------

  async function criarCartao(dados) {
    const payload = {
      nome:           dados.nome.trim(),
      banco:          dados.banco?.trim() || null,
      limite_total:   Number(dados.limite_total),
      dia_fechamento: Number(dados.dia_fechamento),
      dia_vencimento: Number(dados.dia_vencimento),
      pessoa_id:      dados.pessoa_id ?? user.id,
      ativo:          dados.ativo ?? true,
    }
    const { error: err } = await supabase.from('cartoes').insert(payload)
    if (err) throw err
    await fetchCartoes()
  }

  // -------------------------------------------------------------------------
  // atualizarCartao
  // Carimba updated_at para manter histórico consistente (trigger no banco
  // faz o mesmo, mas explicitamos aqui por simetria com useMetas).
  // Soft-delete recomendado: atualizarCartao(id, { ativo: false }).
  // -------------------------------------------------------------------------

  async function atualizarCartao(id, dados) {
    const { error: err } = await supabase
      .from('cartoes')
      .update({ ...dados, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (err) throw err
    await fetchCartoes()
  }

  // -------------------------------------------------------------------------
  // deletarCartao
  // Delete físico — ON DELETE CASCADE remove fatura_pagamentos do cartão.
  // ON DELETE SET NULL preserva lançamentos vinculados (cartao_id vira null).
  // Preferir atualizarCartao(id, { ativo: false }) para preservar histórico.
  // -------------------------------------------------------------------------

  async function deletarCartao(id) {
    const { error: err } = await supabase.from('cartoes').delete().eq('id', id)
    if (err) throw err
    await fetchCartoes()
  }

  // -------------------------------------------------------------------------
  // fetchLancamentosDoCartao
  // Busca TODO o histórico de lançamentos do cartão (sem filtro de mês) para
  // que calcularFaturas possa agrupar faturas passadas, atual e futuras.
  // Retorna a lista diretamente — não armazena em estado próprio (evita
  // conflito com o estado de lancamentos de useLancamentos).
  // -------------------------------------------------------------------------

  async function fetchLancamentosDoCartao(cartaoId) {
    const { data, error: err } = await supabase
      .from('lancamentos')
      .select('*, profiles(nome)')
      .eq('cartao_id', cartaoId)
      .order('data',       { ascending: true })
      .order('created_at', { ascending: true })
    if (err) throw err
    return data ?? []
  }

  // -------------------------------------------------------------------------
  // calcularFaturas
  // Agrupa os lançamentos do cartão por competência (via agruparPorFatura),
  // depois cruza com fatura_pagamentos para marcar cada fatura como paga/aberta.
  //
  // Retorna array de faturas (mais antigo → mais recente) enriquecido com:
  //   paga:          boolean
  //   dataPagamento: string | null  (YYYY-MM-DD, conforme retorna o banco)
  //   valorPago:     number | null
  //
  // Conversão de mês: fatura_pagamentos.competencia_mes é 1-indexed no banco.
  // Chave interna do lookup: `${ano}-${mes0indexed}` para evitar off-by-one.
  // -------------------------------------------------------------------------

  async function calcularFaturas(cartaoId) {
    const cartao = cartoes.find(c => c.id === cartaoId)
    if (!cartao) throw new Error('Cartão não encontrado no estado local — chame fetchCartoes primeiro.')

    // Busca paralela: lançamentos do cartão + pagamentos de fatura
    const [lancamentos, pagResult] = await Promise.all([
      fetchLancamentosDoCartao(cartaoId),
      supabase
        .from('fatura_pagamentos')
        .select('*')
        .eq('cartao_id', cartaoId),
    ])

    if (pagResult.error) throw pagResult.error

    const faturas    = agruparPorFatura(lancamentos, cartao)
    const pagamentos = pagResult.data ?? []

    // Monta mapa de pagamentos com chave em mês 0-indexed (subtrair 1 do banco)
    const pagMap = {}
    for (const p of pagamentos) {
      const chave   = `${p.competencia_ano}-${p.competencia_mes - 1}`
      pagMap[chave] = p
    }

    return faturas.map(f => {
      const chave    = `${f.ano}-${f.mes}`
      const pagamento = pagMap[chave]
      return {
        ...f,
        paga:          !!pagamento,
        dataPagamento: pagamento?.data_pagamento ?? null,
        valorPago:     pagamento ? Number(pagamento.valor_pago) : null,
      }
    })
  }

  // -------------------------------------------------------------------------
  // calcularLimite
  // Soma os totais das faturas AINDA NÃO PAGAS — essa é a parcela do limite
  // que está comprometida. Faturas pagas liberam o limite (regra de ouro:
  // pagar a fatura é uma baixa de controle, não um gasto novo).
  //
  // Retorna { total, usado, disponivel } todos em Number.
  // -------------------------------------------------------------------------

  async function calcularLimite(cartaoId) {
    const cartao = cartoes.find(c => c.id === cartaoId)
    if (!cartao) throw new Error('Cartão não encontrado no estado local — chame fetchCartoes primeiro.')

    const faturas = await calcularFaturas(cartaoId)
    const usado   = faturas
      .filter(f => !f.paga)
      .reduce((sum, f) => sum + f.total, 0)

    return {
      total:      Number(cartao.limite_total),
      usado,
      disponivel: Number(cartao.limite_total) - usado,
    }
  }

  // -------------------------------------------------------------------------
  // pagarFatura
  // Registra o pagamento de uma competência via upsert — o UNIQUE constraint
  // (cartao_id, competencia_ano, competencia_mes) garante idempotência.
  // Permite corrigir valor/data de um pagamento já registrado.
  //
  // NUNCA toca na tabela lancamentos — a regra de ouro é inviolável.
  //
  // @param {string} cartaoId
  // @param {{ ano: number, mes: number, valor: number, data: string }} params
  //   mes é 0-indexed; a conversão para 1-indexed ocorre aqui antes do insert.
  // -------------------------------------------------------------------------

  async function pagarFatura(cartaoId, { ano, mes, valor, data }) {
    const { error: err } = await supabase
      .from('fatura_pagamentos')
      .upsert(
        {
          cartao_id:       cartaoId,
          competencia_ano: ano,
          competencia_mes: mes + 1,   // 0-indexed → 1-indexed para o banco
          valor_pago:      Number(valor),
          data_pagamento:  data,
          pago_por:        user.id,
        },
        { onConflict: 'cartao_id,competencia_ano,competencia_mes' },
      )
    if (err) throw err
  }

  // -------------------------------------------------------------------------
  // despesasPorCartao
  // Agrega lançamentos de saída por cartao_id. Lançamentos sem cartão ficam
  // agrupados com cartaoId=null, identificados como 'Sem cartão'.
  //
  // Recebe a lista de lançamentos como parâmetro (não usa estado interno)
  // para ser reutilizável com qualquer subconjunto — ex.: useLancamentos do
  // mês corrente, ou fetchLancamentosDoCartao de um período específico.
  //
  // @param {Array} lancamentos
  // @returns {Array<{ cartaoId, nomeCartao, total, lancamentos }>} desc por total
  // -------------------------------------------------------------------------

  function despesasPorCartao(lancamentos) {
    const grupos = {}

    for (const l of lancamentos) {
      if (l.tipo !== 'saida') continue
      const cid   = l.cartao_id ?? null
      const chave = cid ?? '__sem_cartao__'

      if (!grupos[chave]) {
        // Tenta encontrar o nome do cartão no estado local
        const cartao = cid ? cartoes.find(c => c.id === cid) : null
        grupos[chave] = {
          cartaoId:   cid,
          nomeCartao: cartao ? `${cartao.nome}${cartao.banco ? ` (${cartao.banco})` : ''}` : 'Sem cartão',
          total:      0,
          lancamentos: [],
        }
      }

      grupos[chave].total += Number(l.valor)
      grupos[chave].lancamentos.push(l)
    }

    return Object.values(grupos).sort((a, b) => b.total - a.total)
  }

  // -------------------------------------------------------------------------
  // despesasPorCategoria
  // Agrega lançamentos de saída por categoria.
  //
  // @param {Array} lancamentos
  // @returns {Array<{ categoria, total, lancamentos }>} desc por total
  // -------------------------------------------------------------------------

  function despesasPorCategoria(lancamentos) {
    const grupos = {}

    for (const l of lancamentos) {
      if (l.tipo !== 'saida') continue
      const cat = l.categoria ?? 'outros'

      if (!grupos[cat]) {
        grupos[cat] = { categoria: cat, total: 0, lancamentos: [] }
      }

      grupos[cat].total += Number(l.valor)
      grupos[cat].lancamentos.push(l)
    }

    return Object.values(grupos).sort((a, b) => b.total - a.total)
  }

  // -------------------------------------------------------------------------
  // despesasPorPessoa
  // Agrega lançamentos de saída por pessoa_id. Usa profiles.nome do join
  // select('*, profiles(nome)') já presente em fetchLancamentosDoCartao e
  // em useLancamentos.fetchLancamentos.
  //
  // @param {Array} lancamentos
  // @returns {Array<{ pessoaId, nome, total, lancamentos }>} desc por total
  // -------------------------------------------------------------------------

  function despesasPorPessoa(lancamentos) {
    const grupos = {}

    for (const l of lancamentos) {
      if (l.tipo !== 'saida') continue
      const pid = l.pessoa_id

      if (!grupos[pid]) {
        grupos[pid] = {
          pessoaId:    pid,
          nome:        l.profiles?.nome ?? 'Usuário',
          total:       0,
          lancamentos: [],
        }
      }

      grupos[pid].total += Number(l.valor)
      grupos[pid].lancamentos.push(l)
    }

    return Object.values(grupos).sort((a, b) => b.total - a.total)
  }

  // -------------------------------------------------------------------------
  // Retorno público
  // -------------------------------------------------------------------------

  return {
    cartoes,
    loading,
    error,
    fetchCartoes,
    criarCartao,
    atualizarCartao,
    deletarCartao,
    fetchLancamentosDoCartao,
    calcularFaturas,
    calcularLimite,
    pagarFatura,
    despesasPorCartao,
    despesasPorCategoria,
    despesasPorPessoa,
  }
}
