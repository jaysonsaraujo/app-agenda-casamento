/**
 * Camada de acesso ao banco (Supabase) para o app.
 * Requer que window.supabaseClient esteja definido em /config/supabase.js
 */

(function () {
  'use strict';

  // ---------------- Utilidades ----------------
  function ensureClient() {
    const client = window.supabaseClient; // *** SEM fallback para window.supabase ***
    if (!client) {
      throw new Error('[database.js] Supabase client ausente. Confira a ordem dos scripts (SDK -> /config/supabase.js -> /src/database.js).');
    }
    if (typeof client.from !== 'function') {
      throw new Error('[database.js] window.supabaseClient não é um cliente válido (sem .from).');
    }
    return client;
  }

  function normalizeTimeToSeconds(timeStr) {
    if (!timeStr) return null;
    if (/^\d{2}:\d{2}:\d{2}$/.test(timeStr)) return timeStr;
    if (/^\d{2}:\d{2}$/.test(timeStr)) return `${timeStr}:00`;
    const m = String(timeStr).match(/(\d{2}):(\d{2})(?::(\d{2}))?/);
    return m ? `${m[1]}:${m[2]}:${m[3] ?? '00'}` : null;
  }

  // ------------- Healthcheck -------------
  async function checkSupabaseConnection() {
    const supabase = ensureClient();
    const { error } = await supabase.from('system_config').select('config_key').limit(1);
    if (error) throw error;
    return true;
  }

  // ------------- Config -------------
  async function getConfig() {
    const supabase = ensureClient();
    const { data, error } = await supabase
      .from('system_config')
      .select('config_key, config_value, config_type');
    if (error) throw error;

    const out = {};
    for (const row of data || []) {
      let v = row.config_value;
      if (row.config_type === 'int' || row.config_type === 'number') v = Number(v);
      if (row.config_type === 'bool' || row.config_type === 'boolean') {
        v = (v === true || v === 'true' || v === 1 || v === '1');
      }
      out[row.config_key] = v;
    }
    return out;
  }

  async function saveConfig(values = {}) {
    const supabase = ensureClient();
    const rows = Object.entries(values).map(([config_key, val]) => {
      let config_type = 'text';
      if (typeof val === 'number') config_type = 'int';
      else if (typeof val === 'boolean') config_type = 'bool';
      return { config_key, config_value: val, config_type };
    });
    if (!rows.length) return { updated: 0 };
    const { error } = await supabase.from('system_config').upsert(rows, { onConflict: 'config_key' });
    if (error) throw error;
    return { updated: rows.length };
  }

  // ------------- Catálogos -------------
  async function getCelebrants() {
    const supabase = ensureClient();
    const { data, error } = await supabase
      .from('celebrants')
      .select('id, name, title, phone, is_active')
      .order('name', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async function getLocations() {
    const supabase = ensureClient();
    const { data, error } = await supabase
      .from('locations')
      .select('id, name, address, capacity, is_active')
      .order('name', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  // ------------- Eventos / Calendário -------------
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

    if (error) throw error;
    return data || [];
  }

  // ------------- CRUD WEDDINGS -------------
  async function checkWeddingConflicts({
    weddingDate,
    weddingTime,
    locationId,
    celebrantId,
    isCommunity,
    weddingId = null,
  }) {
    const supabase = ensureClient();
    const time = normalizeTimeToSeconds(weddingTime);

    const params = {
      p_wedding_date: weddingDate,
      p_wedding_time: time,
      p_location_id: Number(locationId),
      p_celebrant_id: Number(celebrantId),
      p_is_community: !!isCommunity,
      // *** string ou null — nunca undefined ***
      p_wedding_id: weddingId == null ? null : String(weddingId),
    };

    const { data, error } = await supabase.rpc('check_wedding_conflicts', params);
    if (error) {
      console.error('checkWeddingConflicts erro:', error, 'params:', params);
      throw error;
    }
    return Array.isArray(data) ? data : [];
  }

  async function createWedding(payload) {
    const supabase = ensureClient();
    const toInsert = { ...payload };
    if (toInsert.wedding_time) toInsert.wedding_time = normalizeTimeToSeconds(toInsert.wedding_time);

    // valida antes de inserir
    const conflicts = await checkWeddingConflicts({
      weddingDate: toInsert.wedding_date,
      weddingTime: toInsert.wedding_time,
      locationId: toInsert.location_id,
      celebrantId: toInsert.celebrant_id,
      isCommunity: !!toInsert.is_community,
      weddingId: null,
    });
    if (conflicts.length) {
      const msg = conflicts.map(c => c.message).join(' | ');
      const err = new Error(msg);
      err.details = conflicts;
      throw err;
    }

    const { data, error } = await supabase.from('weddings').insert(toInsert).select();
    if (error) throw error;
    return (data && data[0]) || null;
  }

  async function updateWedding(weddingId, payload) {
    const supabase = ensureClient();
    const toUpdate = { ...payload };
    if (toUpdate.wedding_time) toUpdate.wedding_time = normalizeTimeToSeconds(toUpdate.wedding_time);

    const conflicts = await checkWeddingConflicts({
      weddingDate: toUpdate.wedding_date,
      weddingTime: toUpdate.wedding_time,
      locationId: toUpdate.location_id,
      celebrantId: toUpdate.celebrant_id,
      isCommunity: !!toUpdate.is_community,
      weddingId: String(weddingId),
    });
    if (conflicts.length) {
      const msg = conflicts.map(c => c.message).join(' | ');
      const err = new Error(msg);
      err.details = conflicts;
      throw err;
    }

    const { data, error } = await supabase
      .from('weddings')
      .update(toUpdate)
      .eq('wedding_id', weddingId)
      .select();

    if (error) throw error;
    return (data && data[0]) || null;
  }

  async function deleteWedding(weddingId) {
    const supabase = ensureClient();
    const { error } = await supabase.from('weddings').delete().eq('wedding_id', weddingId);
    if (error) throw error;
    return true;
  }

  // ------------- Exports globais -------------
  window.db = window.db || {};
  window.db.checkSupabaseConnection = checkSupabaseConnection;

  window.db.getConfig = getConfig;
  window.db.saveConfig = saveConfig;

  window.db.getCelebrants = getCelebrants;
  window.db.getLocations = getLocations;

  window.db.getCalendarEvents = getCalendarEvents;

  window.db.checkWeddingConflicts = checkWeddingConflicts;
  window.db.createWedding = createWedding;
  window.db.updateWedding = updateWedding;
  window.db.deleteWedding = deleteWedding;

  // compat legado
  window.checkSupabaseConnection = window.db.checkSupabaseConnection;
})();
