-- =============================================================================
-- Migration: 20260701_cartoes.sql
-- Tabelas  : public.cartoes, public.fatura_pagamentos
-- Alter    : public.lancamentos (+cartao_id, +forma_pagamento)
-- Descrição: Módulo de cartão de crédito. Cada lançamento pode ter um cartão
--   vinculado (cartao_id) — a fatura é derivada (agrupamento por competência),
--   nunca um lançamento separado. Pagar a fatura registra uma "baixa" em
--   fatura_pagamentos para liberar limite, sem duplicar o gasto no relatório.
--
-- Regra de ouro: o lançamento individual é o gasto real; a fatura é agrupamento;
-- o pagamento da fatura é apenas uma baixa de controle de limite.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Tabelas
-- -----------------------------------------------------------------------------

-- 1a. cartoes
-- pessoa_id NOT NULL (sem exceção): todo cartão pertence a uma pessoa.
-- Diferente de metas (que podem ser compartilhadas com pessoa_id IS NULL),
-- aqui não existe conceito de "cartão do casal" — cada cartão tem um dono.
-- dia_fechamento e dia_vencimento são armazenados como int (1–31) e usados
-- pelo módulo src/lib/fatura.js para calcular competência e data de vencimento
-- sem precisar persistir essas datas — elas são sempre derivadas.
create table if not exists public.cartoes (
  id             uuid          default gen_random_uuid() primary key,
  pessoa_id      uuid          not null references public.profiles(id) on delete cascade,
  nome           text          not null,
  banco          text,
  limite_total   numeric(12,2) not null check (limite_total > 0),
  dia_fechamento int           not null check (dia_fechamento between 1 and 31),
  dia_vencimento int           not null check (dia_vencimento between 1 and 31),
  ativo          boolean       default true not null,
  created_at     timestamptz   default now() not null,
  updated_at     timestamptz   default now() not null
);

-- 1b. fatura_pagamentos
-- Registra o pagamento de uma fatura (competência cartão + ano + mês).
-- NÃO cria lançamento correspondente — o gasto real já existe nos lançamentos
-- vinculados via lancamentos.cartao_id. Este registro serve apenas para:
--   • marcar a fatura como quitada nos relatórios;
--   • liberar o limite disponível do cartão;
--   • identificar quem pagou (pago_por), útil para o casal.
-- Constraint UNIQUE(cartao_id, competencia_ano, competencia_mes) impede
-- pagamento duplicado da mesma competência; o upsert em useCartoes.pagarFatura
-- usa esse conflito (INSERT ON CONFLICT DO UPDATE) para corrigir valor/data.
-- Não tem updated_at: é um registro de baixa. Se precisar corrigir,
-- o hook deleta e recria (ou usa o upsert pela chave única).
create table if not exists public.fatura_pagamentos (
  id               uuid          default gen_random_uuid() primary key,
  cartao_id        uuid          not null references public.cartoes(id) on delete cascade,
  competencia_ano  int           not null,
  competencia_mes  int           not null check (competencia_mes between 1 and 12),
  valor_pago       numeric(12,2) not null,
  data_pagamento   date          not null,
  -- pago_por NULL é permitido para suportar importação de pagamentos históricos
  -- onde não se sabe (ou não importa) quem realizou o pagamento.
  pago_por         uuid          references public.profiles(id),
  created_at       timestamptz   default now() not null,
  unique (cartao_id, competencia_ano, competencia_mes)
);

-- 1c. Colunas adicionadas em lancamentos
-- cartao_id: vincula o lançamento a um cartão. NULL = pagamento não foi no crédito
--   (ou o cartão não está cadastrado). on delete set null preserva o histórico
--   de gastos caso o cartão seja deletado do sistema (preferir ativo=false).
-- forma_pagamento: enum dos meios de pagamento comuns no Brasil. Sem FK, sem
--   tabela auxiliar — enum CHECK é suficiente para um conjunto fechado e estável.
--   Não há constraint cruzada com cartao_id para flexibilizar a importação de
--   dados históricos (ex.: sabe-se que foi crédito, mas o cartão não está
--   cadastrado — cartao_id fica NULL e forma_pagamento='credito' é válido).
alter table public.lancamentos
  add column if not exists cartao_id       uuid references public.cartoes(id) on delete set null,
  add column if not exists forma_pagamento text
    check (forma_pagamento in ('dinheiro', 'pix', 'debito', 'credito', 'transferencia', 'boleto'));

-- -----------------------------------------------------------------------------
-- 2. Índices
--    cartoes(pessoa_id)             → filtro principal: cartões de um usuário
--    lancamentos(cartao_id)         → consulta de lançamentos por cartão (fatura)
--    fatura_pagamentos(cartao_id)   → consulta de faturas/pagamentos por cartão
-- -----------------------------------------------------------------------------
create index if not exists cartoes_pessoa_id_idx
  on public.cartoes(pessoa_id);

create index if not exists lancamentos_cartao_id_idx
  on public.lancamentos(cartao_id);

create index if not exists fatura_pagamentos_cartao_id_idx
  on public.fatura_pagamentos(cartao_id);

-- -----------------------------------------------------------------------------
-- 3. RLS — cartoes
-- • Membro : vê/edita apenas seus próprios cartões (pessoa_id = uid)
-- • Admin  : vê/edita todos os cartões sem restrição
-- Não há caso "compartilhado" — pessoa_id é sempre NOT NULL (ver comentário 1a).
-- -----------------------------------------------------------------------------
alter table public.cartoes enable row level security;

-- SELECT
create policy "cartoes_select"
  on public.cartoes for select
  using (
    pessoa_id = auth.uid()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- INSERT
-- Membro só pode criar cartão com pessoa_id = seu próprio uid.
-- Admin pode criar cartão para qualquer pessoa_id (ex: cadastrar cartão da esposa
-- durante a configuração inicial sem precisar trocar de sessão).
create policy "cartoes_insert"
  on public.cartoes for insert
  with check (
    auth.uid() is not null
    and (
      pessoa_id = auth.uid()
      or exists (
        select 1 from public.profiles
        where id = auth.uid() and role = 'admin'
      )
    )
  );

-- UPDATE
create policy "cartoes_update"
  on public.cartoes for update
  using (
    pessoa_id = auth.uid()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- DELETE
-- Recomendação: preferir ativo=false em vez de delete físico para preservar o
-- histórico de lançamentos vinculados. Delete está disponível se necessário.
create policy "cartoes_delete"
  on public.cartoes for delete
  using (
    pessoa_id = auth.uid()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- -----------------------------------------------------------------------------
-- 4. RLS — fatura_pagamentos
-- Não tem pessoa_id direto. Acesso é derivado via cartao_id → cartoes.pessoa_id:
-- quem pode ver/editar o cartão pode ver/editar seus pagamentos de fatura.
-- UPDATE incluído porque useCartoes.pagarFatura usa upsert
-- (INSERT ON CONFLICT DO UPDATE); sem policy de UPDATE o upsert falharia
-- silenciosamente no caso de conflito.
-- -----------------------------------------------------------------------------
alter table public.fatura_pagamentos enable row level security;

-- SELECT
create policy "fatura_pagamentos_select"
  on public.fatura_pagamentos for select
  using (
    exists (
      select 1 from public.cartoes c
      where c.id = cartao_id
        and (
          c.pessoa_id = auth.uid()
          or exists (
            select 1 from public.profiles
            where id = auth.uid() and role = 'admin'
          )
        )
    )
  );

-- INSERT
create policy "fatura_pagamentos_insert"
  on public.fatura_pagamentos for insert
  with check (
    auth.uid() is not null
    and exists (
      select 1 from public.cartoes c
      where c.id = cartao_id
        and (
          c.pessoa_id = auth.uid()
          or exists (
            select 1 from public.profiles
            where id = auth.uid() and role = 'admin'
          )
        )
    )
  );

-- UPDATE
-- Necessário para o upsert de pagarFatura (INSERT ON CONFLICT DO UPDATE).
-- Aplica a mesma verificação de propriedade via cartao_id → cartoes.
-- WITH CHECK replica a mesma condição do USING: sem ele, o UPDATE só valida
-- a linha ANTES da mudança, permitindo trocar cartao_id para um cartão que
-- o usuário não possui (USING sozinho não valida o novo valor da linha).
create policy "fatura_pagamentos_update"
  on public.fatura_pagamentos for update
  using (
    exists (
      select 1 from public.cartoes c
      where c.id = cartao_id
        and (
          c.pessoa_id = auth.uid()
          or exists (
            select 1 from public.profiles
            where id = auth.uid() and role = 'admin'
          )
        )
    )
  )
  with check (
    exists (
      select 1 from public.cartoes c
      where c.id = cartao_id
        and (
          c.pessoa_id = auth.uid()
          or exists (
            select 1 from public.profiles
            where id = auth.uid() and role = 'admin'
          )
        )
    )
  );

-- DELETE
create policy "fatura_pagamentos_delete"
  on public.fatura_pagamentos for delete
  using (
    exists (
      select 1 from public.cartoes c
      where c.id = cartao_id
        and (
          c.pessoa_id = auth.uid()
          or exists (
            select 1 from public.profiles
            where id = auth.uid() and role = 'admin'
          )
        )
    )
  );

-- -----------------------------------------------------------------------------
-- 5. Trigger updated_at — cartoes
-- Reutiliza public.handle_updated_at() criada em 20260627_metas.sql.
-- create or replace garante que a função exista mesmo se esta migration rodar
-- antes ou independentemente da migration de metas — é o mesmo padrão adotado
-- em metas.sql: cada migration que usa a função a (re)declara de forma segura.
-- fatura_pagamentos NÃO recebe trigger: não tem coluna updated_at (ver 1b).
-- -----------------------------------------------------------------------------
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger cartoes_updated_at
  before update on public.cartoes
  for each row execute procedure public.handle_updated_at();
