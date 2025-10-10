-- AJUSTE A DATA/HORA/LOCAL/CELEBRANTE AQUI
\set p_date      '2025-11-07'
\set p_time      '19:00'
\set p_location  1
\set p_celebrant 1

-- 1) Listar TODAS as linhas do dia
select wedding_id, is_community, wedding_date, wedding_time, location_id, celebrant_id
from public.weddings
where wedding_date = date :'p_date'
order by wedding_time, location_id, celebrant_id;

-- 2) Quais SLOTS COMUNITÁRIOS distintos o banco enxerga neste dia?
with weds as (
  select *
  from public.weddings
  where wedding_date = date :'p_date'
),
community_slots as (
  select wedding_date, wedding_time, location_id, celebrant_id, count(*) as couples
  from weds
  where is_community = true
  group by wedding_date, wedding_time, location_id, celebrant_id
)
select *
from community_slots
order by wedding_time, location_id, celebrant_id;

-- 3) O slot que você quer usar existe?
with weds as (
  select *
  from public.weddings
  where wedding_date = date :'p_date'
),
slot as (
  select 1
  from weds
  where is_community = true
    and wedding_time = time :'p_time'
    and location_id  = :p_location
    and celebrant_id = :p_celebrant
  limit 1
)
select exists(select 1 from slot) as slot_exists;
