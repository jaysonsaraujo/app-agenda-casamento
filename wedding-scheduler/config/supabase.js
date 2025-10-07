// Configuração do cliente Supabase
const SUPABASE_URL = 'https://app-phm-psj-db-phm2-supabase.xqzrhl.easypanel.host';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';

// Criar cliente Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
    },
    db: {
        schema: 'public'
    },
    global: {
        headers: {
            'x-application-name': 'wedding-scheduler'
        }
    }
});

// Função para verificar conexão
async function checkConnection() {
    try {
        const { data, error } = await supabase.from('system_config').select('*').limit(1);
        if (error) throw error;
        console.log('Conexão com Supabase estabelecida com sucesso');
        return true;
    } catch (error) {
        console.error('Erro ao conectar com Supabase:', error);
        return false;
    }
}

// Exportar para uso global
window.supabaseClient = supabase;
window.checkSupabaseConnection = checkConnection;
