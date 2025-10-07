// Sistema de gerenciamento de lembretes
class ReminderSystem {
    constructor() {
        this.checkInterval = 5 * 60 * 1000; // 5 minutos
        this.isRunning = false;
        this.lastCheck = null;
    }

    // ===== INICIALIZAÇÃO =====
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.scheduleNextCheck();
        
        // Primeira verificação imediata
        this.checkPendingReminders();
    }

    stop() {
        this.isRunning = false;
        if (this.checkTimer) {
            clearTimeout(this.checkTimer);
        }
    }

    scheduleNextCheck() {
        if (!this.isRunning) return;
        
        this.checkTimer = setTimeout(() => {
            this.checkPendingReminders();
            this.scheduleNextCheck();
        }, this.checkInterval);
    }

    // ===== VERIFICAÇÃO DE LEMBRETES =====
    async checkPendingReminders() {
        try {
            console.log('Verificando lembretes pendentes...');
            this.lastCheck = new Date();
            
            const reminders = await window.db.getPendingReminders();
            
            if (reminders.length === 0) {
                console.log('Nenhum lembrete pendente');
                return;
            }
            
            console.log(`${reminders.length} lembretes pendentes encontrados`);
            
            for (const reminder of reminders) {
                await this.processReminder(reminder);
            }
        } catch (error) {
            console.error('Erro ao verificar lembretes:', error);
        }
    }

    async processReminder(reminder) {
        try {
            const wedding = reminder.weddings;
            const message = this.formatReminderMessage(reminder, wedding);
            
            // Aqui você pode implementar o envio real via WhatsApp
            // Por enquanto, vamos simular o envio
            const sent = await this.sendWhatsAppMessage(reminder, wedding, message);
            
            if (sent) {
                // Marcar como enviado
                await window.db.markReminderAsSent(reminder.id);
                
                // Mostrar notificação no sistema
                this.showSystemNotification(message.title, message.body);
                
                console.log(`Lembrete enviado: ${reminder.reminder_type} - ${wedding.wedding_id}`);
            }
        } catch (error) {
            console.error('Erro ao processar lembrete:', error);
        }
    }

    // ===== FORMATAÇÃO DE MENSAGENS =====
    formatReminderMessage(reminder, wedding) {
        const templates = {
            INTERVIEW_2D: {
                title: 'Lembrete de Entrevista - 2 dias',
                body: `Olá! Este é um lembrete que sua entrevista de casamento está agendada para ${this.formatDateTime(wedding.interview_date)}.\n\nNoivos: ${wedding.bride_name} & ${wedding.groom_name}\n\nPor favor, confirme sua presença.`
            },
            INTERVIEW_1D: {
                title: 'Lembrete de Entrevista - Amanhã',
                body: `Olá! Lembramos que sua entrevista de casamento é AMANHÃ às ${this.formatTime(wedding.interview_date)}.\n\nNoivos: ${wedding.bride_name} & ${wedding.groom_name}\n\nNão se esqueçam de trazer os documentos necessários.`
            },
            INTERVIEW_12H: {
                title: 'Lembrete Urgente - Entrevista em 12 horas',
                body: `LEMBRETE URGENTE! Sua entrevista de casamento é em 12 HORAS.\n\nHorário: ${this.formatTime(wedding.interview_date)}\nNoivos: ${wedding.bride_name} & ${wedding.groom_name}`
            },
            WEDDING: {
                title: 'Seu casamento é amanhã!',
                body: `Parabéns! Seu grande dia chegou! 💑\n\nSeu casamento está confirmado para amanhã, ${this.formatDate(wedding.wedding_date)} às ${wedding.wedding_time}.\n\nNoivos: ${wedding.bride_name} & ${wedding.groom_name}\n\nQue Deus abençoe esta união! 🙏`
            }
        };
        
        return templates[reminder.reminder_type] || {
            title: 'Lembrete',
            body: 'Você tem um compromisso agendado.'
        };
    }

    // ===== ENVIO DE MENSAGENS =====
    async sendWhatsAppMessage(reminder, wedding, message) {
        try {
            // Determinar destinatários
            const recipients = this.getRecipients(reminder, wedding);
            
            // Aqui você implementaria a integração real com WhatsApp
            // Por exemplo, usando a API do WhatsApp Business
            
            // Por enquanto, vamos simular o envio
            console.log('Simulando envio de WhatsApp:');
            console.log('Destinatários:', recipients);
            console.log('Mensagem:', message);
            
            // Simular delay de envio
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Retornar true para simular sucesso
            return true;
        } catch (error) {
            console.error('Erro ao enviar mensagem WhatsApp:', error);
            return false;
        }
    }

    getRecipients(reminder, wedding) {
        const recipients = [];
        
        // Adicionar noiva
        if (wedding.bride_whatsapp) {
            recipients.push({
                name: wedding.bride_name,
                phone: wedding.bride_whatsapp
            });
        }
        
        // Adicionar noivo
        if (wedding.groom_whatsapp) {
            recipients.push({
                name: wedding.groom_name,
                phone: wedding.groom_whatsapp
            });
        }
        
        return recipients;
    }

    // ===== NOTIFICAÇÕES DO SISTEMA =====
    showSystemNotification(title, body) {
        // Verificar se o navegador suporta notificações
        if (!("Notification" in window)) {
            console.log("Este navegador não suporta notificações desktop");
            return;
        }
        
        // Verificar permissão
        if (Notification.permission === "granted") {
            // Criar notificação
            const notification = new Notification(title, {
                body: body,
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                vibrate: [200, 100, 200],
                requireInteraction: true
            });
            
            // Fechar após 10 segundos
            setTimeout(() => notification.close(), 10000);
        } else if (Notification.permission !== "denied") {
            // Solicitar permissão
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    this.showSystemNotification(title, body);
                }
            });
        }
        
        // Também mostrar no app
        if (window.app) {
            window.app.showNotification(title, 'info');
        }
    }

    // ===== UTILITÁRIOS =====
    formatDate(date) {
        return window.validator ? window.validator.formatDate(new Date(date)) : date;
    }

    formatTime(datetime) {
        const date = new Date(datetime);
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    formatDateTime(datetime) {
        return window.validator ? window.validator.formatDateTime(new Date(datetime)) : datetime;
    }

    // ===== INTEGRAÇÃO COM WHATSAPP (TEMPLATE) =====
    // Este é um template para futura integração com WhatsApp Business API
    async sendViaWhatsAppAPI(phone, message) {
        // Configuração da API (exemplo)
        const config = {
            apiUrl: 'https://api.whatsapp.com/send',
            apiKey: 'YOUR_API_KEY', // Substituir pela chave real
            senderId: 'YOUR_SENDER_ID' // Substituir pelo ID real
        };
        
        // Formatar número de telefone
        const formattedPhone = this.formatPhoneForWhatsApp(phone);
        
        // Preparar payload
        const payload = {
            to: formattedPhone,
            type: 'text',
            text: {
                body: message.body
            }
        };
        
        // Enviar requisição (exemplo)
        try {
            const response = await fetch(config.apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            const result = await response.json();
            return result.success;
        } catch (error) {
            console.error('Erro na API do WhatsApp:', error);
            return false;
        }
    }

    formatPhoneForWhatsApp(phone) {
        // Remove caracteres não numéricos
        let cleaned = phone.replace(/\D/g, '');
        
        // Adiciona código do país se não tiver
        if (!cleaned.startsWith('55')) {
            cleaned = '55' + cleaned;
        }
        
        return cleaned;
    }

    // ===== STATUS E MONITORAMENTO =====
    getStatus() {
        return {
            isRunning: this.isRunning,
            lastCheck: this.lastCheck,
            checkInterval: this.checkInterval,
            nextCheck: this.checkTimer ? new Date(Date.now() + this.checkInterval) : null
        };
    }

    async getStatistics() {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const stats = await window.db.supabase
                .from('reminders')
                .select('reminder_type, sent')
                .gte('created_at', today.toISOString());
            
            const result = {
                total: stats.data.length,
                sent: stats.data.filter(r => r.sent).length,
                pending: stats.data.filter(r => !r.sent).length,
                byType: {}
            };
            
            // Agrupar por tipo
            stats.data.forEach(reminder => {
                if (!result.byType[reminder.reminder_type]) {
                    result.byType[reminder.reminder_type] = {
                        total: 0,
                        sent: 0,
                        pending: 0
                    };
                }
                
                result.byType[reminder.reminder_type].total++;
                if (reminder.sent) {
                    result.byType[reminder.reminder_type].sent++;
                } else {
                    result.byType[reminder.reminder_type].pending++;
                }
            });
            
            return result;
        } catch (error) {
            console.error('Erro ao obter estatísticas de lembretes:', error);
            return null;
        }
    }
}

// Criar instância global
window.reminderSystem = new ReminderSystem();

// Exportar para uso em outros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReminderSystem;
}
