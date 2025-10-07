const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log de todas as requisições
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Servir arquivos estáticos da pasta public
app.use(express.static(path.join(__dirname, 'public'), {
    extensions: ['html', 'htm']
}));

// Servir config
app.use('/config', express.static(path.join(__dirname, 'config')));

// Servir src
app.use('/src', express.static(path.join(__dirname, 'src')));

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// API config para o frontend
app.get('/api/config', (req, res) => {
    res.json({
        supabaseUrl: process.env.SUPABASE_URL || 'https://app-phm-psj-db-phm2-supabase.xqzrhl.easypanel.host',
        supabaseAnonKey: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE'
    });
});

// Status
app.get('/api/status', (req, res) => {
    res.json({
        app: 'Wedding Scheduler',
        status: 'running',
        version: '1.0.0'
    });
});

// Rota de teste
app.get('/test', (req, res) => {
    res.send('<h1>Servidor funcionando!</h1><p>Se você vê isso, o servidor está OK.</p>');
});

// Página de configurações
app.get('/config', (req, res) => {
    const configPath = path.join(__dirname, 'public', 'config.html');
    console.log('Servindo config de:', configPath);
    res.sendFile(configPath);
});

// SPA - Retornar index.html para todas as outras rotas
app.get('*', (req, res) => {
    const indexPath = path.join(__dirname, 'public', 'index.html');
    console.log('Servindo index de:', indexPath);
    res.sendFile(indexPath);
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Erro:', err);
    res.status(500).json({ error: err.message });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log('========================================');
    console.log('  Wedding Scheduler');
    console.log('========================================');
    console.log(`  Porta: ${PORT}`);
    console.log(`  Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log(`  Diretório: ${__dirname}`);
    console.log(`  Public: ${path.join(__dirname, 'public')}`);
    console.log('========================================');
    
    // Listar arquivos em public
    const fs = require('fs');
    const publicDir = path.join(__dirname, 'public');
    if (fs.existsSync(publicDir)) {
        console.log('\nArquivos em public/:');
        fs.readdirSync(publicDir).forEach(file => {
            console.log(`  - ${file}`);
        });
    } else {
        console.log('\n⚠️  Diretório public/ não encontrado!');
    }
    console.log('========================================');
});
