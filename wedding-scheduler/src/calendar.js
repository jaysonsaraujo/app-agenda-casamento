// Classe para gerenciar o calendário
class CalendarManager {
    constructor() {
        this.currentYear = new Date().getFullYear();
        this.currentMonth = new Date().getMonth() + 1;
        this.monthsToShow = 3;
        this.events = {};
        this.selectedDate = null;
        this.tooltip = null;
    }

    init() {
        console.log('📅 Inicializando calendário...');
        this.setupElements();
        this.setupEventListeners();
        this.loadCalendar();
        console.log('✅ Calendário inicializado');
    }

    setupElements() {
        this.calendarContainer = document.getElementById('calendar-container');
        this.yearDisplay = document.getElementById('current-year');
        this.tooltip = document.getElementById('calendar-tooltip');
        this.tooltipContent = this.tooltip.querySelector('.tooltip-content');
    }

    setupEventListeners() {
        document.getElementById('btn-prev-year').addEventListener('click', () => {
            this.currentYear--;
            this.loadCalendar();
        });

        document.getElementById('btn-next-year').addEventListener('click', () => {
            this.currentYear++;
            this.loadCalendar();
        });

        this.calendarContainer.addEventListener('wheel', (e) => {
            e.preventDefault();
            
            if (e.deltaY > 0) {
                this.currentMonth++;
                if (this.currentMonth > 12) {
                    this.currentMonth = 1;
                    this.currentYear++;
                }
            } else {
                this.currentMonth--;
                if (this.currentMonth < 1) {
                    this.currentMonth = 12;
                    this.currentYear--;
                }
            }
            
            this.loadCalendar();
        });
    }

    async loadCalendar() {
        this.yearDisplay.textContent = this.currentYear;
        this.showLoading();
        
        try {
            await this.loadYearEvents();
            this.renderMonths();
        } catch (error) {
            console.error('Erro ao carregar calendário:', error);
            if (window.app) {
                window.app.showNotification('Erro ao carregar calendário', 'error');
            }
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
            <div style="text-align: center; padding: 40px;">
                <div class="loading"></div>
                <p style="margin-top: 10px;">Carregando calendário...</p>
            </div>
        `;
    }

    renderMonths() {
        this.calendarContainer.innerHTML = '';
        
        const monthsToRender = [];
        let month = this.currentMonth;
        let year = this.currentYear;
        
        for (let i = 0; i < this.monthsToShow; i++) {
            monthsToRender.push({ month, year });
            month++;
            if (month > 12) {
                month = 1;
                year++;
            }
        }
        
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
        
        const header = document.createElement('div');
        header.className = 'calendar-month-header';
        header.textContent = `${monthNames[month - 1]} ${year}`;
        monthDiv.appendChild(header);
        
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
        
        const daysDiv = document.createElement('div');
        daysDiv.className = 'calendar-days';
        
        const firstDay = new Date(year, month - 1, 1);
        const firstDayOfWeek = firstDay.getDay();
        const daysInMonth = new Date(year, month, 0).getDate();
        const prevMonthLastDay = new Date(year, month - 1, 0).getDate();
        
        for (let i = firstDayOfWeek - 1; i >= 0; i--) {
            const dayDiv = this.createDayElement(prevMonthLastDay - i, month - 1, year, true);
            daysDiv.appendChild(dayDiv);
        }
        
        for (let day = 1; day <= daysInMonth; day++) {
            const dayDiv = this.createDayElement(day, month, year, false);
            daysDiv.appendChild(dayDiv);
        }
        
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
        
        const date = new Date(year, month - 1, day);
        const dateStr = this.formatDateForDB(date);
        const today = new Date();
        
        if (date.toDateString() === today.toDateString()) {
            dayDiv.classList.add('today');
        }
        
        if (date < today && !this.isSameDay(date, today)) {
            dayDiv.classList.add('past');
        }
        
        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = day;
        dayDiv.appendChild(dayNumber);
        
        const dayEvents = this.events[dateStr];
        if (dayEvents && dayEvents.total_events > 0) {
            dayDiv.classList.add('has-events');
            
            if (dayEvents.community_events > 0) {
                dayDiv.classList.add('community');
            }
            
            const eventCount = document.createElement('div');
            eventCount.className = 'event-count';
            eventCount.textContent = dayEvents.total_events;
            dayDiv.appendChild(eventCount);
        }
        
        if (!isOtherMonth) {
            dayDiv.addEventListener('mouseenter', (e) => {
                if (dayEvents && dayEvents.total_events > 0) {
                    this.showTooltip(e, dayEvents);
                }
            });
            
            dayDiv.addEventListener('mouseleave', () => {
                this.hideTooltip();
            });
            
            dayDiv.addEventListener('click', () => {
                this.selectedDate = dateStr;
                this.handleDayClick(dateStr, dayEvents);
            });
        }
        
        return dayDiv;
    }

    showTooltip(event, dayEvents) {
        const content = `
            <strong>${dayEvents.total_events} evento${dayEvents.total_events > 1 ? 's' : ''}</strong>
            ${dayEvents.community_events > 0 ? `<br>${dayEvents.community_events} comunitário${dayEvents.community_events > 1 ? 's' : ''}` : ''}
            ${dayEvents.individual_events > 0 ? `<br>${dayEvents.individual_events} individual${dayEvents.individual_events > 1 ? 'is' : ''}` : ''}
        `;
        
        this.tooltipContent.innerHTML = content;
        this.tooltip.classList.add('show');
        
        const rect = event.target.getBoundingClientRect();
        this.tooltip.style.left = rect.left + 'px';
        this.tooltip.style.top = (rect.bottom + 5) + 'px';
    }

    hideTooltip() {
        this.tooltip.classList.remove('show');
    }

    async handleDayClick(dateStr, dayEvents) {
        if (dayEvents && dayEvents.total_events > 0) {
            await this.showDayEvents(dateStr, dayEvents);
        } else {
            this.showWeddingTypeModal(dateStr);
        }
    }

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

    showWeddingTypeModal(dateStr) {
        this.selectedDate = dateStr;
        window.app.openModal('modal-wedding-type');
    }

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

// ===== CRIAR INSTÂNCIA GLOBAL =====
console.log('📅 Criando window.calendar...');
window.calendar = new CalendarManager();
console.log('✅ window.calendar criado:', typeof window.calendar);
