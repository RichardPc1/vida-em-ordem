import { useState, useEffect, useRef } from 'react'
import { MessageCircle, Send, X } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { fmtCurrency } from '../../lib/utils'
import { processarComando } from '../../lib/assistente'

function dataHoje() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function Assistente() {
  const { user, profile } = useAuth()
  const [aberto, setAberto]         = useState(false)
  const [input, setInput]           = useState('')
  const [carregando, setCarregando] = useState(false)
  const [msgs, setMsgs]             = useState([
    { id: 'welcome', role: 'assistant', text: 'Olá! Como posso te ajudar?' },
  ])
  const bottomRef   = useRef(null)
  const textareaRef = useRef(null)

  // Atualiza saudação quando profile carrega
  useEffect(() => {
    if (!profile?.nome) return
    const base  = profile.nome.includes('@') ? profile.nome.split('@')[0] : profile.nome.split(' ')[0]
    const nome  = base.charAt(0).toUpperCase() + base.slice(1)
    setMsgs(m =>
      m[0]?.id === 'welcome'
        ? [{ ...m[0], text: `Olá, ${nome}! Como posso te ajudar?` }, ...m.slice(1)]
        : m
    )
  }, [profile?.nome])

  // Scroll automático para a última mensagem
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, carregando])

  // Focus no input ao abrir o painel
  useEffect(() => {
    if (aberto) setTimeout(() => textareaRef.current?.focus(), 320)
  }, [aberto])

  async function buildContexto() {
    const hoje  = new Date()
    const inicio = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`
    const fim    = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
    const fimStr = `${fim.getFullYear()}-${String(fim.getMonth() + 1).padStart(2, '0')}-${String(fim.getDate()).padStart(2, '0')}`

    const [tarefasRes, lancRes] = await Promise.all([
      supabase
        .from('tarefas')
        .select('titulo, status, data_vencimento')
        .eq('status', 'pendente')
        .order('data_vencimento', { ascending: true, nullsFirst: false })
        .limit(5),
      supabase
        .from('lancamentos')
        .select('descricao, valor, tipo, data')
        .gte('data', inicio)
        .lte('data', fimStr)
        .order('data', { ascending: false })
        .limit(20),
    ])

    const todosLanc = lancRes.data ?? []
    const entradas  = todosLanc.filter(l => l.tipo === 'entrada').reduce((s, l) => s + Number(l.valor), 0)
    const saidas    = todosLanc.filter(l => l.tipo === 'saida').reduce((s, l) => s + Number(l.valor), 0)

    return {
      nomeUsuario:        profile?.nome?.split(' ')[0] ?? 'Usuário',
      dataAtual:          new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
      entradas:           fmtCurrency(entradas),
      saidas:             fmtCurrency(saidas),
      tarefasPendentes:   tarefasRes.data?.length ?? 0,
      ultimasTarefas:     tarefasRes.data ?? [],
      ultimosLancamentos: todosLanc.slice(0, 5),
    }
  }

  async function executarAcao(resultado) {
    const { acao, dados } = resultado
    if (!dados || acao === 'consulta') return

    if (acao === 'criar_tarefa') {
      const { error } = await supabase.from('tarefas').insert({
        titulo:          dados.titulo ?? 'Nova tarefa',
        descricao:       dados.descricao ?? null,
        categoria:       dados.categoria ?? 'pessoal',
        prioridade:      dados.prioridade ?? 'media',
        data_vencimento: dados.data_vencimento ?? null,
        status:          'pendente',
        pessoa_id:       user.id,
        recorrencia:     dados.recorrencia ?? null,
      })
      if (error) throw error
    } else if (acao === 'criar_lancamento') {
      const { error } = await supabase.from('lancamentos').insert({
        tipo:         dados.tipo ?? 'saida',
        descricao:    dados.descricao ?? 'Lançamento',
        valor:        Number(dados.valor ?? 0),
        categoria:    dados.categoria ?? 'outros',
        data:         dados.data ?? dataHoje(),
        pessoa_id:    user.id,
        eh_parcelado: false,
      })
      if (error) throw error
    } else if (acao === 'criar_meta') {
      const { error } = await supabase.from('metas').insert({
        titulo:      dados.titulo ?? 'Nova meta',
        descricao:   dados.descricao ?? null,
        valor_alvo:  Number(dados.valor_alvo ?? 0),
        valor_atual: 0,
        prazo:       dados.prazo ?? null,
        pessoa_id:   dados.compartilhada ? null : user.id,
        status:      'ativa',
      })
      if (error) throw error
    }
  }

  async function handleEnviar() {
    const texto = input.trim()
    if (!texto || carregando) return

    setInput('')
    setMsgs(m => [...m, { id: Date.now(), role: 'user', text: texto }])
    setCarregando(true)

    try {
      const contexto  = await buildContexto()
      const resultado = await processarComando(texto, contexto)

      await executarAcao(resultado)

      setMsgs(m => [...m, { id: Date.now() + 1, role: 'assistant', text: resultado.mensagem }])

      if (resultado.acao !== 'consulta') {
        toast.success(resultado.mensagem, { style: { borderColor: 'var(--color-accent)' } })
      }
    } catch (err) {
      console.error('[Assistente]', err)
      setMsgs(m => [
        ...m,
        { id: Date.now() + 1, role: 'assistant', text: 'Desculpe, ocorreu um erro. Tente novamente.' },
      ])
      toast.error('Erro no assistente', { style: { borderColor: 'var(--color-danger)' } })
    } finally {
      setCarregando(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleEnviar()
    }
  }

  return (
    <>
      {/* Overlay escuro quando painel está aberto */}
      {aberto && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={() => setAberto(false)}
        />
      )}

      {/* FAB — mobile: acima do BottomNav (80px); desktop: 32px da borda */}
      <button
        onClick={() => setAberto(v => !v)}
        className="fixed bottom-20 right-4 md:bottom-8 md:right-8 z-50"
        style={{
          width:          56,
          height:         56,
          borderRadius:   '50%',
          background:     aberto ? 'var(--color-accent-2)' : 'var(--color-accent)',
          border:         'none',
          cursor:         'pointer',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          transition:     'background 0.15s',
          flexShrink:     0,
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-accent-2)')}
        onMouseLeave={e => { if (!aberto) e.currentTarget.style.background = 'var(--color-accent)' }}
        aria-label="Abrir assistente"
      >
        <MessageCircle size={24} color="#0F0F0F" strokeWidth={2} />
      </button>

      {/* Painel — bottom sheet que desliza de baixo */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 md:inset-x-auto md:right-8 md:bottom-8 md:w-96 rounded-t-3xl md:rounded-3xl"
        style={{
          background:    'var(--color-surface)',
          border:        '1px solid var(--color-border)',
          maxHeight:     '70vh',
          display:       'flex',
          flexDirection: 'column',
          transform:     aberto ? 'translateY(0)' : 'translateY(110%)',
          transition:    'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            padding:        '16px 20px',
            borderBottom:   '1px solid var(--color-border)',
            flexShrink:     0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-accent)' }} />
            <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-text-1)' }}>
              Assistente
            </span>
          </div>
          <button
            onClick={() => setAberto(false)}
            style={{
              background: 'transparent', border: 'none',
              padding: 4, borderRadius: 6, cursor: 'pointer',
              color: 'var(--color-text-2)', display: 'flex', alignItems: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Lista de mensagens */}
        <div
          style={{
            flex: 1, overflowY: 'auto',
            padding: '16px 16px 8px',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}
        >
          {msgs.map(msg => (
            <div
              key={msg.id}
              style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}
            >
              <div
                style={{
                  maxWidth:     '80%',
                  padding:      '10px 14px',
                  borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background:   msg.role === 'user' ? 'var(--color-accent)' : 'var(--color-surface-2)',
                  color:        msg.role === 'user' ? '#0F0F0F' : 'var(--color-text-1)',
                  fontSize:     14,
                  lineHeight:   1.5,
                  whiteSpace:   'pre-wrap',
                }}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {/* Três pontinhos de loading */}
          {carregando && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div
                style={{
                  padding: '12px 16px', borderRadius: '16px 16px 16px 4px',
                  background: 'var(--color-surface-2)',
                  display: 'flex', gap: 5, alignItems: 'center',
                }}
              >
                {[0, 1, 2].map(i => (
                  <div key={i} className="dot-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div
          style={{
            padding: '12px 16px 16px',
            borderTop: '1px solid var(--color-border)',
            display: 'flex', gap: 10, alignItems: 'flex-end', flexShrink: 0,
          }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ex: adiciona R$50 de almoço hoje..."
            rows={1}
            disabled={carregando}
            style={{
              flex:        1,
              background:  'var(--color-surface-2)',
              border:      '1px solid var(--color-border)',
              borderRadius: 12,
              padding:     '10px 12px',
              color:       'var(--color-text-1)',
              fontFamily:  'inherit',
              outline:     'none',
              resize:      'none',
              lineHeight:  1.4,
              maxHeight:   80,
              overflowY:   'auto',
            }}
          />
          <button
            onClick={handleEnviar}
            disabled={!input.trim() || carregando}
            style={{
              width: 40, height: 40, borderRadius: 12, border: 'none',
              background:     input.trim() && !carregando ? 'var(--color-accent)' : 'var(--color-surface-2)',
              color:          input.trim() && !carregando ? '#0F0F0F' : 'var(--color-text-3)',
              cursor:         input.trim() && !carregando ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'all 0.15s',
            }}
          >
            <Send size={17} />
          </button>
        </div>
      </div>
    </>
  )
}
