import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Plus, ChevronLeft, ChevronRight, Trash2, FileDown, Loader2 } from 'lucide-react'
import {
  PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, CartesianGrid, ResponsiveContainer,
} from 'recharts'
import { useAuth } from '../contexts/AuthContext'
import {
  useLancamentos,
  CATEGORIAS_SAIDA,
  CATEGORIAS_ENTRADA,
  CORES_CATEGORIA,
} from '../hooks/useLancamentos'
import { supabase } from '../lib/supabase'
import { fmtCurrency } from '../lib/utils'
import { gerarRelatorioPDF } from '../lib/relatorio'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'

// ---------------------------------------------------------------------------
// Helper local de data (NÃO usar toISOString — bug de timezone UTC no Brasil)
// ---------------------------------------------------------------------------

function dataLocalStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ---------------------------------------------------------------------------
// Constante do formulário em branco
// ---------------------------------------------------------------------------

const FORM_INICIAL = {
  tipo: 'saida',
  descricao: '',
  valor: '',
  categoria: '',
  data: dataLocalStr(new Date()),
  pessoa_id: '',
  eh_parcelado: false,
  total_parcelas: 6,
}

// ---------------------------------------------------------------------------
// Estilos reutilizáveis do modal
// ---------------------------------------------------------------------------

const inputStyle = {
  background: 'var(--color-surface-2)',
  border: '1px solid var(--color-border)',
  borderRadius: 10,
  padding: '9px 12px',
  color: 'var(--color-text-1)',
  fontSize: 14,
  width: '100%',
  outline: 'none',
  fontFamily: 'inherit',
  transition: 'border-color 0.15s',
}

function focusAcc(e) { e.target.style.borderColor = 'var(--color-accent)' }
function blurBorder(e) { e.target.style.borderColor = 'var(--color-border)' }

// ---------------------------------------------------------------------------
// SeletorMes
// ---------------------------------------------------------------------------

function SeletorMes({ mes, onAnterior, onProximo }) {
  const btnStyle = {
    background: 'var(--color-surface-2)',
    border: '1px solid var(--color-border)',
    borderRadius: 6,
    padding: '4px 8px',
    cursor: 'pointer',
    color: 'var(--color-text-2)',
    display: 'flex',
    alignItems: 'center',
    transition: 'color 0.15s',
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button
        style={btnStyle}
        onClick={onAnterior}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-1)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-2)')}
        aria-label="Mês anterior"
      >
        <ChevronLeft size={16} />
      </button>
      <span style={{
        fontSize: 15,
        fontWeight: 600,
        color: 'var(--color-text-1)',
        minWidth: 130,
        textAlign: 'center',
        textTransform: 'capitalize',
      }}>
        {mes.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
      </span>
      <button
        style={btnStyle}
        onClick={onProximo}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-1)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-2)')}
        aria-label="Próximo mês"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// TotalCard
// ---------------------------------------------------------------------------

function TotalCard({ label, value, color, loading }) {
  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 16,
      padding: 24,
    }}>
      <p style={{
        fontSize: 12,
        fontWeight: 500,
        color: 'var(--color-text-2)',
        margin: '0 0 10px',
        textTransform: 'uppercase',
        letterSpacing: '0.07em',
      }}>
        {label}
      </p>
      {loading
        ? (
          <div
            style={{ height: 34, width: '65%', borderRadius: 6, background: 'var(--color-surface-2)' }}
            className="animate-pulse"
          />
        )
        : (
          <p style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 28,
            fontWeight: 500,
            color,
            margin: 0,
            lineHeight: 1.1,
          }}>
            {fmtCurrency(value)}
          </p>
        )
      }
    </div>
  )
}

// ---------------------------------------------------------------------------
// PizzaCard
// ---------------------------------------------------------------------------

function PizzaCard({ dados, loading }) {
  const total = dados.reduce((s, d) => s + d.valor, 0)
  const todasCats = [...CATEGORIAS_SAIDA, ...CATEGORIAS_ENTRADA]

  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 16,
      padding: 24,
    }}>
      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-1)', margin: '0 0 20px' }}>
        Gastos por categoria
      </p>

      {loading ? (
        <div
          style={{ height: 180, borderRadius: 10, background: 'var(--color-surface-2)' }}
          className="animate-pulse"
        />
      ) : dados.length === 0 ? (
        <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ fontSize: 13, color: 'var(--color-text-3)', margin: 0 }}>Nenhum gasto este mês</p>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={dados}
                dataKey="valor"
                nameKey="categoria"
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={80}
              >
                {dados.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0].payload
                  const label = todasCats.find(c => c.value === d.categoria)?.label ?? d.categoria
                  return (
                    <div style={{
                      background: 'var(--color-surface-2)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 10,
                      padding: '8px 12px',
                    }}>
                      <p style={{ color: 'var(--color-text-2)', fontSize: 12, margin: '0 0 2px' }}>{label}</p>
                      <p style={{
                        color: 'var(--color-text-1)',
                        fontSize: 13,
                        fontFamily: 'JetBrains Mono, monospace',
                        margin: 0,
                      }}>
                        {fmtCurrency(d.valor)}
                      </p>
                    </div>
                  )
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Legenda */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            {dados.map(d => {
              const pct = total > 0 ? ((d.valor / total) * 100).toFixed(1) : '0'
              const label = todasCats.find(c => c.value === d.categoria)?.label ?? d.categoria
              return (
                <div key={d.categoria} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: d.fill,
                    flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 12, color: 'var(--color-text-2)', flex: 1 }}>{label}</span>
                  <span style={{
                    fontSize: 12,
                    fontFamily: 'JetBrains Mono, monospace',
                    color: 'var(--color-text-1)',
                  }}>
                    {fmtCurrency(d.valor)}
                  </span>
                  <span style={{
                    fontSize: 11,
                    color: 'var(--color-text-3)',
                    minWidth: 36,
                    textAlign: 'right',
                  }}>
                    {pct}%
                  </span>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// BarrasCard
// ---------------------------------------------------------------------------

function BarrasCard({ dados, loading }) {
  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 16,
      padding: 24,
    }}>
      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-1)', margin: '0 0 20px' }}>
        Últimos 6 meses
      </p>

      {loading ? (
        <div
          style={{ height: 200, borderRadius: 10, background: 'var(--color-surface-2)' }}
          className="animate-pulse"
        />
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={dados} barGap={4} barSize={14}>
            <CartesianGrid vertical={false} stroke="#2E2E2E" strokeDasharray="4 4" />
            <XAxis
              dataKey="mes"
              tick={{ fill: '#8A8A8A', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => v.replace('.', '')}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                return (
                  <div style={{
                    background: 'var(--color-surface-2)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 10,
                    padding: '10px 14px',
                  }}>
                    <p style={{
                      color: 'var(--color-text-2)',
                      margin: '0 0 6px',
                      fontSize: 12,
                      textTransform: 'capitalize',
                    }}>
                      {label}
                    </p>
                    {payload.map(p => (
                      <p key={p.dataKey} style={{
                        color: p.fill,
                        margin: '2px 0',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: 12,
                      }}>
                        {p.name}: {fmtCurrency(p.value)}
                      </p>
                    ))}
                  </div>
                )
              }}
              cursor={{ fill: 'rgba(255,255,255,0.02)' }}
            />
            <Bar dataKey="entradas" name="Entradas" fill="#4ECDC4" radius={[4, 4, 0, 0]} />
            <Bar dataKey="saidas" name="Saídas" fill="#FF5C5C" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// LancamentoItem
// ---------------------------------------------------------------------------

function LancamentoItem({ lancamento: l, isAdmin, isLast, onDelete }) {
  const [confirmando, setConfirmando] = useState(false)
  const isEntrada = l.tipo === 'entrada'
  const categorias = isEntrada ? CATEGORIAS_ENTRADA : CATEGORIAS_SAIDA
  const catLabel = categorias.find(c => c.value === l.categoria)?.label ?? l.categoria
  const cor = CORES_CATEGORIA[l.categoria] ?? '#8A8A8A'

  function handleClickDelete() {
    if (!confirmando) { setConfirmando(true); return }
    onDelete(l)
    setConfirmando(false)
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '12px 16px',
      borderBottom: isLast ? 'none' : '1px solid var(--color-border)',
    }}>
      {/* Bolinha colorida da categoria */}
      <div style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        flexShrink: 0,
        background: `${cor}20`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: cor }} />
      </div>

      {/* Descrição + badges */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 14,
          fontWeight: 500,
          color: 'var(--color-text-1)',
          margin: '0 0 3px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {l.descricao}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-2)' }}>{catLabel}</span>

          {l.eh_parcelado && (
            <span style={{
              fontSize: 11,
              fontFamily: 'JetBrains Mono, monospace',
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              padding: '1px 6px',
              borderRadius: 6,
              color: 'var(--color-text-2)',
            }}>
              {l.parcela_atual}/{l.total_parcelas}
            </span>
          )}

          {isAdmin && l.profiles?.nome && (
            <span style={{
              fontSize: 11,
              color: 'var(--color-text-2)',
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              padding: '1px 6px',
              borderRadius: 6,
            }}>
              @{l.profiles.nome.split(' ')[0].toLowerCase()}
            </span>
          )}
        </div>
      </div>

      {/* Valor */}
      <span style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 15,
        fontWeight: 500,
        color: isEntrada ? 'var(--color-success)' : 'var(--color-danger)',
        whiteSpace: 'nowrap',
      }}>
        {isEntrada ? '+' : '-'}{fmtCurrency(l.valor)}
      </span>

      {/* Botão delete */}
      <button
        onClick={handleClickDelete}
        onBlur={() => setConfirmando(false)}
        title={confirmando ? 'Clique para confirmar' : 'Deletar'}
        aria-label={`Deletar: ${l.descricao}`}
        style={{
          background: confirmando ? 'rgba(255,92,92,0.1)' : 'transparent',
          border: 'none',
          padding: 6,
          borderRadius: 6,
          cursor: 'pointer',
          color: confirmando ? 'var(--color-danger)' : 'var(--color-text-3)',
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { if (!confirmando) e.currentTarget.style.color = 'var(--color-danger)' }}
        onMouseLeave={e => { if (!confirmando) e.currentTarget.style.color = 'var(--color-text-3)' }}
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers de agrupamento por data
// ---------------------------------------------------------------------------

function agruparPorData(lancamentos) {
  const grupos = {}
  lancamentos.forEach(l => {
    if (!grupos[l.data]) grupos[l.data] = []
    grupos[l.data].push(l)
  })
  return Object.entries(grupos).sort(([a], [b]) => b.localeCompare(a))
}

function labelData(dataStr) {
  const d = new Date(dataStr + 'T00:00:00')
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  const ontem = new Date(hoje); ontem.setDate(ontem.getDate() - 1)
  if (d.getTime() === hoje.getTime()) return 'Hoje'
  if (d.getTime() === ontem.getTime()) return 'Ontem'
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })
}

// ---------------------------------------------------------------------------
// ListaLancamentos
// ---------------------------------------------------------------------------

function ListaLancamentos({ lancamentos, loading, isAdmin, onDelete }) {
  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[0.8, 0.6, 0.75, 0.5, 0.9].map((w, i) => (
        <div key={i} style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 16px',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 16,
        }}>
          <div
            style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-surface-2)' }}
            className="animate-pulse"
          />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div
              style={{ height: 14, width: `${w * 100}%`, borderRadius: 4, background: 'var(--color-surface-2)' }}
              className="animate-pulse"
            />
            <div
              style={{ height: 11, width: '40%', borderRadius: 4, background: 'var(--color-surface-2)' }}
              className="animate-pulse"
            />
          </div>
        </div>
      ))}
    </div>
  )

  if (lancamentos.length === 0) return (
    <div style={{ padding: '48px 0', textAlign: 'center' }}>
      <p style={{ fontSize: 15, color: 'var(--color-text-2)', margin: '0 0 4px' }}>
        Nenhum lançamento este mês
      </p>
      <p style={{ fontSize: 13, color: 'var(--color-text-3)', margin: 0 }}>
        Use o botão acima para adicionar
      </p>
    </div>
  )

  const grupos = agruparPorData(lancamentos)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {grupos.map(([data, items]) => (
        <div key={data}>
          <p style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--color-text-3)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            margin: '0 0 8px',
          }}>
            {labelData(data)}
          </p>
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 16,
            overflow: 'hidden',
          }}>
            {items.map((l, idx) => (
              <LancamentoItem
                key={l.id}
                lancamento={l}
                isAdmin={isAdmin}
                isLast={idx === items.length - 1}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Componente auxiliar de campo de formulário
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Export default — Financeiro
// ---------------------------------------------------------------------------

export default function Financeiro() {
  const { user, profile, isAdmin } = useAuth()
  const {
    lancamentos,
    loading,
    error,
    fetchLancamentos,
    criarLancamento,
    deletarLancamento,
    calcularTotaisMes,
    prepararDadosPizza,
    prepararDadosBarras,
  } = useLancamentos()

  const [mes, setMes]                     = useState(new Date())
  const [gerandoPDF, setGerandoPDF]       = useState(false)
  const [modalOpen, setModalOpen]         = useState(false)
  const [deletandoLanc, setDeletandoLanc] = useState(null)
  const [outroProfile, setOutroProfile]   = useState(null)
  const [form, setForm]                   = useState(FORM_INICIAL)
  const [salvando, setSalvando]           = useState(false)
  const [erro, setErro]                   = useState('')

  // Buscar lançamentos ao mudar de mês
  useEffect(() => {
    if (!user) return
    fetchLancamentos({ mes })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, mes])

  // Buscar perfil do outro usuário (admin only)
  useEffect(() => {
    if (!isAdmin || !user) return
    supabase
      .from('profiles')
      .select('id, nome')
      .neq('id', user.id)
      .maybeSingle()
      .then(({ data }) => setOutroProfile(data))
      .catch(err => console.error('[Financeiro] outroProfile:', err.message))
  }, [isAdmin, user?.id])

  // Resetar formulário ao abrir o modal
  useEffect(() => {
    if (!modalOpen) return
    setErro('')
    setForm({
      ...FORM_INICIAL,
      pessoa_id: user?.id ?? '',
      data: dataLocalStr(new Date()),
    })
  }, [modalOpen])

  // ---- Navegação de mês ----

  function anteriorMes() {
    setMes(m => {
      const n = new Date(m)
      n.setDate(1)
      n.setMonth(n.getMonth() - 1)
      return n
    })
  }

  function proximoMes() {
    setMes(m => {
      const n = new Date(m)
      n.setDate(1)
      n.setMonth(n.getMonth() + 1)
      return n
    })
  }

  // ---- Delete com suporte a parcelados ----

  function handleDelete(l) {
    if (l.eh_parcelado) { setDeletandoLanc(l); return }
    deletarLancamento(l.id, true)
  }

  // ---- Submit do modal ----

  async function handleSalvar() {
    if (!form.descricao.trim()) { setErro('Descrição obrigatória'); return }
    const valorNum = Number(form.valor.replace(',', '.'))
    if (!valorNum || valorNum <= 0) { setErro('Valor inválido'); return }
    if (!form.categoria) { setErro('Selecione uma categoria'); return }

    setSalvando(true)
    setErro('')
    try {
      await criarLancamento({
        ...form,
        valor: valorNum,
        pessoa_id: form.pessoa_id || user.id,
      })
      setModalOpen(false)
    } catch {
      setErro('Erro ao salvar. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  // ---- Exportar PDF ----

  async function handleExportarPDF() {
    setGerandoPDF(true)
    try {
      const ano    = mes.getFullYear()
      const mesNum = mes.getMonth() + 1
      const mesStr = `${ano}-${String(mesNum).padStart(2, '0')}-01`
      const ultimo = new Date(ano, mesNum, 0)
      const fimStr = `${ano}-${String(mesNum).padStart(2, '0')}-${String(ultimo.getDate()).padStart(2, '0')}`

      // Busca orçamentos e metas em paralelo
      const [orcResult, metasResult] = await Promise.all([
        supabase.from('orcamento_mensal').select('*').eq('mes_referencia', mesStr),
        supabase.from('metas').select('titulo, valor_alvo, valor_atual, prazo, status'),
      ])

      // Monta orcamentos com gasto calculado a partir dos lançamentos do mês em tela
      const CATS = ['alimentacao','transporte','moradia','saude','lazer','educacao','vestuario','outros']
      const CAT_LABEL = {
        alimentacao:'Alimentação', transporte:'Transporte', moradia:'Moradia',
        saude:'Saúde', lazer:'Lazer', educacao:'Educação', vestuario:'Vestuário', outros:'Outros',
      }
      const orcamentosComGasto = CATS
        .map(cat => {
          const orc        = orcResult.data?.find(o => o.categoria === cat)
          const valorLimite = Number(orc?.valor_limite ?? 0)
          const gasto       = lancamentos
            .filter(l => l.tipo === 'saida' && l.categoria === cat)
            .reduce((s, l) => s + Number(l.valor), 0)
          return {
            categoria:   cat,
            label:       CAT_LABEL[cat],
            valorLimite,
            gasto,
            diferenca:   valorLimite - gasto,
            percentual:  valorLimite > 0 ? (gasto / valorLimite) * 100 : 0,
          }
        })
        .filter(o => o.gasto > 0 || o.valorLimite > 0)

      const { entradas: e, saidas: s, saldo: sl } = calcularTotaisMes(mes)

      gerarRelatorioPDF(mesNum, ano, {
        lancamentos,
        orcamentos: orcamentosComGasto,
        metas:      metasResult.data ?? [],
        perfil:     profile,
        totais:     { entradas: e, saidas: s, saldo: sl },
        isAdmin,
      })

      toast.success('PDF gerado com sucesso!', { style: { borderColor: 'var(--color-accent)' } })
    } catch (err) {
      console.error('[PDF]', err)
      toast.error('Erro ao gerar PDF', { style: { borderColor: 'var(--color-danger)' } })
    } finally {
      setGerandoPDF(false)
    }
  }

  // ---- Dados calculados ----

  const { entradas, saidas, saldo } = calcularTotaisMes(mes)
  const dadosPizza  = prepararDadosPizza(mes)
  const dadosBarras = prepararDadosBarras()
  const corSaldo    = saldo > 0
    ? 'var(--color-accent)'
    : saldo < 0
    ? 'var(--color-danger)'
    : 'var(--color-text-2)'

  const categoriaOptions = form.tipo === 'entrada' ? CATEGORIAS_ENTRADA : CATEGORIAS_SAIDA

  // ---- Error state ----

  if (error) return (
    <div style={{ padding: '40px 0', textAlign: 'center' }}>
      <p style={{ color: 'var(--color-danger)', fontSize: 14, margin: '0 0 12px' }}>
        Erro ao carregar: {error}
      </p>
      <button
        onClick={() => fetchLancamentos({ mes })}
        style={{
          padding: '8px 16px',
          borderRadius: 10,
          border: '1px solid var(--color-border)',
          background: 'transparent',
          color: 'var(--color-text-2)',
          fontSize: 13,
          cursor: 'pointer',
        }}
      >
        Tentar novamente
      </button>
    </div>
  )

  // ---- Render ----

  return (
    <div className="flex flex-col gap-6">

      {/* ------------------------------------------------------------------ */}
      {/* Header                                                               */}
      {/* ------------------------------------------------------------------ */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-1)', margin: '0 0 2px' }}>
            Financeiro
          </h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-2)', margin: 0 }}>
            Controle de entradas e saídas
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <SeletorMes mes={mes} onAnterior={anteriorMes} onProximo={proximoMes} />

          {/* Botão Exportar PDF */}
          <button
            onClick={handleExportarPDF}
            disabled={gerandoPDF || loading}
            style={{
              display:     'flex',
              alignItems:  'center',
              gap:         6,
              padding:     '8px 14px',
              borderRadius: 10,
              border:      '1px solid var(--color-border)',
              background:  'transparent',
              color:       gerandoPDF ? 'var(--color-text-3)' : 'var(--color-text-2)',
              fontSize:    13,
              fontWeight:  500,
              cursor:      gerandoPDF ? 'not-allowed' : 'pointer',
              transition:  'all 0.15s',
              flexShrink:  0,
            }}
            onMouseEnter={e => { if (!gerandoPDF) e.currentTarget.style.color = 'var(--color-text-1)' }}
            onMouseLeave={e => { if (!gerandoPDF) e.currentTarget.style.color = 'var(--color-text-2)' }}
          >
            {gerandoPDF
              ? <Loader2 size={15} className="animate-spin" />
              : <FileDown size={15} />
            }
            {gerandoPDF ? 'Gerando...' : 'Exportar PDF'}
          </button>

          <button
            onClick={() => setModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 10,
              border: 'none',
              background: 'var(--color-accent)',
              color: '#0F0F0F',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.15s',
              flexShrink: 0,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-accent-2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-accent)')}
          >
            <Plus size={16} />
            Novo lançamento
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Cards de totais — grid 3 colunas no desktop                         */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TotalCard
          label="Entradas"
          value={entradas}
          color="var(--color-success)"
          loading={loading}
        />
        <TotalCard
          label="Saídas"
          value={saidas}
          color="var(--color-danger)"
          loading={loading}
        />
        <TotalCard
          label="Saldo"
          value={saldo}
          color={corSaldo}
          loading={loading}
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Gráficos — grid 2 colunas no desktop                                */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PizzaCard dados={dadosPizza} loading={loading} />
        <BarrasCard dados={dadosBarras} loading={loading} />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Lista de lançamentos                                                 */}
      {/* ------------------------------------------------------------------ */}
      <div>
        <p style={{
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--color-text-1)',
          margin: '0 0 16px',
        }}>
          Lançamentos do mês
        </p>
        <ListaLancamentos
          lancamentos={lancamentos}
          loading={loading}
          isAdmin={isAdmin}
          onDelete={handleDelete}
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Modal — novo lançamento                                              */}
      {/* ------------------------------------------------------------------ */}
      <Dialog open={modalOpen} onOpenChange={v => !v && setModalOpen(false)}>
        <DialogContent style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 16,
          maxWidth: 480,
          padding: 28,
        }}>
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--color-text-1)', fontSize: 16, fontWeight: 600 }}>
              Novo lançamento
            </DialogTitle>
          </DialogHeader>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>

            {/* Toggle Entrada / Saída */}
            <div style={{
              display: 'flex',
              background: 'var(--color-surface-2)',
              borderRadius: 10,
              padding: 4,
              gap: 4,
            }}>
              {['saida', 'entrada'].map(t => (
                <button
                  key={t}
                  onClick={() => setForm(f => ({ ...f, tipo: t, categoria: '' }))}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: 8,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                    transition: 'all 0.15s',
                    background: form.tipo === t ? 'var(--color-surface)' : 'transparent',
                    color: form.tipo === t ? 'var(--color-text-1)' : 'var(--color-text-2)',
                  }}
                >
                  {t === 'entrada' ? 'Entrada' : 'Saída'}
                </button>
              ))}
            </div>

            {/* Descrição */}
            <FormField label="Descrição *">
              <input
                type="text"
                autoFocus
                value={form.descricao}
                onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                placeholder="Ex: Supermercado, Salário..."
                style={inputStyle}
                onFocus={focusAcc}
                onBlur={blurBorder}
              />
            </FormField>

            {/* Valor e Data — grid 2 colunas */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FormField label="Valor *">
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.valor}
                  onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
                  placeholder="0,00"
                  style={{ ...inputStyle, fontFamily: 'JetBrains Mono, monospace' }}
                  onFocus={focusAcc}
                  onBlur={blurBorder}
                />
              </FormField>
              <FormField label="Data">
                <input
                  type="date"
                  value={form.data}
                  onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
                  style={{ ...inputStyle, colorScheme: 'dark' }}
                  onFocus={focusAcc}
                  onBlur={blurBorder}
                />
              </FormField>
            </div>

            {/* Categoria */}
            <FormField label="Categoria *">
              <Select
                value={form.categoria}
                onValueChange={v => setForm(f => ({ ...f, categoria: v }))}
              >
                <SelectTrigger style={{
                  background: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 10,
                  color: form.categoria ? 'var(--color-text-1)' : 'var(--color-text-3)',
                  fontSize: 14,
                  height: 38,
                }}>
                  <SelectValue placeholder="Selecionar categoria" />
                </SelectTrigger>
                <SelectContent style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 10,
                }}>
                  {categoriaOptions.map(opt => (
                    <SelectItem
                      key={opt.value}
                      value={opt.value}
                      style={{ color: 'var(--color-text-1)', fontSize: 14 }}
                    >
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            {/* Campo "De quem?" — somente admin */}
            {isAdmin && outroProfile && (
              <FormField label="De quem?">
                <Select
                  value={form.pessoa_id}
                  onValueChange={v => setForm(f => ({ ...f, pessoa_id: v }))}
                >
                  <SelectTrigger style={{
                    background: 'var(--color-surface-2)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 10,
                    color: 'var(--color-text-1)',
                    fontSize: 14,
                    height: 38,
                  }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 10,
                  }}>
                    <SelectItem value={user.id} style={{ color: 'var(--color-text-1)', fontSize: 14 }}>
                      Eu
                    </SelectItem>
                    <SelectItem value={outroProfile.id} style={{ color: 'var(--color-text-1)', fontSize: 14 }}>
                      {outroProfile.nome.split(' ')[0]}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            )}

            {/* Toggle parcelado */}
            <div style={{
              borderTop: '1px solid var(--color-border)',
              paddingTop: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: 14, color: 'var(--color-text-1)' }}>Parcelado?</span>
                <button
                  onClick={() => setForm(f => ({ ...f, eh_parcelado: !f.eh_parcelado }))}
                  style={{
                    width: 40,
                    height: 22,
                    borderRadius: 11,
                    border: 'none',
                    cursor: 'pointer',
                    background: form.eh_parcelado ? 'var(--color-accent)' : 'var(--color-surface-2)',
                    position: 'relative',
                    transition: 'background 0.2s',
                  }}
                  aria-label="Alternar parcelado"
                >
                  <div style={{
                    position: 'absolute',
                    top: 3,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: form.eh_parcelado ? 'var(--color-bg)' : 'var(--color-text-3)',
                    transition: 'left 0.2s',
                    left: form.eh_parcelado ? 21 : 3,
                  }} />
                </button>
              </div>

              {form.eh_parcelado && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-2)' }}>
                    Parcelas (2–48)
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={48}
                    value={form.total_parcelas}
                    onChange={e => setForm(f => ({
                      ...f,
                      total_parcelas: Math.min(48, Math.max(2, Number(e.target.value))),
                    }))}
                    style={{ ...inputStyle, fontFamily: 'JetBrains Mono, monospace' }}
                    onFocus={focusAcc}
                    onBlur={blurBorder}
                  />
                  {form.valor && Number(form.valor.replace(',', '.')) > 0 && (
                    <p style={{
                      fontSize: 12,
                      color: 'var(--color-accent)',
                      margin: 0,
                      fontFamily: 'JetBrains Mono, monospace',
                    }}>
                      {form.total_parcelas}x de {fmtCurrency(Number(form.valor.replace(',', '.')) / form.total_parcelas)}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Mensagem de erro */}
            {erro && (
              <p style={{ fontSize: 13, color: 'var(--color-danger)', margin: 0 }}>{erro}</p>
            )}
          </div>

          <DialogFooter style={{ marginTop: 24, gap: 8 }}>
            <button
              onClick={() => setModalOpen(false)}
              style={{
                padding: '9px 20px',
                borderRadius: 10,
                cursor: 'pointer',
                background: 'transparent',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-2)',
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSalvar}
              disabled={salvando}
              style={{
                padding: '9px 20px',
                borderRadius: 10,
                cursor: salvando ? 'not-allowed' : 'pointer',
                background: salvando ? 'var(--color-surface-2)' : 'var(--color-accent)',
                color: salvando ? 'var(--color-text-2)' : '#0F0F0F',
                border: 'none',
                fontSize: 14,
                fontWeight: 600,
                transition: 'all 0.15s',
              }}
            >
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------------ */}
      {/* Dialog — deleção de parcelados                                       */}
      {/* ------------------------------------------------------------------ */}
      <Dialog open={!!deletandoLanc} onOpenChange={v => !v && setDeletandoLanc(null)}>
        <DialogContent style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 16,
          maxWidth: 400,
          padding: 28,
        }}>
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--color-text-1)', fontSize: 16 }}>
              Deletar lançamento parcelado
            </DialogTitle>
          </DialogHeader>

          <p style={{ fontSize: 14, color: 'var(--color-text-2)', margin: '12px 0 0' }}>
            Este é um lançamento parcelado ({deletandoLanc?.parcela_atual}/{deletandoLanc?.total_parcelas}).
            O que deseja fazer?
          </p>

          <DialogFooter style={{ marginTop: 24, flexDirection: 'column', gap: 8 }}>
            <button
              onClick={() => {
                deletarLancamento(deletandoLanc.id, true)
                setDeletandoLanc(null)
              }}
              style={{
                padding: '9px 16px',
                borderRadius: 10,
                border: '1px solid var(--color-border)',
                background: 'transparent',
                color: 'var(--color-text-1)',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Só este lançamento
            </button>
            <button
              onClick={() => {
                deletarLancamento(deletandoLanc.id, false)
                setDeletandoLanc(null)
              }}
              style={{
                padding: '9px 16px',
                borderRadius: 10,
                border: 'none',
                background: 'var(--color-danger)',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Todas as {deletandoLanc?.total_parcelas} parcelas
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
