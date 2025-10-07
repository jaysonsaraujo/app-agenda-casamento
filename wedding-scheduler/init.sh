#!/bin/bash

# ========================================
# Script de Inicialização do Projeto
# ========================================

set -e

echo "========================================="
echo "   Inicializando Wedding Scheduler"
echo "========================================="

# Criar package-lock.json se não existir
if [ ! -f package-lock.json ]; then
    echo "Gerando package-lock.json..."
    npm install
    echo "package-lock.json criado!"
fi

# Criar diretórios necessários
echo "Criando diretórios..."
mkdir -p public src config sql scripts logs uploads backups

# Criar arquivo .env se não existir
if [ ! -f .env ]; then
    echo "Criando arquivo .env..."
    cat > .env << 'EOF'
# Configurações do Supabase
SUPABASE_URL=https://app-phm-psj-db-phm2-supabase.xqzrhl.easypanel.host
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE

# Configurações da Aplicação
NODE_ENV=production
PORT=3000
APP_NAME=Sistema de Agendamento de Casamentos
TZ=America/Sao_Paulo
EOF
    echo "Arquivo .env criado!"
fi

# Verificar se server.js existe
if [ ! -f server.js ]; then
    echo "ERRO: server.js não encontrado!"
    echo "Certifique-se de que todos os arquivos foram copiados corretamente."
    exit 1
fi

echo ""
echo "========================================="
echo "✅ Inicialização concluída!"
echo "========================================="
echo ""
echo "Próximos passos:"
echo "1. Execute: npm install (se ainda não executou)"
echo "2. Para desenvolvimento: npm run dev"
echo "3. Para produção: npm start"
echo "4. Para Docker: docker-compose up -d"
echo ""
