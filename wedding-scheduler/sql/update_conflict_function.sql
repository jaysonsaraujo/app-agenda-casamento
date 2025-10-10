-- Atualiza a regra de conflitos para:
-- 1) Diferenciar "eventos comunitários" (slots distintos) de "casais" dentro do mesmo evento.
-- 2) Contar eventos comunitários por dia como combinações DISTINTAS de (horário, local, celebrante).
-- 3) Respeitar o limite de casais por evento comunitário (novo parâmetro).
-- 4) Impedir o mesmo celebrante em dois locais no MESMO horário.
-- 5) Manter as demais regras para casamento INDIVIDUAL.

-- Garanta que a nova configuração exista (rode uma vez):
-- INSERT INTO system_config (config_key, config_value, config_type, description)
-- VALUES ('max_couples_per_community', '20', 'integer', 'Máximo de casais por casamento comunitário')
-- ON CONFLICT (config_key) DO NOTHING;

CREATE OR REPLACE FUNCTION check_wedding_conflicts(
    p_wedding_date DATE,
    p_wedding_time TIME,
    p_location_id  INTEGER,
    p_celebrant_id INTEGER,
    p_is_community BOOLEAN,
    p_wedding_id   VARCHAR(10) DEFAULT NULL
)
RETURNS TABLE(conflict_type VARCHAR, message TEXT) AS $$
DECLARE
    v_max_total              INTEGER := COALESCE((SELECT config_value::INT FROM system_config WHERE config_key='max_weddings_per_day'), 4);
    v_max_community_events   INTEGER := COALESCE((SELECT config_value::INT FROM system_config WHERE config_key='max_community_weddings'), 2);
    v_max_couples_per_comm   INTEGER := COALESCE((SELECT config_value::INT FROM system_config WHERE config_key='max_couples_per_community'), 20);

    v_total_events_day       INTEGER;
    v_comm_events_day        INTEGER;
    v_is_new_comm_slot       BOOLEAN;
    v_slot_existing_couples  INTEGER;
    v_same_loc_time_count    INTEGER;
    v_celebrant_conflicts    INTEGER;
BEGIN
    ----------------------------------------------------------------
    -- 1) Se COMUNITÁRIO: verificar limite de CASAIS no "slot" (data+hora+local+celebrante)
    ----------------------------------------------------------------
    IF p_is_community THEN
        SELECT COUNT(*)
          INTO v_slot_existing_couples
          FROM weddings
         WHERE wedding_date = p_wedding_date
           AND wedding_time = p_wedding_time
           AND location_id  = p_location_id
           AND celebrant_id = p_celebrant_id
           AND is_community = TRUE
           AND status = 'AGENDADO'
           AND (p_wedding_id IS NULL OR wedding_id <> p_wedding_id);

        v_is_new_comm_slot := (v_slot_existing_couples = 0);

        IF v_slot_existing_couples >= v_max_couples_per_comm THEN
            RETURN QUERY
            SELECT 'LIMITE_CASAIS_COMUNITARIO', 'Limite de casais por casamento comunitário já atingido';
            RETURN;
        END IF;
    ELSE
        v_is_new_comm_slot := FALSE;
    END IF;

    ----------------------------------------------------------------
    -- 2) Contagem de EVENTOS do dia:
    --    - Individuais: cada linha conta 1 evento.
    --    - Comunitários: DISTINCT por (hora, local, celebrante).
    ----------------------------------------------------------------
    SELECT
        COUNT(*)  -- individuais
      + COALESCE((
            SELECT COUNT(*) FROM (
                SELECT wedding_time, location_id, celebrant_id
                  FROM weddings
                 WHERE wedding_date = p_wedding_date
                   AND is_community = TRUE
                   AND status = 'AGENDADO'
                   AND (p_wedding_id IS NULL OR wedding_id <> p_wedding_id)
                 GROUP BY wedding_time, location_id, celebrant_id
            ) AS comm_events
        ), 0)
      INTO v_total_events_day
      FROM weddings
     WHERE wedding_date = p_wedding_date
       AND is_community = FALSE
       AND status = 'AGENDADO'
       AND (p_wedding_id IS NULL OR wedding_id <> p_wedding_id);

    SELECT COUNT(*) INTO v_comm_events_day
    FROM (
        SELECT wedding_time, location_id, celebrant_id
          FROM weddings
         WHERE wedding_date = p_wedding_date
           AND is_community = TRUE
           AND status = 'AGENDADO'
           AND (p_wedding_id IS NULL OR wedding_id <> p_wedding_id)
         GROUP BY wedding_time, location_id, celebrant_id
    ) AS comm_events;

    -- Se este cadastro cria um NOVO slot comunitário, simule a adição no limite diário
    IF p_is_community AND v_is_new_comm_slot THEN
        v_comm_events_day := v_comm_events_day + 1;
        v_total_events_day := v_total_events_day + 1;
    END IF;

    IF p_is_community AND v_comm_events_day > v_max_community_events THEN
        RETURN QUERY SELECT 'LIMITE_COMUNITARIO', 'Limite de eventos comunitários por dia já atingido';
        RETURN;
    END IF;

    IF v_total_events_day > v_max_total THEN
        RETURN QUERY SELECT 'LIMITE_TOTAL', 'Limite total de eventos por dia já atingido';
        RETURN;
    END IF;

    ----------------------------------------------------------------
    -- 3) Conflitos de LOCAL+HORÁRIO e CELEBRANTE+HORÁRIO
    ----------------------------------------------------------------
    -- LOCAL+HORÁRIO: bloqueia apenas para INDIVIDUAL (comunitário pode compartilhar o mesmo local/horário)
    SELECT COUNT(*) INTO v_same_loc_time_count
      FROM weddings
     WHERE wedding_date = p_wedding_date
       AND wedding_time = p_wedding_time
       AND location_id  = p_location_id
       AND status = 'AGENDADO'
       AND (p_wedding_id IS NULL OR wedding_id <> p_wedding_id);

    IF v_same_loc_time_count > 0 AND NOT p_is_community THEN
        RETURN QUERY SELECT 'CONFLITO_LOCAL_HORARIO', 'Já existe um casamento agendado neste local e horário';
        RETURN;
    END IF;

    -- CELEBRANTE+HORÁRIO:
    -- - INDIVIDUAL: conflita com QUALQUER compromisso do celebrante no horário.
    -- - COMUNITÁRIO: conflita se houver compromisso do celebrante no MESMO horário EM OUTRO local.
    IF NOT p_is_community THEN
        SELECT COUNT(*) INTO v_celebrant_conflicts
          FROM weddings
         WHERE wedding_date = p_wedding_date
           AND wedding_time = p_wedding_time
           AND celebrant_id = p_celebrant_id
           AND status = 'AGENDADO'
           AND (p_wedding_id IS NULL OR wedding_id <> p_wedding_id);
    ELSE
        SELECT COUNT(*) INTO v_celebrant_conflicts
          FROM weddings
         WHERE wedding_date = p_wedding_date
           AND wedding_time = p_wedding_time
           AND celebrant_id = p_celebrant_id
           AND status = 'AGENDADO'
           AND (p_wedding_id IS NULL OR wedding_id <> p_wedding_id)
           AND (location_id <> p_location_id);
    END IF;

    IF v_celebrant_conflicts > 0 THEN
        RETURN QUERY SELECT 'CONFLITO_CELEBRANTE', 'O celebrante já tem compromisso neste horário';
        RETURN;
    END IF;

    RETURN;
END;
$$ LANGUAGE plpgsql;
