import { useState, useEffect, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth }    from '../contexts/AuthContext'
import { useTarefas } from '../hooks/useTarefas'
import { supabase }   from '../lib/supabase'
import { FilterPill }              from '../components/tarefas/FilterPill'
import { TaskCard }                from '../components/tarefas/TaskCard'
import { TaskModal }               from '../components/tarefas/TaskModal'
import { TaskSkeletons, EmptyState } from '../components/tarefas/TaskSkeletons'

const STATUS_OPTS = [
  { value: '',              label: 'Todas' },
  { value: 'pendente',      label: 'Pendentes' },
  { value: 'em_progresso',  label: 'Em progresso' },
  { value: 'concluida',     label: 'Concluídas' },
]

const PRIORIDADE_OPTS = [
  { value: '',      label: 'Todas prioridades' },
  { value: 'alta',  label: 'Alta' },
  { value: 'media', label: 'Média' },
  { value: 'baixa', label: 'Baixa' },
]

export default function Tarefas() {
  const { user, isAdmin } = useAuth()

  const [statusFiltro,     setStatusFiltro]     = useState('')
  const [prioridadeFiltro, setPrioridadeFiltro] = useState('')
  const [pessoaFiltro,     setPessoaFiltro]     = useState('')
  const [modalOpen,        setModalOpen]        = useState(false)
  const [editandoTarefa,   setEditandoTarefa]   = useState(null)
  const [outroProfile,     setOutroProfile]     = useState(null)
  const [togglingId,       setTogglingId]       = useState(null)
  const [deletandoId,      setDeletandoId]      = useState(null)

  const filtros = useMemo(() => {
    const f = {}
    if (statusFiltro)     f.status     = statusFiltro
    if (prioridadeFiltro) f.prioridade = prioridadeFiltro
    if (pessoaFiltro)     f.pessoa_id  = pessoaFiltro
    return f
  }, [statusFiltro, prioridadeFiltro, pessoaFiltro])

  const { tarefas, loading, error, criarTarefa, atualizarTarefa, deletarTarefa, concluirTarefa } =
    useTarefas(filtros)

  useEffect(() => {
    if (!isAdmin || !user) return
    supabase
      .from('profiles')
      .select('id, nome')
      .neq('id', user.id)
      .maybeSingle()
      .then(({ data }) => setOutroProfile(data))
      .catch(err => console.error('[Tarefas] outroProfile:', err.message))
  }, [isAdmin, user?.id])

  function abrirModalNovo() { setEditandoTarefa(null); setModalOpen(true) }
  function abrirModalEditar(tarefa) { setEditandoTarefa(tarefa); setModalOpen(true) }

  async function handleSalvar(dados) {
    try {
      if (editandoTarefa) {
        await atualizarTarefa(editandoTarefa.id, dados)
        toast.success('Tarefa atualizada', {
          style: { borderColor: 'var(--color-accent)' },
        })
      } else {
        await criarTarefa(dados)
        toast.success('Tarefa criada', {
          style: { borderColor: 'var(--color-accent)' },
        })
      }
    } catch {
      toast.error('Erro ao salvar tarefa', {
        style: { borderColor: 'var(--color-danger)' },
      })
    }
  }

  async function handleToggle(tarefa) {
    setTogglingId(tarefa.id)
    try {
      if (tarefa.status === 'concluida') {
        await atualizarTarefa(tarefa.id, { status: 'pendente' })
        toast('Tarefa reaberta', { style: { borderColor: 'var(--color-border)' } })
      } else {
        const resultado = await concluirTarefa(tarefa.id)
        const msg = resultado?.proximaData
          ? `Tarefa concluída ✓  Próxima para ${
              new Date(resultado.proximaData + 'T00:00:00')
                .toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })
            }`
          : 'Tarefa concluída ✓'
        toast.success(msg, { style: { borderColor: 'var(--color-accent)' } })
      }
    } catch {
      toast.error('Erro ao atualizar tarefa', {
        style: { borderColor: 'var(--color-danger)' },
      })
    } finally {
      setTogglingId(null)
    }
  }

  async function handleDelete(id) {
    if (deletandoId !== id) { setDeletandoId(id); return }
    try {
      await deletarTarefa(id)
      setDeletandoId(null)
      toast.success('Tarefa deletada', {
        style: { borderColor: 'var(--color-accent)' },
      })
    } catch {
      setDeletandoId(null)
      toast.error('Erro ao deletar tarefa', {
        style: { borderColor: 'var(--color-danger)' },
      })
    }
  }

  const tarefasOrdenadas = useMemo(() => (
    [...tarefas].sort((a, b) => {
      if (a.status === 'concluida' && b.status !== 'concluida') return 1
      if (a.status !== 'concluida' && b.status === 'concluida') return -1
      return 0
    })
  ), [tarefas])

  return (
    <div className="flex flex-col gap-6">

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-text-1)', margin: 0 }}>
          Tarefas
        </h1>
        <button
          onClick={abrirModalNovo}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 10, border: 'none',
            background: 'var(--color-accent)', color: 'var(--color-bg)',
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-accent-2)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-accent)')}
        >
          <Plus size={16} strokeWidth={2.5} />
          Nova tarefa
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}
          className="hide-scrollbar">
          {STATUS_OPTS.map(opt => (
            <FilterPill key={opt.value} label={opt.label}
              active={statusFiltro === opt.value}
              onClick={() => setStatusFiltro(opt.value)} />
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}
          className="hide-scrollbar">
          {PRIORIDADE_OPTS.map(opt => (
            <FilterPill key={opt.value} label={opt.label}
              active={prioridadeFiltro === opt.value}
              onClick={() => setPrioridadeFiltro(opt.value)} />
          ))}

          {isAdmin && outroProfile && (
            <>
              <div style={{ width: 1, background: 'var(--color-border)', margin: '0 4px', flexShrink: 0 }} />
              {[
                { value: '',              label: 'Todos' },
                { value: user?.id,        label: 'Eu' },
                { value: outroProfile.id, label: outroProfile.nome.split(' ')[0] },
              ].map(opt => (
                <FilterPill key={opt.value} label={opt.label}
                  active={pessoaFiltro === opt.value}
                  onClick={() => setPessoaFiltro(opt.value)} />
              ))}
            </>
          )}
        </div>
      </div>

      {error ? (
        <div style={{ padding: '40px 0', textAlign: 'center' }}>
          <p style={{ color: 'var(--color-danger)', fontSize: 14, margin: '0 0 12px' }}>
            Erro ao carregar tarefas: {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 16px', borderRadius: 10, border: '1px solid var(--color-border)',
              background: 'transparent', color: 'var(--color-text-2)', fontSize: 13, cursor: 'pointer',
            }}
          >
            Tentar novamente
          </button>
        </div>
      ) : loading ? (
        <TaskSkeletons />
      ) : tarefasOrdenadas.length === 0 ? (
        <EmptyState onNova={abrirModalNovo} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tarefasOrdenadas.map(tarefa => (
            <TaskCard
              key={tarefa.id}
              tarefa={tarefa}
              isAdmin={isAdmin}
              userId={user?.id}
              onToggle={() => handleToggle(tarefa)}
              onEdit={() => abrirModalEditar(tarefa)}
              onDelete={() => handleDelete(tarefa.id)}
              toggling={togglingId === tarefa.id}
              confirmando={deletandoId === tarefa.id}
            />
          ))}
        </div>
      )}

      <TaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSalvar={handleSalvar}
        editando={editandoTarefa}
        isAdmin={isAdmin}
        userId={user?.id}
        outroProfile={outroProfile}
      />
    </div>
  )
}
