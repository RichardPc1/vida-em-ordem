import {
  ShoppingCart, Car, Home, Heart, Smile, GraduationCap, Shirt, MoreHorizontal,
  Laptop, Repeat, Receipt, HandCoins, Zap, HeartHandshake,
  CarFront, Calculator, Users, Landmark, Phone, Wallet, Dumbbell, Archive,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Fonte única de categorias financeiras.
// Consumida por: useLancamentos.js, useOrcamento.js, Orcamento.jsx, relatorio.js
// Regra: nunca duplicar estas listas — sempre importar daqui.
// ---------------------------------------------------------------------------

export const CATEGORIAS_SAIDA = [
  { value: 'alimentacao',        label: 'Alimentação'          },
  { value: 'transporte',         label: 'Transporte'           },
  { value: 'moradia',            label: 'Moradia'              },
  { value: 'saude',              label: 'Saúde'                },
  { value: 'lazer',              label: 'Lazer'                },
  { value: 'educacao',           label: 'Educação'             },
  { value: 'vestuario',          label: 'Vestuário'            },
  { value: 'softwares_licencas', label: 'Softwares e licenças' },
  { value: 'assinaturas',        label: 'Assinaturas'          },
  { value: 'impostos',           label: 'Impostos'             },
  { value: 'emprestimos',        label: 'Empréstimos'          },
  { value: 'contas_casa',        label: 'Contas da casa'       },
  { value: 'ajuda_familiar',     label: 'Ajuda familiar'       },
  { value: 'carro',              label: 'Carro'                },
  { value: 'contabilidade',      label: 'Contabilidade'        },
  { value: 'pagamento_pessoas',  label: 'Pagamento a pessoas'  },
  { value: 'financiamento',      label: 'Financiamento'        },
  { value: 'internet_telefone',  label: 'Internet e telefone'  },
  { value: 'credito_especial',   label: 'Crédito especial'     },
  { value: 'saude_bem_estar',    label: 'Saúde e bem-estar'    },
  // saldo_inicial: representa a fatura de cartão aberta/não detalhada no
  // início do uso do app (ver useCartoes.js) — não é um gasto novo real,
  // mas precisa de categoria própria para não inflar "outros" nem duplicar
  // relatórios de despesa por categoria.
  { value: 'saldo_inicial',      label: 'Saldo inicial (fatura)' },
  { value: 'outros',             label: 'Outros'               },
]

export const CATEGORIAS_ENTRADA = [
  { value: 'salario',      label: 'Salário'      },
  { value: 'beneficio',    label: 'Benefício'    },
  { value: 'freelance',    label: 'Freelance'    },
  { value: 'investimento', label: 'Investimento' },
  { value: 'aluguel',      label: 'Aluguel'      },
  { value: 'outros',       label: 'Outros'       },
]

// Cores hardcoded para Recharts — CSS vars não funcionam em SVG fill.
// moradia usa #4ADE80 (não #C8F04D que é a cor accent do design system —
// accent é reservada para CTAs/valores positivos, nunca para gráficos).
// Todas as cores foram validadas para contraste, chroma e separação CVD
// no modo dark (superfície #1A1A1A).
export const CORES_CATEGORIA = {
  alimentacao:        '#4ECDC4',
  transporte:         '#FFB830',
  moradia:            '#4ADE80',
  saude:              '#FF6B9D',
  lazer:              '#A78BFA',
  educacao:           '#60A5FA',
  vestuario:          '#F97316',
  softwares_licencas: '#67E8F9',
  assinaturas:        '#D946EF',
  impostos:           '#A5B4FC',
  emprestimos:        '#FB923C',
  contas_casa:        '#FDE047',
  ajuda_familiar:     '#F472B6',
  carro:              '#0EA5E9',
  contabilidade:      '#14B8A6',
  pagamento_pessoas:  '#9333EA',
  financiamento:      '#CA8A04',
  internet_telefone:  '#06B6D4',
  credito_especial:   '#E11D48',
  saude_bem_estar:    '#FB7185',
  saldo_inicial:      '#64748B',
  outros:             '#8A8A8A',
  // categorias de entrada
  salario:            '#4ECDC4',
  beneficio:          '#EF4444',
  freelance:          '#A78BFA',
  investimento:       '#C8F04D',
  aluguel:            '#60A5FA',
}

// Formas de pagamento — valores idênticos ao CHECK constraint de
// lancamentos.forma_pagamento em supabase/20260701_cartoes.sql. Manter os
// dois sincronizados manualmente caso o enum do banco mude.
export const FORMAS_PAGAMENTO = [
  { value: 'dinheiro',      label: 'Dinheiro'      },
  { value: 'pix',           label: 'PIX'           },
  { value: 'debito',        label: 'Débito'        },
  { value: 'credito',       label: 'Crédito'       },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'boleto',        label: 'Boleto'        },
]

// Ícones Lucide por categoria — para EnvelopeCard em Orcamento.jsx e onde mais precisar.
// MoreHorizontal cobre tanto a categoria "outros" quanto o fallback de categorias desconhecidas.
export const ICONES_CATEGORIA = {
  alimentacao:        ShoppingCart,
  transporte:         Car,
  moradia:            Home,
  saude:              Heart,
  lazer:              Smile,
  educacao:           GraduationCap,
  vestuario:          Shirt,
  softwares_licencas: Laptop,
  assinaturas:        Repeat,
  impostos:           Receipt,
  emprestimos:        HandCoins,
  contas_casa:        Zap,
  ajuda_familiar:     HeartHandshake,
  carro:              CarFront,
  contabilidade:      Calculator,
  pagamento_pessoas:  Users,
  financiamento:      Landmark,
  internet_telefone:  Phone,
  credito_especial:   Wallet,
  saude_bem_estar:    Dumbbell,
  saldo_inicial:      Archive,
  outros:             MoreHorizontal,
}
