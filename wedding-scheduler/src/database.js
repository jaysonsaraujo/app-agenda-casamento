/**
 * Camada de acesso ao Supabase (browser).
 * - Usa SEMPRE window.supabaseClient (criado por /config/supabase.js)
 * - Se o cliente ainda não existir, chama window.initSupabase() antes de qualquer query
 * - Expõe window.db com métodos utilitários usados no app
 */

(function () {
  // Aguarda o cliente global existir (ou tenta inicializar)
  async function ensureClient() {
    if (window.supabaseClient) return window.supabaseClient;
    if (typeof window.initSupabase === "function") {
      const ok = await window.initSupabase();
      if (ok && window.supabaseClient) return window.supabaseClient;
    }
    throw new Error("Supabase client não inicializado. Verifique /config/supabase.js e a ordem dos <script>.");
  }

  // Helper genérico para executar operações com cliente garantido
  async function withClient(fn) {
    const sb = await ensureClient();
    return fn(sb);
  }

  // -------- CONFIGURAÇÕES --------

  async function getConfig() {
    return withClient(async (sb) => {
      const { data, error } = await sb
        .from("system_config")
        .select("config_key, config_value, config_type");
      if (error) {
        console.error("getConfig erro:", error);
        throw error;
      }
      return data || [];
    });
  }

  async function updateConfig(key, value) {
    return withClient(async (sb) => {
      // upsert por config_key
      const { error } = await sb
        .from("system_config")
        .upsert(
          [{ config_key: key, config_value: String(value) }],
          { onConflict: "config_key" }
        );
      if (error) {
        console.error("updateConfig erro:", error);
        throw error;
      }
      return true;
    });
  }

  // -------- LOCAIS --------

  async function getLocations(onlyActive = false) {
    return withClient(async (sb) => {
      let query = sb
        .from("locations")
        .select("id, name, address, capacity, is_active")
        .order("name", { ascending: true });

      if (onlyActive) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;
      if (error) {
        console.error("getLocations erro:", error);
        throw error;
      }
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
      const { data, error } = await sb
        .from("locations")
        .insert(row)
        .select("id")
        .single();
      if (error) {
        console.error("addLocation erro:", error);
        throw error;
      }
      return data;
    });
  }

  // -------- CELEBRANTES --------

  async function getCelebrants(onlyActive = false) {
    return withClient(async (sb) => {
      let query = sb
        .from("celebrants")
        .select("id, name, title, phone, is_active")
        .order("name", { ascending: true });

      if (onlyActive) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;
      if (error) {
        console.error("getCelebrants erro:", error);
        throw error;
      }
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
      const { data, error } = await sb
        .from("celebrants")
        .insert(row)
        .select("id")
        .single();
      if (error) {
        console.error("addCelebrant erro:", error);
        throw error;
      }
      return data;
    });
  }

  // -------- CASAMENTOS / CALENDÁRIO (básico usado no app) --------

  async function getWeddingsByDateRange(dateFrom, dateTo) {
    return withClient(async (sb) => {
      const { data, error } = await sb
        .from("weddings")
        .select(`
          wedding_id, wedding_date, wedding_time, is_community, status,
          location_id, celebrant_id,
          bride_name, groom_name
        `)
        .gte("wedding_date", dateFrom)
        .lte("wedding_date", dateTo)
        .order("wedding_date", { ascending: true })
        .order("wedding_time", { ascending: true });
      if (error) {
        console.error("getWeddingsByDateRange erro:", error);
        throw error;
      }
      return data || [];
    });
  }

  async function createWedding(payload) {
    // payload deve conter campos conforme seu schema (id opcional)
    return withClient(async (sb) => {
      const { data, error } = await sb
        .from("weddings")
        .insert(payload)
        .select("*")
        .single();
      if (error) {
        console.error("createWedding erro:", error);
        throw error;
      }
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
      if (error) {
        console.error("updateWedding erro:", error);
        throw error;
      }
      return data;
    });
  }

  // -------- CONFLITOS --------

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
      if (error) {
        console.error("checkWeddingConflicts erro:", error, "args:", args);
        throw error;
      }
      // A função retorna tabela (possivelmente vazia). Se vazia => sem conflitos.
      return Array.isArray(data) ? data : [];
    });
  }

  // -------- Expor API global --------

  window.db = {
    // config
    getConfig,
    updateConfig,

    // locais
    getLocations,
    addLocation,

    // celebrantes
    getCelebrants,
    addCelebrant,

    // casamentos
    getWeddingsByDateRange,
    createWedding,
    updateWedding,

    // conflitos
    checkWeddingConflicts,
  };
})();
