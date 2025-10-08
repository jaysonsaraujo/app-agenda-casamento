// Classe para gerenciar busca e filtros
class SearchManager {
    constructor() {
        this.filters = {
            name: '',
            dateStart: '',
            dateEnd: '',
            location: '',
            celebrant: '',
            type: '',
            status: ''
        };
        this.results = [];
        this.currentPage = 1;
        this.resultsPerPage = 25;
        this.totalResults = 0;
    }

    init() {
        console.log('🔍 Inicializando SearchManager...');
        this.setupEventListeners();
        this.loadFilterOptions();
        console.log('✅ SearchManager inicializado');
    }

    setupEventListeners() {
        // Toggle filtros
        document.getElementById('btn-toggle-filters').addEventListener('click', () => {
            this.toggleFilters();
        });

        // Aplicar filtros
        document.getElementById('btn-apply-filters').addEventListener('click', () => {
            this.applyFilters();
        });

        // Limpar filtros
        document.getElementById('btn-clear-filters').addEventListener('click', () => {
            this.clearFilters();
        });

        // Busca em tempo real no nome
        document.getElementById('search-name').addEventListener('input', () => {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                if (this.isFiltersPanelOpen()) {
                    this.applyFilters();
                }
            }, 500);
        });

        // Mudança de resultados por página
        document.getElementById('results-per-page').addEventListener('change', (e) => {
            this.resultsPerPage = parseInt(e.target.value);
            this.currentPage = 1;
            this.renderResults();
        });

        // Exportações
        document.getElementById('btn-export-excel').addEventListener('click', () => {
            this.exportToExcel();
        });

        document.getElementById('btn-export-pdf').addEventListener('click', () => {
            this.exportToPDF();
        });

        // Validação em tempo real
        if (window.validator) {
            window.validator.setupRealtimeValidation('filters-panel');
        }
    }

    async loadFilterOptions() {
        try {
            // Carregar locais
            const locations = await window.db.getLocations(false);
            const locationSelect = document.getElementById('search-location');
            locations.forEach(loc => {
                const option = document.createElement('option');
                option.value = loc.id;
                option.textContent = loc.name;
                locationSelect.appendChild(option);
            });

            // Carregar celebrantes
            const celebrants = await window.db.getCelebrants(false);
            const celebrantSelect = document.getElementById('search-celebrant');
            celebrants.forEach(cel => {
                const option = document.createElement('option');
                option.value = cel.id;
                option.textContent = `${cel.title} ${cel.name}`;
                celebrantSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Erro ao carregar opções de filtro:', error);
        }
    }

    toggleFilters() {
        const panel = document.getElementById('filters-panel');
        const button = document.getElementById('filter-toggle-text');
        
        if (panel.style.display === 'none') {
            panel.style.display = 'block';
            button.textContent = 'Ocultar Filtros';
        } else {
            panel.style.display = 'none';
            button.textContent = 'Mostrar Filtros';
        }
    }

    isFiltersPanelOpen() {
        return document.getElementById('filters-panel').style.display !== 'none';
    }

    async applyFilters() {
        try {
            // Coletar valores dos filtros
            this.filters.name = document.getElementById('search-name').value;
            this.filters.dateStart = document.getElementById('search-date-start').value;
            this.filters.dateEnd = document.getElementById('search-date-end').value;
            this.filters.location = document.getElementById('search-location').value;
            this.filters.celebrant = document.getElementById('search-celebrant').value;
            this.filters.type = document.getElementById('search-type').value;
            this.filters.status = document.getElementById('search-status').value;

            // Mostrar loading
            this.showLoading();

            // Buscar no banco
            await this.performSearch();

            // Renderizar resultados
            this.currentPage = 1;
            this.renderResults();

            // Mostrar filtros ativos
            this.renderActiveFilters();

            console.log(`✅ Busca concluída: ${this.totalResults} resultados`);
        } catch (error) {
            console.error('Erro ao aplicar filtros:', error);
            if (window.app) {
                window.app.showNotification('Erro ao buscar: ' + error.message, 'error');
            }
        }
    }

    async performSearch() {
        try {
            let query = window.db.supabase
                .from('weddings')
                .select(`
                    *,
                    locations (name),
                    celebrants (name, title)
                `);

            // Filtro por nome
            if (this.filters.name) {
                const searchTerm = this.filters.name.toUpperCase();
                query = query.or(`bride_name.ilike.%${searchTerm}%,groom_name.ilike.%${searchTerm}%`);
            }

            // Filtro por período
            if (this.filters.dateStart) {
                query = query.gte('wedding_date', this.filters.dateStart);
            }
            if (this.filters.dateEnd) {
                query = query.lte('wedding_date', this.filters.dateEnd);
            }

            // Filtro por local
            if (this.filters.location) {
                query = query.eq('location_id', parseInt(this.filters.location));
            }

            // Filtro por celebrante
            if (this.filters.celebrant) {
                query = query.eq('celebrant_id', parseInt(this.filters.celebrant));
            }

            // Filtro por tipo
            if (this.filters.type !== '') {
                query = query.eq('is_community', this.filters.type === 'true');
            }

            // Filtro por status
            if (this.filters.status) {
                query = query.eq('status', this.filters.status);
            }

            // Ordenar por data
            query = query.order('wedding_date', { ascending: true })
                         .order('wedding_time', { ascending: true });

            const { data, error } = await query;

            if (error) throw error;

            this.results = data || [];
            this.totalResults = this.results.length;
        } catch (error) {
            console.error('Erro na busca:', error);
            throw error;
        }
    }

    renderResults() {
        const container = document.getElementById('search-results');
        container.innerHTML = '';

        if (this.totalResults === 0) {
            container.innerHTML = `
                <div class="results-empty">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="opacity: 0.3;">
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="m21 21-4.35-4.35"></path>
                    </svg>
                    <p>Nenhum resultado encontrado</p>
                    <small>Tente ajustar os filtros de busca</small>
                </div>
            `;
            document.getElementById('results-count').textContent = '0 resultados encontrados';
            document.getElementById('pagination').style.display = 'none';
            return;
        }

        // Calcular paginação
        const startIndex = (this.currentPage - 1) * this.resultsPerPage;
        const endIndex = Math.min(startIndex + this.resultsPerPage, this.totalResults);
        const pageResults = this.results.slice(startIndex, endIndex);

        // Atualizar contador
        document.getElementById('results-count').textContent = 
            `${this.totalResults} resultado${this.totalResults > 1 ? 's' : ''} encontrado${this.totalResults > 1 ? 's' : ''} (${startIndex + 1}-${endIndex})`;

        // Renderizar resultados
        pageResults.forEach(wedding => {
            const resultCard = this.createResultCard(wedding);
            container.appendChild(resultCard);
        });

        // Renderizar paginação
        this.renderPagination();
    }

    createResultCard(wedding) {
        const card = document.createElement('div');
        card.className = 'result-card';
        card.style.cursor = 'pointer';

        const statusClass = wedding.status.toLowerCase();
        const typeText = wedding.is_community ? 'Comunitário' : 'Individual';
        const statusEmoji = {
            'AGENDADO': '📅',
            'REALIZADO': '✅',
            'CANCELADO': '❌'
        };

        card.innerHTML = `
            <div class="result-card-header">
                <div class="result-id">${wedding.wedding_id}</div>
                <div class="result-badges">
                    <span class="badge badge-${wedding.is_community ? 'community' : 'individual'}">
                        ${typeText}
                    </span>
                    <span class="badge badge-${statusClass}">
                        ${statusEmoji[wedding.status]} ${wedding.status}
                    </span>
                </div>
            </div>
            <div class="result-card-body">
                <div class="result-couple">
                    <strong>💑 Noivos:</strong> ${wedding.bride_name} & ${wedding.groom_name}
                </div>
                <div class="result-details">
                    <div><strong>📅 Data:</strong> ${window.validator.formatDate(new Date(wedding.wedding_date + 'T12:00:00'))}</div>
                    <div><strong>🕐 Horário:</strong> ${wedding.wedding_time.substring(0, 5)}</div>
                    <div><strong>📍 Local:</strong> ${wedding.locations.name}</div>
                    <div><strong>⛪ Celebrante:</strong> ${wedding.celebrants.title} ${wedding.celebrants.name}</div>
                </div>
            </div>
            <div class="result-card-footer">
                <button class="btn-result-action" onclick="searchManager.editWedding('${wedding.wedding_id}')">
                    ✏️ Editar
                </button>
                <button class="btn-result-action" onclick="searchManager.viewDetails('${wedding.wedding_id}')">
                    👁️ Detalhes
                </button>
            </div>
        `;

        return card;
    }

    renderPagination() {
        const totalPages = Math.ceil(this.totalResults / this.resultsPerPage);
        
        if (totalPages <= 1) {
            document.getElementById('pagination').style.display = 'none';
            return;
        }

        const pagination = document.getElementById('pagination');
        pagination.style.display = 'flex';
        pagination.innerHTML = '';

        // Botão anterior
        const prevBtn = document.createElement('button');
        prevBtn.className = 'pagination-btn';
        prevBtn.textContent = '← Anterior';
        prevBtn.disabled = this.currentPage === 1;
        prevBtn.onclick = () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.renderResults();
            }
        };
        pagination.appendChild(prevBtn);

        // Páginas
        const maxPagesToShow = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
        let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

        if (endPage - startPage < maxPagesToShow - 1) {
            startPage = Math.max(1, endPage - maxPagesToShow + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = 'pagination-btn' + (i === this.currentPage ? ' active' : '');
            pageBtn.textContent = i;
            pageBtn.onclick = () => {
                this.currentPage = i;
                this.renderResults();
            };
            pagination.appendChild(pageBtn);
        }

        // Botão próximo
        const nextBtn = document.createElement('button');
        nextBtn.className = 'pagination-btn';
        nextBtn.textContent = 'Próximo →';
        nextBtn.disabled = this.currentPage === totalPages;
        nextBtn.onclick = () => {
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.renderResults();
            }
        };
        pagination.appendChild(nextBtn);
    }

    renderActiveFilters() {
        const container = document.getElementById('active-filters');
        container.innerHTML = '';

        const activeFilters = [];

        if (this.filters.name) {
            activeFilters.push({ label: 'Nome', value: this.filters.name, key: 'name' });
        }
        if (this.filters.dateStart) {
            activeFilters.push({ label: 'De', value: window.validator.formatDate(new Date(this.filters.dateStart + 'T12:00:00')), key: 'dateStart' });
        }
        if (this.filters.dateEnd) {
            activeFilters.push({ label: 'Até', value: window.validator.formatDate(new Date(this.filters.dateEnd + 'T12:00:00')), key: 'dateEnd' });
        }
        if (this.filters.location) {
            const locationName = document.querySelector(`#search-location option[value="${this.filters.location}"]`).textContent;
            activeFilters.push({ label: 'Local', value: locationName, key: 'location' });
        }
        if (this.filters.celebrant) {
            const celebrantName = document.querySelector(`#search-celebrant option[value="${this.filters.celebrant}"]`).textContent;
            activeFilters.push({ label: 'Celebrante', value: celebrantName, key: 'celebrant' });
        }
        if (this.filters.type !== '') {
            activeFilters.push({ label: 'Tipo', value: this.filters.type === 'true' ? 'Comunitário' : 'Individual', key: 'type' });
        }
        if (this.filters.status) {
            activeFilters.push({ label: 'Status', value: this.filters.status, key: 'status' });
        }

        if (activeFilters.length === 0) return;

        activeFilters.forEach(filter => {
            const badge = document.createElement('div');
            badge.className = 'filter-badge';
            badge.innerHTML = `
                <span><strong>${filter.label}:</strong> ${filter.value}</span>
                <button onclick="searchManager.removeFilter('${filter.key}')">&times;</button>
            `;
            container.appendChild(badge);
        });
    }

    removeFilter(key) {
        const elementMap = {
            name: 'search-name',
            dateStart: 'search-date-start',
            dateEnd: 'search-date-end',
            location: 'search-location',
            celebrant: 'search-celebrant',
            type: 'search-type',
            status: 'search-status'
        };

        const element = document.getElementById(elementMap[key]);
        if (element) {
            element.value = '';
        }

        this.applyFilters();
    }

    clearFilters() {
        document.getElementById('search-name').value = '';
        document.getElementById('search-date-start').value = '';
        document.getElementById('search-date-end').value = '';
        document.getElementById('search-location').value = '';
        document.getElementById('search-celebrant').value = '';
        document.getElementById('search-type').value = '';
        document.getElementById('search-status').value = '';

        this.filters = {
            name: '',
            dateStart: '',
            dateEnd: '',
            location: '',
            celebrant: '',
            type: '',
            status: ''
        };

        document.getElementById('search-results').innerHTML = `
            <div class="results-empty">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="opacity: 0.3;">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                </svg>
                <p>Use os filtros acima para buscar casamentos</p>
            </div>
        `;

        document.getElementById('active-filters').innerHTML = '';
        document.getElementById('results-count').textContent = '0 resultados encontrados';
        document.getElementById('pagination').style.display = 'none';
    }

    showLoading() {
        document.getElementById('search-results').innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div class="loading"></div>
                <p>Buscando...</p>
            </div>
        `;
    }

    editWedding(weddingId) {
        if (window.app) {
            window.app.editWedding(weddingId);
        }
    }

    async viewDetails(weddingId) {
        try {
            const wedding = await window.db.getWedding(weddingId);
            // Implementar modal de detalhes (próxima funcionalidade)
            console.log('Detalhes:', wedding);
            if (window.app) {
                window.app.showNotification('Função de detalhes em desenvolvimento', 'info');
            }
        } catch (error) {
            console.error('Erro ao carregar detalhes:', error);
        }
    }

    exportToExcel() {
        // Preparar dados para exportação
        if (this.totalResults === 0) {
            if (window.app) {
                window.app.showNotification('Não há resultados para exportar', 'warning');
            }
            return;
        }

        if (window.app) {
            window.app.showNotification('📊 Preparando exportação para Excel... (em desenvolvimento)', 'info');
        }
    }

    exportToPDF() {
        if (this.totalResults === 0) {
            if (window.app) {
                window.app.showNotification('Não há resultados para exportar', 'warning');
            }
            return;
        }

        if (window.app) {
            window.app.showNotification('📄 Preparando exportação para PDF... (em desenvolvimento)', 'info');
        }
    }
}

// Criar instância global
console.log('🔍 Criando window.searchManager...');
window.searchManager = new SearchManager();
console.log('✅ window.searchManager criado');
