import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

// ─── Paleta ───────────────────────────────────────────────────────────────────
const C = {
  bg:       [15,  15,  15],
  surface:  [26,  26,  26],
  border:   [46,  46,  46],
  accent:   [200, 240, 77],
  text1:    [242, 242, 242],
  text2:    [138, 138, 138],
  danger:   [255, 92,  92],
  warning:  [255, 184, 48],
  success:  [78,  205, 196],
}

const W   = 210   // A4 largura mm
const H   = 297   // A4 altura mm
const M   = 20    // margem lateral
const CW  = W - M * 2  // largura útil

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fillPage(doc) {
  doc.setFillColor(...C.bg)
  doc.rect(0, 0, W, H, 'F')
}

function hline(doc, y, color = C.border) {
  doc.setDrawColor(...color)
  doc.setLineWidth(0.3)
  doc.line(M, y, W - M, y)
}

function setColor(doc, color) { doc.setTextColor(...color) }

function text(doc, str, x, y, opts = {}) {
  doc.text(str, x, y, opts)
}

function sectionTitle(doc, title, y) {
  setColor(doc, C.accent)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  text(doc, title, M, y)
  return y + 10
}

function body(doc, str, x, y, maxWidth = CW) {
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  setColor(doc, C.text1)
  const lines = doc.splitTextToSize(str, maxWidth)
  text(doc, lines, x, y)
  return y + lines.length * 6
}

function label(doc, str, x, y) {
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  setColor(doc, C.accent)
  text(doc, str, x, y)
  return y + 6
}

function sub(doc, str, x, y, maxWidth = CW) {
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  setColor(doc, C.text2)
  const lines = doc.splitTextToSize(str, maxWidth)
  text(doc, lines, x, y)
  return y + lines.length * 5.5
}

function bullet(doc, items, x, y, maxWidth = CW - 8) {
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  setColor(doc, C.text1)
  for (const item of items) {
    const lines = doc.splitTextToSize(`• ${item}`, maxWidth)
    text(doc, lines, x + 4, y)
    y += lines.length * 5.5
  }
  return y
}

function footer(doc, pageNum, total) {
  const y = H - 12
  hline(doc, y - 4)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  setColor(doc, C.text2)
  text(doc, 'VidaEmOrdem · Documentação', M, y)
  text(doc, `${pageNum} / ${total}`, W - M, y, { align: 'right' })
}

function tableStyle() {
  return {
    theme: 'plain',
    styles: {
      fillColor:   C.surface,
      textColor:   C.text1,
      fontSize:    10,
      cellPadding: { top: 5, bottom: 5, left: 6, right: 6 },
      lineColor:   C.border,
      lineWidth:   0.3,
    },
    headStyles: {
      fillColor: [36, 36, 36],
      textColor:  C.accent,
      fontStyle: 'bold',
      fontSize:   10,
    },
    alternateRowStyles: {
      fillColor: [22, 22, 22],
    },
  }
}

// ─── Páginas ──────────────────────────────────────────────────────────────────

function pageCapa(doc) {
  fillPage(doc)

  const cx = W / 2
  const dataHoje = new Date().toLocaleDateString('pt-BR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
  const dataStr = dataHoje.charAt(0).toUpperCase() + dataHoje.slice(1)

  // Logo / nome
  doc.setFontSize(48)
  doc.setFont('helvetica', 'bold')
  setColor(doc, C.accent)
  text(doc, 'VidaEmOrdem', cx, 110, { align: 'center' })

  // Subtítulo
  doc.setFontSize(20)
  doc.setFont('helvetica', 'normal')
  setColor(doc, C.text2)
  text(doc, 'Documentação do App', cx, 126, { align: 'center' })

  // Versão
  doc.setFontSize(12)
  setColor(doc, C.text2)
  text(doc, `Versão 2.0 — ${dataStr}`, cx, 140, { align: 'center' })

  // Linha
  hline(doc, 152)

  // Tagline
  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  setColor(doc, C.text1)
  text(doc, 'Seu app pessoal de tarefas e finanças', cx, 166, { align: 'center' })
}

function pageVisaoGeral(doc) {
  fillPage(doc)
  let y = 30

  y = sectionTitle(doc, 'Visão Geral', y)
  hline(doc, y)
  y += 10

  y = body(doc,
    'VidaEmOrdem é um app pessoal PWA desenvolvido para Richard e Rebeca gerenciarem ' +
    'tarefas domésticas e finanças do casal de forma simples e organizada.',
    M, y)
  y += 8

  y = label(doc, 'Para quem é:', M, y)
  y = bullet(doc, [
    'Richard (admin) — vê e gerencia tudo: próprias tarefas, tarefas da Rebeca, lançamentos e metas do casal',
    'Rebeca (membro) — vê e gerencia apenas seus próprios dados e as metas compartilhadas',
  ], M, y)
  y += 10

  y = label(doc, 'Stack tecnológica:', M, y)
  y = bullet(doc, [
    'Frontend: React 18 + Vite 6 + Tailwind CSS v3 + shadcn/ui',
    'Backend: Supabase (PostgreSQL + Auth + Row Level Security + Realtime)',
    'Deploy: Vercel com suporte a PWA instalável',
    'IA: OpenAI GPT-4o-mini integrado no Assistente',
    'Gráficos: Recharts',
  ], M, y)
  y += 10

  y = label(doc, 'Módulos disponíveis:', M, y)
  y = bullet(doc, [
    'Dashboard — visão geral do mês com métricas e gráfico',
    'Tarefas — CRUD completo com recorrência e filtros',
    'Financeiro — lançamentos de entrada/saída com relatório PDF',
    'Orçamento — envelope budgeting por categoria',
    'Metas — metas individuais e do casal com depósitos',
    'Assistente IA — comandos por texto e voz',
    'Perfil — dados do usuário e configurações',
  ], M, y)
}

function pageAcesso(doc) {
  fillPage(doc)
  let y = 30

  y = sectionTitle(doc, 'Como Acessar', y)
  hline(doc, y)
  y += 10

  y = label(doc, 'Login:', M, y)
  y = body(doc,
    'Acesse o app pela URL do Vercel no navegador. Digite seu email e senha cadastrados. ' +
    'Não existe tela de cadastro público — os usuários são criados manualmente.',
    M, y)
  y += 10

  y = label(doc, 'Instalar como app no Android (PWA):', M, y)
  y = bullet(doc, [
    'Abra o Chrome e acesse a URL do app',
    'Toque no menu (três pontinhos ⋮) no canto superior direito',
    'Selecione "Adicionar à tela inicial"',
    'Confirme o nome e toque em "Adicionar"',
    'O app aparecerá na tela inicial como um ícone nativo',
  ], M, y)
  y += 10

  y = label(doc, 'Instalar como app no iOS (PWA):', M, y)
  y = bullet(doc, [
    'Abra o Safari (obrigatório no iOS) e acesse a URL do app',
    'Toque no botão Compartilhar (ícone de seta para cima)',
    'Role para baixo e selecione "Adicionar à Tela de Início"',
    'Confirme o nome e toque em "Adicionar"',
    'O app aparecerá na tela inicial como um ícone nativo',
  ], M, y)
  y += 10

  y = label(doc, 'Acesso pelo computador:', M, y)
  y = body(doc,
    'Acesse pela URL do Vercel em qualquer navegador moderno (Chrome, Edge, Firefox, Safari). ' +
    'O layout adapta automaticamente para telas maiores com sidebar lateral.',
    M, y)
}

function pageDashboard(doc) {
  fillPage(doc)
  let y = 30

  y = sectionTitle(doc, 'Dashboard', y)
  hline(doc, y)
  y += 10

  y = body(doc,
    'A tela inicial do app. Mostra um resumo financeiro e de tarefas do mês atual, ' +
    'além do registro de humor do dia.',
    M, y)
  y += 8

  y = label(doc, 'Cards de métricas:', M, y)
  y = bullet(doc, [
    'Saldo do mês — diferença entre entradas e saídas do mês atual',
    'Entradas — total de receitas lançadas no mês',
    'Saídas — total de despesas lançadas no mês',
    'Tarefas pendentes — quantidade de tarefas não concluídas',
    'Tarefas concluídas — total concluído no mês',
    'Metas ativas — quantas metas estão em andamento',
  ], M, y)
  y += 8

  y = label(doc, 'Gráfico de 6 meses:', M, y)
  y = body(doc,
    'Exibe barras de entradas (verde) e saídas (vermelho) dos últimos 6 meses, ' +
    'permitindo visualizar a tendência financeira do casal.',
    M, y)
  y += 8

  y = label(doc, 'Card de humor:', M, y)
  y = body(doc,
    'Registre como está se sentindo no dia escolhendo um emoji. ' +
    'O dashboard exibe o humor atual do casal (Richard vê ambos, Rebeca vê só o seu). ' +
    'Clique no emoji desejado para registrar.',
    M, y)
  y += 8

  y = label(doc, 'Pull to refresh:', M, y)
  y = body(doc,
    'No celular, puxe a tela para baixo e solte para atualizar todos os dados. ' +
    'Um indicador circular animado aparece durante o carregamento.',
    M, y)
  y += 8

  y = label(doc, 'Proximas tarefas:', M, y)
  y = body(doc,
    'Lista as tarefas com vencimento mais próximo. ' +
    'Tarefas atrasadas aparecem com destaque em vermelho.',
    M, y)
}

function pageTarefas(doc) {
  fillPage(doc)
  let y = 30

  y = sectionTitle(doc, 'Tarefas', y)
  hline(doc, y)
  y += 10

  y = label(doc, 'Como criar uma tarefa:', M, y)
  y = bullet(doc, [
    'Toque no botão "Nova tarefa" no canto superior direito',
    'Preencha o título (obrigatório)',
    'Escolha a categoria: Casa, Trabalho, Saúde, Financeiro, Compras ou Outro',
    'Defina a prioridade: Alta, Média ou Baixa',
    'Adicione uma data de vencimento (opcional)',
    'Se admin: selecione para quem é a tarefa (você ou Rebeca)',
    'Adicione uma descrição ou observações (opcional)',
    'Toque em "Salvar"',
  ], M, y)
  y += 8

  y = label(doc, 'Como marcar como concluida:', M, y)
  y = body(doc,
    'Toque no círculo à esquerda da tarefa. O status alterna entre pendente e concluída. ' +
    'Tarefas concluídas aparecem riscadas no final da lista.',
    M, y)
  y += 8

  y = label(doc, 'Filtros disponíveis:', M, y)
  y = bullet(doc, [
    'Por status: Todas, Pendentes, Em progresso, Concluídas',
    'Por prioridade: Todas, Alta, Média, Baixa',
    'Por pessoa (só admin): Todos, Eu, Rebeca',
  ], M, y)
  y += 8

  y = label(doc, 'Tarefas recorrentes:', M, y)
  y = body(doc,
    'Ao criar ou editar uma tarefa, ative a opção "Repetir" e escolha a frequência: ' +
    'Diário, Semanal, Quinzenal ou Mensal. ' +
    'Quando você conclui uma tarefa recorrente, o app cria automaticamente a próxima ' +
    'com a nova data calculada. Um toast mostra a data da próxima ocorrência.',
    M, y)
  y += 8

  y = label(doc, 'Visao por perfil:', M, y)
  y = bullet(doc, [
    'Richard (admin): vê todas as tarefas — as suas e as da Rebeca. Pode criar tarefas para Rebeca.',
    'Rebeca (membro): vê e gerencia apenas suas próprias tarefas.',
  ], M, y)
}

function pageFinanceiro(doc) {
  fillPage(doc)
  let y = 30

  y = sectionTitle(doc, 'Financeiro', y)
  hline(doc, y)
  y += 10

  y = body(doc,
    'Módulo de controle de receitas e despesas por mês. ' +
    'Cada usuário gerencia seus próprios lançamentos.',
    M, y)
  y += 8

  y = label(doc, 'Como lancar entrada ou saida:', M, y)
  y = bullet(doc, [
    'Toque no botão "+" no canto superior direito',
    'Selecione o tipo: Entrada (receita) ou Saída (despesa)',
    'Digite o valor e a descrição',
    'Escolha a categoria (Alimentação, Transporte, Saúde, etc.)',
    'Defina a data do lançamento',
    'Toque em "Salvar"',
  ], M, y)
  y += 8

  y = label(doc, 'Lancamento parcelado:', M, y)
  y = body(doc,
    'Ao criar uma saída, ative "Parcelado" e informe o número de parcelas. ' +
    'O app cria automaticamente todas as parcelas com as datas mensais subsequentes, ' +
    'identificadas como "1/12", "2/12", etc.',
    M, y)
  y += 8

  y = label(doc, 'Navegar entre meses:', M, y)
  y = body(doc,
    'Use as setas < > no topo da tela para navegar entre os meses. ' +
    'Os dados, totais e gráficos atualizam automaticamente.',
    M, y)
  y += 8

  y = label(doc, 'Exportar relatorio PDF:', M, y)
  y = body(doc,
    'Toque no ícone de PDF no canto superior direito. ' +
    'O app gera e faz o download de um relatório completo do mês selecionado, ' +
    'com totais, gráfico de categorias e lista detalhada de lançamentos.',
    M, y)
  y += 8

  y = label(doc, 'Graficos:', M, y)
  y = bullet(doc, [
    'Pizza — distribuição percentual por categoria de saídas',
    'Barras — comparativo de entradas x saídas dos últimos 6 meses',
  ], M, y)
}

function pageOrcamento(doc) {
  fillPage(doc)
  let y = 30

  y = sectionTitle(doc, 'Orcamento', y)
  hline(doc, y)
  y += 10

  y = body(doc,
    'O módulo de orçamento usa o método de Envelope Budgeting — você define um limite ' +
    'de gasto para cada categoria e acompanha em tempo real o quanto já foi usado.',
    M, y)
  y += 10

  y = label(doc, 'O que e Envelope Budgeting:', M, y)
  y = body(doc,
    'Imagine que você separa dinheiro em envelopes físicos: um para alimentação, ' +
    'um para transporte, um para lazer, etc. Quando o envelope acaba, acabou o orçamento ' +
    'daquela categoria. O app digitaliza essa ideia com barras de progresso visuais.',
    M, y)
  y += 10

  y = label(doc, 'Como configurar limite por categoria:', M, y)
  y = bullet(doc, [
    'Toque em uma categoria para editar seu limite mensal',
    'Digite o valor máximo que deseja gastar naquela categoria',
    'O app compara automaticamente com os lançamentos do módulo Financeiro',
    'Navegue entre meses com as setas < > no topo',
  ], M, y)
  y += 10

  y = label(doc, 'Como interpretar as barras de progresso:', M, y)
  y = bullet(doc, [
    'Verde (accent #C8F04D) — abaixo de 70% do limite usado',
    'Amarelo (#FFB830)     — entre 70% e 90% do limite, atenção redobrada',
    'Vermelho (#FF5C5C)    — acima de 90% do limite, orçamento estourado',
  ], M, y)
  y += 10

  y = label(doc, 'Dica:', M, y)
  y = body(doc,
    'Configure os limites no início do mês com base nos lançamentos recorrentes ' +
    '(contas fixas, parcelas) e reserve uma margem para imprevistos.',
    M, y)
}

function pageMetas(doc) {
  fillPage(doc)
  let y = 30

  y = sectionTitle(doc, 'Metas', y)
  hline(doc, y)
  y += 10

  y = body(doc,
    'Módulo de metas financeiras — acompanhe o progresso de economias para objetivos ' +
    'individuais ou compartilhados do casal.',
    M, y)
  y += 8

  y = label(doc, 'Como criar uma meta individual:', M, y)
  y = bullet(doc, [
    'Toque no botão "Nova meta"',
    'Preencha o título (ex: "Fundo de emergência")',
    'Defina o valor alvo (ex: R$ 10.000,00)',
    'Adicione uma data prazo (opcional)',
    'Deixe o campo "Compartilhada" desativado',
    'Toque em "Salvar"',
  ], M, y)
  y += 8

  y = label(doc, 'Como criar uma meta compartilhada:', M, y)
  y = body(doc,
    'Siga os mesmos passos acima e ative a opção "Compartilhada". ' +
    'A meta ficará visível para ambos os perfis. ' +
    'Tanto Richard quanto Rebeca podem fazer depósitos nela.',
    M, y)
  y += 8

  y = label(doc, 'Como fazer um deposito:', M, y)
  y = bullet(doc, [
    'Abra a meta desejada',
    'Toque em "Depositar"',
    'Digite o valor a ser adicionado',
    'Confirme — o progresso atualiza imediatamente',
  ], M, y)
  y += 8

  y = label(doc, 'Acompanhamento:', M, y)
  y = bullet(doc, [
    'Barra de progresso — visual do quanto foi alcançado (verde = 100%)',
    'Percentual — "X% da meta alcançada"',
    'Countdown — dias restantes até o prazo ("X dias restantes" ou "Vence hoje")',
    'Para metas compartilhadas: barra dividida mostrando a contribuição de cada um',
  ], M, y)
}

function pageAssistente(doc) {
  fillPage(doc)
  let y = 30

  y = sectionTitle(doc, 'Assistente IA', y)
  hline(doc, y)
  y += 10

  y = body(doc,
    'O Assistente usa inteligência artificial (OpenAI GPT-4o-mini) para entender ' +
    'comandos em linguagem natural e executar ações no app.',
    M, y)
  y += 8

  y = label(doc, 'Como abrir:', M, y)
  y = body(doc,
    'Toque no botão circular verde flutuante no canto inferior direito da tela. ' +
    'Um painel desliza de baixo com o campo de texto e o botão de microfone.',
    M, y)
  y += 8

  y = label(doc, 'Como usar por texto:', M, y)
  y = body(doc,
    'Digite seu comando em português e pressione Enter ou toque no botão enviar. ' +
    'O assistente interpreta a intenção, executa a ação e confirma o que foi feito.',
    M, y)
  y += 8

  y = label(doc, 'Como usar por voz:', M, y)
  y = body(doc,
    'Toque no ícone de microfone. Fale seu comando em português (o botão pulsa em vermelho ' +
    'enquanto ouve). O texto aparece automaticamente no campo. ' +
    'O app envia quando o reconhecimento terminar.',
    M, y)
  y += 10

  y = label(doc, 'Exemplos de comandos:', M, y)
  y += 4

  autoTable(doc, {
    startY:  y,
    margin:  { left: M, right: M },
    head:    [['Comando', 'O que faz']],
    body:    [
      ['"Adiciona um gasto de R$50 de almoco hoje"',    'Cria lançamento de saída de R$ 50,00'],
      ['"Cria tarefa pagar conta de luz na sexta"',     'Cria tarefa com vencimento na sexta-feira'],
      ['"Quanto gastei esse mes?"',                      'Mostra o total de saídas do mês atual'],
      ['"Cria meta viagem R$5000 pra dezembro"',         'Cria meta financeira com prazo em dezembro'],
      ['"Quais tarefas tenho pendentes?"',               'Lista as tarefas ainda não concluídas'],
    ],
    ...tableStyle(),
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: CW - 90 },
    },
  })

  y = doc.lastAutoTable.finalY + 10

  y = label(doc, 'O que o Assistente NAO faz:', M, y)
  y = bullet(doc, [
    'Deletar tarefas, lançamentos ou metas (por segurança, exclusões são sempre manuais)',
    'Acessar dados de períodos futuros ou fazer previsões',
    'Enviar mensagens ou notificações para terceiros',
  ], M, y)
}

function pagePermissoes(doc) {
  fillPage(doc)
  let y = 30

  y = sectionTitle(doc, 'Perfis e Permissoes', y)
  hline(doc, y)
  y += 10

  y = body(doc,
    'O app tem dois perfis fixos. As permissões são controladas por Row Level Security (RLS) ' +
    'diretamente no banco de dados — não é possível burlar pelo frontend.',
    M, y)
  y += 10

  y = label(doc, 'Tabela de permissoes:', M, y)
  y += 4

  autoTable(doc, {
    startY:  y,
    margin:  { left: M, right: M },
    head:    [['Funcionalidade', 'Richard (Admin)', 'Rebeca (Membro)']],
    body:    [
      ['Ver proprias tarefas',          '✓', '✓'],
      ['Ver tarefas da Rebeca',         '✓', '✗'],
      ['Criar tarefa para Rebeca',      '✓', '✗'],
      ['Editar tarefa da Rebeca',       '✓', '✗'],
      ['Ver proprios lancamentos',      '✓', '✓'],
      ['Ver lancamentos do Richard',    '✓', '✗'],
      ['Criar lancamentos',             '✓', '✓'],
      ['Metas individuais',             '✓', '✓'],
      ['Metas compartilhadas',          '✓', '✓'],
      ['Depositar em metas',            '✓', '✓'],
      ['Humor do casal (dashboard)',    '✓', 'Só o próprio'],
      ['Exportar relatorio PDF',        '✓', '✓'],
      ['Usar Assistente IA',            '✓', '✓'],
    ],
    ...tableStyle(),
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: (CW - 90) / 2, halign: 'center' },
      2: { cellWidth: (CW - 90) / 2, halign: 'center' },
    },
  })
}

function pageProblemas(doc) {
  fillPage(doc)
  let y = 30

  y = sectionTitle(doc, 'Problemas Comuns', y)
  hline(doc, y)
  y += 10

  y = body(doc,
    'A maioria dos problemas é resolvida com uma das soluções abaixo. ' +
    'Se o problema persistir, entre em contato com o admin.',
    M, y)
  y += 10

  autoTable(doc, {
    startY:  y,
    margin:  { left: M, right: M },
    head:    [['Problema', 'Solução']],
    body:    [
      ['App não atualiza os dados',
       'Puxe a tela para baixo (pull to refresh) ou recarregue a página'],
      ['Dados não aparecem após login',
       'Faça logout e login novamente. Se persistir, limpe o cache do navegador'],
      ['Assistente não responde',
       'Verifique sua conexão com a internet. O assistente requer acesso à API OpenAI'],
      ['Microfone não funciona no Assistente',
       'Permita acesso ao microfone nas configurações do navegador/sistema'],
      ['PDF não é gerado',
       'Tente novamente. Se persistir, tente em outro navegador ou contate o admin'],
      ['App PWA não instala',
       'No iOS use obrigatoriamente o Safari. No Android use o Chrome'],
      ['Tela de login em loop',
       'Limpe os dados do site/app nas configurações do navegador e tente novamente'],
      ['Lançamento não aparece no orçamento',
       'Verifique se a categoria do lançamento corresponde a uma categoria configurada no Orçamento'],
    ],
    ...tableStyle(),
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: CW - 80 },
    },
  })
}

function pageRoadmap(doc) {
  fillPage(doc)
  let y = 30

  y = sectionTitle(doc, 'Roadmap', y)
  hline(doc, y)
  y += 10

  y = label(doc, 'V2 — Ja implementado:', M, y)
  y = bullet(doc, [
    'Dashboard com métricas, gráfico de 6 meses e card de humor',
    'Tarefas com recorrência, filtros e atribuição entre perfis',
    'Financeiro com lançamentos parcelados e relatório PDF',
    'Orçamento com envelope budgeting por categoria',
    'Metas individuais e compartilhadas com depósitos',
    'Assistente IA com entrada por texto e voz (Web Speech API)',
    'Pull-to-refresh em todas as telas',
    'PWA instalável no Android e iOS',
    'Design system dark mode com paleta consistente',
  ], M, y)
  y += 10

  y = label(doc, 'V3 — Planejado:', M, y)
  y = bullet(doc, [
    'Notificações push — lembretes de tarefas com vencimento próximo',
    'Importação de extrato bancário OFX/CSV — lançamentos automáticos',
    'Integração Google Calendar — visualizar tarefas no calendário',
    'Exportação Google Sheets — backup automático dos lançamentos',
    'Relatório mensal por email — resumo automático enviado no 1º dia do mês',
    'Modo planejamento — projetar saldo futuro com base em recorrências',
    'App nativo (React Native) para melhor experiência mobile',
  ], M, y)

  y += 10
  hline(doc, y, C.accent)
  y += 10

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  setColor(doc, C.text2)
  text(doc,
    'Sugestões de funcionalidades? Fale com o admin.',
    M, y)
}

// ─── Exportação principal ─────────────────────────────────────────────────────

export function gerarDocumentacaoPDF() {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const pages = [
    pageCapa,
    pageVisaoGeral,
    pageAcesso,
    pageDashboard,
    pageTarefas,
    pageFinanceiro,
    pageOrcamento,
    pageMetas,
    pageAssistente,
    pagePermissoes,
    pageProblemas,
    pageRoadmap,
  ]

  const total = pages.length

  pages.forEach((fn, i) => {
    if (i > 0) doc.addPage()
    fn(doc)
    if (i > 0) footer(doc, i + 1, total)  // capa não tem rodapé
  })

  doc.save('VidaEmOrdem_Documentacao.pdf')
}
