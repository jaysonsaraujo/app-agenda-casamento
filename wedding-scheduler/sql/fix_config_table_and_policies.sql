-- 1) Tabela de configurações (cria se não existir)
create table if not exists public.system_config (
  config_key   text primary key,
  config_value text not null,
  config_type  text default 'string',
  description  text
);

-- 2) Habilita RLS (e mantém explícito)
alter table public.system_config enable row level security;

-- 3) Policies para a UI pública (ANON).
--    Se você preferir restringir UPDATE/INSERT, depois a gente troca por "authenticated" + Auth.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'system_config' and policyname = 'anon_select_system_config'
  ) then
    create policy anon_select_system_config
      on public.system_config for select
      to anon
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'system_config' and policyname = 'anon_upsert_system_config'
  ) then
    create policy anon_upsert_system_config
      on public.system_config for insert
      to anon
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'system_config' and policyname = 'anon_update_system_config'
  ) then
    create policy anon_update_system_config
      on public.system_config for update
      to anon
      using (true)
      with check (true);
  end if;
end$$;

-- 4) Semeia valores padrão, sem sobrepor os já existentes
insert into public.system_config (config_key, config_value, config_type, description) values
  ('site_name', 'Sistema de Agendamento de Casamentos', 'string', 'Título exibido no topo'),

  -- Limites diários
  ('max_weddings_per_day',       '4',  'integer', 'Máximo de casamentos (total) por dia'),
  ('max_community_weddings',     '2',  'integer', 'Máximo de eventos comunitários por dia'),

  -- Novo limite por evento comunitário (casais)
  ('max_couples_per_community',  '20', 'integer', 'Máximo de casais por casamento comunitário'),

  -- Lembretes
  ('reminder_interview_2d',      '48', 'integer', 'Lembrete 2 dias antes (em horas)'),
  ('reminder_interview_1d',      '24', 'integer', 'Lembrete 1 dia antes (em horas)'),
  ('reminder_interview_12h',     '12', 'integer', 'Lembrete 12 horas antes (em horas)')
on conflict (config_key) do nothing;

-- 5) Sanidade: veja o que ficou gravado
select config_key, config_value
from public.system_config
order by config_key;
