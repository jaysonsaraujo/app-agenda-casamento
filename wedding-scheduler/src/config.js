// Classe para gerenciar a página de configurações
class ConfigManager {
    constructor() {
        this.configs = {};
        this.locations = [];
        this.celebrants = [];
    }

    // ===== INICIALIZAÇÃO =====
    async init() {
        try {
            // Verificar conexão
            const connected = await window.checkSupabaseConnection();
            if (!connected) {
                this.showNotification('Erro ao conectar com o banco de dados', 'error');
                return;
            }

            // Carregar dados
            await this.loadAllData();

            // Configurar eventos
            this.setupEventListeners();

            // Carregar estatísticas
            await this.loadStatistics();

            console.log('Página de configurações carregada');
        } catch (error) {
            console.error('Erro ao inicializar configurações:', error);
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
            
            // Transformar array em objeto
            this.configs = {};
            configs.forEach(config => {
                this.configs[config.config_key] = config.config_value;
            });

            // Preencher formulários
            this.fillConfigForms();
        } catch (error) {
            console.error('Erro ao carregar configurações:', error);
        }
    }

    fillConfigForms() {
        // Configurações gerais
        document.getElementById('config-site-name').value = this.configs.site_name || '';

        // Configurações de agendamento
        document.getElementById('config-max-weddings').value = this.configs.max_weddings_per_day || '4';
        document.getElementById('config-max-community').value = this.configs.max_community_weddings || '3';

        // Configurações de lembretes
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
        window.validator.setupRealtimeValidation('form-edit-location');
        window.validator.setupRealtimeValidation('form-edit-celebrant');
    }

    // ===== SALVAR CONFIGURAÇÕES =====
    async saveGeneralConfig() {
        try {
            const siteName = document.getElementById('config-site-name').value;
            
            await window.db.updateConfig('site_name', siteName);
            
            // Atualizar título da página
            document.getElementById('site-title').textContent = siteName;
            document.title = `Configurações - ${siteName}`;
            
            this.showNotification('Configurações gerais salvas com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao salvar configurações gerais:', error);
            this.showNotification('Erro ao salvar configurações', 'error');
        }
    }

    async saveScheduleConfig() {
        try {
            const configs = {
                max_weddings_per_day: document.getElementById('config-max-weddings').value,
                max_community_weddings: document.getElementById('config-max-community').value
            };

            for (const [key, value] of Object.entries(configs)) {
                await window.db.updateConfig(key, value);
            }

            this.showNotification('Configurações de agendamento salvas com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao salvar configurações de agendamento:', error);
            this.showNotification('Erro ao salvar configurações', 'error');
        }
    }

    async saveReminderConfig() {
        try {
            const configs = {
                reminder_interview_2d: document.getElementById('config-reminder-2d').value,
                reminder_interview_1d: document.getElementById('config-reminder-1d').value,
                reminder_interview_12h: document.getElementById('config-reminder-12h').value,
                reminder_wedding: document.getElementById('config-reminder-wedding').value
            };

            for (const [key, value] of Object.entries(configs)) {
                await window.db.updateConfig(key, value);
            }

            this.showNotification('Configurações de lembretes salvas com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao salvar configurações de lembretes:', error);
            this.showNotification('Erro ao salvar configurações', 'error');
        }
    }

    // ===== LOCAIS =====
    async loadLocations() {
        try {
            this.locations = await window.db.getLocations(false); // Carregar todos, inclusive inativos
            this.renderLocationsTable();
        } catch (error) {
            console.error('Erro ao carregar locais:', error);
        }
    }

    renderLocationsTable() {
        const tbody = document.querySelector('#locations-table tbody');
        tbody.innerHTML = '';

        this.locations.forEach(location => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${location.name}</td>
                <td>${location.address || '-'}</td>
                <td>${location.capacity || '-'}</td>
                <td>
                    <span class="status-badge ${location.is_active ? 'active' : 'inactive'}">
                        ${location.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                </td>
                <td>
                    <div class="table-actions">
                        <button class="btn-table" onclick="configManager.editLocation(${location.id})">
                            Editar
                        </button>
                        <button class="btn-table danger" onclick="configManager.toggleLocationStatus(${location.id})">
                            ${location.is_active ? 'Desativar' : 'Ativar'}
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
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
                name: document.getElementById('edit-location-name').value,
                address: document.getElementById('edit-location-address').value,
                capacity: document.getElementById('edit-location-capacity').value ? 
                         parseInt(document.getElementById('edit-location-capacity').value) : null,
                is_active: document.getElementById('edit-location-active').value === 'true'
            };

            await window.db.supabase
                .from('locations')
                .update(data)
                .eq('id', id);

            this.closeModal('modal-edit-location');
            await this.loadLocations();
            this.showNotification('Local atualizado com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao atualizar local:', error);
            this.showNotification('Erro ao atualizar local', 'error');
        }
    }

    async toggleLocationStatus(id) {
        try {
            const location = this.locations.find(l => l.id === id);
            if (!location) return;

            const confirmMessage = location.is_active ? 
                'Deseja realmente desativar este local?' : 
                'Deseja reativar este local?';

            if (!confirm(confirmMessage)) return;

            await window.db.supabase
                .from('locations')
                .update({ is_active: !location.is_active })
                .eq('id', id);

            await this.loadLocations();
            this.showNotification('Status do local atualizado!', 'success');
        } catch (error) {
            console.error('Erro ao alterar status do local:', error);
            this.showNotification('Erro ao alterar status', 'error');
        }
    }

    // ===== CELEBRANTES =====
    async loadCelebrants() {
        try {
            this.celebrants = await window.db.getCelebrants(false); // Carregar todos, inclusive inativos
            this.renderCelebrantsTable();
        } catch (error) {
            console.error('Erro ao carregar celebrantes:', error);
        }
    }

    renderCelebrantsTable() {
        const tbody = document.querySelector('#celebrants-table tbody');
        tbody.innerHTML = '';

        this.celebrants.forEach(celebrant => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${celebrant.name}</td>
                <td>${celebrant.title}</td>
                <td>${celebrant.phone || '-'}</td>
                <td>
                    <span class="status-badge ${celebrant.is_active ? 'active' : 'inactive'}">
                        ${celebrant.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                </td>
                <td>
                    <div class="table-actions">
                        <button class="btn-table" onclick="configManager.editCelebrant(${celebrant.id})">
                            Editar
                        </button>
                        <button class="btn-table danger" onclick="configManager.toggleCelebrantStatus(${celebrant.id})">
                            ${celebrant.is_active ? 'Desativar' : 'Ativar'}
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
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
                name: document.getElementById('edit-celebrant-name').value,
                title: document.getElementById('edit-celebrant-title').value,
                phone: document.getElementById('edit-celebrant-phone').value,
                is_active: document.getElementById('edit-celebrant-active').value === 'true'
            };

            await window.db.supabase
                .from('celebrants')
                .update(data)
                .eq('id', id);

            this.closeModal('modal-edit-celebrant');
            await this.loadCelebrants();
            this.showNotification('Celebrante atualizado com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao atualizar celebrante:', error);
            this.showNotification('Erro ao atualizar celebrante', 'error');
        }
    }

    async toggleCelebrantStatus(id) {
        try {
            const celebrant = this.celebrants.find(c => c.id === id);
            if (!celebrant) return;

            const confirmMessage = celebrant.is_active ? 
                'Deseja realmente desativar este celebrante?' : 
                'Deseja reativar este celebrante?';

            if (!confirm(confirmMessage)) return;

            await window.db.supabase
                .from('celebrants')
                .update({ is_active: !celebrant.is_active })
                .eq('id', id);

            await this.loadCelebrants();
            this.showNotification('Status do celebrante atualizado!', 'success');
        } catch (error) {
            console.error('Erro ao alterar status do celebrante:', error);
            this.showNotification('Erro ao alterar status', 'error');
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
            const stats = await window.db.getMonthStatistics(currentYear, currentMonth);

            // Atualizar valores
            document.getElementById('stat-total-weddings').textContent = totalWeddings || 0;
            document.getElementById('stat-month-weddings').textContent = stats.total;
            document.getElementById('stat-community-weddings').textContent = stats.community;
            document.getElementById('stat-civil-weddings').textContent = stats.withCivil;
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
        
        const icons = {
            success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
            error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
            warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
            info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
        };
        
        notification.innerHTML = `
            <div class="notification-icon">${icons[type]}</div>
            <div class="notification-content">
                <div class="notification-message">${message}</div>
            </div>
            <button class="notification-close">&times;</button>
        `;
        
        container.appendChild(notification);
        
        // Auto remover após 5 segundos
        setTimeout(() => {
            notification.remove();
        }, 5000);
        
        // Remover ao clicar no X
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
    }
}

// Criar instância global
const configManager = new ConfigManager();

// Funções globais
window.closeModal = (modalId) => configManager.closeModal(modalId);
window.showAddLocationModal = () => window.location.href = '/#modal-add-location';
window.showAddCelebrantModal = () => window.location.href = '/#modal-add-celebrant';

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    configManager.init();
});
