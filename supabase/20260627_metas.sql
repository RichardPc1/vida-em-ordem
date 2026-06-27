-- =============================================================================
-- Migration: 20260627_metas.sql
-- Tabela: public.metas
-- Descrição: Metas financeiras individuais e compartilhadas do casal.
--   pessoa_id NULL  → meta compartilhada (visível a todos os membros)
--   pessoa_id NOT NULL → meta individual (visível ao dono + admin)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Tabela
-- -----------------------------------------------------------------------------
create table if not exists public.metas (
  id          uuid          default gen_random_uuid() primary key,
  titulo      text          not null,
  descricao   text,
  valor_alvo  numeric(12,2) not null,
  valor_atual numeric(12,2) default 0 not null,
  prazo       date,
  status      text          default 'ativa' not null
                check (status in ('ativa', 'concluida', 'cancelada')),
  -- NULL = meta compartilhada do casal; NOT NULL = meta individual
  pessoa_id   uuid          references public.profiles(id) on delete cascade,
  created_at  timestamptz   default now() not null,
  updated_at  timestamptz   default now() not null
);

-- -----------------------------------------------------------------------------
-- 2. Índices
--    pessoa_id  → filtro principal em todas as queries de listagem
--    status     → filtro frequente (metas ativas vs concluídas)
-- -----------------------------------------------------------------------------
create index if not exists metas_pessoa_id_idx on public.metas(pessoa_id);
create index if not exists metas_status_idx    on public.metas(status);

-- -----------------------------------------------------------------------------
-- 3. RLS
-- -----------------------------------------------------------------------------
alter table public.metas enable row level security;

-- SELECT
-- • Membro : vê metas próprias (pessoa_id = uid) + compartilhadas (pessoa_id IS NULL)
-- • Admin  : vê todas as metas sem restrição
create policy "metas_select"
  on public.metas for select
  using (
    pessoa_id = auth.uid()
    or pessoa_id is null
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- INSERT
-- • Qualquer usuário autenticado pode criar metas próprias ou compartilhadas
-- • Admin pode criar meta para qualquer pessoa_id (incluindo outro perfil)
create policy "metas_insert"
  on public.metas for insert
  with check (
    auth.uid() is not null
    and (
      pessoa_id = auth.uid()
      or pessoa_id is null
      or exists (
        select 1 from public.profiles
        where id = auth.uid() and role = 'admin'
      )
    )
  );

-- UPDATE
-- • Membro  : atualiza metas próprias + compartilhadas
-- • Admin   : atualiza qualquer meta
-- Decisão: metas compartilhadas (pessoa_id IS NULL) são editáveis por qualquer
-- membro autenticado porque pertencem ao casal, não a um indivíduo.
create policy "metas_update"
  on public.metas for update
  using (
    pessoa_id = auth.uid()
    or pessoa_id is null
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- DELETE
-- • Membro  : deleta apenas metas próprias (NÃO pode deletar compartilhadas)
-- • Admin   : deleta qualquer meta
-- Decisão: metas compartilhadas não podem ser deletadas por um único membro
-- para evitar exclusão acidental de meta que pertence ao casal.
create policy "metas_delete"
  on public.metas for delete
  using (
    pessoa_id = auth.uid()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- -----------------------------------------------------------------------------
-- 4. Trigger updated_at
-- Cria (ou substitui) a função utilitária handle_updated_at — seguro para
-- reutilização por outras tabelas que precisem do mesmo comportamento.
-- -----------------------------------------------------------------------------
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger metas_updated_at
  before update on public.metas
  for each row execute procedure public.handle_updated_at();
