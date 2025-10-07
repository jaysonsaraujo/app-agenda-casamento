// Classe para gerenciar todas as operações do banco de dados
class DatabaseManager {
    constructor() {
        this.supabase = window.supabaseClient;
        this.cache = new Map();
    }

    // ===== CONFIGURAÇÕES =====
    async getConfig(key = null) {
        try {
            const query = this.supabase.from('system_config').select('*');
            
            if (key) {
                query.eq('config_key', key);
            }
            
            const { data, error } = await query;
            
            if (error) throw error;
            
            if (key && data.length > 0) {
                return data[0].config_value;
            }
            
            return data;
        } catch (error) {
            console.error('Erro ao buscar configuração:', error);
            throw error;
        }
    }

    async updateConfig(key, value) {
        try {
            const { data, error } = await this.supabase
                .from('system_config')
                .update({ config_value: value })
                .eq('config_key', key);
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro ao atualizar configuração:', error);
            throw error;
        }
    }

    // ===== LOCAIS =====
    async getLocations(activeOnly = true) {
        try {
            let query = this.supabase.from('locations').select('*');
            
            if (activeOnly) {
                query = query.eq('is_active', true);
            }
            
            const { data, error } = await query.order('name');
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro ao buscar locais:', error);
            throw error;
        }
    }

    async addLocation(locationData) {
        try {
            // Converter para maiúsculas
            locationData.name = locationData.name.toUpperCase();
            if (locationData.address) {
                locationData.address = locationData.address.toUpperCase();
            }
            
            const { data, error } = await this.supabase
                .from('locations')
                .insert(locationData)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro ao adicionar local:', error);
            throw error;
        }
    }

    // ===== CELEBRANTES =====
    async getCelebrants(activeOnly = true) {
        try {
            let query = this.supabase.from('celebrants').select('*');
            
            if (activeOnly) {
                query = query.eq('is_active', true);
            }
            
            const { data, error } = await query.order('name');
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro ao buscar celebrantes:', error);
            throw error;
        }
    }

    async addCelebrant(celebrantData) {
        try {
            // Converter nome para maiúsculas
            celebrantData.name = celebrantData.name.toUpperCase();
            
            const { data, error } = await this.supabase
                .from('celebrants')
                .insert(celebrantData)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro ao adicionar celebrante:', error);
            throw error;
        }
    }

    // ===== CASAMENTOS =====
    async generateWeddingId() {
        try {
            const { data, error } = await this.supabase
                .rpc('generate_wedding_id');
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro ao gerar ID do casamento:', error);
            throw error;
        }
    }

    async checkWeddingConflicts(weddingData) {
        try {
            const { data, error } = await this.supabase
                .rpc('check_wedding_conflicts', {
                    p_wedding_date: weddingData.wedding_date,
                    p_wedding_time: weddingData.wedding_time,
                    p_location_id: weddingData.location_id,
                    p_celebrant_id: weddingData.celebrant_id,
                    p_is_community: weddingData.is_community,
                    p_wedding_id: weddingData.wedding_id || null
                });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Erro ao verificar conflitos:', error);
            throw error;
        }
    }

    async calculateProclamationSundays(weddingDate) {
        try {
            const { data, error } = await this.supabase
                .rpc('calculate_proclamation_sundays', {
                    wedding_date: weddingDate
                });
            
            if (error) throw error;
            return data[0];
        } catch (error) {
            console.error('Erro ao calcular domingos dos proclames:', error);
            throw error;
        }
    }

    async createWedding(weddingData) {
        try {
            // Converter campos de texto para maiúsculas
            const fieldsToUpperCase = ['bride_name', 'groom_name', 'observations', 'system_message'];
            fieldsToUpperCase.forEach(field => {
                if (weddingData[field]) {
                    weddingData[field] = weddingData[field].toUpperCase();
                }
            });

            // Gerar ID único
            weddingData.wedding_id = await this.generateWeddingId();
            
            // Calcular domingos dos proclames
            const sundays = await this.calculateProclamationSundays(weddingData.wedding_date);
            weddingData.first_sunday = sundays.first_sunday;
            weddingData.second_sunday = sundays.second_sunday;
            weddingData.third_sunday = sundays.third_sunday;
            
            const { data, error } = await this.supabase
                .from('weddings')
                .insert(weddingData)
                .select()
                .single();
            
            if (error) throw error;
            
            // Criar lembretes
            await this.createReminders(data.wedding_id, data.interview_date, data.wedding_date);
            
            return data;
        } catch (error) {
            console.error('Erro ao criar casamento:', error);
            throw error;
        }
    }

    async updateWedding(weddingId, weddingData) {
        try {
            // Converter campos de texto para maiúsculas
            const fieldsToUpperCase = ['bride_name', 'groom_name', 'observations', 'system_message'];
            fieldsToUpperCase.forEach(field => {
                if (weddingData[field]) {
                    weddingData[field] = weddingData[field].toUpperCase();
                }
            });

            // Recalcular domingos se a data mudou
            if (weddingData.wedding_date) {
                const sundays = await this.calculateProclamationSundays(weddingData.wedding_date);
                weddingData.first_sunday = sundays.first_sunday;
                weddingData.second_sunday = sundays.second_sunday;
                weddingData.third_sunday = sundays.third_sunday;
            }
            
            const { data, error } = await this.supabase
                .from('weddings')
                .update(weddingData)
                .eq('wedding_id', weddingId)
                .select()
                .single();
            
            if (error) throw error;
            
            // Atualizar lembretes se necessário
            if (weddingData.interview_date) {
                await this.updateReminders(weddingId, data.interview_date, data.wedding_date);
            }
            
            return data;
        } catch (error) {
            console.error('Erro ao atualizar casamento:', error);
            throw error;
        }
    }

    async getWedding(weddingId) {
        try {
            const { data, error } = await this.supabase
                .from('weddings')
                .select(`
                    *,
                    locations (name),
                    celebrants (name, title)
                `)
                .eq('wedding_id', weddingId)
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro ao buscar casamento:', error);
            throw error;
        }
    }

    async getWeddingsByDateRange(startDate, endDate) {
        try {
            const { data, error } = await this.supabase
                .from('weddings')
                .select(`
                    *,
                    locations (name),
                    celebrants (name, title)
                `)
                .gte('wedding_date', startDate)
                .lte('wedding_date', endDate)
                .eq('status', 'AGENDADO')
                .order('wedding_date')
                .order('wedding_time');
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro ao buscar casamentos por período:', error);
            throw error;
        }
    }

    async getCalendarEvents(year, month = null) {
        try {
            let startDate, endDate;
            
            if (month !== null) {
                startDate = `${year}-${String(month).padStart(2, '0')}-01`;
                const lastDay = new Date(year, month, 0).getDate();
                endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
            } else {
                startDate = `${year}-01-01`;
                endDate = `${year}-12-31`;
            }
            
            const { data, error } = await this.supabase
                .from('calendar_view')
                .select('*')
                .gte('wedding_date', startDate)
                .lte('wedding_date', endDate);
            
            if (error) throw error;
            
            // Transformar em objeto indexado por data
            const events = {};
            data.forEach(item => {
                events[item.wedding_date] = item;
            });
            
            return events;
        } catch (error) {
            console.error('Erro ao buscar eventos do calendário:', error);
            throw error;
        }
    }

    async getDayEvents(date) {
        try {
            const { data, error } = await this.supabase
                .from('weddings')
                .select(`
                    *,
                    locations (name),
                    celebrants (name, title)
                `)
                .eq('wedding_date', date)
                .eq('status', 'AGENDADO')
                .order('wedding_time');
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro ao buscar eventos do dia:', error);
            throw error;
        }
    }

    // ===== LEMBRETES =====
    async createReminders(weddingId, interviewDate, weddingDate) {
        try {
            const reminders = [];
            
            // Buscar configurações de lembretes
            const config = await this.getConfig();
            const reminderConfig = {};
            config.forEach(item => {
                reminderConfig[item.config_key] = parseInt(item.config_value);
            });
            
            // Lembretes da entrevista
            if (interviewDate) {
                const interviewDateTime = new Date(interviewDate);
                
                // 2 dias antes
                const reminder2d = new Date(interviewDateTime);
                reminder2d.setHours(reminder2d.getHours() - (reminderConfig.reminder_interview_2d || 48));
                reminders.push({
                    wedding_id: weddingId,
                    reminder_type: 'INTERVIEW_2D',
                    reminder_date: reminder2d.toISOString()
                });
                
                // 1 dia antes
                const reminder1d = new Date(interviewDateTime);
                reminder1d.setHours(reminder1d.getHours() - (reminderConfig.reminder_interview_1d || 24));
                reminders.push({
                    wedding_id: weddingId,
                    reminder_type: 'INTERVIEW_1D',
                    reminder_date: reminder1d.toISOString()
                });
                
                // 12 horas antes
                const reminder12h = new Date(interviewDateTime);
                reminder12h.setHours(reminder12h.getHours() - (reminderConfig.reminder_interview_12h || 12));
                reminders.push({
                    wedding_id: weddingId,
                    reminder_type: 'INTERVIEW_12H',
                    reminder_date: reminder12h.toISOString()
                });
            }
            
            // Lembrete do casamento
            if (weddingDate) {
                const weddingDateTime = new Date(weddingDate);
                weddingDateTime.setHours(weddingDateTime.getHours() - (reminderConfig.reminder_wedding || 24));
                reminders.push({
                    wedding_id: weddingId,
                    reminder_type: 'WEDDING',
                    reminder_date: weddingDateTime.toISOString()
                });
            }
            
            if (reminders.length > 0) {
                const { error } = await this.supabase
                    .from('reminders')
                    .insert(reminders);
                
                if (error) throw error;
            }
        } catch (error) {
            console.error('Erro ao criar lembretes:', error);
            throw error;
        }
    }

    async updateReminders(weddingId, interviewDate, weddingDate) {
        try {
            // Deletar lembretes antigos
            await this.supabase
                .from('reminders')
                .delete()
                .eq('wedding_id', weddingId)
                .eq('sent', false);
            
            // Criar novos lembretes
            await this.createReminders(weddingId, interviewDate, weddingDate);
        } catch (error) {
            console.error('Erro ao atualizar lembretes:', error);
            throw error;
        }
    }

    async getPendingReminders() {
        try {
            const now = new Date().toISOString();
            
            const { data, error } = await this.supabase
                .from('reminders')
                .select(`
                    *,
                    weddings (
                        wedding_id,
                        bride_name,
                        bride_whatsapp,
                        groom_name,
                        groom_whatsapp,
                        wedding_date,
                        wedding_time,
                        interview_date
                    )
                `)
                .lte('reminder_date', now)
                .eq('sent', false)
                .order('reminder_date');
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro ao buscar lembretes pendentes:', error);
            throw error;
        }
    }

    async markReminderAsSent(reminderId) {
        try {
            const { error } = await this.supabase
                .from('reminders')
                .update({ 
                    sent: true, 
                    sent_at: new Date().toISOString() 
                })
                .eq('id', reminderId);
            
            if (error) throw error;
        } catch (error) {
            console.error('Erro ao marcar lembrete como enviado:', error);
            throw error;
        }
    }

    // ===== RELATÓRIOS E ESTATÍSTICAS =====
    async getMonthStatistics(year, month) {
        try {
            const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
            const lastDay = new Date(year, month, 0).getDate();
            const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
            
            const { data, error } = await this.supabase
                .from('weddings')
                .select('is_community, with_civil_effect')
                .gte('wedding_date', startDate)
                .lte('wedding_date', endDate)
                .eq('status', 'AGENDADO');
            
            if (error) throw error;
            
            const stats = {
                total: data.length,
                community: data.filter(w => w.is_community).length,
                individual: data.filter(w => !w.is_community).length,
                withCivil: data.filter(w => w.with_civil_effect).length
            };
            
            return stats;
        } catch (error) {
            console.error('Erro ao buscar estatísticas:', error);
            throw error;
        }
    }
}

// Criar instância global
window.db = new DatabaseManager();
