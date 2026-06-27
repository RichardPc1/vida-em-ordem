import { classificarSituacao } from './classificador'

// Opções de recorrência — exportada para uso no modal e na lógica
export const RECORRENCIA_OPCOES = [
  { value: 'diaria',    label: 'Diária'    },
  { value: 'semanal',   label: 'Semanal'   },
  { value: 'quinzenal', label: 'Quinzenal' },
  { value: 'mensal',    label: 'Mensal'    },
]

// Helpers de data local — nunca usar toISOString (bug UTC no Brasil)
function parseData(str) {
  return new Date(str + 'T00:00:00')
}

function fmtISO(date) {
  const ano = date.getFullYear()
  const mes = String(date.getMonth() + 1).padStart(2, '0')
  const dia = String(date.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

// Calcula a próxima data com base na recorrência
// Exportada para uso no preview do modal
export function calcularProximaData(dataAtual, recorrencia) {
  if (!dataAtual || !recorrencia) return null
  const d = parseData(dataAtual)
  switch (recorrencia) {
    case 'diaria':    d.setDate(d.getDate() + 1);   break
    case 'semanal':   d.setDate(d.getDate() + 7);   break
    case 'quinzenal': d.setDate(d.getDate() + 14);  break
    case 'mensal':    d.setMonth(d.getMonth() + 1); break
    default:          return null
  }
  return fmtISO(d)
}

// Gera o payload da próxima tarefa a partir da tarefa concluída
// Remove campos que não devem ser herdados
export function gerarProximaTarefa(tarefa) {
  if (!tarefa.recorrencia || !tarefa.data_vencimento) return null

  const proximaData = calcularProximaData(tarefa.data_vencimento, tarefa.recorrencia)
  if (!proximaData) return null

  // Desestrutura fora os campos que NÃO devem ser copiados
  // eslint-disable-next-line no-unused-vars
  const { id, created_at, updated_at, status, profiles, ...resto } = tarefa

  return {
    ...resto,
    data_vencimento: proximaData,
    status:          'pendente',
    tarefa_pai_id:   id,   // aponta para a tarefa original
  }
}

// Gera o payload do próximo lançamento financeiro recorrente
// A situacao é calculada automaticamente pela data futura
export function gerarProximoLancamento(lancamento) {
  if (!lancamento.recorrencia || !lancamento.data) return null

  const proximaData = calcularProximaData(lancamento.data, lancamento.recorrencia)
  if (!proximaData) return null

  // eslint-disable-next-line no-unused-vars
  const { id, created_at, updated_at, confirmado_em, situacao, profiles, ...resto } = lancamento

  return {
    ...resto,
    data:         proximaData,
    situacao:     classificarSituacao(proximaData),
    confirmado_em: null,
  }
}
