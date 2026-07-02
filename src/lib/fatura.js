// ---------------------------------------------------------------------------
// Funções puras de lógica de fatura de cartão de crédito.
// Seguem o mesmo padrão de classificador.js: sem efeitos colaterais, sem
// chamadas ao Supabase — apenas transformações de dados.
//
// Convenção de mês: SEMPRE 0-indexed internamente (como JS Date.getMonth()),
// idêntico ao restante do codebase. A conversão para 1-indexed (banco) é feita
// EXCLUSIVAMENTE no hook useCartoes.js no ponto de fronteira com o Supabase.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// calcularCompetencia
// Determina a qual competência (mês de fatura) pertence uma compra.
//
// Regra: se o dia da compra for MAIOR que diaFechamento, a compra "passa" para
// a fatura do mês seguinte. Caso contrário fica na competência do mês corrente.
//
// Exemplos (fechamento dia 5):
//   compra em 2026-07-03 (dia 3 ≤ 5) → competência julho/2026
//   compra em 2026-07-10 (dia 10 > 5) → competência agosto/2026
//
// @param {string} dataCompraStr  - data no formato 'YYYY-MM-DD'
// @param {number} diaFechamento  - dia do mês em que a fatura fecha (1–31)
// @returns {{ ano: number, mes: number }}  mes é 0-indexed
// ---------------------------------------------------------------------------

export function calcularCompetencia(dataCompraStr, diaFechamento) {
  const data = new Date(dataCompraStr + 'T00:00:00')
  const dia  = data.getDate()

  if (dia > diaFechamento) {
    // A compra cai na competência do mês seguinte
    const proximo = new Date(data.getFullYear(), data.getMonth() + 1, 1)
    return { ano: proximo.getFullYear(), mes: proximo.getMonth() }
  }

  return { ano: data.getFullYear(), mes: data.getMonth() }
}

// ---------------------------------------------------------------------------
// calcularVencimento
// Determina a data de vencimento de uma fatura dado a competência e os dias
// de fechamento/vencimento do cartão.
//
// Regra:
//   diaVencimento > diaFechamento → vence no MESMO mês da competência
//     (ex.: fecha dia 5, vence dia 12 → fatura de julho vence em 12/julho)
//   diaVencimento ≤ diaFechamento → vence no mês SEGUINTE à competência
//     (ex.: fecha dia 28, vence dia 5 → fatura de julho vence em 5/agosto)
//
// Aplica clamp: se diaVencimento não existe no mês de destino (ex.: dia 31 em
// fevereiro), usa o último dia disponível — mesmo padrão de criarLancamento
// em useLancamentos.js.
//
// @param {{ ano: number, mes: number }} competencia  mes 0-indexed
// @param {number} diaVencimento
// @param {number} diaFechamento
// @returns {Date}
// ---------------------------------------------------------------------------

export function calcularVencimento({ ano, mes }, diaVencimento, diaFechamento) {
  let anoVenc, mesVenc

  if (diaVencimento > diaFechamento) {
    // Vence no mesmo mês da competência
    anoVenc = ano
    mesVenc = mes
  } else {
    // Vence no mês seguinte à competência
    const proximo = new Date(ano, mes + 1, 1)
    anoVenc = proximo.getFullYear()
    mesVenc = proximo.getMonth()
  }

  // Clamp: evita data inválida (ex.: 31 de fevereiro)
  const ultimoDiaMes = new Date(anoVenc, mesVenc + 1, 0).getDate()
  const dia          = Math.min(diaVencimento, ultimoDiaMes)

  return new Date(anoVenc, mesVenc, dia)
}

// ---------------------------------------------------------------------------
// calcularDataFechamento
// Retorna o Date do dia de fechamento dentro da competência informada.
// Aplica o mesmo clamp de diaVencimento para cobrir meses curtos.
//
// @param {{ ano: number, mes: number }} competencia  mes 0-indexed
// @param {number} diaFechamento
// @returns {Date}
// ---------------------------------------------------------------------------

export function calcularDataFechamento({ ano, mes }, diaFechamento) {
  const ultimoDiaMes = new Date(ano, mes + 1, 0).getDate()
  const dia          = Math.min(diaFechamento, ultimoDiaMes)
  return new Date(ano, mes, dia)
}

// ---------------------------------------------------------------------------
// agruparPorFatura
// Recebe lançamentos já filtrados por cartao_id e o objeto cartão (com
// dia_fechamento e dia_vencimento). Para cada lançamento calcula a competência
// via calcularCompetencia, agrupa por (ano, mes) e retorna o array de faturas
// ordenado do mais antigo para o mais recente.
//
// NÃO cruza com fatura_pagamentos — esse enriquecimento (paga/dataPagamento)
// é responsabilidade de useCartoes.calcularFaturas que tem acesso ao Supabase.
//
// @param {Array}  lancamentos  lançamentos do cartão (qualquer período)
// @param {Object} cartao       { dia_fechamento, dia_vencimento, ...resto }
// @returns {Array<{
//   ano: number,
//   mes: number,
//   dataFechamento: Date,
//   dataVencimento: Date,
//   total: number,
//   lancamentos: Array,
// }>}  ordenado do mais antigo pro mais recente
// ---------------------------------------------------------------------------

export function agruparPorFatura(lancamentos, cartao) {
  const { dia_fechamento, dia_vencimento } = cartao
  const grupos = {}

  for (const l of lancamentos) {
    const comp  = calcularCompetencia(l.data, dia_fechamento)
    const chave = `${comp.ano}-${comp.mes}`

    if (!grupos[chave]) {
      grupos[chave] = {
        ano:            comp.ano,
        mes:            comp.mes,
        dataFechamento: calcularDataFechamento(comp, dia_fechamento),
        dataVencimento: calcularVencimento(comp, dia_vencimento, dia_fechamento),
        total:          0,
        lancamentos:    [],
      }
    }

    grupos[chave].total += Number(l.valor)
    grupos[chave].lancamentos.push(l)
  }

  // Ordena do mais antigo pro mais recente (a UI de faturas lista em sequência
  // histórica: faturas passadas → atual → futuras)
  return Object.values(grupos).sort((a, b) => {
    if (a.ano !== b.ano) return a.ano - b.ano
    return a.mes - b.mes
  })
}
