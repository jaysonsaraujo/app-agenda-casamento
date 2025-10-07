// Classe principal da aplicação
class WeddingSchedulerApp {
    constructor() {
        this.currentModal = null;
        this.currentWeddingType = null;
        this.editingWeddingId = null;
    }

    // ===== INICIALIZAÇÃO =====
    async init() {
        try {
            // Verificar conexão com Supabase
            const connected = await window.checkSupabaseConnection();
            if (!connected) {
                this.showNotification('Erro ao conectar com o banco de dados', 'error');
                return;
            }

            // Carregar configurações
            await this.loadConfig();

            // Inicializar módulos
            window.calendar.init();
            
            // Configurar eventos
            this.setupEventListeners();
            
            // Carregar dados iniciais
            await this.loadInitialData();
            
            // Iniciar verificação de lembretes
            this.startReminderCheck();
            
            console.log('Aplicação iniciada com sucesso');
        } catch (error) {
            console.error('Erro ao inicializar aplicação:', error);
            this.showNotification('Erro ao inicializar aplicação', 'error');
        }
    }

    async loadConfig() {
        try {
            const configs = await window.db.getConfig();
            
            // Aplicar configurações
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
            // Carregar locais e celebrantes
            await Promise.all([
                this.loadLocations(),
                this.loadCelebrants()
            ]);
        } catch (error) {
            console.error('Erro ao carregar dados iniciais:', error);
        }
    }

    // ===== NAVEGAÇÃO =====
    setupEventListeners() {
        // Navegação principal
        document.getElementById('btn-calendar').addEventListener('click', () => {
            this.showSection('calendar');
        });

        document.getElementById('btn-config').addEventListener('click', () => {
            this.showSection('config');
        });

        // Tipo de casamento
        document.querySelectorAll('.btn-wedding-type').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.currentTarget.dataset.type;
                this.selectWeddingType(type);
            });
        });

        // Formulários
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

        // Botões de adicionar
        document.getElementById('btn-add-location').addEventListener('click', () => {
            this.openModal('modal-add-location');
        });

        document.getElementById('btn-add-celebrant').addEventListener('click', () => {
            this.openModal('modal-add-celebrant');
        });

        // Atualizar proclames quando mudar data do casamento
        document.getElementById('wedding-date').addEventListener('change', (e) => {
            this.updateProclamationDates(e.target.value);
        });

        // Validação em tempo real
        window.validator.setupRealtimeValidation('wedding-form');
        window.validator.setupRealtimeValidation('form-add-location');
        window.validator.setupRealtimeValidation('form-add-celebrant');
    }

    showSection(section) {
        // Atualizar navegação
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.setAttribute('data-active', 'false');
        });
        document.getElementById(`btn-${section}`).setAttribute('data-active', 'true');

        // Mostrar seção
        document.querySelectorAll('.content-section').forEach(sec => {
            sec.classList.remove('active');
        });
        document.getElementById(`${section}-section`)?.classList.add('active');

        // Carregar conteúdo específico
        if (section === 'config') {
            window.location.href = '/config.html';
        }
    }

    // ===== MODAIS =====
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('show');
            this.currentModal = modalId;
            document.body.style.overflow = 'hidden';
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = '';
            
            if (modalId === 'modal-wedding-form') {
                this.resetWeddingForm();
            }
        }
    }

    // ===== CASAMENTOS =====
    selectWeddingType(type) {
        this.currentWeddingType = type === 'community';
        this.closeModal('modal-wedding-type');
        this.showWeddingForm();
    }

    showWeddingForm() {
        // Configurar formulário
        const form = document.getElementById('wedding-form');
        form.reset();
        
        // Preencher dados automáticos
        document.getElementById('wedding-id').value = '';
        document.getElementById('display-wedding-id').value = 'Será gerado automaticamente';
        document.getElementById('schedule-date').value = window.calendar.selectedDate;
        document.getElementById('display-schedule-date').value = window.validator.formatDate(new Date(window.calendar.selectedDate + 'T12:00:00'));
        document.getElementById('is-community').value = this.currentWeddingType;
        document.getElementById('display-wedding-type').value = this.currentWeddingType ? 'COMUNITÁRIO' : 'INDIVIDUAL';
        
        // Limpar validações
        window.validator.clearErrors();
        form.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
        form.querySelectorAll('.error-message').forEach(el => el.remove());
        
        this.openModal('modal-wedding-form');
    }

    async saveWedding() {
        try {
            // Coletar dados do formulário
            const formData = this.collectFormData();
            
            // Validar formulário
            if (!window.validator.validateWeddingForm(formData)) {
                window.validator.showFormErrors('wedding-form');
                this.showNotification('Por favor, corrija os erros no formulário', 'error');
                return;
            }
            
            // Validar conflitos
            if (!await window.validator.validateWeddingConflicts(formData)) {
                window.validator.showFormErrors('wedding-form');
                this.showNotification('Existem conflitos com este agendamento', 'error');
                return;
            }
            
            // Mostrar loading
            this.showLoading('Salvando casamento...');
            
            // Salvar no banco
            let result;
            if (this.editingWeddingId) {
                result = await window.db.updateWedding(this.editingWeddingId, formData);
            } else {
                result = await window.db.createWedding(formData);
            }
            
            // Fechar modal e atualizar calendário
            this.closeModal('modal-wedding-form');
            window.calendar.refresh();
            
            this.showNotification(
                this.editingWeddingId ? 'Casamento atualizado com sucesso!' : 'Casamento agendado com sucesso!',
                'success'
            );
        } catch (error) {
            console.error('Erro ao salvar casamento:', error);
            this.showNotification('Erro ao salvar casamento', 'error');
        } finally {
            this.hideLoading();
        }
    }

    collectFormData() {
        const form = document.getElementById('wedding-form');
        const formData = new FormData(form);
        
        const data = {
            schedule_date: formData.get('schedule_date'),
            interview_date: formData.get('interview_date'),
            bride_name: formData.get('bride_name'),
            bride_whatsapp: formData.get('bride_whatsapp'),
            groom_name: formData.get('groom_name'),
            groom_whatsapp: formData.get('groom_whatsapp'),
            wedding_date: formData.get('wedding_date'),
            wedding_time: formData.get('wedding_time'),
            location_id: parseInt(formData.get('location_id')),
            celebrant_id: parseInt(formData.get('celebrant_id')),
            is_community: formData.get('is_community') === 'true',
            transfer_type: formData.get('transfer_type') === 'none' ? null : formData.get('transfer_type'),
            with_civil_effect: formData.get('with_civil_effect') === 'on',
            observations: formData.get('observations'),
            system_message: formData.get('system_message')
        };
        
        return data;
    }

    async editWedding(weddingId) {
        try {
            this.editingWeddingId = weddingId;
            
            // Carregar dados do casamento
            const wedding = await window.db.getWedding(weddingId);
            
            // Preencher formulário
            this.fillWeddingForm(wedding);
            
            this.openModal('modal-wedding-form');
        } catch (error) {
            console.error('Erro ao carregar casamento:', error);
            this.showNotification('Erro ao carregar dados do casamento', 'error');
        }
    }

    fillWeddingForm(wedding) {
        document.getElementById('wedding-id').value = wedding.wedding_id;
        document.getElementById('display-wedding-id').value = wedding.wedding_id;
        document.getElementById('schedule-date').value = wedding.schedule_date;
        document.getElementById('display-schedule-date').value = window.validator.formatDate(new Date(wedding.schedule_date + 'T12:00:00'));
        document.getElementById('is-community').value = wedding.is_community;
        document.getElementById('display-wedding-type').value = wedding.is_community ? 'COMUNITÁRIO' : 'INDIVIDUAL';
        
        // Preencher campos
        document.getElementById('interview-date').value = wedding.interview_date ? wedding.interview_date.substring(0, 16) : '';
        document.getElementById('bride-name').value = wedding.bride_name;
        document.getElementById('bride-whatsapp').value = wedding.bride_whatsapp;
        document.getElementById('groom-name').value = wedding.groom_name;
        document.getElementById('groom-whatsapp').value = wedding.groom_whatsapp;
        document.getElementById('wedding-date').value = wedding.wedding_date;
        document.getElementById('wedding-time').value = wedding.wedding_time;
        document.getElementById('location').value = wedding.location_id;
        document.getElementById('celebrant').value = wedding.celebrant_id;
        
        // Transferência
        const transferRadio = document.querySelector(`input[name="transfer_type"][value="${wedding.transfer_type || 'none'}"]`);
        if (transferRadio) transferRadio.checked = true;
        
        // Efeito civil
        document.getElementById('civil-effect').checked = wedding.with_civil_effect;
        
        // Observações
        document.getElementById('observations').value = wedding.observations || '';
        document.getElementById('system-message').value = wedding.system_message || '';
        
        // Atualizar proclames
        this.updateProclamationDates(wedding.wedding_date);
    }

    resetWeddingForm() {
        this.editingWeddingId = null;
        this.currentWeddingType = null;
        document.getElementById('wedding-form').reset();
        window.validator.clearErrors();
    }

    async updateProclamationDates(weddingDate) {
        if (!weddingDate) {
            document.getElementById('first-sunday').textContent = '--/--/----';
            document.getElementById('second-sunday').textContent = '--/--/----';
            document.getElementById('third-sunday').textContent = '--/--/----';
            document.getElementById('wedding-date-display').textContent = '--/--/----';
            return;
        }
        
        try {
            const sundays = await window.db.calculateProclamationSundays(weddingDate);
            
            document.getElementById('first-sunday').textContent = window.validator.formatDate(new Date(sundays.first_sunday + 'T12:00:00'));
            document.getElementById('second-sunday').textContent = window.validator.formatDate(new Date(sundays.second_sunday + 'T12:00:00'));
            document.getElementById('third-sunday').textContent = window.validator.formatDate(new Date(sundays.third_sunday + 'T12:00:00'));
            document.getElementById('wedding-date-display').textContent = window.validator.formatDate(new Date(weddingDate + 'T12:00:00'));
        } catch (error) {
            console.error('Erro ao calcular proclames:', error);
        }
    }

    // ===== LOCAIS E CELEBRANTES =====
    async loadLocations() {
        try {
            const locations = await window.db.getLocations();
            const select = document.getElementById('location');
            
            select.innerHTML = '<option value="">Selecione...</option>';
            locations.forEach(location => {
                const option = document.createElement('option');
                option.value = location.id;
                option.textContent = location.name;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Erro ao carregar locais:', error);
        }
    }

    async loadCelebrants() {
        try {
            const celebrants = await window.db.getCelebrants();
            const select = document.getElementById('celebrant');
            
            select.innerHTML = '<option value="">Selecione...</option>';
            celebrants.forEach(celebrant => {
                const option = document.createElement('option');
                option.value = celebrant.id;
                option.textContent = `${celebrant.title} ${celebrant.name}`;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Erro ao carregar celebrantes:', error);
        }
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
            
            this.showNotification('Local adicionado com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao adicionar local:', error);
            this.showNotification('Erro ao adicionar local', 'error');
        }
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
            
            this.showNotification('Celebrante adicionado com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao adicionar celebrante:', error);
            this.showNotification('Erro ao adicionar celebrante', 'error');
        }
    }

    // ===== LEMBRETES =====
    startReminderCheck() {
        // Verificar lembretes a cada 5 minutos
        setInterval(async () => {
            await this.checkReminders();
        }, 5 * 60 * 1000);
        
        // Primeira verificação
        this.checkReminders();
    }

    async checkReminders() {
        try {
            const reminders = await window.db.getPendingReminders();
            
            for (const reminder of reminders) {
                // Aqui você pode implementar o envio real de mensagens
                // Por enquanto, apenas marcar como enviado e mostrar notificação
                await window.db.markReminderAsSent(reminder.id);
                
                const wedding = reminder.weddings;
                let message = '';
                
                switch (reminder.reminder_type) {
                    case 'INTERVIEW_2D':
                        message = `Lembrete: Entrevista em 2 dias - ${wedding.bride_name} & ${wedding.groom_name}`;
                        break;
                    case 'INTERVIEW_1D':
                        message = `Lembrete: Entrevista amanhã - ${wedding.bride_name} & ${wedding.groom_name}`;
                        break;
                    case 'INTERVIEW_12H':
                        message = `Lembrete: Entrevista em 12 horas - ${wedding.bride_name} & ${wedding.groom_name}`;
                        break;
                    case 'WEDDING':
                        message = `Lembrete: Casamento amanhã - ${wedding.bride_name} & ${wedding.groom_name}`;
                        break;
                }
                
                this.showNotification(message, 'info');
            }
        } catch (error) {
            console.error('Erro ao verificar lembretes:', error);
        }
    }

    // ===== NOTIFICAÇÕES =====
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

    showLoading(message = 'Carregando...') {
        const loading = document.createElement('div');
        loading.id = 'app-loading';
        loading.className = 'modal show';
        loading.innerHTML = `
            <div class="modal-content modal-small">
                <div class="text-center">
                    <div class="loading"></div>
                    <p class="mt-2">${message}</p>
                </div>
            </div>
        `;
        document.body.appendChild(loading);
    }

    hideLoading() {
        document.getElementById('app-loading')?.remove();
    }
}

// Criar instância global e inicializar
window.app = new WeddingSchedulerApp();

// Tornar funções disponíveis globalmente para onclick
window.closeModal = (modalId) => window.app.closeModal(modalId);

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.app.init();
});
