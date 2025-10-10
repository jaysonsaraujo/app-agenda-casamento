-- Atualiza/recria a função principal de conflitos.
-- Retorna 0 linhas = sem conflito. Caso contrário, 1+ linhas com {code, message}.

create or replace function public.check_wedding_conflicts(
  p_wedding_date date,
  p_wedding_time time,
  p_location_id  integer,
  p_celebrant_id integer,
  p_is_community boolean,
  p_wedding_id   integer default null
)
returns table(code text, message text)
language plpgsql
as $$
declare
  v_max_per_day              integer := 4;
  v_max_community_per_day    integer := 2;
  v_max_couples_per_slot     integer := 20;

  -- flags/contadores auxiliares
  v_slot_exists              boolean;
  v_couples_in_slot          integer;
  v_community_slots_day      integer;
  v_unique_count_day         integer;
  v_events_day               integer; -- unique + community_slots
  v_events_day_if_insert     integer;
  v_community_slots_if_ins   integer;

begin
  -- 1) Lê limites da system_config (se existirem)
  select coalesce( (select config_value::int from public.system_config where config_key='max_weddings_per_day'), v_max_per_day )
    into v_max_per_day;
  select coalesce( (select config_value::int from public.system_config where config_key='max_community_weddings'), v_max_community_per_day )
    into v_max_community_per_day;
  select coalesce( (select config_value::int from public.system_config where config_key='max_couples_per_community'), v_max_couples_per_slot )
    into v_max_couples_per_slot;

  -- 2) Valida disponibilidade do CELEBRANTE no MESMO DIA/HORA em OUTRO LOCAL.
  --    Só é permitido múltiplos no mesmo slot se for comunitário no MESMO local
  --    (ou seja, repetir casal dentro do mesmo evento comunitário).
  if exists (
      select 1
      from public.weddings w
      where w.wedding_date = p_wedding_date
        and w.wedding_time = p_wedding_time
        and w.celebrant_id = p_celebrant_id
        and (p_wedding_id is null or w.wedding_id <> p_wedding_id)
        and (
          -- CONFLITO se:
          --  (a) local diferente
          w.location_id <> p_location_id
          or
          --  (b) mesmo local porém pelo menos um dos lados NÃO é comunitário
          not (w.is_community = true and p_is_community = true)
        )
    )
  then
    code := 'CELEBRANT_CONFLICT';
    message := 'O celebrante já está reservado neste dia e horário (em outro atendimento).';
    return next;
    return;
  end if;

  -- 3) Cálculo do "slot comunitário" (data+hora+local+celebrante)
  select exists (
           select 1 from public.weddings w
            where w.wedding_date = p_wedding_date
              and w.wedding_time = p_wedding_time
              and w.location_id  = p_location_id
              and w.celebrant_id = p_celebrant_id
              and w.is_community = true
              and (p_wedding_id is null or w.wedding_id <> p_wedding_id)
         )
    into v_slot_exists;

  -- Casais já cadastrados nesse slot (somente comunitários)
  select count(*)
    from public.weddings w
   where w.wedding_date = p_wedding_date
     and w.wedding_time = p_wedding_time
     and w.location_id  = p_location_id
     and w.celebrant_id = p_celebrant_id
     and w.is_community = true
     and (p_wedding_id is null or w.wedding_id <> p_wedding_id)
    into v_couples_in_slot;

  -- 4) Limite de CASAIS por evento comunitário
  if p_is_community then
    if v_couples_in_slot >= v_max_couples_per_slot then
      code := 'LIMITE_CASAIS_COMUNITARIO';
      message := format('Limite de %s casais por casamento comunitário já atingido para este slot.', v_max_couples_per_slot);
      return next;
      return;
    end if;
  end if;

  -- 5) Contagem de EVENTOS por dia (únicos + slots comunitários distintos)
  --    Ignora o próprio registro (em edição).
  with weds as (
    select *
      from public.weddings w
     where w.wedding_date = p_wedding_date
       and (p_wedding_id is null or w.wedding_id <> p_wedding_id)
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

  -- Se vamos inserir um comunitário:
  if p_is_community then
    -- Só soma novo "slot" se ele ainda não existir
    v_community_slots_if_ins := v_community_slots_day + (case when v_slot_exists then 0 else 1 end);
    v_events_day_if_insert   := v_unique_count_day + v_community_slots_if_ins;

    if v_community_slots_if_ins > v_max_community_per_day then
      code := 'LIMITE_COMUNITARIO';
      message := format('Limite de %s casamentos comunitários por dia já atingido.', v_max_community_per_day);
      return next;
      return;
    end if;

    if v_events_day_if_insert > v_max_per_day then
      code := 'LIMITE_EVENTOS_DIA';
      message := format('Limite de %s eventos por dia já atingido.', v_max_per_day);
      return next;
      return;
    end if;

  else
    -- Inserção de ÚNICO: sempre acrescenta 1 evento no dia
    if (v_events_day + 1) > v_max_per_day then
      code := 'LIMITE_EVENTOS_DIA';
      message := format('Limite de %s eventos por dia já atingido.', v_max_per_day);
      return next;
      return;
    end if;

    -- Também proíbe único no mesmo slot de um comunitário existente (mesma data/hora/local/celebrante)
    if v_slot_exists then
      code := 'CONFLITO_COMUNITARIO_NO_SLOT';
      message := 'Já existe casamento comunitário neste mesmo horário/local/celebrante.';
      return next;
      return;
    end if;
  end if;

  -- 6) Sem conflitos
  return;
end;
$$;
