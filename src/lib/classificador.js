// Classificação automática por período — nunca manual
// 'realizado' → meses anteriores ou confirmado pelo usuário
// 'pendente'  → mês atual (aguardando confirmação)
// 'previsto'  → meses futuros

export function classificarSituacao(dataLancamento) {
  const hoje = new Date()
  const mesAtual = { mes: hoje.getMonth(), ano: hoje.getFullYear() }
  const data = new Date(dataLancamento + 'T00:00:00')
  const mesLancamento = { mes: data.getMonth(), ano: data.getFullYear() }

  if (
    mesLancamento.ano < mesAtual.ano ||
    (mesLancamento.ano === mesAtual.ano && mesLancamento.mes < mesAtual.mes)
  ) return 'realizado'

  if (
    mesLancamento.ano > mesAtual.ano ||
    (mesLancamento.ano === mesAtual.ano && mesLancamento.mes > mesAtual.mes)
  ) return 'previsto'

  return 'pendente'
}

// Não recalcula 'realizado' — significa que o usuário confirmou manualmente
export function recalcularSituacoes(lancamentos) {
  return lancamentos.map(l => ({
    ...l,
    situacao: l.situacao === 'realizado' ? 'realizado' : classificarSituacao(l.data),
  }))
}
