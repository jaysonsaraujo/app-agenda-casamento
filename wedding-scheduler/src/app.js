// Classe principal da aplicação
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

        // === NOVA PARTE: Botão de Buscar no menu ===
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
        // === NOVA PARTE: Exportar Excel com feedback ===
document.getElementById('btn-export-excel').addEventListener('click', async () => {
    // === INDICADORES DE FILTROS ATIVOS ===
const activeFilters = document.getElementById('active-filters');
const filters = [];

const name = document.getElementById('search-name').value.trim();
if (name) {
  filters.push(`Nome: ${name} <span class="remove" onclick="this.parentElement.remove()">×</span>`);
}

const location = document.getElementById('search-location').value;
if (location) {
  const locationText = document.getElementById('search-location').selectedOptions[0].text;
  filters.push(`Local: ${locationText} <span class="remove" onclick="this.parentElement.remove()">×</span>`);
}

const celebrant = document.getElementById('search-celebrant').value;
if (celebrant) {
  const celebrantText = document.getElementById('search-celebrant').selectedOptions[0].text;
  filters.push(`Celebrante: ${celebrantText} <span class="remove" onclick="this.parentElement.remove()">×</span>`);
}

const type = document.getElementById('search-type').value;
if (type) {
  const typeText = type === 'true' ? 'Comunitário' : 'Individual';
  filters.push(`Tipo: ${typeText} <span class="remove" onclick="this.parentElement.remove()">×</span>`);
}

const status = document.getElementById('search-status').value;
if (status) {
  const statusMap = {
    'AGENDADO': 'Agendado',
    'REALIZADO': 'Realizado',
    'CANCELADO': 'Cancelado'
  };
  filters.push(`Status: ${statusMap[status]} <span class="remove" onclick="this.parentElement.remove()">×</span>`);
}

const startDate = document.getElementById('search-date-start').value;
if (startDate) {
  filters.push(`De: ${startDate} <span class="remove" onclick="this.parentElement.remove()">×</span>`);
}

const endDate = document.getElementById('search-date-end').value;
if (endDate) {
  filters.push(`Até: ${endDate} <span class="remove" onclick="this.parentElement.remove()">×</span>`);
}

// Mostra os indicadores
activeFilters.innerHTML = filters.length > 0
  ? filters.map(f => `<span class="active-filter">${f}</span>`).join(' ')
  : '<span style="color: #666; font-style: italic;">Nenhum filtro aplicado.</span>';

    // === LIMPAR FILTROS ===
document.getElementById('btn-clear-filters').addEventListener('click', () => {
  document.getElementById('search-name').value = '';
  document.getElementById('search-date-start').value = '';
  document.getElementById('search-date-end').value = '';
  document.getElementById('search-location').value = '';
  document.getElementById('search-celebrant').value = '';
  document.getElementById('search-type').value = '';
  document.getElementById('search-status').value = '';
  
  activeFilters.innerHTML = '<span style="color: #666; font-style: italic;">Nenhum filtro aplicado.</span>';
});
    
    const btn = document.getElementById('btn-export-excel');
    const originalText = btn.innerHTML;
    
    try {
        btn.disabled = true;
        btn.innerHTML = '📊 Exportando...';
        this.showLoading('Exportando para Excel...');
        
        // === FUNÇÃO DE EXPORTAR EXCEL (mock ou real) ===
        // Se você tem uma função real, substitua esta:
        await this.exportExcel(); // <-- vamos criar esta função logo abaixo
        // Ou: await window.db.exportToExcel(); (se já existir)
        
        this.showNotification('✅ Exportado para Excel com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao exportar Excel:', error);
        this.showNotification('Erro ao exportar Excel', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
        this.hideLoading();
    }
});

// === NOVA PARTE: Exportar PDF com feedback ===
document.getElementById('btn-export-pdf').addEventListener('click', async () => {
    const btn = document.getElementById('btn-export-pdf');
    const originalText = btn.innerHTML;
    
    try {
        btn.disabled = true;
        btn.innerHTML = '📄 Exportando...';
        this.showLoading('Exportando para PDF...');
        
        // === FUNÇÃO DE EXPORTAR PDF (mock ou real) ===
        await this.exportPDF(); // <-- vamos criar esta função logo abaixo
        
        this.showNotification('✅ Exportado para PDF com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao exportar PDF:', error);
        this.showNotification('Erro ao exportar PDF', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
        this.hideLoading();
    }
});
    }

    showSection(section) {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(`btn-${section}`).classList.add('active');

        document.querySelectorAll('.content-section').forEach(sec => {
            sec.classList.remove('active');
        });
        document.getElementById(`${section}-section`)?.classList.add('active');
    }

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

    selectWeddingType(type) {
        this.currentWeddingType = type === 'community';
        this.closeModal('modal-wedding-type');
        this.showWeddingForm();
    }

    showWeddingForm() {
        const form = document.getElementById('wedding-form');
        form.reset();
        
        document.getElementById('display-wedding-id').value = 'Será gerado automaticamente';
        document.getElementById('display-schedule-date').value = window.validator.formatDate(new Date());
        document.getElementById('is-community').value = this.currentWeddingType;
        document.getElementById('display-wedding-type').value = this.currentWeddingType ? 'COMUNITÁRIO' : 'INDIVIDUAL';
        
        if (window.calendar.selectedDate) {
            document.getElementById('wedding-date').value = window.calendar.selectedDate;
            this.updateProclamationDates(window.calendar.selectedDate);
        }
        
        window.validator.clearErrors();
        form.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
        form.querySelectorAll('.error-message').forEach(el => el.remove());
        
        this.openModal('modal-wedding-form');
    }

   async saveWedding() {
    try {
        const formData = this.collectFormData();
        
        if (!window.validator.validateWeddingForm(formData)) {
            window.validator.showFormErrors('wedding-form');
            this.showNotification('Por favor, corrija os erros no formulário', 'error');
            return;
        }
        
        if (!await window.validator.validateWeddingConflicts(formData)) {
            window.validator.showFormErrors('wedding-form');
            this.showNotification('Existem conflitos com este agendamento', 'error');
            return;
        }
        
        // === NOVA PARTE: Feedback visual no botão de salvar ===
        const saveBtn = document.querySelector('#wedding-form button[type="submit"]');
        const originalText = saveBtn.textContent;
        saveBtn.disabled = true;
        saveBtn.textContent = 'Salvando...';
        saveBtn.classList.add('loading');

        // === FIM DA NOVA PARTE ===

        this.showLoading('Salvando casamento...');
        
        let result;
        if (this.editingWeddingId) {
            const statusSelect = document.getElementById('wedding-status');
            if (statusSelect) {
                formData.status = statusSelect.value;
            }
            result = await window.db.updateWedding(this.editingWeddingId, formData);
        } else {
            result = await window.db.createWedding(formData);
        }
        
        this.closeModal('modal-wedding-form');
        window.calendar.refresh();
        
        this.showNotification(
            this.editingWeddingId ? 'Casamento atualizado com sucesso!' : 'Casamento agendado com sucesso!',
            'success'
        );
    } catch (error) {
        console.error('Erro ao salvar casamento:', error);
        this.showNotification('Erro ao salvar casamento: ' + error.message, 'error');
    } finally {
        // === NOVA PARTE: Restaurar o botão ao final (mesmo com erro) ===
        const saveBtn = document.querySelector('#wedding-form button[type="submit"]');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = originalText;
            saveBtn.classList.remove('loading');
        }
        // === FIM DA NOVA PARTE ===
        
        this.hideLoading();
    }
}

    collectFormData() {
        const transferType = document.querySelector('input[name="transfer_type"]:checked').value;
        
        const data = {
            interview_date: document.getElementById('interview-date').value,
            bride_name: document.getElementById('bride-name').value,
            bride_whatsapp: document.getElementById('bride-whatsapp').value,
            groom_name: document.getElementById('groom-name').value,
            groom_whatsapp: document.getElementById('groom-whatsapp').value,
            wedding_date: document.getElementById('wedding-date').value,
            wedding_time: document.getElementById('wedding-time').value,
            location_id: parseInt(document.getElementById('location').value),
            celebrant_id: parseInt(document.getElementById('celebrant').value),
            is_community: document.getElementById('is-community').value === 'true',
            transfer_type: transferType === 'none' ? null : transferType,
            with_civil_effect: document.getElementById('civil-effect').checked,
            observations: document.getElementById('observations').value,
            system_message: document.getElementById('system-message').value
        };
        
        return data;
    }

    async editWedding(weddingId) {
        try {
            console.log('Editando casamento:', weddingId);
            this.editingWeddingId = weddingId;
            
            const wedding = await window.db.getWedding(weddingId);
            this.currentWeddingType = wedding.is_community;
            
            this.fillWeddingForm(wedding);
            this.addEditActions(wedding.status);
            
            this.openModal('modal-wedding-form');
        } catch (error) {
            console.error('Erro ao carregar casamento:', error);
            this.showNotification('Erro ao carregar dados do casamento', 'error');
        }
    }

    fillWeddingForm(wedding) {
        document.getElementById('display-wedding-id').value = wedding.wedding_id;
        document.getElementById('display-schedule-date').value = window.validator.formatDate(new Date(wedding.schedule_date + 'T12:00:00'));
        document.getElementById('is-community').value = wedding.is_community;
        document.getElementById('display-wedding-type').value = wedding.is_community ? 'COMUNITÁRIO' : 'INDIVIDUAL';
        
        document.getElementById('interview-date').value = wedding.interview_date ? wedding.interview_date.substring(0, 16) : '';
        document.getElementById('bride-name').value = wedding.bride_name;
        document.getElementById('bride-whatsapp').value = wedding.bride_whatsapp;
        document.getElementById('groom-name').value = wedding.groom_name;
        document.getElementById('groom-whatsapp').value = wedding.groom_whatsapp;
        document.getElementById('wedding-date').value = wedding.wedding_date;
        document.getElementById('wedding-time').value = wedding.wedding_time;
        document.getElementById('location').value = wedding.location_id;
        document.getElementById('celebrant').value = wedding.celebrant_id;
        
        const transferRadio = document.querySelector(`input[name="transfer_type"][value="${wedding.transfer_type || 'none'}"]`);
        if (transferRadio) transferRadio.checked = true;
        
        document.getElementById('civil-effect').checked = wedding.with_civil_effect;
        document.getElementById('observations').value = wedding.observations || '';
        document.getElementById('system-message').value = wedding.system_message || '';
        
        this.updateProclamationDates(wedding.wedding_date);
    }

    addEditActions(currentStatus) {
        let actionsExtra = document.getElementById('form-actions-extra');
        
        if (!actionsExtra) {
            actionsExtra = document.createElement('div');
            actionsExtra.id = 'form-actions-extra';
            actionsExtra.style.cssText = 'display:flex; gap:1rem; padding-top:1rem; border-top:1px solid var(--border); margin-top:1rem;';
            
            const formActions = document.querySelector('#wedding-form .form-actions');
            formActions.parentNode.insertBefore(actionsExtra, formActions);
        }
        
        actionsExtra.innerHTML = `
            <div style="flex:1; display:flex; gap:0.5rem; align-items:center;">
                <button type="button" class="btn-secondary" onclick="app.deleteWedding()" style="background-color:var(--danger-color); color:white; border:none;">
                    🗑️ Excluir
                </button>
                <select id="wedding-status" style="padding:0.5rem 1rem; border-radius:var(--radius-md); border:1px solid var(--border);">
                    <option value="AGENDADO">📅 Agendado</option>
                    <option value="REALIZADO">✅ Realizado</option>
                    <option value="CANCELADO">❌ Cancelado</option>
                </select>
            </div>
        `;
        
        document.getElementById('wedding-status').value = currentStatus || 'AGENDADO';
    }

async deleteWedding() {
    if (!this.editingWeddingId) return;
    
    try {
        const wedding = await window.db.getWedding(this.editingWeddingId);
        const coupleName = `${wedding.bride_name} & ${wedding.groom_name}`;
        
        // === MELHORIA: Usar modal personalizado em vez de confirm() ===
        const modal = document.getElementById('modal-confirm-delete');
        const messageEl = document.getElementById('confirm-delete-message');
        const confirmBtn = document.getElementById('btn-confirm-delete');
        
        messageEl.innerHTML = `Tem certeza que deseja excluir o casamento de <strong>${coupleName}</strong>?`;
        
        // Mostra o modal
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        
        // Cria uma Promise para esperar a resposta
        const confirmed = await new Promise((resolve) => {
            const onConfirm = () => {
                cleanup();
                resolve(true);
            };
            const onCancel = () => {
                cleanup();
                resolve(false);
            };
            const cleanup = () => {
                confirmBtn.removeEventListener('click', onConfirm);
                document.querySelectorAll('#modal-confirm-delete .btn-close, .btn-secondary').forEach(btn => {
                    btn.removeEventListener('click', onCancel);
                });
                modal.classList.remove('show');
                document.body.style.overflow = '';
            };
            
            confirmBtn.addEventListener('click', onConfirm);
            document.querySelectorAll('#modal-confirm-delete .btn-close, .btn-secondary').forEach(btn => {
                btn.addEventListener('click', onCancel);
            });
        });
        
        if (!confirmed) return;

        // === Feedback visual no botão de excluir ===
        const deleteBtn = document.querySelector('#form-actions-extra button[type="button"]');
        const originalText = deleteBtn.innerHTML;
        deleteBtn.disabled = true;
        deleteBtn.innerHTML = '🗑️ Excluindo...';
        
        this.showLoading('Excluindo casamento...');
        
        await window.db.deleteWedding(this.editingWeddingId);
        
        // === Animação de saída do modal ===
        const modalForm = document.getElementById('modal-wedding-form');
        modalForm.style.opacity = '0';
        modalForm.style.transition = 'opacity 0.3s ease';
        
        setTimeout(() => {
            this.closeModal('modal-wedding-form');
            modalForm.style.opacity = '';
        }, 200);
        
        this.hideLoading();
        
        window.calendar.refresh();
        
        this.showNotification(`Casamento de ${coupleName} excluído com sucesso!`, 'success');
        
        this.editingWeddingId = null;
    } catch (error) {
        // Restaura botão mesmo com erro
        const deleteBtn = document.querySelector('#form-actions-extra button[type="button"]');
        if (deleteBtn) {
            deleteBtn.disabled = false;
            deleteBtn.innerHTML = '🗑️ Excluir';
        }
        
        this.hideLoading();
        console.error('Erro ao excluir:', error);
        this.showNotification('Erro ao excluir casamento', 'error');
    }
}

    resetWeddingForm() {
        this.editingWeddingId = null;
        this.currentWeddingType = null;
        document.getElementById('wedding-form').reset();
        
        const actionsExtra = document.getElementById('form-actions-extra');
        if (actionsExtra) {
            actionsExtra.remove();
        }
        
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

    // === FUNÇÃO DE EXPORTAR EXCEL (mock) ===
async exportExcel() {
    // Simula um tempo de processamento
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // === AQUI VOCÊ ADICIONA A LÓGICA REAL DEPOIS ===
    // Ex: chamar window.db.exportToExcel()
    // Ex: gerar CSV com dados e baixar
    
    // Por enquanto, apenas simula
    console.log('Exportando Excel...');
    
    // Exemplo de download (opcional)
    const data = 'Título,Data,Noiva,Noivo,Status\nExemplo,2025-04-05,Maria,João,AGENDADO';
    const blob = new Blob([data], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'casamentos.csv';
    a.click();
    window.URL.revokeObjectURL(url);
}

// === FUNÇÃO DE EXPORTAR PDF (mock) ===
async exportPDF() {
    // Simula um tempo de processamento
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // === AQUI VOCÊ ADICIONA A LÓGICA REAL DEPOIS ===
    // Ex: usar jsPDF, html2pdf.js, ou chamada ao backend
    
    // Por enquanto, apenas simula
    console.log('Exportando PDF...');
    
    // Exemplo de download (opcional)
    const data = 'Casamentos Exportados\n\n1. Maria & João - 05/04/2025\n2. Ana & Pedro - 12/04/2025';
    const blob = new Blob([data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'casamentos.pdf';
    a.click();
    window.URL.revokeObjectURL(url);
}

    showNotification(message, type = 'info') {
        const container = document.getElementById('notification-container');
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        notification.innerHTML = `
            <div class="notification-icon">${icons[type]}</div>
            <div class="notification-content">
                <div class="notification-message">${message}</div>
            </div>
            <button class="notification-close">&times;</button>
        `;
        
        container.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
        
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
    }

    showLoading(message = 'Carregando...') {
        const loading = document.createElement('div');
        loading.id = 'app-loading';
        loading.className = 'modal show';
        loading.innerHTML = `
            <div class="modal-content modal-small" style="text-align: center;">
                <div class="loading"></div>
                <p style="margin-top: 1rem;">${message}</p>
            </div>
        `;
        document.body.appendChild(loading);
    }

    hideLoading() {
        document.getElementById('app-loading')?.remove();
    }
}

window.app = new WeddingSchedulerApp();
window.closeModal = (modalId) => window.app.closeModal(modalId);

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, iniciando app...');
    window.app.init();
});
