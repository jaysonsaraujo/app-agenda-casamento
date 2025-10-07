// Classe para gerenciar a página de configurações
class ConfigManager {
    constructor() {
        this.configs = {};
        this.locations = [];
        this.celebrants = [];
    }

    async init() {
        try {
            console.log('🔧 Inicializando Config Manager...');
            
            const connected = await window.checkSupabaseConnection();
            if (!connected) {
                this.showNotification('Erro ao conectar com o banco de dados', 'error');
                return;
            }

            await this.loadAllData();
            this.setupEventListeners();
            await this.loadStatistics();
            
            console.log('✅ Config Manager inicializado');
        } catch (error) {
            console.error('Erro ao inicializar:', error);
            this.showNotification('Erro ao carregar configurações', 'error');
        }
    }

    async loadAllData() {
        await Promise.all([
            this.loadConfigs(),
            this.loadLocations(),
            this.loadCelebrants()
        ]);
    }

    // ===== CONFIGURAÇÕES =====
    async loadConfigs() {
        try {
            const configs = await window.db.getConfig();
            
            this.configs = {};
            configs.forEach(config => {
                this.configs[config.config_key] = config.config_value;
            });

            this.fillConfigForms();
        } catch (error) {
            console.error('Erro ao carregar configurações:', error);
        }
    }

    fillConfigForms() {
        document.getElementById('config-site-name').value = this.configs.site_name || '';
        document.getElementById('config-max-weddings').value = this.configs.max_weddings_per_day || '4';
        document.getElementById('config-max-community').value = this.configs.max_community_weddings || '3';
        document.getElementById('config-reminder-2d').value = this.configs.reminder_interview_2d || '48';
        document.getElementById('config-reminder-1d').value = this.configs.reminder_interview_1d || '24';
        document.getElementById('config-reminder-12h').value = this.configs.reminder_interview_12h || '12';
        document.getElementById('config-reminder-wedding').value = this.configs.reminder_wedding || '24';
    }

    // ===== EVENT LISTENERS =====
    setupEventListeners() {
        // Formulários de configuração
        document.getElementById('form-general-config').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveGeneralConfig();
        });

        document.getElementById('form-schedule-config').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveScheduleConfig();
        });

        document.getElementById('form-reminder-config').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveReminderConfig();
        });

        // Formulários de adição
        document.getElementById('form-add-location').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addLocation();
        });

        document.getElementById('form-add-celebrant').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addCelebrant();
        });

        // Formulários de edição
        document.getElementById('form-edit-location').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateLocation();
        });

        document.getElementById('form-edit-celebrant').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateCelebrant();
        });

        // Validação em tempo real
        window.validator.setupRealtimeValidation('form-add-location');
        window.validator.setupRealtimeValidation('form-add-celebrant');
        window.validator.setupRealtimeValidation('form-edit-location');
        window.validator.setupRealtimeValidation('form-edit-celebrant');
    }

    // ===== SALVAR CONFIGURAÇÕES =====
    async saveGeneralConfig() {
        try {
            const siteName = document.getElementById('config-site-name').value;
            await window.db.updateConfig('site_name', siteName);
            
            this.showNotification('✅ Configurações gerais salvas!', 'success');
        } catch (error) {
            console.error('Erro ao salvar:', error);
            this.showNotification('❌ Erro ao salvar configurações', 'error');
        }
    }

    async saveScheduleConfig() {
        try {
            await window.db.updateConfig('max_weddings_per_day', document.getElementById('config-max-weddings').value);
            await window.db.updateConfig('max_community_weddings', document.getElementById('config-max-community').value);
            
            this.showNotification('✅ Limites de agendamento salvos!', 'success');
        } catch (error) {
            console.error('Erro ao salvar:', error);
            this.showNotification('❌ Erro ao salvar limites', 'error');
        }
    }

    async saveReminderConfig() {
        try {
            await window.db.updateConfig('reminder_interview_2d', document.getElementById('config-reminder-2d').value);
            await window.db.updateConfig('reminder_interview_1d', document.getElementById('config-reminder-1d').value);
            await window.db.updateConfig('reminder_interview_12h', document.getElementById('config-reminder-12h').value);
            await window.db.updateConfig('reminder_wedding', document.getElementById('config-reminder-wedding').value);
            
            this.showNotification('✅ Configurações de lembretes salvas!', 'success');
        } catch (error) {
            console.error('Erro ao salvar:', error);
            this.showNotification('❌ Erro ao salvar lembretes', 'error');
        }
    }

    // ===== LOCAIS =====
    async loadLocations() {
        try {
            this.locations = await window.db.getLocations(false);
            this.renderLocationsTable();
        } catch (error) {
            console.error('Erro ao carregar locais:', error);
        }
    }

    renderLocationsTable() {
        const tbody = document.querySelector('#locations-table tbody');
        tbody.innerHTML = '';

        if (this.locations.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Nenhum local cadastrado</td></tr>';
            return;
        }

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
    }

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
            this.showNotification('✅ Local adicionado com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao adicionar:', error);
            this.showNotification('❌ Erro ao adicionar local: ' + error.message, 'error');
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
            console.error('Erro ao atualizar:', error);
            this.showNotification('❌ Erro ao atualizar local', 'error');
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
            console.error('Erro ao alterar status:', error);
            this.showNotification('❌ Erro ao alterar status', 'error');
        }
    }

    // ===== CELEBRANTES =====
    async loadCelebrants() {
        try {
            this.celebrants = await window.db.getCelebrants(false);
            this.renderCelebrantsTable();
        } catch (error) {
            console.error('Erro ao carregar celebrantes:', error);
        }
    }

    renderCelebrantsTable() {
        const tbody = document.querySelector('#celebrants-table tbody');
        tbody.innerHTML = '';

        if (this.celebrants.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Nenhum celebrante cadastrado</td></tr>';
            return;
        }

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
    }

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
            this.showNotification('✅ Celebrante adicionado com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao adicionar:', error);
            this.showNotification('❌ Erro ao adicionar celebrante: ' + error.message, 'error');
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
            console.error('Erro ao atualizar:', error);
            this.showNotification('❌ Erro ao atualizar celebrante', 'error');
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
            console.error('Erro ao alterar status:', error);
            this.showNotification('❌ Erro ao alterar status', 'error');
        }
    }

    // ===== ESTATÍSTICAS =====
    async loadStatistics() {
        try {
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth() + 1;

            // Total geral
            const { count: totalWeddings } = await window.db.supabase
                .from('weddings')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'AGENDADO');

            // Este mês
            const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
            const lastDay = new Date(currentYear, currentMonth, 0).getDate();
            const endDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${lastDay}`;

            const { data: monthData } = await window.db.supabase
                .from('weddings')
                .select('is_community, with_civil_effect')
                .gte('wedding_date', startDate)
                .lte('wedding_date', endDate)
                .eq('status', 'AGENDADO');

            const monthStats = {
                total: monthData?.length || 0,
                community: monthData?.filter(w => w.is_community).length || 0,
                civil: monthData?.filter(w => w.with_civil_effect).length || 0
            };

            // Atualizar valores
            document.getElementById('stat-total').textContent = totalWeddings || 0;
            document.getElementById('stat-month').textContent = monthStats.total;
            document.getElementById('stat-community').textContent = monthStats.community;
            document.getElementById('stat-civil').textContent = monthStats.civil;
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
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
    configManager.init();
});
