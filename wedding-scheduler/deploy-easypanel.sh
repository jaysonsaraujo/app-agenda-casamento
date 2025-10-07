#!/bin/bash

# ========================================
# Deploy Script para EasyPanel
# ========================================

set -e

echo "========================================="
echo "   Deploy para EasyPanel"
echo "========================================="

# 1. Verificar arquivo .env
if [ ! -f .env ]; then
    echo "Criando arquivo .env com valores padrão..."
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

# 2. Criar diretórios necessários
echo "Criando diretórios..."
mkdir -p logs uploads backups

# 3. Dar permissões
echo "Ajustando permissões..."
chmod -R 755 .
chmod 600 .env

# 4. Verificar Dockerfile
if [ ! -f Dockerfile ]; then
    echo "ERRO: Dockerfile não encontrado!"
    exit 1
fi

# 5. Informações para o EasyPanel
echo ""
echo "========================================="
echo "✅ Preparação concluída!"
echo "========================================="
echo ""
echo "Agora no EasyPanel:"
echo ""
echo "1. Vá para seu projeto no EasyPanel"
echo "2. Clique em 'Create Service'"
echo "3. Escolha 'Git' ou 'Docker Compose'"
echo "4. Se Git:"
echo "   - Cole a URL do seu repositório"
echo "   - Configure o branch (main/master)"
echo ""
echo "5. Configure as variáveis de ambiente:"
echo "   SUPABASE_URL = ${SUPABASE_URL}"
echo "   SUPABASE_ANON_KEY = ${SUPABASE_ANON_KEY}"
echo ""
echo "6. Configure o domínio:"
echo "   - Adicione seu domínio personalizado"
echo "   - Ative HTTPS"
echo ""
echo "7. Deploy!"
echo "========================================="

# Verificar se as variáveis estão configuradas
source .env
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
    echo ""
    echo "⚠️  ATENÇÃO: Configure as variáveis SUPABASE no arquivo .env"
fi

echo ""
echo "Arquivo docker-compose.yml está pronto para o EasyPanel!"
echo ""

exit 0
