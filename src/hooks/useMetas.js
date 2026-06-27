import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ---------------------------------------------------------------------------
// Hook principal
// ---------------------------------------------------------------------------

export function useMetas() {
  const { user } = useAuth()

  const [metas,   setMetas]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  // -------------------------------------------------------------------------
  // fetchMetas
  // RLS filtra no banco — retorna apenas metas visíveis ao usuário logado.
  // useCallback garante referência estável para que depositarNaMeta e
  // atualizarMeta possam chamar fetchMetas sem capturar uma closure obsoleta.
  // -------------------------------------------------------------------------

  const fetchMetas = useCallback(async function fetchMetas() {
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('metas')
        .select('*, profiles(nome)')
        .order('created_at', { ascending: false })
      if (err) throw err
      setMetas(data ?? [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user) return
    fetchMetas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // -------------------------------------------------------------------------
  // criarMeta
  // pessoa_id = null → meta compartilhada do casal (sem vínculo a um perfil).
  // pessoa_id = uuid → meta individual, RLS aplica visibilidade normal.
  // -------------------------------------------------------------------------

  async function criarMeta(dados) {
    const payload = {
      titulo:      dados.titulo.trim(),
      descricao:   dados.descricao?.trim() || null,
      valor_alvo:  Number(dados.valor_alvo),
      valor_atual: Number(dados.valor_atual ?? 0),
      prazo:       dados.prazo || null,
      pessoa_id:   dados.pessoa_id ?? null,
      status:      'ativa',
    }
    const { error: err } = await supabase.from('metas').insert(payload)
    if (err) throw err
    await fetchMetas()
  }

  // -------------------------------------------------------------------------
  // atualizarMeta
  // Sempre carimba updated_at para manter histórico de alterações consistente.
  // -------------------------------------------------------------------------

  async function atualizarMeta(id, dados) {
    const { error: err } = await supabase
      .from('metas')
      .update({ ...dados, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (err) throw err
    await fetchMetas()
  }

  // -------------------------------------------------------------------------
  // depositarNaMeta
  // Incrementa valor_atual a partir do estado local para evitar race condition.
  // Promove status para 'concluida' automaticamente quando meta é batida.
  // -------------------------------------------------------------------------

  async function depositarNaMeta(id, valor) {
    const meta = metas.find(m => m.id === id)
    if (!meta) throw new Error('Meta não encontrada')

    const novoValor  = Number(meta.valor_atual) + Number(valor)
    const novoStatus = novoValor >= Number(meta.valor_alvo) ? 'concluida' : 'ativa'

    await atualizarMeta(id, { valor_atual: novoValor, status: novoStatus })
  }

  // -------------------------------------------------------------------------
  // concluirMeta / cancelarMeta
  // Transições explícitas de status — não afetam valor_atual.
  // -------------------------------------------------------------------------

  async function concluirMeta(id) {
    return atualizarMeta(id, { status: 'concluida' })
  }

  async function cancelarMeta(id) {
    return atualizarMeta(id, { status: 'cancelada' })
  }

  // -------------------------------------------------------------------------
  // calcularProgresso
  // Retorna percentual de 0 a 100. Nunca ultrapassa 100 (meta já batida).
  // -------------------------------------------------------------------------

  function calcularProgresso(valorAtual, valorAlvo) {
    if (!valorAlvo || valorAlvo <= 0) return 0
    return Math.min(100, (Number(valorAtual) / Number(valorAlvo)) * 100)
  }

  // -------------------------------------------------------------------------
  // calcularCountdown
  // Usa data local (T00:00:00) para evitar deslocamento de fuso horário UTC.
  // Retorna { dias, texto, urgente, vencido } — interface consistente mesmo
  // quando prazo é null (Sem prazo), vencido ou urgente (≤ 7 dias).
  // -------------------------------------------------------------------------

  function calcularCountdown(prazo) {
    if (!prazo) {
      return { dias: null, texto: 'Sem prazo', urgente: false, vencido: false }
    }

    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    const dataPrazo = new Date(prazo + 'T00:00:00')
    const diffMs    = dataPrazo.getTime() - hoje.getTime()
    const dias      = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

    if (dias < 0) {
      const abs = Math.abs(dias)
      return {
        dias:    abs,
        texto:   `Venceu há ${abs} dia${abs !== 1 ? 's' : ''}`,
        urgente: false,
        vencido: true,
      }
    }

    if (dias === 0) {
      return { dias: 0, texto: 'Vence hoje', urgente: true, vencido: false }
    }

    return {
      dias,
      texto:   `${dias} dia${dias !== 1 ? 's' : ''} restantes`,
      urgente: dias <= 7,
      vencido: false,
    }
  }

  // -------------------------------------------------------------------------
  // Retorno público do hook
  // -------------------------------------------------------------------------

  return {
    metas,
    loading,
    error,
    fetchMetas,
    criarMeta,
    atualizarMeta,
    depositarNaMeta,
    concluirMeta,
    cancelarMeta,
    calcularProgresso,
    calcularCountdown,
  }
}
