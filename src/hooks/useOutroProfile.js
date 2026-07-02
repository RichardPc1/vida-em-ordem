import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ---------------------------------------------------------------------------
// useOutroProfile
// Busca o perfil do outro membro do casal — usado quando o admin precisa
// atribuir um lançamento/cartão à esposa (ou vice-versa) sem trocar de sessão.
// Retorna null para membro não-admin (RLS de profiles já restringiria mesmo
// que a query rodasse).
// ---------------------------------------------------------------------------

export function useOutroProfile() {
  const { user, isAdmin } = useAuth()
  const [outroProfile, setOutroProfile] = useState(null)

  useEffect(() => {
    if (!isAdmin || !user) return
    supabase
      .from('profiles')
      .select('id, nome')
      .neq('id', user.id)
      .maybeSingle()
      .then(({ data }) => setOutroProfile(data))
      .catch(err => console.error('[useOutroProfile]', err.message))
  }, [isAdmin, user?.id])

  return outroProfile
}
