// Classe para gerenciar validações e formatações
class ValidationManager {
    constructor() {
        this.errors = new Map();
    }

    // ===== FORMATADORES =====
    formatPhone(value) {
        // Remove tudo que não é número
        const numbers = value.replace(/\D/g, '');
        
        // Aplica a máscara (11) 99999-9999
        if (numbers.length <= 11) {
            return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        }
        
        return value;
    }

    formatDate(date) {
        if (!date) return '';
        
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        
        return `${day}/${month}/${year}`;
    }

    formatDateTime(datetime) {
        if (!datetime) return '';
        
        const d = new Date(datetime);
        const date = this.formatDate(d);
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        
        return `${date} às ${hours}:${minutes}`;
    }

    formatTime(time) {
        if (!time) return '';
        
        const [hours, minutes] = time.split(':');
        return `${hours}:${minutes}`;
    }

    toUpperCase(value) {
        return value ? value.toUpperCase() : '';
    }

    // ===== VALIDADORES =====
    isValidPhone(phone) {
        const cleaned = phone.replace(/\D/g, '');
        return cleaned.length === 11 && cleaned[2] === '9';
    }

    isValidDate(date) {
        const d = new Date(date);
        return d instanceof Date && !isNaN(d);
    }

    isFutureDate(date) {
        const d = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return d >= today;
    }

    isValidTime(time) {
        const regex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        return regex.test(time);
    }

    isValidEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }

    isEmpty(value) {
        return value === null || value === undefined || value.trim() === '';
    }

    // ===== VALIDAÇÃO DE FORMULÁRIO =====
    validateWeddingForm(formData) {
        this.errors.clear();
        
        // Validar data da entrevista
        if (!formData.interview_date) {
            this.addError('interview_date', 'Data da entrevista é obrigatória');
        } else if (!this.isFutureDate(formData.interview_date)) {
            this.addError('interview_date', 'Data da entrevista deve ser futura');
        }
        
        // Validar dados da noiva
        if (this.isEmpty(formData.bride_name)) {
            this.addError('bride_name', 'Nome da noiva é obrigatório');
        }
        
        if (this.isEmpty(formData.bride_whatsapp)) {
            this.addError('bride_whatsapp', 'WhatsApp da noiva é obrigatório');
        } else if (!this.isValidPhone(formData.bride_whatsapp)) {
            this.addError('bride_whatsapp', 'WhatsApp da noiva inválido');
        }
        
        // Validar dados do noivo
        if (this.isEmpty(formData.groom_name)) {
            this.addError('groom_name', 'Nome do noivo é obrigatório');
        }
        
        if (this.isEmpty(formData.groom_whatsapp)) {
            this.addError('groom_whatsapp', 'WhatsApp do noivo é obrigatório');
        } else if (!this.isValidPhone(formData.groom_whatsapp)) {
            this.addError('groom_whatsapp', 'WhatsApp do noivo inválido');
        }
        
        // Validar data do casamento
        if (!formData.wedding_date) {
            this.addError('wedding_date', 'Data do casamento é obrigatória');
        } else if (!this.isFutureDate(formData.wedding_date)) {
            this.addError('wedding_date', 'Data do casamento deve ser futura');
        } else if (formData.interview_date && new Date(formData.wedding_date) <= new Date(formData.interview_date)) {
            this.addError('wedding_date', 'Data do casamento deve ser após a entrevista');
        }
        
        // Validar horário
        if (this.isEmpty(formData.wedding_time)) {
            this.addError('wedding_time', 'Horário do casamento é obrigatório');
        } else if (!this.isValidTime(formData.wedding_time)) {
            this.addError('wedding_time', 'Horário inválido');
        }
        
        // Validar local
        if (!formData.location_id) {
            this.addError('location_id', 'Local é obrigatório');
        }
        
        // Validar celebrante
        if (!formData.celebrant_id) {
            this.addError('celebrant_id', 'Celebrante é obrigatório');
        }
        
        return this.errors.size === 0;
    }

    validateLocationForm(formData) {
        this.errors.clear();
        
        if (this.isEmpty(formData.name)) {
            this.addError('name', 'Nome do local é obrigatório');
        }
        
        if (formData.capacity && formData.capacity < 0) {
            this.addError('capacity', 'Capacidade deve ser positiva');
        }
        
        return this.errors.size === 0;
    }

    validateCelebrantForm(formData) {
        this.errors.clear();
        
        if (this.isEmpty(formData.name)) {
            this.addError('name', 'Nome do celebrante é obrigatório');
        }
        
        if (this.isEmpty(formData.title)) {
            this.addError('title', 'Título é obrigatório');
        }
        
        if (formData.phone && !this.isValidPhone(formData.phone)) {
            this.addError('phone', 'Telefone inválido');
        }
        
        return this.errors.size === 0;
    }

    // ===== GERENCIAMENTO DE ERROS =====
    addError(field, message) {
        this.errors.set(field, message);
    }

    getError(field) {
        return this.errors.get(field);
    }

    hasErrors() {
        return this.errors.size > 0;
    }

    getErrors() {
        return Array.from(this.errors.entries());
    }

    clearErrors() {
        this.errors.clear();
    }

    // ===== EXIBIÇÃO DE ERROS NO FORMULÁRIO =====
    showFormErrors(formId) {
        const form = document.getElementById(formId);
        if (!form) return;
        
        // Limpar erros anteriores
        form.querySelectorAll('.error-message').forEach(el => el.remove());
        form.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
        
        // Mostrar novos erros
        this.errors.forEach((message, field) => {
            const input = form.querySelector(`[name="${field}"]`);
            if (input) {
                input.classList.add('error');
                
                const errorEl = document.createElement('small');
                errorEl.className = 'error-message text-danger';
                errorEl.textContent = message;
                
                const formGroup = input.closest('.form-group');
                if (formGroup) {
                    formGroup.appendChild(errorEl);
                }
            }
        });
        
        // Focar no primeiro campo com erro
        const firstError = form.querySelector('.error');
        if (firstError) {
            firstError.focus();
            firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    // ===== VALIDAÇÃO EM TEMPO REAL =====
    setupRealtimeValidation(formId) {
        const form = document.getElementById(formId);
        if (!form) return;
        
        // Configurar máscaras e transformações
        form.querySelectorAll('input[type="tel"]').forEach(input => {
            input.addEventListener('input', (e) => {
                e.target.value = this.formatPhone(e.target.value);
            });
        });
        
        form.querySelectorAll('.uppercase-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const cursorPos = e.target.selectionStart;
                e.target.value = this.toUpperCase(e.target.value);
                e.target.setSelectionRange(cursorPos, cursorPos);
            });
        });
        
        // Validação ao sair do campo
        form.querySelectorAll('input[required], select[required]').forEach(input => {
            input.addEventListener('blur', () => {
                this.validateField(input);
            });
        });
    }

    validateField(input) {
        const formGroup = input.closest('.form-group');
        if (!formGroup) return;
        
        // Remover erro anterior
        formGroup.querySelector('.error-message')?.remove();
        input.classList.remove('error');
        
        // Validar campo
        let error = null;
        
        if (input.hasAttribute('required') && this.isEmpty(input.value)) {
            error = 'Este campo é obrigatório';
        } else if (input.type === 'tel' && input.value && !this.isValidPhone(input.value)) {
            error = 'Telefone inválido';
        } else if (input.type === 'email' && input.value && !this.isValidEmail(input.value)) {
            error = 'Email inválido';
        } else if (input.type === 'date' && input.value && !this.isValidDate(input.value)) {
            error = 'Data inválida';
        } else if (input.type === 'time' && input.value && !this.isValidTime(input.value)) {
            error = 'Horário inválido';
        }
        
        if (error) {
            input.classList.add('error');
            const errorEl = document.createElement('small');
            errorEl.className = 'error-message text-danger';
            errorEl.textContent = error;
            formGroup.appendChild(errorEl);
        }
        
        return !error;
    }

    // ===== VALIDAÇÃO DE CONFLITOS =====
    async validateWeddingConflicts(formData) {
        try {
            const conflicts = await window.db.checkWeddingConflicts(formData);
            
            if (conflicts.length > 0) {
                conflicts.forEach(conflict => {
                    switch (conflict.conflict_type) {
                        case 'LIMITE_COMUNITARIO':
                        case 'LIMITE_TOTAL':
                            this.addError('wedding_date', conflict.message);
                            break;
                        case 'CONFLITO_LOCAL_HORARIO':
                            this.addError('wedding_time', conflict.message);
                            break;
                        case 'CONFLITO_CELEBRANTE':
                            this.addError('celebrant_id', conflict.message);
                            break;
                    }
                });
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('Erro ao validar conflitos:', error);
            this.addError('general', 'Erro ao verificar disponibilidade');
            return false;
        }
    }
}

// Criar instância global
window.validator = new ValidationManager();
