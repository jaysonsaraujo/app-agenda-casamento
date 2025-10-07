#!/bin/bash

echo "Criando estrutura mínima do projeto..."

# Criar diretórios
mkdir -p public src config sql

# Criar Dockerfile
cat > Dockerfile << 'EOF'
FROM node:18-alpine

RUN apk add --no-cache curl tzdata
ENV TZ=America/Sao_Paulo
WORKDIR /app
COPY package*.json ./
RUN npm install --production || npm install --production --legacy-peer-deps
COPY . .
RUN mkdir -p /app/logs /app/uploads /app/backups
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD curl -f http://localhost:3000/health || exit 1
CMD ["node", "server.js"]
EOF

# Criar package.json
cat > package.json << 'EOF'
{
  "name": "wedding-scheduler",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "@supabase/supabase-js": "^2.39.0",
    "dotenv": "^16.3.1"
  }
}
EOF

# Criar server.js
cat > server.js << 'EOF'
const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.get('/api/config', (req, res) => {
    res.json({
        supabaseUrl: process.env.SUPABASE_URL || 'https://app-phm-psj-db-phm2-supabase.xqzrhl.easypanel.host',
        supabaseAnonKey: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE'
    });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
EOF

# Criar index.html mínimo
cat > public/index.html << 'EOF'
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sistema de Agendamento de Casamentos</title>
</head>
<body>
    <h1>Sistema de Agendamento de Casamentos</h1>
    <p>Sistema funcionando!</p>
</body>
</html>
EOF

# Criar docker-compose.yml
cat > docker-compose.yml << 'EOF'
services:
  web:
    build: .
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 3000
      SUPABASE_URL: https://app-phm-psj-db-phm2-supabase.xqzrhl.easypanel.host
      SUPABASE_ANON_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE
    expose:
      - "3000"
EOF

echo "✅ Estrutura mínima criada!"
echo ""
echo "Próximos passos:"
echo "1. Faça commit e push dos arquivos"
echo "2. Deploy no EasyPanel"
