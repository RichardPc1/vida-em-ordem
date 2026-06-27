import {
  BarChart, Bar, XAxis, Tooltip,
  CartesianGrid, ResponsiveContainer,
} from 'recharts'
import { useAuth }      from '../contexts/AuthContext'
import { useDashboard } from '../hooks/useDashboard'
import { fmtCurrency, fmtDate, getSaudacao } from '../lib/utils'
import { Skeleton }      from '../components/shared/Skeleton'
import { PriorityBadge } from '../components/shared/PriorityBadge'
import { PersonBadge }   from '../components/shared/PersonBadge'

function Card({ children, className = '', style = {} }) {
  return (
    <div className={className} style={{
      background:   'var(--color-surface)',
      border:       '1px solid var(--color-border)',
      borderRadius: 16,
      padding:      24,
      ...style,
    }}>
      {children}
    </div>
  )
}

function MetricCard({ label, value, valueColor, loading, mono = true }) {
  return (
    <Card>
      <p style={{
        fontSize:       12,
        fontWeight:     500,
        color:          'var(--color-text-2)',
        margin:         '0 0 10px',
        textTransform:  'uppercase',
        letterSpacing:  '0.07em',
      }}>
        {label}
      </p>
      {loading ? (
        <Skeleton height={34} width="65%" radius={6} />
      ) : (
        <p style={{
          fontFamily: mono ? 'JetBrains Mono, monospace' : 'Inter, sans-serif',
          fontSize:   28,
          fontWeight: 500,
          color:      valueColor,
          margin:     0,
          lineHeight: 1.1,
        }}>
          {value}
        </p>
      )}
    </Card>
  )
}

function TaskItem({ tarefa, isAdmin, isLast }) {
  return (
    <div style={{
      display:       'flex',
      flexDirection: 'column',
      gap:           8,
      padding:       '12px 0',
      borderBottom:  isLast ? 'none' : '1px solid var(--color-border)',
    }}>
      <p style={{
        fontSize:     14,
        fontWeight:   500,
        color:        'var(--color-text-1)',
        margin:       0,
        overflow:     'hidden',
        textOverflow: 'ellipsis',
        whiteSpace:   'nowrap',
      }}>
        {tarefa.titulo}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {tarefa.data_vencimento && (
          <span style={{ fontSize: 12, color: 'var(--color-text-2)' }}>
            {fmtDate(tarefa.data_vencimento)}
          </span>
        )}
        <PriorityBadge prioridade={tarefa.prioridade} />
        {isAdmin && <PersonBadge nome={tarefa.profiles?.nome} />}
      </div>
    </div>
  )
}

function TarefasCard({ tarefas, loading, isAdmin }) {
  return (
    <Card style={{ display: 'flex', flexDirection: 'column' }}>
      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-1)', margin: '0 0 4px' }}>
        Próximas tarefas
      </p>
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
          {[0.8, 0.6, 0.7].map((w, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Skeleton height={14} width={`${w * 100}%`} />
              <Skeleton height={11} width="45%" />
            </div>
          ))}
        </div>
      ) : tarefas.length === 0 ? (
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center',
          justifyContent: 'center', padding: '28px 0',
        }}>
          <p style={{ fontSize: 13, color: 'var(--color-text-2)', textAlign: 'center', margin: 0 }}>
            Nenhuma tarefa pendente com prazo
          </p>
        </div>
      ) : (
        <div style={{ marginTop: 4 }}>
          {tarefas.map((t, i) => (
            <TaskItem key={t.id} tarefa={t} isAdmin={isAdmin} isLast={i === tarefas.length - 1} />
          ))}
        </div>
      )}
    </Card>
  )
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background:   'var(--color-surface-2)',
      border:       '1px solid var(--color-border)',
      borderRadius: 10,
      padding:      '10px 14px',
      fontSize:     13,
    }}>
      <p style={{ color: 'var(--color-text-2)', margin: '0 0 6px', fontWeight: 500, textTransform: 'capitalize' }}>
        {label}
      </p>
      {payload.map(p => (
        <p key={p.dataKey} style={{
          color:      p.fill,
          margin:     '2px 0',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize:   12,
        }}>
          {p.name}: {fmtCurrency(p.value)}
        </p>
      ))}
    </div>
  )
}

function ChartCard({ dados, loading }) {
  return (
    <Card>
      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-1)', margin: '0 0 20px' }}>
        Evolução dos últimos 6 meses
      </p>
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 180, paddingBottom: 4 }}>
          {[55, 75, 45, 85, 60, 90].map((h, i) => (
            <div key={i} className="animate-pulse flex-1 flex gap-1 items-end" style={{ height: '100%' }}>
              <div style={{
                flex: 1, height: `${h * 0.55}%`,
                background: 'var(--color-surface-2)',
                borderRadius: '4px 4px 0 0',
              }} />
              <div style={{
                flex: 1, height: `${h * 0.75}%`,
                background: 'var(--color-surface-2)',
                borderRadius: '4px 4px 0 0',
              }} />
            </div>
          ))}
        </div>
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
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
            <Bar dataKey="entradas" name="Entradas" fill="#4ECDC4" radius={[4, 4, 0, 0]} />
            <Bar dataKey="saidas"   name="Saídas"   fill="#FF5C5C" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  )
}

export default function Dashboard() {
  const { profile, isAdmin } = useAuth()
  const { entradas, saidas, saldo, tarefasPendentes, proximasTarefas, dadosGrafico, loading, error } = useDashboard()

  const primeiroNome  = profile?.nome?.split(' ')[0] ?? 'Usuário'
  const dataFormatada = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  if (error) return (
    <div style={{ padding: '40px 0', textAlign: 'center' }}>
      <p style={{ color: 'var(--color-danger)', fontSize: 14, margin: '0 0 12px' }}>
        Erro ao carregar dados: {error}
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
  )

  return (
    <div className="flex flex-col gap-6">

      <div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-text-1)', margin: 0, lineHeight: 1.2 }}>
          {getSaudacao()}, {primeiroNome}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--color-text-2)', margin: '4px 0 0', textTransform: 'capitalize' }}>
          {dataFormatada}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Entradas"    value={fmtCurrency(entradas)} valueColor="var(--color-success)" loading={loading} />
        <MetricCard label="Saídas"      value={fmtCurrency(saidas)}   valueColor="var(--color-danger)"  loading={loading} />
        <MetricCard
          label="Saldo do Mês"
          value={fmtCurrency(saldo)}
          valueColor={
            !loading && saldo > 0 ? 'var(--color-accent)' :
            !loading && saldo < 0 ? 'var(--color-danger)' :
            'var(--color-text-2)'
          }
          loading={loading}
        />
        <MetricCard
          label="Tarefas Pendentes"
          value={loading ? '–' : String(tarefasPendentes)}
          valueColor="var(--color-text-1)"
          loading={loading}
          mono={false}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
        <ChartCard dados={dadosGrafico} loading={loading} />
        <TarefasCard tarefas={proximasTarefas} loading={loading} isAdmin={isAdmin} />
      </div>

    </div>
  )
}
