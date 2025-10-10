// /config/supabase.js
(function () {
  'use strict';

  // === SUA CONFIG ===
  const SUPABASE_URL = 'https://aplicativos-db-phm2-supabase.xqzrhl.easypanel.host';
  const SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';

  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    console.error('[supabase.js] SDK do Supabase não encontrado. Inclua o CDN antes deste arquivo.');
    return;
  }

  try {
    const { createClient } = window.supabase;
    window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
      global: { headers: { 'x-client-info': 'casamentos-app/1.0' } },
    });
    console.info('[supabase.js] Supabase client inicializado.');
  } catch (err) {
    console.error('[supabase.js] Falha ao criar o cliente:', err);
  }
})();
