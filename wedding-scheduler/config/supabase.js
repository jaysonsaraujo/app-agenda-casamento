/**
 * Inicialização do Supabase no navegador com URL/ANON fixos.
 * - Carrega a lib UMD do @supabase/supabase-js@2 se necessário
 * - Cria window.supabaseClient usando as constantes abaixo
 * - Expõe window.initSupabase() e window.checkSupabaseConnection()
 *
 * IMPORTANTE: Este arquivo é JavaScript puro (NÃO coloque <script> aqui).
 * Na página, inclua na ordem: UMD do Supabase -> ESTE arquivo -> seus src/*.js
 */

/** ====== SUAS CREDENCIAIS PÚBLICAS (ANON) ====== */
const SUPABASE_URL = "https://aplicativos-db-phm2-supabase.xqzrhl.easypanel.host";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE";
/** ============================================== */

(function () {
  // Carrega um script externo e resolve quando terminar
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      try {
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) {
          if (existing.dataset.loaded === "1") return resolve();
          existing.addEventListener("load", () => resolve());
          existing.addEventListener("error", () => reject(new Error("Falha ao carregar: " + src)));
          return;
        }
        const s = document.createElement("script");
        s.async = true;
        s.src = src;
        s.onload = () => {
          s.dataset.loaded = "1";
          resolve();
        };
        s.onerror = () => reject(new Error("Falha ao carregar: " + src));
        document.head.appendChild(s);
      } catch (e) {
        reject(e);
      }
    });
  }

  // Garante que a lib UMD esteja disponível (window.supabase ou window.Supabase)
  async function ensureSupabaseUMD() {
    if ((window.supabase && typeof window.supabase.createClient === "function") ||
        (window.Supabase && typeof window.Supabase.createClient === "function")) {
      return;
    }

    // Tenta jsDelivr primeiro, depois unpkg
    const cdnCandidates = [
      "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js",
      "https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.min.js"
    ];
    let lastErr = null;
    for (const url of cdnCandidates) {
      try {
        await loadScript(url);
        if ((window.supabase && typeof window.supabase.createClient === "function") ||
            (window.Supabase && typeof window.Supabase.createClient === "function")) {
          return;
        }
      } catch (e) {
        lastErr = e;
      }
    }
    throw (lastErr || new Error("Não foi possível carregar a lib UMD do Supabase."));
  }

  // Cria (ou reaproveita) o cliente global com as constantes acima
  async function initSupabase() {
    try {
      await ensureSupabaseUMD();
      if (window.supabaseClient) {
        return true;
      }

      const createClient =
        (window.supabase && window.supabase.createClient) ||
        (window.Supabase && window.Supabase.createClient);

      if (typeof createClient !== "function") {
        throw new Error("createClient não encontrado no UMD do Supabase.");
      }

      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        throw new Error("SUPABASE_URL/SUPABASE_ANON_KEY não definidos.");
      }

      window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      return true;
    } catch (err) {
      console.error("initSupabase() falhou:", err);
      return false;
    }
  }

  // Faz um check rápido na conexão (consulta leve)
  async function checkSupabaseConnection() {
    try {
      if (!window.supabaseClient) {
        const ok = await initSupabase();
        if (!ok) return false;
      }
      // Tabela leve/simples para ping (ajuste se quiser)
      const { error } = await window.supabaseClient
        .from("system_config")
        .select("config_key")
        .limit(1);
      if (error) {
        console.error("Ping Supabase falhou:", error);
        return false;
      }
      return true;
    } catch (e) {
      console.error("checkSupabaseConnection() erro:", e);
      return false;
    }
  }

  // Expõe no escopo global
  window.initSupabase = initSupabase;
  window.checkSupabaseConnection = checkSupabaseConnection;
})();
