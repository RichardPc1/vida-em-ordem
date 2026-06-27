import jsPDF from 'jspdf'
import 'jspdf-autotable'

// ---------------------------------------------------------------------------
// Paleta — hex hardcoded (CSS vars não funcionam fora do browser DOM)
// ---------------------------------------------------------------------------

const C = {
  surface:  [26,  26,  26],   // #1A1A1A
  surface2: [36,  36,  36],   // #242424
  border:   [46,  46,  46],   // #2E2E2E
  accent:   [200, 240, 77],   // #C8F04D
  text1:    [242, 242, 242],  // #F2F2F2
  text2:    [138, 138, 138],  // #8A8A8A
  success:  [78,  205, 196],  // #4ECDC4
  danger:   [255, 92,  92],   // #FF5C5C
}

const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

const ALL_CATS = {
  alimentacao: 'Alimentação', transporte: 'Transporte',  moradia:      'Moradia',
  saude:       'Saúde',       lazer:      'Lazer',        educacao:     'Educação',
  vestuario:   'Vestuário',   outros:     'Outros',       salario:      'Salário',
  freelance:   'Freelance',   investimento:'Investimento', aluguel:     'Aluguel',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor ?? 0)
}

function secTitle(doc, texto, y, M) {
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...C.text1)
  doc.text(texto, M, y)
  doc.setDrawColor(...C.border)
  doc.setLineWidth(0.3)
  doc.line(M, y + 2, 210 - M, y + 2)
  return y + 8
}

function needsNewPage(doc, y, minSpace = 60) {
  if (y > 297 - 20 - minSpace) {
    doc.addPage()
    return 20
  }
  return y
}

// ---------------------------------------------------------------------------
// gerarRelatorioPDF — função principal exportada
// ---------------------------------------------------------------------------
// dados = { lancamentos, orcamentos, metas, perfil, totais, isAdmin }
// orcamentos = [{ categoria, label, valorLimite, gasto, diferenca, percentual }]
// ---------------------------------------------------------------------------

export function gerarRelatorioPDF(mes, ano, dados) {
  const { lancamentos = [], orcamentos = [], metas = [], perfil, totais, isAdmin } = dados
  const nomeMes  = MESES[mes - 1] ?? `Mês ${mes}`
  const nomeArq  = `VidaEmOrdem_${nomeMes}_${ano}.pdf`

  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
  const W = 210
  const M = 15  // margem horizontal

  // -------------------------------------------------------------------------
  // Cabeçalho — fundo escuro com título e subtítulo
  // -------------------------------------------------------------------------

  const hH = 44
  doc.setFillColor(...C.surface)
  doc.rect(0, 0, W, hH, 'F')

  // "VidaEmOrdem" em accent bold 22pt
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...C.accent)
  doc.text('VidaEmOrdem', M, 16)

  // Linha do título do relatório
  doc.setFontSize(13)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...C.text1)
  doc.text(`Relatório Financeiro — ${nomeMes} ${ano}`, M, 26)

  // Data de geração
  const agora = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  doc.setFontSize(9)
  doc.setTextColor(...C.text2)
  doc.text(`Gerado em ${agora}`, M, 34)

  // Nome do perfil à direita
  if (perfil?.nome) {
    doc.setFontSize(9)
    doc.setTextColor(...C.text2)
    doc.text(perfil.nome, W - M, 16, { align: 'right' })
  }

  let y = hH + 10

  // -------------------------------------------------------------------------
  // Resumo — 3 caixas: Entradas / Saídas / Saldo
  // -------------------------------------------------------------------------

  const boxW = 57
  const boxH = 24
  const boxGap = 4.5
  const boxes = [
    { label: 'ENTRADAS', valor: totais?.entradas ?? 0, cor: C.success },
    { label: 'SAÍDAS',   valor: totais?.saidas   ?? 0, cor: C.danger  },
    {
      label: 'SALDO',
      valor: totais?.saldo ?? 0,
      cor:   (totais?.saldo ?? 0) >= 0 ? C.accent : C.danger,
    },
  ]

  boxes.forEach((box, i) => {
    const x = M + i * (boxW + boxGap)
    doc.setFillColor(...C.surface)
    doc.setDrawColor(...C.border)
    doc.setLineWidth(0.4)
    doc.roundedRect(x, y, boxW, boxH, 3, 3, 'FD')

    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...C.text2)
    doc.text(box.label, x + 5, y + 8)

    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...box.cor)
    doc.text(fmt(box.valor), x + 5, y + 19)
  })

  y += boxH + 14

  // -------------------------------------------------------------------------
  // Seção 1: Gastos por Categoria
  // -------------------------------------------------------------------------

  const orcFiltrados = orcamentos.filter(o => o.gasto > 0 || o.valorLimite > 0)

  if (orcFiltrados.length > 0) {
    y = needsNewPage(doc, y, 50)
    y = secTitle(doc, 'Gastos por Categoria', y, M)

    const totalOrcado = orcFiltrados.reduce((s, o) => s + (o.valorLimite || 0), 0)
    const totalGasto  = orcFiltrados.reduce((s, o) => s + o.gasto, 0)
    const totalDiff   = totalOrcado - totalGasto

    const orcRows = orcFiltrados.map(o => [
      o.label ?? ALL_CATS[o.categoria] ?? o.categoria,
      o.valorLimite > 0 ? fmt(o.valorLimite) : '–',
      fmt(o.gasto),
      o.valorLimite > 0 ? fmt(o.diferenca ?? (o.valorLimite - o.gasto)) : '–',
      o.percentual > 0  ? `${Math.round(o.percentual)}%`                : '–',
    ])

    // Linha de total (destacada)
    orcRows.push([
      'TOTAL',
      totalOrcado > 0 ? fmt(totalOrcado) : '–',
      fmt(totalGasto),
      totalOrcado > 0 ? fmt(totalDiff) : '–',
      totalOrcado > 0 ? `${Math.round((totalGasto / totalOrcado) * 100)}%` : '–',
    ])

    doc.autoTable({
      startY: y,
      head: [['Categoria', 'Orçado', 'Gasto', 'Diferença', '%']],
      body: orcRows,
      theme: 'plain',
      margin: { left: M, right: M },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right', cellWidth: 14 },
      },
      headStyles: {
        fillColor: C.surface,
        textColor: C.text1,
        fontStyle:  'bold',
        fontSize:   9,
        cellPadding: 3,
      },
      bodyStyles: {
        fontSize:    9,
        textColor:   C.text1,
        fillColor:   C.surface,
        cellPadding: 2.5,
      },
      alternateRowStyles: { fillColor: C.surface2 },
      didParseCell(data) {
        if (data.section !== 'body') return
        const isTotal = data.row.index === orcRows.length - 1
        // Diferença: verde se sobrou, vermelho se estourou
        if (data.column.index === 3 && !isTotal && data.cell.raw !== '–') {
          const o = orcFiltrados[data.row.index]
          if (o && o.valorLimite > 0) {
            const diff = o.diferenca ?? (o.valorLimite - o.gasto)
            data.cell.styles.textColor = diff >= 0 ? C.success : C.danger
          }
        }
        if (isTotal) {
          data.cell.styles.fontStyle = 'bold'
          data.cell.styles.fillColor = C.surface
          // Diferença do total
          if (data.column.index === 3 && totalOrcado > 0) {
            data.cell.styles.textColor = totalDiff >= 0 ? C.success : C.danger
          }
        }
      },
    })

    y = doc.lastAutoTable.finalY + 12
  }

  // -------------------------------------------------------------------------
  // Seção 2: Lançamentos do Mês
  // -------------------------------------------------------------------------

  if (lancamentos.length > 0) {
    y = needsNewPage(doc, y, 60)
    y = secTitle(doc, 'Lançamentos do Mês', y, M)

    const lancSorted = [...lancamentos].sort((a, b) => b.data.localeCompare(a.data))

    const lancRows = lancSorted.map(l => {
      const d = new Date(l.data + 'T00:00:00')
      const dataFmt = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
      const isE = l.tipo === 'entrada'
      return [
        dataFmt,
        l.descricao,
        ALL_CATS[l.categoria] ?? l.categoria,
        `${isE ? '+' : '-'}${fmt(l.valor)}`,
      ]
    })

    doc.autoTable({
      startY: y,
      head: [['Data', 'Descrição', 'Categoria', 'Valor']],
      body: lancRows,
      theme: 'plain',
      margin: { left: M, right: M },
      columnStyles: {
        0: { cellWidth: 20 },
        2: { cellWidth: 30 },
        3: { cellWidth: 34, halign: 'right' },
      },
      headStyles: {
        fillColor: C.surface,
        textColor: C.text1,
        fontStyle:  'bold',
        fontSize:   9,
        cellPadding: 3,
      },
      bodyStyles: {
        fontSize:    9,
        textColor:   C.text1,
        fillColor:   C.surface,
        cellPadding: 2.5,
      },
      alternateRowStyles: { fillColor: C.surface2 },
      didParseCell(data) {
        if (data.section === 'body' && data.column.index === 3) {
          const l = lancSorted[data.row.index]
          if (l) data.cell.styles.textColor = l.tipo === 'entrada' ? C.success : C.danger
        }
      },
    })

    y = doc.lastAutoTable.finalY + 12
  }

  // -------------------------------------------------------------------------
  // Seção 3: Metas Ativas
  // -------------------------------------------------------------------------

  const metasAtivas = metas.filter(m => m.status === 'ativa')

  if (metasAtivas.length > 0) {
    y = needsNewPage(doc, y, 60)
    y = secTitle(doc, 'Metas Ativas', y, M)

    const metaRows = metasAtivas.map(m => {
      const prog = Math.min(100, (Number(m.valor_atual) / Number(m.valor_alvo)) * 100)
      const prazoFmt = m.prazo
        ? new Date(m.prazo + 'T00:00:00').toLocaleDateString('pt-BR')
        : 'Sem prazo'
      return [m.titulo, fmt(m.valor_alvo), fmt(m.valor_atual), `${Math.round(prog)}%`, prazoFmt]
    })

    doc.autoTable({
      startY: y,
      head: [['Meta', 'Alvo', 'Atual', 'Progresso', 'Prazo']],
      body: metaRows,
      theme: 'plain',
      margin: { left: M, right: M },
      columnStyles: {
        1: { halign: 'right', cellWidth: 32 },
        2: { halign: 'right', cellWidth: 32 },
        3: { halign: 'right', cellWidth: 20 },
        4: { cellWidth: 24 },
      },
      headStyles: {
        fillColor: C.surface,
        textColor: C.text1,
        fontStyle:  'bold',
        fontSize:   9,
        cellPadding: 3,
      },
      bodyStyles: {
        fontSize:    9,
        textColor:   C.text1,
        fillColor:   C.surface,
        cellPadding: 2.5,
      },
      alternateRowStyles: { fillColor: C.surface2 },
      didParseCell(data) {
        if (data.section === 'body' && data.column.index === 2) {
          data.cell.styles.textColor = C.accent
        }
      },
    })

    y = doc.lastAutoTable.finalY + 12
  }

  // -------------------------------------------------------------------------
  // Seção 4 (Admin): Visão Consolidada do Casal
  // -------------------------------------------------------------------------

  if (isAdmin && lancamentos.length > 0) {
    y = needsNewPage(doc, y, 60)
    y = secTitle(doc, 'Visão Consolidada do Casal', y, M)

    const porPessoa = {}
    lancamentos.forEach(l => {
      const pid  = l.pessoa_id
      const nome = l.profiles?.nome?.split(' ')[0] ?? 'Usuário'
      if (!porPessoa[pid]) porPessoa[pid] = { nome, entradas: 0, saidas: 0 }
      if (l.tipo === 'entrada') porPessoa[pid].entradas += Number(l.valor)
      else                      porPessoa[pid].saidas   += Number(l.valor)
    })

    const pessoaRows = Object.values(porPessoa).map(p => [
      p.nome,
      fmt(p.entradas),
      fmt(p.saidas),
      fmt(p.entradas - p.saidas),
    ])

    doc.autoTable({
      startY: y,
      head: [['Pessoa', 'Entradas', 'Saídas', 'Saldo']],
      body: pessoaRows,
      theme: 'plain',
      margin: { left: M, right: M },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
      },
      headStyles: {
        fillColor: C.surface,
        textColor: C.text1,
        fontStyle:  'bold',
        fontSize:   9,
        cellPadding: 3,
      },
      bodyStyles: {
        fontSize:    9,
        textColor:   C.text1,
        fillColor:   C.surface,
        cellPadding: 2.5,
      },
      alternateRowStyles: { fillColor: C.surface2 },
      didParseCell(data) {
        if (data.section === 'body' && data.column.index === 3) {
          const p = Object.values(porPessoa)[data.row.index]
          if (p) {
            const saldo = p.entradas - p.saidas
            data.cell.styles.textColor = saldo >= 0 ? C.accent : C.danger
          }
        }
      },
    })
  }

  // -------------------------------------------------------------------------
  // Rodapé em todas as páginas
  // -------------------------------------------------------------------------

  const total = doc.internal.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    const yR = 289
    doc.setDrawColor(...C.border)
    doc.setLineWidth(0.3)
    doc.line(M, yR - 4, W - M, yR - 4)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...C.text2)
    doc.text('VidaEmOrdem · Relatório gerado automaticamente', M, yR)
    doc.text(`Página ${i} de ${total}`, W - M, yR, { align: 'right' })
  }

  // -------------------------------------------------------------------------
  // Download
  // -------------------------------------------------------------------------

  doc.save(nomeArq)
}
