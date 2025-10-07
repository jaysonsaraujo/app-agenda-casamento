
## 18. Scripts de Deploy - `/wedding-scheduler/scripts/deploy.sh`

```bash
#!/bin/bash

# ========================================
# Script de Deploy - Sistema de Casamentos
# ========================================

set -e  # Parar em caso de erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configurações
APP_NAME="wedding-scheduler"
ENVIRONMENT=${1:-production}
BRANCH=${2:-main}

# Funções auxiliares
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Header
echo "========================================="
echo "   Deploy do Sistema de Casamentos"
echo "========================================="
echo "Ambiente: $ENVIRONMENT"
echo "Branch: $BRANCH"
echo "========================================="
echo ""

# Verificar pré-requisitos
log_info "Verificando pré-requisitos..."

command -v docker >/dev/null 2>&1 || { 
    log_error "Docker não instalado. Abortando."
    exit 1
}

command -v docker-compose >/dev/null 2>&1 || { 
    log_error "Docker Compose não instalado. Abortando."
    exit 1
}

command -v git >/dev/null 2>&1 || { 
    log_error "Git não instalado. Abortando."
    exit 1
}

# Verificar arquivo .env
if [ ! -f .env ]; then
    log_warn "Arquivo .env não encontrado. Copiando .env.example..."
    cp .env.example .env
    log_error "Por favor, configure o arquivo .env antes de continuar"
    exit 1
fi

# Pull das últimas mudanças
log_info "Atualizando código do repositório..."
git fetch origin
git checkout $BRANCH
git pull origin $BRANCH

# Backup do banco de dados (se em produção)
if [ "$ENVIRONMENT" = "production" ]; then
    log_info "Criando backup do banco de dados..."
    ./scripts/backup.sh
fi

# Build da aplicação
log_info "Construindo a aplicação..."
npm ci --only=production

# Build dos assets
log_info "Construindo assets..."
npm run build 2>/dev/null || true

# Docker build
log_info "Construindo imagem Docker..."
docker-compose build --no-cache

# Parar containers antigos
log_info "Parando containers antigos..."
docker-compose down

# Limpar recursos não utilizados
log_info "Limpando recursos Docker não utilizados..."
docker system prune -f

# Iniciar novos containers
log_info "Iniciando novos containers..."
if [ "$ENVIRONMENT" = "production" ]; then
    docker-compose up -d
else
    docker-compose up -d
fi

# Aguardar containers iniciarem
log_info "Aguardando containers iniciarem..."
sleep 10

# Verificar saúde da aplicação
log_info "Verificando saúde da aplicação..."
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)

if [ "$HEALTH_CHECK" = "200" ]; then
    log_info "Aplicação iniciada com sucesso!"
else
    log_error "Falha ao iniciar aplicação. Status: $HEALTH_CHECK"
    log_info "Verificando logs..."
    docker-compose logs --tail=50
    exit 1
fi

# Executar migrações (se houver)
if [ -f sql/migrations.sql ]; then
    log_info "Executando migrações do banco de dados..."
    docker exec -i $(docker-compose ps -q wedding-app) psql $DATABASE_URL < sql/migrations.sql
fi

# Limpar cache (se aplicável)
log_info "Limpando cache..."
docker exec $(docker-compose ps -q wedding-app) npm run cache:clear 2>/dev/null || true

# Verificar logs
log_info "Últimas linhas dos logs:"
docker-compose logs --tail=20

# Informações finais
echo ""
echo "========================================="
echo -e "${GREEN}   Deploy concluído com sucesso!${NC}"
echo "========================================="
echo "URL: http://localhost:3000"
echo "Ambiente: $ENVIRONMENT"
echo "Versão: $(git describe --tags --always)"
echo "========================================="

# Notificar (opcional)
if [ "$ENVIRONMENT" = "production" ]; then
    # Enviar notificação de deploy (implementar conforme necessário)
    curl -X POST https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK \
        -H 'Content-Type: application/json' \
        -d "{\"text\":\"Deploy realizado com sucesso em $ENVIRONMENT\"}" 2>/dev/null || true
fi

exit 0
