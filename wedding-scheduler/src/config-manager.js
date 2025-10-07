// Classe para gerenciar a página de configurações
class ConfigManager {
    constructor() {
        console.log('🔧 ConfigManager constructor chamado');
        this.configs = {};
        this.locations = [];
        this.celebrants = [];
    }

    async init() {
        try {
            console.log('🔧 Inicializando Config Manager...');
            
            // Verificar se window.db existe
            if (!window.db) {
                console.error('❌ window.db não está disponível!');
                throw new Error('Database não inicializado');
            }
            
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

    async loadAllData() {
        console.log('📊 Carregando todos os dados...');
        try {
            await Promise.all([
                this.loadConfigs(),
                this.loadLocations(),
                this.loadCelebrants()
            ]);
            console.log('✅ Todos os dados carregados');
        } catch (error) {
            console.error('❌ Erro ao carregar dados:', error);
            throw error;
        }
    }

    // ===== CONFIGURAÇÕES =====
    async loadConfigs() {
        try {
            console.log('⚙️ Carregando configurações...');
            const configs = await window.db.getConfig();
            console.log('Configs recebidas:', configs);
            
            this.configs = {};
            configs.forEach(config => {
                this.configs[config.config_key] = config.config_value;
            });

            this.fillConfigForms();
            console.log('✅ Configurações carregadas');
        } catch (error) {
            console.error('❌ Erro ao carregar configurações:', error);
            throw error;
        }
    }

    fillConfigForms() {
        const fields = [
            { id: 'config-site-name', key: 'site_name', default: '' },
            { id: 'config-max-weddings', key: 'max_weddings_per_day', default: '4' },
            { id: 'config-max-community', key: 'max_community_weddings', default: '3' },
            { id: 'config-reminder-2d', key: 'reminder_interview_2d', default: '48' },
            { id: 'config-reminder-1d', key: 'reminder_interview_1d', default: '24' },
            { id: 'config-reminder-12h', key: 'reminder_interview_12h', default: '12' },
            { id: 'config-reminder-wedding', key: 'reminder_wedding', default: '24' }
        ];

        fields.forEach(field => {
            const element = document.getElementById(field.id);
            if (element) {
                element.value = this.configs[field.key] || field.default;
            }
        });
    }

    // ===== LOCAIS =====
    async loadLocations() {
        try {
            console.log('🏛️ Carregando locais...');
            
            // Chamar diretamente o Supabase para garantir
            const { data, error } = await window.db.supabase
                .from('locations')
                .select('*')
                .order('name');
            
            if (error) {
                console.error('❌ Erro do Supabase:', error);
                throw error;
            }
            
            console.log('Locais recebidos:', data);
            this.locations = data || [];
            
            this.renderLocationsTable();
            console.log('✅ Locais carregados:', this.locations.length);
        } catch (error) {
            console.error('❌ Erro ao carregar locais:', error);
            const tbody = document.querySelector('#locations-table tbody');
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red;">Erro: ${error.message}</td></tr>`;
            }
        }
    }

    renderLocationsTable() {
        console.log('🎨 Renderizando tabela de locais...');
        const tbody = document.querySelector('#locations-table tbody');
        
        if (!tbody) {
            console.error('❌ Elemento tbody não encontrado');
            return;
        }
        
        tbody.innerHTML = '';

        if (!this.locations || this.locations.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">Nenhum local cadastrado</td></tr>';
            return;
        }

        console.log(`Renderizando ${this.locations.length} locais`);
        
        this.locations.forEach(location => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${location.name}</strong></td>
                <td>${location.address || '-'}</td>
                <td>${location.capacity || '-'}</td>
                <td>
                    <span class="status-badge ${location.is_active ? 'active' : 'inactive'}">
                        ${location.is_active ? '✅ Ativo' : '❌ Inativo'}
                    </span>
                </td>
                <td>
                    <div class="table-actions">
                        <button class="btn-table" onclick="configManager.editLocation(${location.id})">
                            ✏️ Editar
                        </button>
                        <button class="btn-table ${location.is_active ? 'danger' : ''}" onclick="configManager.toggleLocationStatus(${location.id})">
                            ${location.is_active ? '🚫 Desativar' : '✅ Ativar'}
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
        
        console.log('✅ Tabela de locais renderizada');
    }

    // ===== CELEBRANTES =====
    async loadCelebrants() {
        try {
            console.log('⛪ Carregando celebrantes...');
            
            // Chamar diretamente o Supabase
            const { data, error } = await window.db.supabase
                .from('celebrants')
                .select('*')
                .order('name');
            
            if (error) {
                console.error('❌ Erro do Supabase:', error);
                throw error;
            }
            
            console.log('Celebrantes recebidos:', data);
            this.celebrants = data || [];
            
            this.renderCelebrantsTable();
            console.log('✅ Celebrantes carregados:', this.celebrants.length);
        } catch (error) {
            console.error('❌ Erro ao carregar celebrantes:', error);
            const tbody = document.querySelector('#celebrants-table tbody');
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red;">Erro: ${error.message}</td></tr>`;
            }
        }
    }

    renderCelebrantsTable() {
        console.log('🎨 Renderizando tabela de celebrantes...');
        const tbody = document.querySelector('#celebrants-table tbody');
        
        if (!tbody) {
            console.error('❌ Elemento tbody não encontrado');
            return;
        }
        
        tbody.innerHTML = '';

        if (!this.celebrants || this.celebrants.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">Nenhum celebrante cadastrado</td></tr>';
            return;
        }

        console.log(`Renderizando ${this.celebrants.length} celebrantes`);

        this.celebrants.forEach(celebrant => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${celebrant.name}</strong></td>
                <td>${celebrant.title}</td>
                <td>${celebrant.phone || '-'}</td>
                <td>
                    <span class="status-badge ${celebrant.is_active ? 'active' : 'inactive'}">
                        ${celebrant.is_active ? '✅ Ativo' : '❌ Inativo'}
                    </span>
                </td>
                <td>
                    <div class="table-actions">
                        <button class="btn-table" onclick="configManager.editCelebrant(${celebrant.id})">
                            ✏️ Editar
                        </button>
                        <button class="btn-table ${celebrant.is_active ? 'danger' : ''}" onclick="configManager.toggleCelebrantStatus(${celebrant.id})">
                            ${celebrant.is_active ? '🚫 Desativar' : '✅ Ativar'}
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
        
        console.log('✅ Tabela de celebrantes renderizada');
    }

    // ===== EVENT LISTENERS =====
    setupEventListeners() {
        console.log('🎯 Configurando event listeners...');
        
        // Formulários de configuração
        const forms = [
            { id: 'form-general-config', handler: () => this.saveGeneralConfig() },
            { id: 'form-schedule-config', handler: () => this.saveScheduleConfig() },
            { id: 'form-reminder-config', handler: () => this.saveReminderConfig() },
            { id: 'form-add-location', handler: () => this.addLocation() },
            { id: 'form-add-celebrant', handler: () => this.addCelebrant() },
            { id: 'form-edit-location', handler: () => this.updateLocation() },
            { id: 'form-edit-celebrant', handler: () => this.updateCelebrant() }
        ];

        forms.forEach(form => {
            const element = document.getElementById(form.id);
            if (element) {
                element.addEventListener('submit', (e) => {
                    e.preventDefault();
                    form.handler();
                });
            }
        });

        // Validação em tempo real
        if (window.validator) {
            window.validator.setupRealtimeValidation('form-add-location');
            window.validator.setupRealtimeValidation('form-add-celebrant');
            window.validator.setupRealtimeValidation('form-edit-location');
            window.validator.setupRealtimeValidation('form-edit-celebrant');
        }
        
        console.log('✅ Event listeners configurados');
    }

    // ===== SALVAR CONFIGURAÇÕES =====
    async saveGeneralConfig() {
        try {
            const siteName = document.getElementById('config-site-name').value;
            await window.db.updateConfig('site_name', siteName);
            this.showNotification('✅ Configurações gerais salvas!', 'success');
        } catch (error) {
            console.error('Erro ao salvar:', error);
            this.showNotification('❌ Erro: ' + error.message, 'error');
        }
    }

    async saveScheduleConfig() {
        try {
            await window.db.updateConfig('max_weddings_per_day', document.getElementById('config-max-weddings').value);
            await window.db.updateConfig('max_community_weddings', document.getElementById('config-max-community').value);
            this.showNotification('✅ Limites salvos!', 'success');
        } catch (error) {
            console.error('Erro ao salvar:', error);
            this.showNotification('❌ Erro: ' + error.message, 'error');
        }
    }

    async saveReminderConfig() {
        try {
            await window.db.updateConfig('reminder_interview_2d', document.getElementById('config-reminder-2d').value);
            await window.db.updateConfig('reminder_interview_1d', document.getElementById('config-reminder-1d').value);
            await window.db.updateConfig('reminder_interview_12h', document.getElementById('config-reminder-12h').value);
            await window.db.updateConfig('reminder_wedding', document.getElementById('config-reminder-wedding').value);
            this.showNotification('✅ Lembretes salvos!', 'success');
        } catch (error) {
            console.error('Erro ao salvar:', error);
            this.showNotification('❌ Erro: ' + error.message, 'error');
        }
    }

    // ===== ADICIONAR LOCAL =====
    async addLocation() {
        try {
            const formData = {
                name: document.getElementById('new-location-name').value,
                address: document.getElementById('new-location-address').value,
                capacity: document.getElementById('new-location-capacity').value ? 
                         parseInt(document.getElementById('new-location-capacity').value) : null
            };
            
            if (!window.validator.validateLocationForm(formData)) {
                window.validator.showFormErrors('form-add-location');
                return;
            }
            
            await window.db.addLocation(formData);
            
            this.closeModal('modal-add-location');
            document.getElementById('form-add-location').reset();
            
            await this.loadLocations();
            this.showNotification('✅ Local adicionado!', 'success');
        } catch (error) {
            console.error('Erro ao adicionar:', error);
            this.showNotification('❌ Erro: ' + error.message, 'error');
        }
    }

    editLocation(id) {
        const location = this.locations.find(l => l.id === id);
        if (!location) return;

        document.getElementById('edit-location-id').value = location.id;
        document.getElementById('edit-location-name').value = location.name;
        document.getElementById('edit-location-address').value = location.address || '';
        document.getElementById('edit-location-capacity').value = location.capacity || '';
        document.getElementById('edit-location-active').value = location.is_active.toString();

        this.openModal('modal-edit-location');
    }

    async updateLocation() {
        try {
            const id = parseInt(document.getElementById('edit-location-id').value);
            const data = {
                name: document.getElementById('edit-location-name').value.toUpperCase(),
                address: document.getElementById('edit-location-address').value.toUpperCase(),
                capacity: document.getElementById('edit-location-capacity').value ? 
                         parseInt(document.getElementById('edit-location-capacity').value) : null,
                is_active: document.getElementById('edit-location-active').value === 'true'
            };

            const { error } = await window.db.supabase
                .from('locations')
                .update(data)
                .eq('id', id);

            if (error) throw error;

            this.closeModal('modal-edit-location');
            await this.loadLocations();
            this.showNotification('✅ Local atualizado!', 'success');
        } catch (error) {
            console.error('Erro:', error);
            this.showNotification('❌ Erro: ' + error.message, 'error');
        }
    }

    async toggleLocationStatus(id) {
        try {
            const location = this.locations.find(l => l.id === id);
            if (!location) return;

            const { error } = await window.db.supabase
                .from('locations')
                .update({ is_active: !location.is_active })
                .eq('id', id);

            if (error) throw error;

            await this.loadLocations();
            this.showNotification(`✅ Local ${location.is_active ? 'desativado' : 'ativado'}!`, 'success');
        } catch (error) {
            console.error('Erro:', error);
            this.showNotification('❌ Erro: ' + error.message, 'error');
        }
    }

    // ===== ADICIONAR CELEBRANTE =====
    async addCelebrant() {
        try {
            const formData = {
                name: document.getElementById('new-celebrant-name').value,
                title: document.getElementById('new-celebrant-title').value,
                phone: document.getElementById('new-celebrant-phone').value
            };
            
            if (!window.validator.validateCelebrantForm(formData)) {
                window.validator.showFormErrors('form-add-celebrant');
                return;
            }
            
            await window.db.addCelebrant(formData);
            
            this.closeModal('modal-add-celebrant');
            document.getElementById('form-add-celebrant').reset();
            
            await this.loadCelebrants();
            this.showNotification('✅ Celebrante adicionado!', 'success');
        } catch (error) {
            console.error('Erro:', error);
            this.showNotification('❌ Erro: ' + error.message, 'error');
        }
    }

    editCelebrant(id) {
        const celebrant = this.celebrants.find(c => c.id === id);
        if (!celebrant) return;

        document.getElementById('edit-celebrant-id').value = celebrant.id;
        document.getElementById('edit-celebrant-name').value = celebrant.name;
        document.getElementById('edit-celebrant-title').value = celebrant.title;
        document.getElementById('edit-celebrant-phone').value = celebrant.phone || '';
        document.getElementById('edit-celebrant-active').value = celebrant.is_active.toString();

        this.openModal('modal-edit-celebrant');
    }

    async updateCelebrant() {
        try {
            const id = parseInt(document.getElementById('edit-celebrant-id').value);
            const data = {
                name: document.getElementById('edit-celebrant-name').value.toUpperCase(),
                title: document.getElementById('edit-celebrant-title').value,
                phone: document.getElementById('edit-celebrant-phone').value,
                is_active: document.getElementById('edit-celebrant-active').value === 'true'
            };

            const { error } = await window.db.supabase
                .from('celebrants')
                .update(data)
                .eq('id', id);

            if (error) throw error;

            this.closeModal('modal-edit-celebrant');
            await this.loadCelebrants();
            this.showNotification('✅ Celebrante atualizado!', 'success');
        } catch (error) {
            console.error('Erro:', error);
            this.showNotification('❌ Erro: ' + error.message, 'error');
        }
    }

    async toggleCelebrantStatus(id) {
        try {
            const celebrant = this.celebrants.find(c => c.id === id);
            if (!celebrant) return;

            const { error } = await window.db.supabase
                .from('celebrants')
                .update({ is_active: !celebrant.is_active })
                .eq('id', id);

            if (error) throw error;

            await this.loadCelebrants();
            this.showNotification(`✅ Celebrante ${celebrant.is_active ? 'desativado' : 'ativado'}!`, 'success');
        } catch (error) {
            console.error('Erro:', error);
            this.showNotification('❌ Erro: ' + error.message, 'error');
        }
    }

    // ===== ESTATÍSTICAS =====
    async loadStatistics() {
        try {
            console.log('📊 Carregando estatísticas...');
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth() + 1;

            const { count: totalWeddings } = await window.db.supabase
                .from('weddings')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'AGENDADO');

            const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
            const lastDay = new Date(currentYear, currentMonth, 0).getDate();
            const endDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${lastDay}`;

            const { data: monthData } = await window.db.supabase
                .from('weddings')
                .select('is_community, with_civil_effect')
                .gte('wedding_date', startDate)
                .lte('wedding_date', endDate)
                .eq('status', 'AGENDADO');

            document.getElementById('stat-total').textContent = totalWeddings || 0;
            document.getElementById('stat-month').textContent = monthData?.length || 0;
            document.getElementById('stat-community').textContent = monthData?.filter(w => w.is_community).length || 0;
            document.getElementById('stat-civil').textContent = monthData?.filter(w => w.with_civil_effect).length || 0;
            
            console.log('✅ Estatísticas carregadas');
        } catch (error) {
            console.error('❌ Erro ao carregar estatísticas:', error);
        }
    }

    // ===== UTILITÁRIOS =====
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = '';
        }
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notification-container');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-message">${message}</div>
            </div>
            <button class="notification-close">&times;</button>
        `;
        
        container.appendChild(notification);
        setTimeout(() => notification.remove(), 5000);
        
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
    }
}

// Criar instância global
const configManager = new ConfigManager();

// Funções globais
window.closeModal = (modalId) => configManager.closeModal(modalId);
window.showAddLocationModal = () => configManager.openModal('modal-add-location');
window.showAddCelebrantModal = () => configManager.openModal('modal-add-celebrant');

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM carregado, iniciando ConfigManager...');
    configManager.init();
});
