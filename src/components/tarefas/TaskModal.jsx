import { useState, useEffect } from 'react'
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from '../ui/dialog'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '../ui/select'
import { CATEGORIAS, PRIORIDADES, FORM_INICIAL } from './constants'
import { RECORRENCIA_OPCOES, calcularProximaData } from '../../lib/recorrencia'

const inputStyle = {
  background:   'var(--color-surface-2)',
  border:       '1px solid var(--color-border)',
  borderRadius: 10,
  padding:      '9px 12px',
  color:        'var(--color-text-1)',
  fontSize:     16,
  width:        '100%',
  maxWidth:     '100%',
  outline:      'none',
  fontFamily:   'inherit',
  transition:   'border-color 0.15s',
  boxSizing:    'border-box',
}

function FormField({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-2)' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function StyledSelect({ value, onValueChange, options }) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger style={{
        background:   'var(--color-surface-2)',
        border:       '1px solid var(--color-border)',
        borderRadius: 10,
        color:        'var(--color-text-1)',
        fontSize:     14,
        height:       38,
        width:        '100%',
        maxWidth:     '100%',
        boxSizing:    'border-box',
      }}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent style={{
        background:   'var(--color-surface)',
        border:       '1px solid var(--color-border)',
        borderRadius: 10,
      }}>
        {options.map(opt => (
          <SelectItem key={opt.value} value={opt.value}
            style={{ color: 'var(--color-text-1)', fontSize: 14 }}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function TaskModal({ open, onClose, onSalvar, editando, isAdmin, userId, outroProfile }) {
  const [form,     setForm]     = useState(FORM_INICIAL)
  const [salvando, setSalvando] = useState(false)
  const [erro,     setErro]     = useState('')

  useEffect(() => {
    if (!open) return
    setErro('')
    setForm(editando ? {
      titulo:          editando.titulo,
      descricao:       editando.descricao ?? '',
      categoria:       editando.categoria,
      prioridade:      editando.prioridade,
      data_vencimento: editando.data_vencimento ?? '',
      pessoa_id:       editando.pessoa_id,
      recorrencia:     editando.recorrencia ?? null,
    } : { ...FORM_INICIAL, pessoa_id: userId })
  }, [open, editando, userId])

  function set(campo, valor) {
    setForm(f => ({ ...f, [campo]: valor }))
  }

  async function handleSalvar() {
    if (!form.titulo.trim()) { setErro('O título é obrigatório.'); return }
    setSalvando(true)
    setErro('')
    try {
      await onSalvar({
        ...form,
        titulo:          form.titulo.trim(),
        data_vencimento: form.data_vencimento || null,
        descricao:       form.descricao       || null,
        recorrencia:     form.recorrencia     || null,
      })
      onClose()
    } catch {
      setErro('Erro ao salvar. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  const pessoaOptions = isAdmin && outroProfile
    ? [
        { value: userId,          label: 'Eu' },
        { value: outroProfile.id, label: outroProfile.nome.split(' ')[0] },
      ]
    : []

  const duasColunas = isAdmin && outroProfile

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent style={{
        background:   'var(--color-surface)',
        border:       '1px solid var(--color-border)',
        borderRadius: 16,
        maxWidth:     480,
        padding:      24,
        overflowY:    'auto',
        maxHeight:    '90vh',
      }}>
        <DialogHeader>
          <DialogTitle style={{ color: 'var(--color-text-1)', fontSize: 16, fontWeight: 600 }}>
            {editando ? 'Editar tarefa' : 'Nova tarefa'}
          </DialogTitle>
        </DialogHeader>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>

          <FormField label="Título *">
            <input
              type="text" value={form.titulo} autoFocus
              onChange={e => set('titulo', e.target.value)}
              placeholder="Nome da tarefa"
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = 'var(--color-accent)')}
              onBlur={e  => (e.target.style.borderColor = 'var(--color-border)')}
            />
          </FormField>

          <FormField label="Descrição">
            <textarea
              value={form.descricao} rows={2}
              onChange={e => set('descricao', e.target.value)}
              placeholder="Detalhes opcionais..."
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
              onFocus={e => (e.target.style.borderColor = 'var(--color-accent)')}
              onBlur={e  => (e.target.style.borderColor = 'var(--color-border)')}
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Categoria">
              <StyledSelect value={form.categoria}
                onValueChange={v => set('categoria', v)} options={CATEGORIAS} />
            </FormField>
            <FormField label="Prioridade">
              <StyledSelect value={form.prioridade}
                onValueChange={v => set('prioridade', v)} options={PRIORIDADES} />
            </FormField>
          </div>

          <div className={`grid gap-3 ${duasColunas ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
            <FormField label="Vencimento">
              <input
                type="date" value={form.data_vencimento}
                onChange={e => set('data_vencimento', e.target.value)}
                style={{ ...inputStyle, colorScheme: 'dark' }}
                onFocus={e => (e.target.style.borderColor = 'var(--color-accent)')}
                onBlur={e  => (e.target.style.borderColor = 'var(--color-border)')}
              />
            </FormField>

            {duasColunas && (
              <FormField label="Atribuir para">
                <StyledSelect value={form.pessoa_id}
                  onValueChange={v => set('pessoa_id', v)} options={pessoaOptions} />
              </FormField>
            )}
          </div>

          {/* Recorrência */}
          <div style={{
            display:       'flex',
            flexDirection: 'column',
            gap:           12,
            paddingTop:    4,
            borderTop:     '1px solid var(--color-border)',
          }}>
            {/* Toggle "Tarefa recorrente?" */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: 14, color: 'var(--color-text-1)' }}>
                  Tarefa recorrente
                </span>
                <p style={{ fontSize: 12, color: 'var(--color-text-3)', margin: '2px 0 0' }}>
                  Cria a próxima ao concluir
                </p>
              </div>
              <button
                type="button"
                onClick={() => set('recorrencia', form.recorrencia ? null : 'semanal')}
                style={{
                  width:        40,
                  height:       22,
                  borderRadius: 11,
                  border:       'none',
                  cursor:       'pointer',
                  background:   form.recorrencia ? 'var(--color-accent)' : 'var(--color-surface-2)',
                  position:     'relative',
                  transition:   'background 0.2s',
                  flexShrink:   0,
                }}
              >
                <div style={{
                  position:     'absolute',
                  top:          3,
                  width:        16,
                  height:       16,
                  borderRadius: '50%',
                  background:   form.recorrencia ? 'var(--color-bg)' : 'var(--color-text-3)',
                  transition:   'left 0.2s',
                  left:         form.recorrencia ? 21 : 3,
                }} />
              </button>
            </div>

            {/* Select de frequência + preview — só quando recorrente */}
            {form.recorrencia && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <StyledSelect
                  value={form.recorrencia}
                  onValueChange={v => set('recorrencia', v)}
                  options={RECORRENCIA_OPCOES}
                />
                {form.data_vencimento && (
                  <p style={{ fontSize: 12, color: 'var(--color-text-2)', margin: 0 }}>
                    Próxima ocorrência:{' '}
                    <span style={{ color: 'var(--color-text-1)', fontWeight: 500 }}>
                      {(() => {
                        const proxima = calcularProximaData(form.data_vencimento, form.recorrencia)
                        if (!proxima) return '–'
                        return new Date(proxima + 'T00:00:00')
                          .toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
                      })()}
                    </span>
                  </p>
                )}
              </div>
            )}
          </div>

          {erro && (
            <p style={{ fontSize: 13, color: 'var(--color-danger)', margin: 0 }}>{erro}</p>
          )}
        </div>

        <DialogFooter style={{ marginTop: 24, gap: 8 }}>
          <button
            onClick={onClose}
            style={{
              padding:     '9px 20px',
              borderRadius: 10,
              cursor:      'pointer',
              background:  'transparent',
              border:      '1px solid var(--color-border)',
              color:       'var(--color-text-2)',
              fontSize:    14,
              fontWeight:  500,
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            disabled={salvando}
            style={{
              padding:     '9px 20px',
              borderRadius: 10,
              cursor:      salvando ? 'not-allowed' : 'pointer',
              background:  salvando ? 'var(--color-surface-2)' : 'var(--color-accent)',
              color:       salvando ? 'var(--color-text-2)'    : '#0F0F0F',
              border:      'none',
              fontSize:    14,
              fontWeight:  600,
              transition:  'all 0.15s',
            }}
          >
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
