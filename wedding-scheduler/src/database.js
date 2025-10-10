/**
 * Camada de acesso ao banco (Supabase) para o app.
 *
 * Este arquivo expõe em window.db:
 *  - checkSupabaseConnection()
 *  - getConfig(), saveConfig(values)
 *  - getSystemStats()
 *  - getCelebrants(), getLocations()
 *  - getCalendarEvents(year)    // eventos do calendário (ano)
 *  - createWedding(payload), updateWedding(id, payload), deleteWedding(id)
 *  - checkWeddingConflicts(params)  // *** usa p_wedding_id como string|null ***
 *
 * Observações:
 *  - Requer o cliente Supabase em window.supabaseClient (configurado em /config/supabase.js).
 *  - Converte IDs para Number onde apropriado.
 *  - Normaliza horários para "HH:mm:ss".
 */

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Utilitários básicos
  // ---------------------------------------------------------------------------
  function ensureClient() {
    const client = window.supabaseClient || window.supabase; // fallback
    if (!client) {
      const msg = '[database.js] Supabase client não encontrado em window.supabaseClient.';
      console.error(msg);
      throw new Error(msg);
    }
    return client;
  }

  // Normaliza hora para HH:mm:ss
  function normalizeTimeToSeconds(timeStr) {
    if (!timeStr) return null;
    if (/^\d{2}:\d{2}:\d{2}$/.test(timeStr)) return timeStr;
    if (/^\d{2}:\d{2}$/.test(timeStr)) return `${timeStr}:00`;
    const m = String(timeStr).match(/(\d{2}):(\d{2})(?::(\d{2}))?/);
    if (!m) return null;
    return `${m[1]}:${m[2]}:${m[3] ?? '00'}`;
  }

  function ymd(d) {
    const dt = (d instanceof Date) ? d : new Date(d);
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${dt.getFullYear()}-${mm}-${dd}`;
  }

  // ---------------------------------------------------------------------------
  // Healthcheck
  // ---------------------------------------------------------------------------
  async function checkSupabaseConnection() {
    const supabase = ensureClient();
    // Tenta uma query leve
    const { data, error } = await supabase.from('system_config').select('config_key').limit(1);
    if (error) throw error;
    return true;
  }

  // ---------------------------------------------------------------------------
  // Configurações do sistema (system_config)
  // ---------------------------------------------------------------------------
  async function getConfig() {
    const supabase = ensureClient();
    const { data, error } = await supabase
      .from('system_config')
      .select('config_key, config_value, config_type');
    if (error) {
      console.error('getConfig erro:', error);
      throw error;
    }
    // transforma em objeto { chave: valorConvertido }
    const out = {};
    for (const row of data || []) {
      const key = row.config_key;
      let val = row.config_value;
      if (row.config_type === 'int' || row.config_type === 'number') {
        const n = Number(val);
        val = Number.isNaN(n) ? null : n;
      } else if (row.config_type === 'bool' || row.config_type === 'boolean') {
        if (val === true || val === false) {
          // ok
        } else if (typeof val === 'string') {
          val = val === 'true' || val === '1';
        } else if (typeof val === 'number') {
          val = val === 1;
        }
      }
      out[key] = val;
    }
    return out;
  }

  /**
   * Salva/atualiza chaves de configuração.
   * Ex.: saveConfig({ max_weddings_per_day: 4, max_community_weddings: 2, max_couples_per_community: 20 })
   */
  async function saveConfig(values = {}) {
    const supabase = ensureClient();
    const rows = Object.entries(values).map(([key, raw]) => {
      let config_type = 'text';
      let config_value = raw;

      if (typeof raw === 'number') {
        config_type = 'int';
      } else if (typeof raw === 'boolean') {
        config_type = 'bool';
      }

      return { config_key: key, config_value, config_type };
    });

    if (!rows.length) return { updated: 0 };

    const { error } = await supabase.from('system_config').upsert(rows, {
      onConflict: 'config_key',
    });
    if (error) {
      console.error('saveConfig erro:', error);
      throw error;
    }
    return { updated: rows.length };
  }

  // ---------------------------------------------------------------------------
  // Estatísticas simples
  // ---------------------------------------------------------------------------
  async function getSystemStats() {
    const supabase = ensureClient();
    const { data, error } = await supabase
      .from('weddings')
      .select('wedding_id'); // simples; se quiser count exato, pode usar { count: 'exact', head: true }
    if (error) {
      console.error('getSystemStats erro:', error);
      throw error;
    }
    return {
      total_weddings: (data || []).length,
    };
  }

  // ---------------------------------------------------------------------------
  // Catálogos: celebrantes e locais
  // ---------------------------------------------------------------------------
  async function getCelebrants() {
    const supabase = ensureClient();
    const { data, error } = await supabase
      .from('celebrants')
      .select('id, name, title, phone, is_active')
      .order('name', { ascending: true });
    if (error) {
      console.error('getCelebrants erro:', error);
      throw error;
    }
    return data || [];
  }

  async function getLocations() {
    const supabase = ensureClient();
    const { data, error } = await supabase
      .from('locations')
      .select('id, name, address, capacity, is_active')
      .order('name', { ascending: true });
    if (error) {
      console.error('getLocations erro:', error);
      throw error;
    }
    return data || [];
  }

  // ---------------------------------------------------------------------------
  // Eventos para o calendário
  // ---------------------------------------------------------------------------
  /**
   * Retorna casamentos do ano informado.
   * @param {number} year
   */
  async function getCalendarEvents(year) {
    const supabase = ensureClient();
    const start = `${year}-01-01`;
    const end = `${year}-12-31`;

    const { data, error } = await supabase
      .from('weddings')
      .select('wedding_id, wedding_date, wedding_time, location_id, celebrant_id, is_community, bride_name, groom_name')
      .gte('wedding_date', start)
      .lte('wedding_date', end)
      .order('wedding_date', { ascending: true })
      .order('wedding_time', { ascending: true });

    if (error) {
      console.error('getCalendarEvents erro:', error);
      throw error;
    }
    return data || [];
  }

  // ---------------------------------------------------------------------------
  // CRUD de casamentos (mínimo necessário)
  // ---------------------------------------------------------------------------
  async function createWedding(payload) {
    const supabase = ensureClient();
    // Normaliza horário
    const toInsert = { ...payload };
    if (toInsert.wedding_time) {
      toInsert.wedding_time = normalizeTimeToSeconds(toInsert.wedding_time);
    }
    // Verificação de conflitos pelo back (opcional, se a UI já chama antes)
    const conflicts = await checkWeddingConflicts({
      weddingDate: toInsert.wedding_date,
      weddingTime: toInsert.wedding_time,
      locationId: toInsert.location_id,
      celebrantId: toInsert.celebrant_id,
      isCommunity: !!toInsert.is_community,
      weddingId: null,
    });
    if (Array.isArray(conflicts) && conflicts.length) {
      const msgs = conflicts.map(c => c.message).join(' | ');
      const err = new Error(msgs || 'Conflitos detectados');
      err.details = conflicts;
      throw err;
    }

    const { data, error } = await supabase.from('weddings').insert(toInsert).select();
    if (error) {
      console.error('createWedding erro:', error);
      throw error;
    }
    return (data && data[0]) || null;
  }

  async function updateWedding(weddingId, payload) {
    const supabase = ensureClient();
    const toUpdate = { ...payload };
    if (toUpdate.wedding_time) {
      toUpdate.wedding_time = normalizeTimeToSeconds(toUpdate.wedding_time);
    }

    const conflicts = await checkWeddingConflicts({
      weddingDate: toUpdate.wedding_date,
      weddingTime: toUpdate.wedding_time,
      locationId: toUpdate.location_id,
      celebrantId: toUpdate.celebrant_id,
      isCommunity: !!toUpdate.is_community,
      weddingId: String(weddingId),
    });
    if (Array.isArray(conflicts) && conflicts.length) {
      const msgs = conflicts.map(c => c.message).join(' | ');
      const err = new Error(msgs || 'Conflitos detectados');
      err.details = conflicts;
      throw err;
    }

    const { data, error } = await supabase
      .from('weddings')
      .update(toUpdate)
      .eq('wedding_id', weddingId)
      .select();

    if (error) {
      console.error('updateWedding erro:', error);
      throw error;
    }
    return (data && data[0]) || null;
  }

  async function deleteWedding(weddingId) {
    const supabase = ensureClient();
    const { error } = await supabase.from('weddings').delete().eq('wedding_id', weddingId);
    if (error) {
      console.error('deleteWedding erro:', error);
      throw error;
    }
    return true;
  }

  // ---------------------------------------------------------------------------
  // Verificação de conflitos (RPC)
  // ---------------------------------------------------------------------------
  /**
   * Chama a função check_wedding_conflicts no banco.
   * Retorna array de conflitos (vazio = sem conflitos).
   */
  async function checkWeddingConflicts({
    weddingDate,      // 'YYYY-MM-DD'
    weddingTime,      // 'HH:mm' ou 'HH:mm:ss'
    locationId,
    celebrantId,
    isCommunity,
    weddingId = null, // string|number|null
  }) {
    const supabase = ensureClient();
    const time = normalizeTimeToSeconds(weddingTime);

    const params = {
      p_wedding_date: weddingDate,
      p_wedding_time: time,
      p_location_id: Number(locationId),
      p_celebrant_id: Number(celebrantId),
      p_is_community: !!isCommunity,
      // *** ponto crucial: STRING ou NULL, nunca undefined ***
      p_wedding_id: weddingId == null ? null : String(weddingId),
    };

    const { data, error } = await supabase.rpc('check_wedding_conflicts', params);
    if (error) {
      console.error('checkWeddingConflicts erro:', error, 'params:', params);
      throw error;
    }
    return Array.isArray(data) ? data : [];
  }

  // ---------------------------------------------------------------------------
  // Exposição pública
  // ---------------------------------------------------------------------------
  window.db = window.db || {};
  window.db.checkSupabaseConnection = checkSupabaseConnection;

  window.db.getConfig = getConfig;
  window.db.saveConfig = saveConfig;
  window.db.getSystemStats = getSystemStats;

  window.db.getCelebrants = getCelebrants;
  window.db.getLocations = getLocations;

  window.db.getCalendarEvents = getCalendarEvents;

  window.db.createWedding = createWedding;
  window.db.updateWedding = updateWedding;
  window.db.deleteWedding = deleteWedding;

  window.db.checkWeddingConflicts = checkWeddingConflicts;

  // Compat de segurança (algumas telas antigas podem chamar window.checkSupabaseConnection)
  window.checkSupabaseConnection = window.db.checkSupabaseConnection;
})();
