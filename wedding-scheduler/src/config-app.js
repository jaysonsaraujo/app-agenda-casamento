// Aplicação de Configurações
class ConfigApp {
    constructor() {
        this.locations = [];
        this.celebrants = [];
        this.currentAction = null;
    }

    async init() {
        try {
            console.log('🔧 Iniciando ConfigApp...');
            
            // Verificar dependências
            if (!window.db) {
                throw new Error('Database não inicializado');
            }
            
            // Configurar event listeners
            this.setupEventListeners();
            
            // Carregar dados
            await this.loadAll();
            
            console.log('✅ ConfigApp inicializado');
        } catch (error) {
            console.error('❌ Erro ao inicializar:', error);
            this.showNotification('Erro ao carregar sistema: ' + error.message, 'error');
        }
    }

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

        // Formulários de locais
        document.getElementById('form-add-location').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addLocation();
        });

        document.getElementById('form-edit-location').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateLocation();
        });

        // Formulários de celebrantes
        document.getElementById('form-add-celebrant').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addCelebrant();
        });

        document.getElementById('form-edit-celebrant').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateCelebrant();
        });

        // Validação em tempo real
        if (window.validator) {
            window.validator.setupRealtimeValidation('form-add-location');
            window.validator.setupRealtimeValidation('form-edit-location');
            window.validator.setupRealtimeValidation('form-add-celebrant');
            window.validator.setupRealtimeValidation('form-edit-celebrant');
        }
    }

    async loadAll() {
        await Promise.all([
            this.loadConfigs(),
            this.loadLocations(),
            this.loadCelebrants(),
            this.loadStatistics()
        ]);
    }

    // ===== CONFIGURAÇÕES =====
    async loadConfigs() {
        try {
            const configs = await window.db.getConfig();
            const configMap = {};
            
            configs.forEach(c => {
                configMap[c.config_key] = c.config_value;
            });

            // Preencher formulários
            this.setInputValue('config-site-name', configMap.site_name || '');
            this.setInputValue('config-max-weddings', configMap.max_weddings_per_day || '4');
            this.setInputValue('config-max-community', configMap.max_community_weddings || '3');
            this.setInputValue('config-reminder-2d', configMap.reminder_interview_2d || '48');
            this.setInputValue('config-reminder-1d', configMap.reminder_interview_1d || '24');
            this.setInputValue('config-reminder-12h', configMap.reminder_interview_12h || '12');
        } catch (error) {
            console.error('Erro ao carregar configs:', error);
        }
    }

    async saveGeneralConfig() {
        try {
            const siteName = document.getElementById('config-site-name').value;
            await window.db.updateConfig('site_name', siteName);
            this.showNotification('✅ Configurações salvas com sucesso!', 'success');
        } catch (error) {
            console.error('Erro:', error);
            this.showNotification('❌ Erro ao salvar: ' + error.message, 'error');
        }
    }

    async saveScheduleConfig() {
        try {
            const maxWeddings = document.getElementById('config-max-weddings').value;
            const maxCommunity = document.getElementById('config-max-community').value;
            
            await window.db.updateConfig('max_weddings_per_day', maxWeddings);
            await window.db.updateConfig('max_community_weddings', maxCommunity);
            
            this.showNotification('✅ Limites salvos com sucesso!', 'success');
        } catch (error) {
            console.error('Erro:', error);
            this.showNotification('❌ Erro ao salvar: ' + error.message, 'error');
        }
    }

    async saveReminderConfig() {
        try {
            await window.db.updateConfig('reminder_interview_2d', document.getElementById('config-reminder-2d').value);
            await window.db.updateConfig('reminder_interview_1d', document.getElementById('config-reminder-1d').value);
            await window.db.updateConfig('reminder_interview_12h', document.getElementById('config-reminder-12h').value);
            
            this.showNotification('✅ Lembretes salvos com sucesso!', 'success');
        } catch (error) {
            console.error('Erro:', error);
            this.showNotification('❌ Erro ao salvar: ' + error.message, 'error');
        }
    }

    // ===== LOCAIS =====
    async loadLocations() {
        try {
            console.log('📍 Carregando locais...');
            
            const { data, error } = await window.db.supabase
                .from('locations')
                .select('*')
                .order('name');
            
            if (error) throw error;
            
            this.locations = data || [];
            this.renderLocationsTable();
            
            console.log(`✅ ${this.locations.length} locais carregados`);
        } catch (error) {
            console.error('❌ Erro ao carregar locais:', error);
            this.showNotification('Erro ao carregar locais', 'error');
        }
    }

    renderLocationsTable() {
        const tbody = document.querySelector('#locations-table tbody');
        tbody.innerHTML = '';

        if (this.locations.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 40px;">
                        <p style="color: var(--text-muted); margin-bottom: 1rem;">Nenhum local cadastrado</p>
                        <button class="btn-primary" onclick="configApp.showAddLocationModal()">
                            ➕ Adicionar Primeiro Local
                        </button>
                    </td>
                </tr>
            `;
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
                        <button class="btn-table" onclick="configApp.editLocation(${location.id})" title="Editar">
                            ✏️ Editar
                        </button>
                        <button class="btn-table ${location.is_active ? 'danger' : ''}" 
                                onclick="configApp.toggleLocationStatus(${location.id})"
                                title="${location.is_active ? 'Desativar' : 'Ativar'}">
                            ${location.is_active ? '🚫 Desativar' : '✅ Ativar'}
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    showAddLocationModal() {
        document.getElementById('form-add-location').reset();
        this.openModal('modal-add-location');
    }

    async addLocation() {
        try {
            const formData = {
                name: document.getElementById('new-location-name').value,
                address: document.getElementById('new-location-address').value,
                capacity: document.getElementById('new-location-capacity').value ? 
                         parseInt(document.getElementById('new-location-capacity').value) : null
            };

            // Validar
            if (!formData.name || formData.name.trim() === '') {
                this.showNotification('⚠️ Nome do local é obrigatório', 'warning');
                return;
            }

            // Verificar duplicado
            const exists = this.locations.find(l => 
                l.name.toUpperCase() === formData.name.toUpperCase()
            );
            
            if (exists) {
                this.showNotification('⚠️ Já existe um local com este nome', 'warning');
                return;
            }

            // Adicionar
            await window.db.addLocation(formData);
            
            this.closeModal('modal-add-location');
            await this.loadLocations();
            
            this.showNotification('✅ Local adicionado com sucesso!', 'success');
        } catch (error) {
            console.error('Erro:', error);
            this.showNotification('❌ Erro ao adicionar: ' + error.message, 'error');
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
            const formData = {
                name: document.getElementById('edit-location-name').value.toUpperCase(),
                address: document.getElementById('edit-location-address').value.toUpperCase(),
                capacity: document.getElementById('edit-location-capacity').value ? 
                         parseInt(document.getElementById('edit-location-capacity').value) : null,
                is_active: document.getElementById('edit-location-active').value === 'true'
            };

            // Validar
            if (!formData.name || formData.name.trim() === '') {
                this.showNotification('⚠️ Nome do local é obrigatório', 'warning');
                return;
            }

            // Atualizar
            const { error } = await window.db.supabase
                .from('locations')
                .update(formData)
                .eq('id', id);

            if (error) throw error;

            this.closeModal('modal-edit-location');
            await this.loadLocations();
            
            this.showNotification('✅ Local atualizado com sucesso!', 'success');
        } catch (error) {
            console.error('Erro:', error);
            this.showNotification('❌ Erro ao atualizar: ' + error.message, 'error');
        }
    }

    async toggleLocationStatus(id) {
        const location = this.locations.find(l => l.id === id);
        if (!location) return;

        const action = location.is_active ? 'desativar' : 'ativar';
        const newStatus = !location.is_active;

        this.showConfirm(
            action === 'desativar' ? '🚫 Desativar Local' : '✅ Ativar Local',
            `Tem certeza que deseja ${action} o local <strong>${location.name}</strong>?`,
            async () => {
                try {
                    const { error } = await window.db.supabase
                        .from('locations')
                        .update({ is_active: newStatus })
                        .eq('id', id);

                    if (error) throw error;

                    await this.loadLocations();
                    this.showNotification(`✅ Local ${action === 'desativar' ? 'desativado' : 'ativado'}!`, 'success');
                } catch (error) {
                    console.error('Erro:', error);
                    this.showNotification('❌ Erro ao alterar status', 'error');
                }
            }
        );
    }

    // ===== CELEBRANTES =====
    async loadCelebrants() {
        try {
            console.log('⛪ Carregando celebrantes...');
            
            const { data, error } = await window.db.supabase
                .from('celebrants')
                .select('*')
                .order('name');
            
            if (error) throw error;
            
            this.celebrants = data || [];
            this.renderCelebrantsTable();
            
            console.log(`✅ ${this.celebrants.length} celebrantes carregados`);
        } catch (error) {
            console.error('❌ Erro ao carregar celebrantes:', error);
            this.showNotification('Erro ao carregar celebrantes', 'error');
        }
    }

    renderCelebrantsTable() {
        const tbody = document.querySelector('#celebrants-table tbody');
        tbody.innerHTML = '';

        if (this.celebrants.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 40px;">
                        <p style="color: var(--text-muted); margin-bottom: 1rem;">Nenhum celebrante cadastrado</p>
                        <button class="btn-primary" onclick="configApp.showAddCelebrantModal()">
                            ➕ Adicionar Primeiro Celebrante
                        </button>
                    </td>
                </tr>
            `;
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
                        <button class="btn-table" onclick="configApp.editCelebrant(${celebrant.id})" title="Editar">
                            ✏️ Editar
                        </button>
                        <button class="btn-table ${celebrant.is_active ? 'danger' : ''}" 
                                onclick="configApp.toggleCelebrantStatus(${celebrant.id})"
                                title="${celebrant.is_active ? 'Desativar' : 'Ativar'}">
                            ${celebrant.is_active ? '🚫 Desativar' : '✅ Ativar'}
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    showAddCelebrantModal() {
        document.getElementById('form-add-celebrant').reset();
        this.openModal('modal-add-celebrant');
    }

    async addCelebrant() {
        try {
            const formData = {
                name: document.getElementById('new-celebrant-name').value,
                title: document.getElementById('new-celebrant-title').value,
                phone: document.getElementById('new-celebrant-phone').value
            };

            // Validar
            if (!formData.name || formData.name.trim() === '') {
                this.showNotification('⚠️ Nome é obrigatório', 'warning');
                return;
            }

            if (!formData.title) {
                this.showNotification('⚠️ Título é obrigatório', 'warning');
                return;
            }

            // Verificar duplicado
            const exists = this.celebrants.find(c => 
                c.name.toUpperCase() === formData.name.toUpperCase()
            );
            
            if (exists) {
                this.showNotification('⚠️ Já existe um celebrante com este nome', 'warning');
                return;
            }

            // Adicionar
            await window.db.addCelebrant(formData);
            
            this.closeModal('modal-add-celebrant');
            await this.loadCelebrants();
            
            this.showNotification('✅ Celebrante adicionado com sucesso!', 'success');
        } catch (error) {
            console.error('Erro:', error);
            this.showNotification('❌ Erro ao adicionar: ' + error.message, 'error');
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
            const formData = {
                name: document.getElementById('edit-celebrant-name').value.toUpperCase(),
                title: document.getElementById('edit-celebrant-title').value,
                phone: document.getElementById('edit-celebrant-phone').value,
                is_active: document.getElementById('edit-celebrant-active').value === 'true'
            };

            // Validar
            if (!formData.name || formData.name.trim() === '') {
                this.showNotification('⚠️ Nome é obrigatório', 'warning');
                return;
            }

            if (!formData.title) {
                this.showNotification('⚠️ Título é obrigatório', 'warning');
                return;
            }

            // Atualizar
            const { error } = await window.db.supabase
                .from('celebrants')
                .update(formData)
                .eq('id', id);

            if (error) throw error;

            this.closeModal('modal-edit-celebrant');
            await this.loadCelebrants();
            
            this.showNotification('✅ Celebrante atualizado com sucesso!', 'success');
        } catch (error) {
            console.error('Erro:', error);
            this.showNotification('❌ Erro ao atualizar: ' + error.message, 'error');
        }
    }

    async toggleCelebrantStatus(id) {
        const celebrant = this.celebrants.find(c => c.id === id);
        if (!celebrant) return;

        const action = celebrant.is_active ? 'desativar' : 'ativar';
        const newStatus = !celebrant.is_active;

        this.showConfirm(
            action === 'desativar' ? '🚫 Desativar Celebrante' : '✅ Ativar Celebrante',
            `Tem certeza que deseja ${action} <strong>${celebrant.title} ${celebrant.name}</strong>?`,
            async () => {
                try {
                    const { error } = await window.db.supabase
                        .from('celebrants')
                        .update({ is_active: newStatus })
                        .eq('id', id);

                    if (error) throw error;

                    await this.loadCelebrants();
                    this.showNotification(`✅ Celebrante ${action === 'desativar' ? 'desativado' : 'ativado'}!`, 'success');
                } catch (error) {
                    console.error('Erro:', error);
                    this.showNotification('❌ Erro ao alterar status', 'error');
                }
            }
        );
    }

    // ===== ESTATÍSTICAS =====
    async loadStatistics() {
        try {
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth() + 1;

            // Total
            const { count: total } = await window.db.supabase
                .from('weddings')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'AGENDADO');

            // Mês atual
            const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
            const lastDay = new Date(year, month, 0).getDate();
            const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

            const { data: monthData } = await window.db.supabase
                .from('weddings')
                .select('is_community, with_civil_effect')
                .gte('wedding_date', startDate)
                .lte('wedding_date', endDate)
                .eq('status', 'AGENDADO');

            this.setInputValue('stat-total', total || 0);
            this.setInputValue('stat-month', monthData?.length || 0);
            this.setInputValue('stat-community', monthData?.filter(w => w.is_community).length || 0);
            this.setInputValue('stat-civil', monthData?.filter(w => w.with_civil_effect).length || 0);
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
        }
    }

    // ===== UTILITÁRIOS =====
    setInputValue(id, value) {
        const el = document.getElementById(id);
        if (el) {
            if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
                el.value = value;
            } else {
                el.textContent = value;
            }
        }
    }

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

    showConfirm(title, message, onConfirm) {
        document.getElementById('confirm-title').textContent = title;
        document.getElementById('confirm-message').innerHTML = message;
        
        const btn = document.getElementById('confirm-action-btn');
        btn.onclick = () => {
            this.closeModal('modal-confirm');
            if (onConfirm) onConfirm();
        };
        
        this.openModal('modal-confirm');
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
const configApp = new ConfigApp();

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    configApp.init();
});
