import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function fmtCurrency(val) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', minimumFractionDigits: 2,
  }).format(val ?? 0)
}

export function fmtDate(str) {
  if (!str) return ''
  const d      = new Date(str + 'T00:00:00')
  const hoje   = new Date()
  const amanha = new Date(hoje)
  amanha.setDate(amanha.getDate() + 1)
  if (d.toDateString() === hoje.toDateString())   return 'Hoje'
  if (d.toDateString() === amanha.toDateString()) return 'Amanhã'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export function getSaudacao() {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'Bom dia'
  if (h >= 12 && h < 18) return 'Boa tarde'
  return 'Boa noite'
}

// Extrai primeiro nome de um campo que pode ser nome real ou email
export function getNomeExibicao(nome) {
  if (!nome) return null
  const base = nome.includes('@') ? nome.split('@')[0] : nome.split(' ')[0]
  return base.charAt(0).toUpperCase() + base.slice(1)
}

export function isAtrasada(tarefa) {
  if (tarefa.status === 'concluida' || !tarefa.data_vencimento) return false
  const inicioHoje = new Date()
  inicioHoje.setHours(0, 0, 0, 0)
  return new Date(tarefa.data_vencimento + 'T00:00:00') < inicioHoje
}
