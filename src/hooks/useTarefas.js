import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function useTarefas(filtros = {}) {
  const { user } = useAuth()
  const [tarefas, setTarefas]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [error,   setError]     = useState(null)

  useEffect(() => {
    if (!user) return
    fetchTarefas()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, JSON.stringify(filtros)])

  async function fetchTarefas() {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('tarefas')
        .select('*, profiles(id, nome)')
        .order('data_vencimento', { ascending: true, nullsFirst: false })
        .order('created_at',      { ascending: false })

      if (filtros.status)     query = query.eq('status',     filtros.status)
      if (filtros.categoria)  query = query.eq('categoria',  filtros.categoria)
      if (filtros.prioridade) query = query.eq('prioridade', filtros.prioridade)
      if (filtros.pessoa_id)  query = query.eq('pessoa_id',  filtros.pessoa_id)

      const { data, error: err } = await query
      if (err) throw err
      setTarefas(data ?? [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function criarTarefa(dados) {
    const payload = { ...dados, pessoa_id: dados.pessoa_id || user.id }
    const { error: err } = await supabase.from('tarefas').insert(payload)
    if (err) throw err
    await fetchTarefas()
  }

  async function atualizarTarefa(id, dados) {
    const { error: err } = await supabase
      .from('tarefas')
      .update({ ...dados, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (err) throw err
    await fetchTarefas()
  }

  async function deletarTarefa(id) {
    const { error: err } = await supabase.from('tarefas').delete().eq('id', id)
    if (err) throw err
    await fetchTarefas()
  }

  async function concluirTarefa(id) {
    return atualizarTarefa(id, { status: 'concluida' })
  }

  return {
    tarefas, loading, error,
    fetchTarefas, criarTarefa, atualizarTarefa, deletarTarefa, concluirTarefa,
  }
}
