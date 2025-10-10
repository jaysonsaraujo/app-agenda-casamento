/**
 * Camada de acesso ao Supabase (browser).
 * - Usa SEMPRE window.supabaseClient (criado por /config/supabase.js)
 * - Se o cliente ainda não existir, chama window.initSupabase() antes de qualquer query
 * - Expõe window.db com métodos utilitários usados no app
 */

(function () {
  // Garante que o cliente global exista
  async function ensureClient() {
    if (window.supabaseClient) return window.supabaseClient;
    if (typeof window.initSupabase === "function") {
      const ok = await window.initSupabase();
      if (ok && window.supabaseClient) return window.supabaseClient;
    }
    throw new Error("Supabase client não inicializado. Verifique /config/supabase.js e a ordem dos <script>.");
  }

  // Executor com cliente garantido
  async function withClient(fn) {
    const sb = await ensureClient();
    return fn(sb);
  }

  // =========================
  // CONFIGURAÇÕES
  // =========================
  async function getConfig() {
    return withClient(async (sb) => {
      const { data, error } = await sb
        .from("system_config")
        .select("config_key, config_value, config_type");
      if (error) { console.error("getConfig erro:", error); throw error; }
      return data || [];
    });
  }

  async function updateConfig(key, value) {
    return withClient(async (sb) => {
      const { error } = await sb
        .from("system_config")
        .upsert([{ config_key: key, config_value: String(value) }], { onConflict: "config_key" });
      if (error) { console.error("updateConfig erro:", error); throw error; }
      return true;
    });
  }

  // =========================
  // LOCAIS
  // =========================
  async function getLocations(onlyActive = false) {
    return withClient(async (sb) => {
      let query = sb.from("locations")
        .select("id, name, address, capacity, is_active")
        .order("name", { ascending: true });
      if (onlyActive) query = query.eq("is_active", true);
      const { data, error } = await query;
      if (error) { console.error("getLocations erro:", error); throw error; }
      return data || [];
    });
  }

  async function addLocation(payload) {
    return withClient(async (sb) => {
      const row = {
        name: payload.name,
        address: payload.address ?? null,
        capacity: payload.capacity ?? null,
        is_active: payload.is_active ?? true,
      };
      const { data, error } = await sb.from("locations").insert(row).select("id").single();
      if (error) { console.error("addLocation erro:", error); throw error; }
      return data;
    });
  }

  // =========================
  // CELEBRANTES
  // =========================
  async function getCelebrants(onlyActive = false) {
    return withClient(async (sb) => {
      let query = sb.from("celebrants")
        .select("id, name, title, phone, is_active")
        .order("name", { ascending: true });
      if (onlyActive) query = query.eq("is_active", true);
      const { data, error } = await query;
      if (error) { console.error("getCelebrants erro:", error); throw error; }
      return data || [];
    });
  }

  async function addCelebrant(payload) {
    return withClient(async (sb) => {
      const row = {
        name: payload.name,
        title: payload.title,
        phone: payload.phone ?? null,
        is_active: payload.is_active ?? true,
      };
      const { data, error } = await sb.from("celebrants").insert(row).select("id").single();
      if (error) { console.error("addCelebrant erro:", error); throw error; }
      return data;
    });
  }

  // =========================
  // CASAMENTOS / CALENDÁRIO
  // =========================

  /**
   * Retorna os eventos do ano agrupados por dia, no formato esperado por calendar.js:
   * {
   *   "YYYY-MM-DD": {
   *     total_events: number,
   *     community_events: number,
   *     individual_events: number,
   *     events: [{
   *       wedding_id, wedding_time, is_community,
   *       bride_name, groom_name,
   *       location_name, celebrant_name
   *     }]
   *   },
   *   ...
   * }
   */
  async function getCalendarEvents(year) {
    return withClient(async (sb) => {
      const dateFrom = `${year}-01-01`;
      const dateTo   = `${year}-12-31`;

      // 1) Busca casamentos do ano
      const { data: weddings, error: wErr } = await sb
        .from("weddings")
        .select(`
          wedding_id, wedding_date, wedding_time, is_community, status,
          location_id, celebrant_id, bride_name, groom_name
        `)
        .gte("wedding_date", dateFrom)
        .lte("wedding_date", dateTo)
        .order("wedding_date", { ascending: true })
        .order("wedding_time", { ascending: true });

      if (wErr) { console.error("getCalendarEvents[weddings] erro:", wErr); throw wErr; }

      // 2) Busca nomes de locais/celebrantes para enriquecer
      const [{ data: locs, error: lErr }, { data: cels, error: cErr }] = await Promise.all([
        sb.from("locations").select("id, name"),
        sb.from("celebrants").select("id, name, title"),
      ]);
      if (lErr) { console.error("getCalendarEvents[locations] erro:", lErr); throw lErr; }
      if (cErr) { console.error("getCalendarEvents[celebrants] erro:", cErr); throw cErr; }

      const locMap = Object.create(null);
      (locs || []).forEach(l => { locMap[l.id] = l.name; });

      const celMap = Object.create(null);
      (cels || []).forEach(c => { celMap[c.id] = (c.title ? `${c.title} ` : "") + c.name; });

      // 3) Agrupa por dia
      const byDay = Object.create(null);

      (weddings || []).forEach(w => {
        const dateStr = w.wedding_date; // ISO YYYY-MM-DD
        if (!byDay[dateStr]) {
          byDay[dateStr] = {
            total_events: 0,
            community_events: 0,
            individual_events: 0,
            events: []
          };
        }
        const bucket = byDay[dateStr];
        bucket.total_events += 1;
        if (w.is_community) bucket.community_events += 1;
        else bucket.individual_events += 1;

        bucket.events.push({
          wedding_id: w.wedding_id,
          wedding_time: (w.wedding_time || "").toString(),
          is_community: !!w.is_community,
          bride_name: w.bride_name,
          groom_name: w.groom_name,
          location_name: locMap[w.location_id] || `#${w.location_id}`,
          celebrant_name: celMap[w.celebrant_id] || `#${w.celebrant_id}`
        });
      });

      return byDay;
    });
  }

  // Busca lista por intervalo (usada em buscas/listagens)
  async function getWeddingsByDateRange(dateFrom, dateTo) {
    return withClient(async (sb) => {
      const { data, error } = await sb
        .from("weddings")
        .select(`
          wedding_id, schedule_date, interview_date,
          bride_name, bride_whatsapp,
          groom_name, groom_whatsapp,
          wedding_date, wedding_time,
          location_id, celebrant_id,
          is_community, transfer_type,
          with_civil_effect, observations, system_message, status
        `)
        .gte("wedding_date", dateFrom)
        .lte("wedding_date", dateTo)
        .order("wedding_date", { ascending: true })
        .order("wedding_time", { ascending: true });
      if (error) { console.error("getWeddingsByDateRange erro:", error); throw error; }
      return data || [];
    });
  }

  async function getWedding(wedding_id) {
    return withClient(async (sb) => {
      const { data, error } = await sb
        .from("weddings")
        .select(`
          wedding_id, schedule_date, interview_date,
          bride_name, bride_whatsapp,
          groom_name, groom_whatsapp,
          wedding_date, wedding_time,
          location_id, celebrant_id,
          is_community, transfer_type,
          with_civil_effect, observations, system_message, status
        `)
        .eq("wedding_id", wedding_id)
        .single();
      if (error) { console.error("getWedding erro:", error); throw error; }
      return data;
    });
  }

  async function createWedding(payload) {
    return withClient(async (sb) => {
      const { data, error } = await sb
        .from("weddings")
        .insert(payload)
        .select("*")
        .single();
      if (error) { console.error("createWedding erro:", error); throw error; }
      return data;
    });
  }

  async function updateWedding(wedding_id, patch) {
    return withClient(async (sb) => {
      const { data, error } = await sb
        .from("weddings")
        .update(patch)
        .eq("wedding_id", wedding_id)
        .select("*")
        .single();
      if (error) { console.error("updateWedding erro:", error); throw error; }
      return data;
    });
  }

  async function deleteWedding(wedding_id) {
    return withClient(async (sb) => {
      const { error } = await sb
        .from("weddings")
        .delete()
        .eq("wedding_id", wedding_id);
      if (error) { console.error("deleteWedding erro:", error); throw error; }
      return true;
    });
  }

  // =========================
  // CONFLITOS / UTILITÁRIOS
  // =========================
  /**
   * Valida conflitos chamando a função SQL check_wedding_conflicts
   * Espera formData com:
   * - wedding_date (YYYY-MM-DD)
   * - wedding_time (HH:mm ou HH:mm:ss)
   * - location_id (int)
   * - celebrant_id (int)
   * - is_community (boolean)
   * - wedding_id (opcional, para edição)
   */
  async function checkWeddingConflicts(formData) {
    return withClient(async (sb) => {
      const args = {
        p_wedding_date: formData.wedding_date,
        p_wedding_time: formData.wedding_time,
        p_location_id:  Number(formData.location_id),
        p_celebrant_id: Number(formData.celebrant_id),
        p_is_community: !!formData.is_community,
        p_wedding_id:   formData.wedding_id ?? null,
      };
      const { data, error } = await sb.rpc("check_wedding_conflicts", args);
      if (error) { console.error("checkWeddingConflicts erro:", error, "args:", args); throw error; }
      return Array.isArray(data) ? data : [];
    });
  }

  /**
   * Calcula os 3 domingos ANTERIORES à data do casamento.
   * Retorna em ordem cronológica:
   * { first_sunday, second_sunday, third_sunday } (YYYY-MM-DD)
   */
  async function calculateProclamationSundays(weddingDateISO) {
    // Pode ser RPC no banco; mantendo versão JS para não depender de função SQL.
    function toISO(d) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const da = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${da}`;
    }

    const base = new Date(`${weddingDateISO}T12:00:00`);
    // Domingo anterior (se o casamento cair num domingo, pega o anterior)
    const prevSunday = new Date(base);
    const dow = prevSunday.getDay(); // 0 = domingo
    // voltar 'dow' dias para chegar no domingo da semana; se já for domingo, volta 7
    prevSunday.setDate(prevSunday.getDate() - (dow === 0 ? 7 : dow));

    const second = new Date(prevSunday);
    second.setDate(second.getDate() - 7);
    const first = new Date(prevSunday);
    first.setDate(first.getDate() - 14);

    return {
      first_sunday:  toISO(first),
      second_sunday: toISO(second),
      third_sunday:  toISO(prevSunday),
    };
  }

  // =========================
  // EXPOR API GLOBAL
  // =========================
  window.db = {
    // Config
    getConfig, updateConfig,

    // Locais
    getLocations, addLocation,

    // Celebrantes
    getCelebrants, addCelebrant,

    // Casamentos / calendário
    getCalendarEvents,
    getWeddingsByDateRange,
    getWedding,
    createWedding,
    updateWedding,
    deleteWedding,

    // Conflitos / utilitários
    checkWeddingConflicts,
    calculateProclamationSundays,
  };
})();
