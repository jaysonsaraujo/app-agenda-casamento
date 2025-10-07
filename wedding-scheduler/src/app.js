    // ===== EDIÇÃO E EXCLUSÃO DE CASAMENTOS =====
    async editWedding(weddingId) {
        try {
            console.log('📝 Editando casamento:', weddingId);
            this.editingWeddingId = weddingId;
            
            const wedding = await window.db.getWedding(weddingId);
            
            // Definir tipo
            this.currentWeddingType = wedding.is_community;
            
            // Preencher formulário
            this.fillWeddingForm(wedding);
            
            // Adicionar botões de ação extras
            this.addEditActions();
            
            this.openModal('modal-wedding-form');
        } catch (error) {
            console.error('Erro ao carregar casamento:', error);
            this.showNotification('❌ Erro ao carregar casamento: ' + error.message, 'error');
        }
    }

    addEditActions() {
        // Verificar se já existe a área de ações extras
        let actionsExtra = document.getElementById('form-actions-extra');
        
        if (!actionsExtra) {
            actionsExtra = document.createElement('div');
            actionsExtra.id = 'form-actions-extra';
            actionsExtra.style.cssText = `
                display: flex;
                gap: 1rem;
                padding-top: 1rem;
                border-top: 1px solid var(--border);
                margin-top: 1rem;
            `;
            
            const formActions = document.querySelector('#wedding-form .form-actions');
            formActions.parentNode.insertBefore(actionsExtra, formActions);
        }
        
        actionsExtra.innerHTML = `
            <div style="flex: 1; display: flex; gap: 0.5rem;">
                <button type="button" class="btn-secondary" onclick="app.deleteWedding()" style="background-color: var(--danger-color); color: white; border: none;">
                    🗑️ Excluir Casamento
                </button>
                <select id="wedding-status" style="padding: 0.5rem 1rem; border-radius: var(--radius-md); border: 1px solid var(--border);">
                    <option value="AGENDADO">📅 Agendado</option>
                    <option value="REALIZADO">✅ Realizado</option>
                    <option value="CANCELADO">❌ Cancelado</option>
                </select>
            </div>
        `;
        
        // Preencher status atual
        const statusSelect = document.getElementById('wedding-status');
        if (statusSelect && this.editingWeddingId) {
            window.db.getWedding(this.editingWeddingId).then(wedding => {
                statusSelect.value = wedding.status || 'AGENDADO';
            });
        }
    }

    async deleteWedding() {
        if (!this.editingWeddingId) return;
        
        try {
            const wedding = await window.db.getWedding(this.editingWeddingId);
            
            // Confirmação
            const confirmed = await this.showConfirmDialog(
                '🗑️ Excluir Casamento',
                `Tem certeza que deseja excluir o casamento de <strong>${wedding.bride_name}</strong> & <strong>${wedding.groom_name}</strong>?<br><br>
                <strong style="color: var(--danger-color);">⚠️ Esta ação não pode ser desfeita!</strong>`
            );
            
            if (!confirmed) return;
            
            this.showLoading('Excluindo casamento...');
            
            // Deletar
            await window.db.deleteWedding(this.editingWeddingId);
            
            this.closeModal('modal-wedding-form');
            this.hideLoading();
            
            // Atualizar calendário
            window.calendar.refresh();
            
            this.showNotification('✅ Casamento excluído com sucesso!', 'success');
            
            this.editingWeddingId = null;
        } catch (error) {
            this.hideLoading();
            console.error('Erro ao excluir:', error);
            this.showNotification('❌ Erro ao excluir casamento: ' + error.message, 'error');
        }
    }

    async showConfirmDialog(title, message) {
        return new Promise((resolve) => {
            // Criar modal de confirmação
            const modalHTML = `
                <div id="modal-confirm-delete" class="modal show">
                    <div class="modal-content modal-small">
                        <div class="modal-header">
                            <h3>${title}</h3>
                        </div>
                        <div style="padding: 1.5rem;">
                            <p style="line-height: 1.6;">${message}</p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn-secondary" id="btn-cancel-delete">
                                Cancelar
                            </button>
                            <button type="button" class="btn-primary" id="btn-confirm-delete" 
                                    style="background-color: var(--danger-color);">
                                Confirmar Exclusão
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = modalHTML;
            const modal = tempDiv.firstElementChild;
            document.body.appendChild(modal);
            
            document.getElementById('btn-cancel-delete').onclick = () => {
                modal.remove();
                resolve(false);
            };
            
            document.getElementById('btn-confirm-delete').onclick = () => {
                modal.remove();
                resolve(true);
            };
        });
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

    resetWeddingForm() {
        this.editingWeddingId = null;
        this.currentWeddingType = null;
        document.getElementById('wedding-form').reset();
        
        // Remover ações extras se existirem
        const actionsExtra = document.getElementById('form-actions-extra');
        if (actionsExtra) {
            actionsExtra.remove();
        }
        
        window.validator.clearErrors();
    }

    async saveWedding() {
        try {
            const formData = this.collectFormData();
            
            if (!window.validator.validateWeddingForm(formData)) {
                window.validator.showFormErrors('wedding-form');
                this.showNotification('⚠️ Por favor, corrija os erros no formulário', 'error');
                return;
            }
            
            if (!await window.validator.validateWeddingConflicts(formData)) {
                window.validator.showFormErrors('wedding-form');
                this.showNotification('⚠️ Existem conflitos com este agendamento', 'error');
                return;
            }
            
            this.showLoading('Salvando casamento...');
            
            let result;
            if (this.editingWeddingId) {
                // Incluir status se estiver editando
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
                this.editingWeddingId ? '✅ Casamento atualizado com sucesso!' : '✅ Casamento agendado com sucesso!',
                'success'
            );
        } catch (error) {
            console.error('Erro ao salvar casamento:', error);
            this.showNotification('❌ Erro ao salvar casamento: ' + error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }
