-- Recria a função check_wedding_conflicts com a ASSINATURA observada no seu banco:
-- (date, time, integer, integer, boolean, character varying)
-- e com RETURNS TABLE(... varchar ...) para compatibilidade.

create or replace function public.check_wedding_conflicts(
  p_wedding_date date,
  p_wedding_time time,
  p_location_id  integer,
  p_celebrant_id integer,
  p_is_community boolean,
  p_wedding_id   text default null
)
returns table(code varchar, message varchar)
language plpgsql
as $$
declare
  v_max_per_day              integer := 4;
  v_max_community_per_day    integer := 2;
  v_max_couples_per_slot     integer := 20;

  v_slot_exists              boolean;
  v_couples_in_slot          integer;
  v_community_slots_day      integer;
  v_unique_count_day         integer;
  v_events_day               integer;
  v_events_day_if_insert     integer;
  v_community_slots_if_ins   integer;
begin
  -- 1) Ler limites da system_config
  select coalesce((select config_value::int from public.system_config where config_key='max_weddings_per_day'), v_max_per_day)
    into v_max_per_day;
  select coalesce((select config_value::int from public.system_config where config_key='max_community_weddings'), v_max_community_per_day)
    into v_max_community_per_day;
  select coalesce((select config_value::int from public.system_config where config_key='max_couples_per_community'), v_max_couples_per_slot)
    into v_max_couples_per_slot;

  -- 2) Conflito de celebrante no MESMO dia/hora em OUTRO local ou quando um dos lados não é comunitário
  if exists (
    select 1
      from public.weddings w
     where w.wedding_date = p_wedding_date
       and w.wedding_time = p_wedding_time
       and w.celebrant_id = p_celebrant_id
       and (p_wedding_id is null or w.wedding_id::text <> p_wedding_id)
       and (
         w.location_id <> p_location_id
         or not (w.is_community = true and p_is_community = true)
       )
  ) then
    return query
      select 'CELEBRANT_CONFLICT'::varchar,
             'O celebrante já está reservado neste dia e horário (em outro atendimento).'::varchar;
    return;
  end if;

  -- 3) Slot comunitário (data+hora+local+celebrante) já existente?
  select exists (
           select 1 from public.weddings w
            where w.wedding_date = p_wedding_date
              and w.wedding_time = p_wedding_time
              and w.location_id  = p_location_id
              and w.celebrant_id = p_celebrant_id
              and w.is_community = true
              and (p_wedding_id is null or w.wedding_id::text <> p_wedding_id)
         )
    into v_slot_exists;

  -- Casais já cadastrados nesse slot (apenas comunitários)
  select count(*)
    from public.weddings w
   where w.wedding_date = p_wedding_date
     and w.wedding_time = p_wedding_time
     and w.location_id  = p_location_id
     and w.celebrant_id = p_celebrant_id
     and w.is_community = true
     and (p_wedding_id is null or w.wedding_id::text <> p_wedding_id)
    into v_couples_in_slot;

  -- 4) Limite de casais por evento comunitário
  if p_is_community then
    if v_couples_in_slot >= v_max_couples_per_slot then
      return query
        select 'LIMITE_CASAIS_COMUNITARIO'::varchar,
               format('Limite de %s casais por casamento comunitário já atingido para este slot.', v_max_couples_per_slot)::varchar;
      return;
    end if;
  end if;

  -- 5) Contagem de EVENTOS por dia (únicos + slots comunitários distintos)
  with weds as (
    select *
      from public.weddings w
     where w.wedding_date = p_wedding_date
       and (p_wedding_id is null or w.wedding_id::text <> p_wedding_id)
  ),
  community_slots as (
    select wedding_date, wedding_time, location_id, celebrant_id
      from weds
     where is_community = true
     group by wedding_date, wedding_time, location_id, celebrant_id
  )
  select
    (select count(*) from weds where is_community = false) as unique_cnt,
    (select count(*) from community_slots)                 as community_slots_cnt
  into v_unique_count_day, v_community_slots_day;

  v_events_day := v_unique_count_day + v_community_slots_day;

  if p_is_community then
    v_community_slots_if_ins := v_community_slots_day + (case when v_slot_exists then 0 else 1 end);
    v_events_day_if_insert   := v_unique_count_day + v_community_slots_if_ins;

    if v_community_slots_if_ins > v_max_community_per_day then
      return query
        select 'LIMITE_COMUNITARIO'::varchar,
               format('Limite de %s casamentos comunitários por dia já atingido.', v_max_community_per_day)::varchar;
      return;
    end if;

    if v_events_day_if_insert > v_max_per_day then
      return query
        select 'LIMITE_EVENTOS_DIA'::varchar,
               format('Limite de %s eventos por dia já atingido.', v_max_per_day)::varchar;
      return;
    end if;

  else
    if (v_events_day + 1) > v_max_per_day then
      return query
        select 'LIMITE_EVENTOS_DIA'::varchar,
               format('Limite de %s eventos por dia já atingido.', v_max_per_day)::varchar;
      return;
    end if;

    if v_slot_exists then
      return query
        select 'CONFLITO_COMUNITARIO_NO_SLOT'::varchar,
               'Já existe casamento comunitário neste mesmo horário/local/celebrante.'::varchar;
      return;
    end if;
  end if;

  -- 6) Sem conflitos => retorna 0 linhas
  return;
end;
$$;
