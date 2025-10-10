<script>
/**
 * Inicialização resiliente do Supabase no navegador.
 * - Garante que a lib UMD do @supabase/supabase-js@2 esteja carregada
 * - Cria window.supabaseClient
 * - Expõe window.initSupabase() e window.checkSupabaseConnection()
 *
 * Observação: este arquivo deve ser incluído DEPOIS do script UMD do supabase
 * (cdn.jsdelivr ou unpkg). Esta versão também tenta carregar dinamicamente se
 * não encontrar a lib por qualquer motivo.
 */

(function () {
  // Carrega um script externamente e devolve uma Promise que resolve no 'load'
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

  // Busca config do backend
  async function fetchRuntimeConfig() {
    const res = await fetch("/api/config", { headers: { "accept": "application/json" } });
    if (!res.ok) {
      throw new Error("Falha ao obter /api/config (" + res.status + ")");
    }
    const json = await res.json();
    // Espera: { supabaseUrl: "...", supabaseKey: "..." }
    if (!json || !json.supabaseUrl || !json.supabaseKey) {
      throw new Error("Config inválida: supabaseUrl/supabaseKey ausentes.");
    }
    return json;
  }

  // Cria (ou reaproveita) o cliente global
  async function initSupabase() {
    try {
      await ensureSupabaseUMD();
      if (window.supabaseClient) {
        return true;
      }
      const { supabaseUrl, supabaseKey } = await fetchRuntimeConfig();

      const createClient =
        (window.supabase && window.supabase.createClient) ||
        (window.Supabase && window.Supabase.createClient);

      if (typeof createClient !== "function") {
        throw new Error("createClient não encontrado no UMD do Supabase.");
      }

      window.supabaseClient = createClient(supabaseUrl, supabaseKey);
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
</script>
