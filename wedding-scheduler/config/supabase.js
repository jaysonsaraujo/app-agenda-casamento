<!-- ESTE ARQUIVO É CARREGADO NO NAVEGADOR (sem exports) -->
<script>
  (function () {
    'use strict';

    // === CONFIGURAÇÃO DO SUPABASE ===
    const SUPABASE_URL = 'https://aplicativos-db-phm2-supabase.xqzrhl.easypanel.host';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';

    // Valida presença do SDK (cdn.jsdelivr ou unpkg)
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      console.error('[supabase.js] SDK do Supabase não carregou. Inclua o script do CDN ANTES deste arquivo:');
      console.error('<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>');
      return;
    }

    // Cria o cliente e expõe globalmente
    try {
      const { createClient } = window.supabase;
      const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false },
        global: { headers: { 'x-client-info': 'casamentos-app/1.0' } }
      });
      window.supabaseClient = client;
      console.info('[supabase.js] Supabase client inicializado.');
    } catch (e) {
      console.error('[supabase.js] Falha ao criar o cliente Supabase:', e);
    }
  })();
</script>
