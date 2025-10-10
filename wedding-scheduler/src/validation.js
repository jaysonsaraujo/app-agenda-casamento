// Classe para gerenciar validações
class ValidationManager {
    constructor() {
        this.errors = new Map();
    }

    // ===== FORMATADORES =====
    formatPhone(value) {
        const numbers = value.replace(/\D/g, '');
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

    isEmpty(value) {
        return value === null || value === undefined || String(value).trim() === '';
    }

    // ===== VALIDAÇÃO DE FORMULÁRIO =====
    validateWeddingForm(formData) {
        this.errors.clear();

        // mapeie SEMPRE para IDs reais do DOM
        if (!formData.interview_date) {
            this.addError('interview-date', 'Data da entrevista é obrigatória');
        } else if (!this.isFutureDate(formData.interview_date)) {
            this.addError('interview-date', 'Data da entrevista deve ser futura');
        }

        if (this.isEmpty(formData.bride_name)) {
            this.addError('bride-name', 'Nome da noiva é obrigatório');
        }

        if (this.isEmpty(formData.bride_whatsapp)) {
            this.addError('bride-whatsapp', 'WhatsApp da noiva é obrigatório');
        } else if (!this.isValidPhone(formData.bride_whatsapp)) {
            this.addError('bride-whatsapp', 'WhatsApp inválido');
        }

        if (this.isEmpty(formData.groom_name)) {
            this.addError('groom-name', 'Nome do noivo é obrigatório');
        }

        if (this.isEmpty(formData.groom_whatsapp)) {
            this.addError('groom-whatsapp', 'WhatsApp do noivo é obrigatório');
        } else if (!this.isValidPhone(formData.groom_whatsapp)) {
            this.addError('groom-whatsapp', 'WhatsApp inválido');
        }

        if (!formData.wedding_date) {
            this.addError('wedding-date', 'Data do casamento é obrigatória');
        } else if (!this.isFutureDate(formData.wedding_date)) {
            this.addError('wedding-date', 'Data do casamento deve ser futura');
        }

        if (this.isEmpty(formData.wedding_time)) {
            this.addError('wedding-time', 'Horário é obrigatório');
        }

        if (!formData.location_id) {
            this.addError('location', 'Local é obrigatório');
        }

        if (!formData.celebrant_id) {
            this.addError('celebrant', 'Celebrante é obrigatório');
        }

        return this.errors.size === 0;
    }

    validateLocationForm(formData) {
        this.errors.clear();
        if (this.isEmpty(formData.name)) {
            this.addError('new-location-name', 'Nome do local é obrigatório');
        }
        return this.errors.size === 0;
    }

    validateCelebrantForm(formData) {
        this.errors.clear();
        if (this.isEmpty(formData.name)) {
            this.addError('new-celebrant-name', 'Nome é obrigatório');
        }
        if (this.isEmpty(formData.title)) {
            this.addError('new-celebrant-title', 'Título é obrigatório');
        }
        return this.errors.size === 0;
    }

    // ===== GERENCIAMENTO DE ERROS =====
    addError(fieldDomId, message) {
        this.errors.set(fieldDomId, message);
    }

    getError(fieldDomId) {
        return this.errors.get(fieldDomId);
    }

    clearErrors() {
        this.errors.clear();
    }

    showFormErrors(formId) {
        const form = document.getElementById(formId);
        if (!form) return;

        form.querySelectorAll('.error-message').forEach(el => el.remove());
        form.querySelectorAll('.error').forEach(el => el.classList.remove('error'));

        this.errors.forEach((message, fieldDomId) => {
            const input = form.querySelector(`#${CSS.escape(fieldDomId)}`);
            if (input) {
                input.classList.add('error');

                const errorEl = document.createElement('small');
                errorEl.className = 'error-message text-danger';
                errorEl.textContent = message;
                errorEl.style.color = '#ef4444';
                errorEl.style.fontSize = '0.875rem';
                errorEl.style.marginTop = '0.25rem';
                errorEl.style.display = 'block';

                const formGroup = input.closest('.form-group');
                if (formGroup) formGroup.appendChild(errorEl);
            }
        });

        const firstError = form.querySelector('.error');
        if (firstError) {
            firstError.focus();
            firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    setupRealtimeValidation(formId) {
        const form = document.getElementById(formId);
        if (!form) return;

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
    }

    // ===== Conflitos de agenda (mapeia para IDs do DOM) =====
    async validateWeddingConflicts(formData) {
        try {
            const conflicts = await window.db.checkWeddingConflicts(formData);

            if (conflicts.length > 0) {
                conflicts.forEach(conflict => {
                    switch (conflict.conflict_type) {
                        case 'LIMITE_COMUNITARIO':
                        case 'LIMITE_TOTAL':
                            this.addError('wedding-date', conflict.message);
                            break;
                        case 'CONFLITO_LOCAL_HORARIO':
                            this.addError('wedding-time', conflict.message);
                            break;
                        case 'CONFLITO_CELEBRANTE':
                            this.addError('celebrant', conflict.message);
                            break;
                    }
                });
                return false;
            }

            return true;
        } catch (error) {
            console.error('Erro ao validar conflitos:', error);
            this.addError('wedding-date', 'Erro ao verificar disponibilidade');
            return false;
        }
    }
}

window.validator = new ValidationManager();
