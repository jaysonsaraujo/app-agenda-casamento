# Build stage
FROM node:18-alpine AS builder

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências de produção
RUN npm ci --only=production && \
    npm cache clean --force

# Copiar código fonte
COPY . .

# Criar diretórios necessários
RUN mkdir -p /app/public /app/src /app/config /app/sql

# Build dos assets (se necessário)
RUN npm run build 2>/dev/null || true

# Production stage
FROM node:18-alpine

# Instalar dependências do sistema
RUN apk add --no-cache \
    curl \
    tzdata \
    tini

# Definir timezone
ENV TZ=America/Sao_Paulo

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos do builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .

# Criar diretórios com permissões corretas
RUN mkdir -p /app/logs /app/temp && \
    chown -R nodejs:nodejs /app

# Expor porta
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Usar usuário não-root
USER nodejs

# Usar tini para gerenciar processos
ENTRYPOINT ["/sbin/tini", "--"]

# Comando de inicialização
CMD ["node", "server.js"]
