// app.js completo com melhorias integradas
class WeddingSchedulerApp {
    constructor() {
        this.currentModal = null;
        this.currentWeddingType = null;
        this.editingWeddingId = null;
    }

    async init() {
        try {
            console.log('🚀 Inicializando aplicação...');
            const connected = await window.checkSupabaseConnection();
            if (!connected) {
                this.showNotification('Erro ao conectar com o banco de dados', 'error');
                return;
            }
            await this.loadConfig();
            window.calendar.init();
            this.setupEventListeners();
            await this.loadInitialData();
            console.log('✅ Aplicação iniciada com sucesso');
        } catch (error) {
            console.error('❌ Erro ao inicializar:', error);
            this.showNotification('Erro ao inicializar aplicação: ' + error.message, 'error');
        }
    }

    async loadConfig() {
        try {
            const configs = await window.db.getConfig();
            configs.forEach(config => {
                if (config.config_key === 'site_name') {
                    document.getElementById('site-title').textContent = config.config_value;
                    document.title = config.config_value;
                }
            });
        } catch (error) {
            console.error('Erro ao carregar configurações:', error);
        }
    }

    async loadInitialData() {
        try {
            await Promise.all([
                this.loadLocations(),
                this.loadCelebrants()
            ]);
        } catch (error) {
            console.error('Erro ao carregar dados iniciais:', error);
        }
    }

    setupEventListeners() {
        document.getElementById('btn-calendar').addEventListener('click', () => {
            this.showSection('calendar');
        });

        document.getElementById('btn-search').addEventListener('click', () => {
            this.showSection('search');
        });

        document.getElementById('btn-config').addEventListener('click', () => {
            window.location.href = '/config.html';
        });

        document.querySelectorAll('.btn-wedding-type').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.currentTarget.dataset.type;
                this.selectWeddingType(type);
            });
        });

        document.getElementById('wedding-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveWedding();
        });

        document.getElementById('form-add-location').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addLocation();
        });

        document.getElementById('form-add-celebrant').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addCelebrant();
        });

        document.getElementById('btn-add-location').addEventListener('click', () => {
            this.openModal('modal-add-location');
        });

        document.getElementById('btn-add-celebrant').addEventListener('click', () => {
            this.openModal('modal-add-celebrant');
        });

        document.getElementById('wedding-date').addEventListener('change', (e) => {
            this.updateProclamationDates(e.target.value);
        });

        window.validator.setupRealtimeValidation('wedding-form');
        window.validator.setupRealtimeValidation('form-add-location');
        window.validator.setupRealtimeValidation('form-add-celebrant');

        // === NOVA PARTE: BUSCA COM FILTROS ===
        document.getElementById('btn-apply-filters').addEventListener('click', async () => {
            try {
                app.showLoading('Buscando casamentos...');

                const filters = {
                    name: document.getElementById('search-name').value.trim(),
                    location_id: document.getElementById('search-location').value || null,
                    celebrant_id: document.getElementById('search-celebrant').value || null,
                    is_community: document.getElementById('search-type').value || null,
                    status: document.getElementById('search-status').value || null,
                    date_start: document.getElementById('search-date-start').value || null,
                    date_end: document.getElementById('search-date-end').value || null,
                };

                const { data: results, error } = await window.supabaseClient
                    .from('weddings')
                    .select('*')
                    .order('wedding_date', { ascending: true });

                if (error) 
