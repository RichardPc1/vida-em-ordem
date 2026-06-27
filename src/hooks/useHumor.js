import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ---------------------------------------------------------------------------
// Constante exportada — mapeamento de valor numérico para emoji e label
// ---------------------------------------------------------------------------

export const HUMOR_CONFIG = {
  1: { emoji: '😔', label: 'Péssimo' },
  2: { emoji: '😕', label: 'Ruim'    },
  3: { emoji: '😐', label: 'Ok'      },
  4: { emoji: '😊', label: 'Bom'     },
  5: { emoji: '😄', label: 'Ótimo'   },
}

// ---------------------------------------------------------------------------
// Helper interno — data local de hoje no formato YYYY-MM-DD
// Não usa toISOString() porque esse método converte para UTC, causando
// deslocamento de data em fusos horários negativos (ex: América/São_Paulo).
// ---------------------------------------------------------------------------

function hojeStr() {
  const d = new Date()
  const ano = d.getFullYear()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

// ---------------------------------------------------------------------------
// Helper interno — início e fim do mês de uma determinada data
// Usa getDate(0) do mês seguinte para obter o último dia de forma segura
// (funciona com anos bissextos e meses com 28, 29, 30 ou 31 dias).
// ---------------------------------------------------------------------------

function rangeDoMes(date) {
  const ano = date.getFullYear()
  const mes = String(date.getMonth() + 1).padStart(2, '0')
  const ultimo = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  return {
    inicio: `${ano}-${mes}-01`,
    fim:    `${ano}-${mes}-${String(ultimo).padStart(2, '0')}`,
  }
}

// ---------------------------------------------------------------------------
// Hook principal
// ---------------------------------------------------------------------------

export function useHumor() {
  const { user, isAdmin } = useAuth()

  const [registros,      setRegistros]      = useState([])   // registros do usuário logado
  const [registrosOutro, setRegistrosOutro] = useState([])   // registros da outra pessoa (admin)
  const [outroProfile,   setOutroProfile]   = useState(null) // perfil da outra pessoa (admin)
  const [loading,        setLoading]        = useState(true)
  const [error,          setError]          = useState(null)

  // -------------------------------------------------------------------------
  // fetchHumor
  // Admin busca todos os registros do mês com join em profiles e separa por
  // pessoa_id. Membro filtra no banco diretamente (RLS também garante isso).
  // useCallback com [user?.id, isAdmin] evita closure obsoleta nas mutações.
  // -------------------------------------------------------------------------

  const fetchHumor = useCallback(async function fetchHumor(mesDate = new Date()) {
    setLoading(true)
    setError(null)
    try {
      const { inicio, fim } = rangeDoMes(mesDate)

      if (isAdmin) {
        const { data, error: err } = await supabase
          .from('humor_diario')
          .select('*, profiles(nome)')
          .gte('data', inicio)
          .lte('data', fim)
          .order('data', { ascending: true })
        if (err) throw err
        setRegistros((data ?? []).filter(r => r.pessoa_id === user.id))
        setRegistrosOutro((data ?? []).filter(r => r.pessoa_id !== user.id))
      } else {
        const { data, error: err } = await supabase
          .from('humor_diario')
          .select('*')
          .eq('pessoa_id', user.id)
          .gte('data', inicio)
          .lte('data', fim)
          .order('data', { ascending: true })
        if (err) throw err
        setRegistros(data ?? [])
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [user?.id, isAdmin]) // eslint-disable-line react-hooks/exhaustive-deps

  // -------------------------------------------------------------------------
  // registrarHumor
  // Upsert garante a constraint única (pessoa_id, data): se já existe registro
  // para hoje, atualiza; caso contrário, insere. Refaz o fetch do mês atual
  // após a operação para manter o estado sincronizado.
  // -------------------------------------------------------------------------

  async function registrarHumor(humor, nota = null) {
    const { error: err } = await supabase
      .from('humor_diario')
      .upsert(
        { pessoa_id: user.id, data: hojeStr(), humor, nota },
        { onConflict: 'pessoa_id,data' }
      )
    if (err) throw err
    await fetchHumor(new Date())
  }

  // -------------------------------------------------------------------------
  // calcularMediaMes
  // Aceita lista customizada para permitir cálculo tanto para o usuário logado
  // quanto para o outro perfil (admin passando registrosOutro).
  // Retorna null quando não há registros — evita exibir "0.0" na UI.
  // -------------------------------------------------------------------------

  function calcularMediaMes(lista = registros) {
    if (!lista.length) return null
    const soma = lista.reduce((s, r) => s + Number(r.humor), 0)
    return Number((soma / lista.length).toFixed(1))
  }

  // -------------------------------------------------------------------------
  // humorHoje
  // Aceita lista customizada pelo mesmo motivo de calcularMediaMes.
  // Compara string YYYY-MM-DD diretamente — sem conversão Date — para evitar
  // qualquer ambiguidade de fuso horário.
  // -------------------------------------------------------------------------

  function humorHoje(lista = registros) {
    const hoje = hojeStr()
    return lista.find(r => r.data === hoje) ?? null
  }

  // -------------------------------------------------------------------------
  // Efeito inicial — dispara fetchHumor quando o usuário está disponível.
  // Não inclui fetchHumor nas dependências para evitar re-render em cascata:
  // o useCallback já garante estabilidade da referência.
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!user) return
    fetchHumor(new Date())
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // -------------------------------------------------------------------------
  // Efeito para outroProfile — executa apenas no admin.
  // maybeSingle() não lança erro quando não encontra resultado (retorna null),
  // ao contrário de single() que lançaria PGRST116.
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!isAdmin || !user) return
    supabase
      .from('profiles')
      .select('id, nome')
      .neq('id', user.id)
      .maybeSingle()
      .then(({ data }) => setOutroProfile(data))
      .catch(err => console.error('[useHumor] outroProfile:', err.message))
  }, [isAdmin, user?.id])

  // -------------------------------------------------------------------------
  // Retorno público do hook
  // -------------------------------------------------------------------------

  return {
    registros,
    registrosOutro,
    outroProfile,
    loading,
    error,
    fetchHumor,
    registrarHumor,
    calcularMediaMes,
    humorHoje,
  }
}
