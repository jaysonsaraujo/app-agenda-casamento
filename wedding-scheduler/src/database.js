// /src/database.js
(function () {
  'use strict';

  function getClient() {
    if (!window.supabaseClient) {
      throw new Error('[database.js] Supabase client ausente. Verifique a ordem dos scripts.');
    }
    return window.supabaseClient;
  }

  // ---------- CONFIG ----------
  async function getConfig() {
    const sb = getClient();
    const { data, error } = await sb
      .from('system_config')
      .select('config_key, config_value, config_type')
      .order('config_key', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async function upsertConfig(pairs) {
    // pairs: [{config_key, config_value, config_type}]
    const sb = getClient();
    const { data, error } = await sb.from('system_config').upsert(pairs, { onConflict: 'config_key' }).select();
    if (error) throw error;
    return data;
  }

  // ---------- CATÁLOGOS ----------
  async function listLocations() {
    const sb = getClient();
    const { data, error } = await sb
      .from('locations')
      .select('id, name, address, capacity, is_active')
      .order('name', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async function listCelebrants() {
    const sb = getClient();
    const { data, error } = await sb
      .from('celebrants')
      .select('id, name, title, phone, is_active')
      .order('name', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  // ---------- RPC de conflitos ----------
  async function checkWeddingConflicts({
    wedding_date,
    wedding_time,
    location_id,
    celebrant_id,
    is_community,
    wedding_id,
  }) {
    const sb = getClient();
    const params = {
      p_wedding_date: wedding_date,               // 'YYYY-MM-DD'
      p_wedding_time: wedding_time,               // 'HH:mm:ss'
      p_location_id: Number(location_id),
      p_celebrant_id: Number(celebrant_id),
      p_is_community: !!is_community,
      p_wedding_id: wedding_id ?? null,          // sempre string ou null (NUNCA undefined)
    };

    const { data, error } = await sb.rpc('check_wedding_conflicts', params);
    if (error) throw error;
    return data || [];
  }

  // ---------- Healthcheck ----------
  async function ping() {
    const sb = getClient();
    const { error } = await sb.from('system_config').select('count', { count: 'exact', head: true }).limit(1);
    if (error) throw error;
    return true;
  }

  // Exponha uma API única no global
  window.db = {
    getConfig,
    upsertConfig,
    listLocations,
    listCelebrants,
    checkWeddingConflicts,
    ping,
  };
})();
