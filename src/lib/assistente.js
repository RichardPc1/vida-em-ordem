import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
})

const SYSTEM_PROMPT = `Você é o assistente pessoal do app VidaEmOrdem.
Responda sempre em português brasileiro de forma curta e direta.
Quando o usuário pedir para criar, editar ou deletar algo,
retorne APENAS um JSON no formato:
{
  "acao": "criar_tarefa" | "criar_lancamento" | "criar_meta" | "consulta",
  "dados": { ...campos necessários },
  "mensagem": "confirmação curta para o usuário"
}
Para consultas retorne:
{
  "acao": "consulta",
  "mensagem": "resposta direta para o usuário"
}`

export async function processarComando(mensagem, contexto) {
  const ctxStr = `
Contexto atual:
- Usuário: ${contexto.nomeUsuario}
- Data: ${contexto.dataAtual}
- Entradas do mês: ${contexto.entradas}
- Saídas do mês: ${contexto.saidas}
- Tarefas pendentes: ${contexto.tarefasPendentes}
- Últimas tarefas: ${JSON.stringify(contexto.ultimasTarefas)}
- Últimos lançamentos: ${JSON.stringify(contexto.ultimosLancamentos)}

Mensagem do usuário: ${mensagem}`

  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: ctxStr },
    ],
    temperature: 0.3,
    max_tokens:  500,
  })

  const text = res.choices[0].message.content.trim()

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[0]) } catch { /* segue */ }
  }

  return { acao: 'consulta', mensagem: text }
}
