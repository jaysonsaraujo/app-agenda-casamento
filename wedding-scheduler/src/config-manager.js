// Classe para gerenciar a página de configurações
class ConfigManager {
    constructor() {
        console.log('🔧 ConfigManager constructor chamado');
        this.configs = {};
        this.locations = [];
        this.celebrants = [];
        this.initTimeout = null;
    }

    async init() {
        try {
            console.log('🔧 Inicializando Config Manager...');
            
            // AGUARDAR window.db ficar disponível
            if (!window.db) {
                console.warn('⏳ Aguardando window.db...');
                await this.waitForDatabase();
            }
            
            console.log('✅ window.db disponível:', window.db);
            
            const connected = await window.checkSupabaseConnection();
            if (!connected) {
                console.error('❌ Não conectado ao Supabase');
                this.showNotification('Erro ao conectar com o banco de dados', 'error');
                return;
            }

            console.log('✅ Supabase conectado');
            
            await this.loadAllData();
            this.setupEventListeners();
            await this.loadStatistics();
            
            console.log('✅ Config Manager inicializado');
        } catch (error) {
            console.error('❌ Erro ao inicializar:', error);
            this.showNotification('Erro ao carregar configurações: ' + error.message, 'error');
        }
    }

    // Nova função para aguardar o database
    waitForDatabase() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50; // 5 segundos
            
            const checkDb = setInterval(() => {
                attempts++;
                console.log(`⏳ Tentativa ${attempts}/${maxAttempts} - window.db:`, typeof window.db);
                
                if (window.db) {
                    clearInterval(checkDb);
                    console.log('✅ window.db encontrado!');
                    resolve();
                } else if (attempts >= maxAttempts) {
                    clearInterval(checkDb);
                    console.error('❌ Timeout aguardando window.db');
                    reject(new Error('Database não inicializado após 5 segundos'));
                }
            }, 100);
        });
    }

    // ... resto do código permanece igual ...
