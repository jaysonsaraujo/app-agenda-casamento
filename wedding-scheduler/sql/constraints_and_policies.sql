-- =========[ CONSTRAINTS E ÍNDICES ÚTEIS ]=========
-- Não vamos ter UNIQUE que proíba casais comunitários no mesmo slot.
-- Apenas índices para performance dos checks.

-- Índice por slot completo (data/hora/local/celebrante)
create index if not exists idx_weddings_slot
  on public.weddings (wedding_date, wedding_time, location_id, celebrant_id);

-- Índice para conferir conflitos de celebrante no mesmo dia/hora
create index if not exists idx_weddings_celebrant_time
  on public.weddings (wedding_date, wedding_time, celebrant_id);

-- Índice por dia para contagem de eventos
create index if not exists idx_weddings_by_day
  on public.weddings (wedding_date);

-- Se você tiver criado algum UNIQUE antigo que travava comunitários, remova aqui:
-- drop index if exists unique_celebrant_datetime;          -- exemplo
-- drop index if exists unique_wedding_date_time_celebrant; -- exemplo
-- (Deixe comentado caso não existam; use conforme seu projeto)

-- =========[ POLICIES (opcional, caso RLS habilitado) ]=========
-- A UI usa papel 'anon' no frontend. Garanta SELECT/INSERT/UPDATE mínimos.
-- Se já tiver policies adequadas, pode pular esta parte.

do $$
begin
  if exists (select 1 from pg_tables where schemaname='public' and tablename='weddings') then
    -- SELECT para ler calendário
    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='weddings' and policyname='anon_select_weddings'
    ) then
      create policy anon_select_weddings
        on public.weddings for select
        to anon
        using (true);
    end if;

    -- INSERT para criar/agendar
    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='weddings' and policyname='anon_insert_weddings'
    ) then
      create policy anon_insert_weddings
        on public.weddings for insert
        to anon
        with check (true);
    end if;

    -- UPDATE para editar
    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='weddings' and policyname='anon_update_weddings'
    ) then
      create policy anon_update_weddings
        on public.weddings for update
        to anon
        using (true)
        with check (true);
    end if;

    -- DELETE (se a UI permitir excluir)
    if not exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='weddings' and policyname='anon_delete_weddings'
    ) then
      create policy anon_delete_weddings
        on public.weddings for delete
        to anon
        using (true);
    end if;
  end if;
end$$;
