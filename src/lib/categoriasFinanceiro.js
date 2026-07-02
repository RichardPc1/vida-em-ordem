import {
  ShoppingCart, Car, Home, Heart, Smile, GraduationCap, Shirt, MoreHorizontal,
  Laptop, Repeat, Receipt, HandCoins, Zap, HeartHandshake,
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
  { value: 'outros',             label: 'Outros'               },
]

export const CATEGORIAS_ENTRADA = [
  { value: 'salario',      label: 'Salário'      },
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
  outros:             '#8A8A8A',
  // categorias de entrada
  salario:            '#4ECDC4',
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
  outros:             MoreHorizontal,
}
