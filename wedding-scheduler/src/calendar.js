// Classe para gerenciar o calendário
class CalendarManager {
    constructor() {
        this.currentYear = new Date().getFullYear();
        this.currentMonth = new Date().getMonth();
        this.monthsToShow = 3;
        this.events = {};
        this.selectedDate = null;
        this.tooltip = null;
        this.isReadOnly = false;
    }

    // ===== INICIALIZAÇÃO =====
    init() {
        this.setupElements();
        this.setupEventListeners();
        this.loadCalendar();
    }

    setupElements() {
        this.calendarContainer = document.getElementById('calendar-container');
        this.yearDisplay = document.getElementById('current-year');
        this.tooltip = document.getElementById('calendar-tooltip');
        this.tooltipContent = this.tooltip.querySelector('.tooltip-content');
    }

    setupEventListeners() {
        // Navegação por ano
        document.getElementById('btn-prev-year').addEventListener('click', () => {
            this.currentYear--;
            this.loadCalendar();
        });

        document.getElementById('btn-next-year').addEventListener('click', () => {
            this.currentYear++;
            this.loadCalendar();
        });

        // Scroll para carregar mais meses
        this.calendarContainer.addEventListener('wheel', (e) => {
            e.preventDefault();
            
            if (e.deltaY > 0) {
                // Scroll para baixo - próximos meses
                this.currentMonth++;
                if (this.currentMonth > 11) {
                    this.currentMonth = 0;
                    this.currentYear++;
                }
            } else {
                // Scroll para cima - meses anteriores
                this.currentMonth--;
                if (this.currentMonth < 0) {
                    this.currentMonth = 11;
                    this.currentYear--;
                }
            }
            
            this.loadCalendar();
        });

        // Fechar tooltip ao mover o mouse para fora
        document.addEventListener('mousemove', (e) => {
            const calendars = document.querySelectorAll('.calendar-day');
            let isOverDay = false;
            
            calendars.forEach(day => {
                if (day.contains(e.target)) {
                    isOverDay = true;
                }
            });
            
            if (!isOverDay) {
                this.hideTooltip();
            }
        });
    }

    // ===== CARREGAMENTO DO CALENDÁRIO =====
    async loadCalendar() {
        this.yearDisplay.textContent = this.currentYear;
        
        // Verificar se é ano passado (somente leitura)
        const currentDate = new Date();
        this.isReadOnly = this.currentYear < currentDate.getFullYear();
        
        // Mostrar loading
        this.showLoading();
        
        try {
            // Carregar eventos do ano
            await this.loadYearEvents();
            
            // Renderizar meses
            this.renderMonths();
        } catch (error) {
            console.error('Erro ao carregar calendário:', error);
            window.app.showNotification('Erro ao carregar calendário', 'error');
        }
    }

    async loadYearEvents() {
        try {
            this.events = await window.db.getCalendarEvents(this.currentYear);
        } catch (error) {
            console.error('Erro ao carregar eventos:', error);
            this.events = {};
        }
    }

    showLoading() {
        this.calendarContainer.innerHTML = `
            <div class="calendar-loading">
                <div class="loading"></div>
                <p>Carregando calendário...</p>
            </div>
        `;
    }

    // ===== RENDERIZAÇÃO =====
    renderMonths() {
        this.calendarContainer.innerHTML = '';
        
        const monthsToRender = [];
        let month = this.currentMonth;
        let year = this.currentYear;
        
        // Calcular meses a renderizar
        for (let i = 0; i < this.monthsToShow; i++) {
            monthsToRender.push({ month, year });
            
            month++;
            if (month > 11) {
                month = 0;
                year++;
            }
        }
        
        // Renderizar cada mês
        monthsToRender.forEach(({ month, year }) => {
            const monthElement = this.createMonthElement(year, month);
            this.calendarContainer.appendChild(monthElement);
        });
    }

    createMonthElement(year, month) {
        const monthNames = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        
        const monthDiv = document.createElement('div');
        monthDiv.className = 'calendar-month';
        
        // Header do mês
        const header = document.createElement('div');
        header.className = 'calendar-month-header';
        header.textContent = `${monthNames[month]} ${year}`;
        monthDiv.appendChild(header);
        
        // Dias da semana
        const weekdaysDiv = document.createElement('div');
        weekdaysDiv.className = 'calendar-weekdays';
        const weekdays = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
        weekdays.forEach(day => {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'weekday';
            dayDiv.textContent = day;
            weekdaysDiv.appendChild(dayDiv);
        });
        monthDiv.appendChild(weekdaysDiv);
        
        // Dias do mês
        const daysDiv = document.createElement('div');
        daysDiv.className = 'calendar-days';
        
        // Primeiro dia do mês
        const firstDay = new Date(year, month, 1);
        const firstDayOfWeek = firstDay.getDay();
        
        // Último dia do mês
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        
        // Dias do mês anterior
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = firstDayOfWeek - 1; i >= 0; i--) {
            const dayDiv = this.createDayElement(
                prevMonthLastDay - i,
                month - 1,
                year,
                true
            );
            daysDiv.appendChild(dayDiv);
        }
        
        // Dias do mês atual
        for (let day = 1; day <= daysInMonth; day++) {
            const dayDiv = this.createDayElement(day, month, year, false);
            daysDiv.appendChild(dayDiv);
        }
        
        // Dias do próximo mês
        const remainingDays = 42 - (firstDayOfWeek + daysInMonth);
        for (let day = 1; day <= remainingDays; day++) {
            const dayDiv = this.createDayElement(day, month + 1, year, true);
            daysDiv.appendChild(dayDiv);
        }
        
        monthDiv.appendChild(daysDiv);
        return monthDiv;
    }

    createDayElement(day, month, year, isOtherMonth) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day';
        
        if (isOtherMonth) {
            dayDiv.classList.add('other-month');
        }
        
        // Verificar se é hoje
        const today = new Date();
        const date = new Date(year, month, day);
        const dateStr = this.formatDateForDB(date);
        
        if (date.toDateString() === today.toDateString()) {
            dayDiv.classList.add('today');
        }
        
        // Verificar se é passado
        if (date < today && !this.isSameDay(date, today)) {
            dayDiv.classList.add('past');
        }
        
        // Número do dia
        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = day;
        dayDiv.appendChild(dayNumber);
        
        // Verificar eventos
        const dayEvents = this.events[dateStr];
        if (dayEvents && dayEvents.total_events > 0) {
            dayDiv.classList.add('has-events');
            
            if (dayEvents.community_events > 0) {
                dayDiv.classList.add('community');
            }
            
            // Badge com número de eventos
            const eventCount = document.createElement('div');
            eventCount.className = 'event-count';
            eventCount.textContent = dayEvents.total_events;
            dayDiv.appendChild(eventCount);
        }
        
        // Eventos do dia
        if (!isOtherMonth) {
            dayDiv.addEventListener('mouseenter', (e) => {
                if (dayEvents && dayEvents.total_events > 0) {
                    this.showTooltip(e, dayEvents);
                }
            });
            
            dayDiv.addEventListener('click', () => {
                if (this.isReadOnly && date < today) {
                    window.app.showNotification('Não é possível agendar em datas passadas', 'warning');
                    return;
                }
                
                this.selectedDate = dateStr;
                this.handleDayClick(dateStr, dayEvents);
            });
        }
        
        return dayDiv;
    }

    // ===== TOOLTIP =====
    showTooltip(event, dayEvents) {
        const content = `
            <strong>${dayEvents.total_events} evento${dayEvents.total_events > 1 ? 's' : ''}</strong>
            ${dayEvents.community_events > 0 ? `<br>${dayEvents.community_events} comunitário${dayEvents.community_events > 1 ? 's' : ''}` : ''}
            ${dayEvents.individual_events > 0 ? `<br>${dayEvents.individual_events} individual${dayEvents.individual_events > 1 ? 'is' : ''}` : ''}
        `;
        
        this.tooltipContent.innerHTML = content;
        this.tooltip.classList.add('show');
        
        // Posicionar tooltip
        const rect = event.target.getBoundingClientRect();
        this.tooltip.style.left = rect.left + 'px';
        this.tooltip.style.top = (rect.bottom + 5) + 'px';
    }

    hideTooltip() {
        this.tooltip.classList.remove('show');
    }

    // ===== EVENTOS =====
    async handleDayClick(dateStr, dayEvents) {
        if (dayEvents && dayEvents.total_events > 0) {
            // Mostrar eventos do dia
            await this.showDayEvents(dateStr);
        } else {
            // Novo agendamento
            this.showWeddingTypeModal(dateStr);
        }
    }

    async showDayEvents(dateStr) {
        try {
            const events = await window.db.getDayEvents(dateStr);
            
            // Formatar data para exibição
            const date = new Date(dateStr + 'T12:00:00');
            const dateFormatted = window.validator.formatDate(date);
            
            document.getElementById('day-events-title').textContent = `Eventos - ${dateFormatted}`;
            
            // Renderizar lista de eventos
            const listContainer = document.getElementById('day-events-list');
            listContainer.innerHTML = '';
            
            events.forEach(event => {
                const eventDiv = document.createElement('div');
                eventDiv.className = 'event-item';
                
                eventDiv.innerHTML = `
                    <div class="event-item-header">
                        <div class="event-item-time">${event.wedding_time.substring(0, 5)}</div>
                        <div class="event-item-type ${event.is_community ? 'community' : 'individual'}">
                            ${event.is_community ? 'Comunitário' : 'Individual'}
                        </div>
                    </div>
                    <div class="event-item-details">
                        <strong>Noivos:</strong> ${event.bride_name} & ${event.groom_name}<br>
                        <strong>Local:</strong> ${event.locations.name}<br>
                        <strong>Celebrante:</strong> ${event.celebrants.title} ${event.celebrants.name}
                    </div>
                `;
                
                eventDiv.addEventListener('click', () => {
                    window.app.editWedding(event.wedding_id);
                });
                
                listContainer.appendChild(eventDiv);
            });
            
            // Configurar botão de novo evento
            document.getElementById('btn-new-event-from-list').onclick = () => {
                window.app.closeModal('modal-day-events');
                this.showWeddingTypeModal(dateStr);
            };
            
            window.app.openModal('modal-day-events');
        } catch (error) {
            console.error('Erro ao carregar eventos do dia:', error);
            window.app.showNotification('Erro ao carregar eventos', 'error');
        }
    }

    showWeddingTypeModal(dateStr) {
        this.selectedDate = dateStr;
        window.app.openModal('modal-wedding-type');
    }

    // ===== UTILITÁRIOS =====
    formatDateForDB(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    isSameDay(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    }

    refresh() {
        this.loadCalendar();
    }
}

// Criar instância global
window.calendar = new CalendarManager();
