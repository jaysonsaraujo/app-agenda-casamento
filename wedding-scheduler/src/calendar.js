    async showDayEvents(dateStr, dayEvents) {
        const date = new Date(dateStr + 'T12:00:00');
        const dateFormatted = window.validator.formatDate(date);
        
        document.getElementById('day-events-title').textContent = `Eventos - ${dateFormatted}`;
        
        const listContainer = document.getElementById('day-events-list');
        listContainer.innerHTML = '';
        
        dayEvents.events.forEach(event => {
            const eventDiv = document.createElement('div');
            eventDiv.className = 'event-item';
            eventDiv.style.cursor = 'pointer';
            eventDiv.title = 'Clique para editar';
            
            eventDiv.innerHTML = `
                <div class="event-item-header">
                    <div class="event-item-time">${event.wedding_time.substring(0, 5)}</div>
                    <div class="event-item-type ${event.is_community ? 'community' : 'individual'}">
                        ${event.is_community ? 'Comunitário' : 'Individual'}
                    </div>
                </div>
                <div class="event-item-details">
                    <strong>Noivos:</strong> ${event.bride_name} & ${event.groom_name}<br>
                    <strong>Local:</strong> ${event.location_name}<br>
                    <strong>Celebrante:</strong> ${event.celebrant_name}<br>
                    <small style="color: var(--text-muted);">ID: ${event.wedding_id}</small>
                </div>
            `;
            
            // Adicionar ação de editar ao clicar
            eventDiv.addEventListener('click', () => {
                window.app.closeModal('modal-day-events');
                window.app.editWedding(event.wedding_id);
            });
            
            listContainer.appendChild(eventDiv);
        });
        
        document.getElementById('btn-new-event-from-list').onclick = () => {
            window.app.closeModal('modal-day-events');
            this.showWeddingTypeModal(dateStr);
        };
        
        window.app.openModal('modal-day-events');
    }
