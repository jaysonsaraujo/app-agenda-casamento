#!/bin/bash

# ========================================
# Script de Backup - Sistema de Casamentos
# ========================================

set -e

# Configurações
BACKUP_DIR="./backups"
DB_CONTAINER="wedding-app"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_${TIMESTAMP}.sql"
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Carregar variáveis de ambiente
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Funções
log_info() {
    echo -e "${GREEN}[BACKUP]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[BACKUP]${NC} $1"
}

# Criar diretório de backup se não existir
mkdir -p $BACKUP_DIR

# Header
echo "========================================="
echo "   Backup do Sistema de Casamentos"
echo "========================================="
echo "Timestamp: $TIMESTAMP"
echo "========================================="

# Verificar se é backup local ou remoto
if [ -n "$SUPABASE_URL" ]; then
    log_info "Iniciando backup do Supabase..."
    
    # Extrair informações de conexão do Supabase URL
    # Formato: https://[PROJECT_REF].supabase.co
    PROJECT_REF=$(echo $SUPABASE_URL | sed -n 's/https:\/\/KATEX_INLINE_OPEN[^.]*KATEX_INLINE_CLOSE.*/\1/p')
    
    # Backup via API do Supabase (se disponível)
    if command -v supabase >/dev/null 2>&1; then
        log_info "Usando Supabase CLI..."
        supabase db dump \
            --project-ref $PROJECT_REF \
            -f $BACKUP_DIR/$BACKUP_FILE
    else
        log_warn "Supabase CLI não encontrado. Tentando backup via pg_dump..."
        
        # Tentar backup direto se tiver as credenciais
        if [ -n "$DB_HOST" ] && [ -n "$DB_PASSWORD" ]; then
            PGPASSWORD=$DB_PASSWORD pg_dump \
                -h $DB_HOST \
                -p ${DB_PORT:-5432} \
                -U ${DB_USER:-postgres} \
                -d ${DB_NAME:-postgres} \
                --no-owner \
                --no-privileges \
                --clean \
                --if-exists \
                > $BACKUP_DIR/$BACKUP_FILE
        else
            log_warn "Credenciais diretas do banco não disponíveis"
        fi
    fi
else
    log_info "Fazendo backup do container Docker..."
    
    # Backup do container Docker
    docker exec $DB_CONTAINER pg_dump \
        -U postgres \
        --no-owner \
        --no-privileges \
        --clean \
        --if-exists \
        postgres > $BACKUP_DIR/$BACKUP_FILE
fi

# Comprimir backup
if [ -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
    log_info "Comprimindo backup..."
    gzip $BACKUP_DIR/$BACKUP_FILE
    BACKUP_FILE="${BACKUP_FILE}.gz"
    
    # Calcular tamanho
    SIZE=$(du -h $BACKUP_DIR/$BACKUP_FILE | cut -f1)
    log_info "Backup criado: $BACKUP_FILE ($SIZE)"
else
    log_warn "Arquivo de backup não foi criado"
    exit 1
fi

# Backup de arquivos enviados (se existir)
if [ -d "./uploads" ]; then
    log_info "Fazendo backup dos arquivos enviados..."
    tar -czf "$BACKUP_DIR/uploads_${TIMESTAMP}.tar.gz" ./uploads
fi

# Limpar backups antigos
log_info "Limpando backups antigos (mais de $RETENTION_DAYS dias)..."
find $BACKUP_DIR -name "backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "uploads_*.tar.gz" -type f -mtime +$RETENTION_DAYS -delete

# Listar backups disponíveis
log_info "Backups disponíveis:"
ls -lh $BACKUP_DIR/*.gz | tail -5

# Upload para cloud (opcional)
if [ -n "$BACKUP_CLOUD_ENABLED" ] && [ "$BACKUP_CLOUD_ENABLED" = "true" ]; then
    log_info "Enviando backup para a nuvem..."
    
    # AWS S3
    if [ -n "$AWS_S3_BUCKET" ]; then
        aws s3 cp $BACKUP_DIR/$BACKUP_FILE s3://$AWS_S3_BUCKET/backups/
    fi
    
    # Google Cloud Storage
    if [ -n "$GCS_BUCKET" ]; then
        gsutil cp $BACKUP_DIR/$BACKUP_FILE gs://$GCS_BUCKET/backups/
    fi
    
    # Dropbox
    if [ -n "$DROPBOX_TOKEN" ]; then
        curl -X POST https://content.dropboxapi.com/2/files/upload \
            --header "Authorization: Bearer $DROPBOX_TOKEN" \
            --header "Dropbox-API-Arg: {\"path\": \"/backups/$BACKUP_FILE\"}" \
            --header "Content-Type: application/octet-stream" \
            --data-binary @$BACKUP_DIR/$BACKUP_FILE
    fi
fi

# Verificar integridade do backup
log_info "Verificando integridade do backup..."
gunzip -t $BACKUP_DIR/$BACKUP_FILE
if [ $? -eq 0 ]; then
    log_info "Backup verificado com sucesso!"
else
    log_warn "Backup pode estar corrompido!"
    exit 1
fi

# Notificação (opcional)
if [ -n "$BACKUP_NOTIFY" ] && [ "$BACKUP_NOTIFY" = "true" ]; then
    # Email
    if [ -n "$NOTIFY_EMAIL" ]; then
        echo "Backup realizado com sucesso: $BACKUP_FILE" | \
            mail -s "Backup Sistema de Casamentos - $TIMESTAMP" $NOTIFY_EMAIL
    fi
    
    # Slack
    if [ -n "$SLACK_WEBHOOK" ]; then
        curl -X POST $SLACK_WEBHOOK \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"✅ Backup realizado: $BACKUP_FILE ($SIZE)\"}"
    fi
fi

echo "========================================="
echo -e "${GREEN}Backup concluído com sucesso!${NC}"
echo "Arquivo: $BACKUP_DIR/$BACKUP_FILE"
echo "========================================="

exit 0
