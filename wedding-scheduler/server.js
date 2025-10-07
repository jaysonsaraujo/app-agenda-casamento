const express = require('express');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const morgan = require('morgan');
const fs = require('fs');
require('dotenv').config();

// Criar aplicação Express
const app = express();
const PORT = process.env.PORT || 3000;

// ===== CONFIGURAÇÕES DE SEGURANÇA =====
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", process.env.SUPABASE_URL || "https://*.supabase.co"]
        }
    },
    crossOriginEmbedderPolicy: false
}));

// CORS configuração
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
    credentials: true
}));

// ===== MIDDLEWARE =====
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV === 'production') {
    // Criar diretório de logs se não existir
    const logsDir = path.join(__dirname, 'logs');
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }
    
    // Criar stream de escrita para logs
    const accessLogStream = fs.createWriteStream(
        path.join(logsDir, 'access.log'),
        { flags: 'a' }
    );
    
    app.use(morgan('combined', { stream: accessLogStream }));
} else {
    app.use(morgan('dev'));
}

// ===== ROTAS ESTÁTICAS =====
// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
    etag: true
}));

// Servir arquivos de configuração
app.use('/config', express.static(path.join(__dirname, 'config')));

// Servir arquivos JavaScript
app.use('/src', express.static(path.join(__dirname, 'src')));

// ===== ROTAS DA API =====
// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0'
    });
});

// Status da aplicação
app.get('/api/status', (req, res) => {
    res.json({
        app: 'Wedding Scheduler',
        status: 'running',
        database: {
            url: process.env.SUPABASE_URL ? 'configured' : 'not configured',
            connected: !!process.env.SUPABASE_ANON_KEY
        },
        features: {
            reminders: true,
            calendar: true,
            config: true
        },
        timestamp: new Date().toISOString()
    });
});

// Configuração do Supabase (endpoint para o frontend)
app.get('/api/config', (req, res) => {
    res.json({
        supabaseUrl: process.env.SUPABASE_URL || '',
        supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
        appName: process.env.APP_NAME || 'Sistema de Agendamento de Casamentos',
        timezone: process.env.TZ || 'America/Sao_Paulo'
    });
});

// Webhook para lembretes (para integração futura)
app.post('/api/webhooks/reminders', express.raw({ type: 'application/json' }), (req, res) => {
    try {
        const signature = req.headers['x-webhook-signature'];
        
        // Verificar assinatura do webhook (implementar conforme necessário)
        if (!verifyWebhookSignature(req.body, signature)) {
            return res.status(401).json({ error: 'Invalid signature' });
        }
        
        // Processar webhook
        const data = JSON.parse(req.body);
        console.log('Webhook recebido:', data);
        
        // Aqui você pode implementar a lógica para processar o webhook
        // Por exemplo, enviar notificações, atualizar status, etc.
        
        res.json({ success: true });
    } catch (error) {
        console.error('Erro no webhook:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Função auxiliar para verificar assinatura do webhook
function verifyWebhookSignature(payload, signature) {
    // Implementar verificação de assinatura conforme seu provedor de webhook
    // Por enquanto, retorna true para desenvolvimento
    if (process.env.NODE_ENV === 'development') {
        return true;
    }
    
    // Em produção, implementar verificação real
    const crypto = require('crypto');
    const secret = process.env.WEBHOOK_SECRET || '';
    const hash = crypto.createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
    
    return hash === signature;
}

// ===== ROTAS DO SPA =====
// Rota para a página de configurações
app.get('/config', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'config.html'));
});

// Catch-all - sempre retornar index.html para rotas não encontradas (SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ===== TRATAMENTO DE ERROS =====
// 404 handler
app.use((req, res, next) => {
    res.status(404).json({
        error: 'Not Found',
        message: 'The requested resource was not found',
        path: req.path
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    const status = err.status || 500;
    const message = process.env.NODE_ENV === 'production' 
        ? 'Internal Server Error' 
        : err.message;
    
    res.status(status).json({
        error: true,
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// ===== GRACEFUL SHUTDOWN =====
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

function gracefulShutdown() {
    console.log('Recebido sinal de término, desligando graciosamente...');
    
    server.close(() => {
        console.log('Servidor HTTP fechado');
        process.exit(0);
    });
    
    // Forçar encerramento após 10 segundos
    setTimeout(() => {
        console.error('Não foi possível fechar conexões a tempo, forçando encerramento');
        process.exit(1);
    }, 10000);
}

// ===== INICIAR SERVIDOR =====
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔════════════════════════════════════════════╗
║     Sistema de Agendamento de Casamentos    ║
╠════════════════════════════════════════════╣
║  Servidor rodando na porta ${PORT}             ║
║  Ambiente: ${process.env.NODE_ENV || 'development'}                  ║
║  URL: http://localhost:${PORT}                ║
╚════════════════════════════════════════════╝
    `);
    
    // Verificar configuração do Supabase
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
        console.warn('⚠️  AVISO: Variáveis do Supabase não configuradas!');
        console.warn('   Configure SUPABASE_URL e SUPABASE_ANON_KEY no arquivo .env');
    } else {
        console.log('✅ Supabase configurado corretamente');
    }
});

// ===== MÓDULO DE MONITORAMENTO =====
// Monitorar uso de memória
setInterval(() => {
    const used = process.memoryUsage();
    const messages = [];
    
    for (let key in used) {
        messages.push(`${key}: ${Math.round(used[key] / 1024 / 1024 * 100) / 100} MB`);
    }
    
    if (process.env.NODE_ENV === 'development') {
        console.log('Memória:', messages.join(', '));
    }
}, 60000); // A cada minuto

module.exports = app;
