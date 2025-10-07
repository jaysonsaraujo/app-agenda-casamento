-- Tabela de configurações do sistema
CREATE TABLE IF NOT EXISTS system_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT,
    config_type VARCHAR(50) DEFAULT 'string',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de locais
CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    address TEXT,
    capacity INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de celebrantes (padres/diáconos)
CREATE TABLE IF NOT EXISTS celebrants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    title VARCHAR(50) NOT NULL, -- 'PADRE' ou 'DIÁCONO'
    phone VARCHAR(20),
    location_id INTEGER REFERENCES locations(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela principal de casamentos
CREATE TABLE IF NOT EXISTS weddings (
    id SERIAL PRIMARY KEY,
    wedding_id VARCHAR(10) UNIQUE NOT NULL, -- psj-XXXXXX
    schedule_date DATE NOT NULL,
    interview_date TIMESTAMP WITH TIME ZONE,
    bride_name VARCHAR(255) NOT NULL,
    bride_whatsapp VARCHAR(20),
    groom_name VARCHAR(255) NOT NULL,
    groom_whatsapp VARCHAR(20),
    wedding_date DATE NOT NULL,
    wedding_time TIME NOT NULL,
    location_id INTEGER REFERENCES locations(id) NOT NULL,
    celebrant_id INTEGER REFERENCES celebrants(id) NOT NULL,
    is_community BOOLEAN DEFAULT false,
    transfer_type VARCHAR(50), -- 'ENTRADA_PAROQUIA', 'SAIDA_PAROQUIA', 'ENTRADA_DIOCESE', 'SAIDA_DIOCESE'
    with_civil_effect BOOLEAN DEFAULT false,
    observations TEXT,
    system_message TEXT,
    first_sunday DATE,
    second_sunday DATE,
    third_sunday DATE,
    status VARCHAR(50) DEFAULT 'AGENDADO', -- 'AGENDADO', 'REALIZADO', 'CANCELADO'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    CONSTRAINT unique_wedding_datetime_location CHECK (
        (is_community = false) OR 
        (is_community = true AND wedding_time IS NOT NULL)
    )
);

-- Tabela de lembretes
CREATE TABLE IF NOT EXISTS reminders (
    id SERIAL PRIMARY KEY,
    wedding_id VARCHAR(10) REFERENCES weddings(wedding_id) ON DELETE CASCADE,
    reminder_type VARCHAR(50) NOT NULL, -- 'INTERVIEW_2D', 'INTERVIEW_1D', 'INTERVIEW_12H', 'WEDDING'
    reminder_date TIMESTAMP WITH TIME ZONE NOT NULL,
    sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para melhorar performance
CREATE INDEX idx_weddings_wedding_date ON weddings(wedding_date);
CREATE INDEX idx_weddings_schedule_date ON weddings(schedule_date);
CREATE INDEX idx_weddings_status ON weddings(status);
CREATE INDEX idx_reminders_reminder_date ON reminders(reminder_date);
CREATE INDEX idx_reminders_sent ON reminders(sent);

-- Função para gerar ID único do casamento
CREATE OR REPLACE FUNCTION generate_wedding_id()
RETURNS VARCHAR(10) AS $$
DECLARE
    new_id VARCHAR(10);
    exists_count INTEGER;
BEGIN
    LOOP
        new_id := 'PSJ-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
        SELECT COUNT(*) INTO exists_count FROM weddings WHERE wedding_id = new_id;
        EXIT WHEN exists_count = 0;
    END LOOP;
    RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- Função para calcular os domingos dos proclames
CREATE OR REPLACE FUNCTION calculate_proclamation_sundays(wedding_date DATE)
RETURNS TABLE(first_sunday DATE, second_sunday DATE, third_sunday DATE) AS $$
DECLARE
    current_date DATE;
    sundays_found INTEGER := 0;
    result_first DATE;
    result_second DATE;
    result_third DATE;
BEGIN
    current_date := wedding_date - INTERVAL '1 day';
    
    WHILE sundays_found < 3 LOOP
        IF EXTRACT(DOW FROM current_date) = 0 THEN -- 0 = domingo
            sundays_found := sundays_found + 1;
            CASE sundays_found
                WHEN 1 THEN result_third := current_date;
                WHEN 2 THEN result_second := current_date;
                WHEN 3 THEN result_first := current_date;
            END CASE;
        END IF;
        current_date := current_date - INTERVAL '1 day';
    END LOOP;
    
    RETURN QUERY SELECT result_first, result_second, result_third;
END;
$$ LANGUAGE plpgsql;

-- Função para verificar conflitos de agendamento
CREATE OR REPLACE FUNCTION check_wedding_conflicts(
    p_wedding_date DATE,
    p_wedding_time TIME,
    p_location_id INTEGER,
    p_celebrant_id INTEGER,
    p_is_community BOOLEAN,
    p_wedding_id VARCHAR(10) DEFAULT NULL
)
RETURNS TABLE(conflict_type VARCHAR, message TEXT) AS $$
DECLARE
    total_count INTEGER;
    community_count INTEGER;
    individual_count INTEGER;
    same_location_time_count INTEGER;
    celebrant_conflict_count INTEGER;
BEGIN
    -- Contar casamentos no dia (excluindo o atual se for edição)
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE is_community = true),
        COUNT(*) FILTER (WHERE is_community = false)
    INTO total_count, community_count, individual_count
    FROM weddings
    WHERE wedding_date = p_wedding_date
    AND status = 'AGENDADO'
    AND (p_wedding_id IS NULL OR wedding_id != p_wedding_id);
    
    -- Verificar limite de casamentos comunitários (máximo 3)
    IF p_is_community AND community_count >= 3 THEN
        RETURN QUERY SELECT 'LIMITE_COMUNITARIO'::VARCHAR, 
            'Limite de 3 casamentos comunitários por dia já atingido'::TEXT;
    END IF;
    
    -- Verificar limite total (máximo 4 eventos)
    IF total_count >= 4 THEN
        RETURN QUERY SELECT 'LIMITE_TOTAL'::VARCHAR, 
            'Limite de 4 eventos por dia já atingido'::TEXT;
    END IF;
    
    -- Verificar conflito de local e horário
    SELECT COUNT(*) INTO same_location_time_count
    FROM weddings
    WHERE wedding_date = p_wedding_date
    AND wedding_time = p_wedding_time
    AND location_id = p_location_id
    AND status = 'AGENDADO'
    AND (p_wedding_id IS NULL OR wedding_id != p_wedding_id);
    
    IF same_location_time_count > 0 AND NOT p_is_community THEN
        RETURN QUERY SELECT 'CONFLITO_LOCAL_HORARIO'::VARCHAR, 
            'Já existe um casamento agendado neste local e horário'::TEXT;
    END IF;
    
    -- Verificar conflito de celebrante
    SELECT COUNT(*) INTO celebrant_conflict_count
    FROM weddings
    WHERE wedding_date = p_wedding_date
    AND wedding_time = p_wedding_time
    AND celebrant_id = p_celebrant_id
    AND status = 'AGENDADO'
    AND (p_wedding_id IS NULL OR wedding_id != p_wedding_id);
    
    IF celebrant_conflict_count > 0 THEN
        RETURN QUERY SELECT 'CONFLITO_CELEBRANTE'::VARCHAR, 
            'O celebrante já tem compromisso neste horário'::TEXT;
    END IF;
    
    -- Se não houver conflitos
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_weddings_updated_at BEFORE UPDATE ON weddings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_celebrants_updated_at BEFORE UPDATE ON celebrants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON system_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Inserir configurações padrão
INSERT INTO system_config (config_key, config_value, config_type, description) VALUES
('site_name', 'Sistema de Agendamento de Casamentos', 'string', 'Nome do site'),
('max_weddings_per_day', '4', 'integer', 'Máximo de casamentos por dia'),
('max_community_weddings', '3', 'integer', 'Máximo de casamentos comunitários por dia'),
('reminder_interview_2d', '48', 'integer', 'Lembrete de entrevista - horas antes'),
('reminder_interview_1d', '24', 'integer', 'Lembrete de entrevista - horas antes'),
('reminder_interview_12h', '12', 'integer', 'Lembrete de entrevista - horas antes'),
('reminder_wedding', '24', 'integer', 'Lembrete do casamento - horas antes')
ON CONFLICT (config_key) DO NOTHING;

-- Inserir dados de exemplo
INSERT INTO locations (name, address, capacity) VALUES
('IGREJA MATRIZ SÃO JOSÉ', 'PRAÇA CENTRAL, 100', 300),
('CAPELA NOSSA SENHORA APARECIDA', 'RUA DAS FLORES, 200', 100),
('SALÃO PAROQUIAL', 'RUA DA PAZ, 50', 150),
('CAPELA SANTO ANTÔNIO', 'AVENIDA BRASIL, 500', 80);

INSERT INTO celebrants (name, title, phone, location_id) VALUES
('PADRE JOÃO SILVA', 'PADRE', '11999991111', 1),
('PADRE MARCOS SANTOS', 'PADRE', '11999992222', 1),
('DIÁCONO PEDRO OLIVEIRA', 'DIÁCONO', '11999993333', 2),
('PADRE ANTÔNIO COSTA', 'PADRE', '11999994444', 3);

-- Inserir 10 casamentos de exemplo
DO $$
DECLARE
    i INTEGER;
    wedding_id_var VARCHAR(10);
    wedding_date_var DATE;
    sundays RECORD;
BEGIN
    FOR i IN 1..10 LOOP
        wedding_id_var := generate_wedding_id();
        wedding_date_var := CURRENT_DATE + (i * 7 + FLOOR(RANDOM() * 30))::INTEGER;
        
        SELECT * INTO sundays FROM calculate_proclamation_sundays(wedding_date_var);
        
        INSERT INTO weddings (
            wedding_id, schedule_date, interview_date,
            bride_name, bride_whatsapp, groom_name, groom_whatsapp,
            wedding_date, wedding_time, location_id, celebrant_id,
            is_community, with_civil_effect, observations,
            first_sunday, second_sunday, third_sunday
        ) VALUES (
            wedding_id_var,
            CURRENT_DATE - (10 - i),
            CURRENT_DATE + (i * 2),
            'NOIVA ' || i || ' SILVA',
            '119' || LPAD(FLOOR(RANDOM() * 100000000)::TEXT, 8, '0'),
            'NOIVO ' || i || ' SANTOS',
            '119' || LPAD(FLOOR(RANDOM() * 100000000)::TEXT, 8, '0'),
            wedding_date_var,
            (ARRAY['10:00', '14:00', '16:00', '18:00', '20:00'])[FLOOR(RANDOM() * 5 + 1)]::TIME,
            FLOOR(RANDOM() * 4 + 1)::INTEGER,
            FLOOR(RANDOM() * 4 + 1)::INTEGER,
            (i % 3 = 0),
            (i % 2 = 0),
            'CASAMENTO DE EXEMPLO ' || i,
            sundays.first_sunday,
            sundays.second_sunday,
            sundays.third_sunday
        );
    END LOOP;
END $$;

-- Criar view para facilitar consultas do calendário
CREATE OR REPLACE VIEW calendar_view AS
SELECT 
    w.wedding_date,
    COUNT(*) as total_events,
    COUNT(*) FILTER (WHERE w.is_community = true) as community_events,
    COUNT(*) FILTER (WHERE w.is_community = false) as individual_events,
    ARRAY_AGG(
        jsonb_build_object(
            'wedding_id', w.wedding_id,
            'bride_name', w.bride_name,
            'groom_name', w.groom_name,
            'wedding_time', w.wedding_time,
            'location_name', l.name,
            'celebrant_name', c.name,
            'is_community', w.is_community
        ) ORDER BY w.wedding_time
    ) as events
FROM weddings w
JOIN locations l ON w.location_id = l.id
JOIN celebrants c ON w.celebrant_id = c.id
WHERE w.status = 'AGENDADO'
GROUP BY w.wedding_date;

-- Permissões para o usuário anon do Supabase
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon;
