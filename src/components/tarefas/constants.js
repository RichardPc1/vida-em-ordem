export const CATEGORIAS = [
  { value: 'pessoal',  label: 'Pessoal'  },
  { value: 'casa',     label: 'Casa'     },
  { value: 'trabalho', label: 'Trabalho' },
  { value: 'compras',  label: 'Compras'  },
  { value: 'saude',    label: 'Saúde'    },
]

export const PRIORIDADES = [
  { value: 'alta',  label: 'Alta'  },
  { value: 'media', label: 'Média' },
  { value: 'baixa', label: 'Baixa' },
]

export const FORM_INICIAL = {
  titulo:          '',
  descricao:       '',
  categoria:       'pessoal',
  prioridade:      'media',
  data_vencimento: '',
  pessoa_id:       '',
  recorrencia:     null,
}
