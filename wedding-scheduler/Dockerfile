# Build stage
FROM node:18-alpine AS builder

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar todas as dependências primeiro para gerar package-lock.json se necessário
RUN npm install --production && \
    npm cache clean --force

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

# Copiar node_modules do builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copiar código da aplicação
COPY --chown=nodejs:nodejs package*.json ./
COPY --chown=nodejs:nodejs public ./public
COPY --chown=nodejs:nodejs src ./src
COPY --chown=nodejs:nodejs config ./config
COPY --chown=nodejs:nodejs sql ./sql
COPY --chown=nodejs:nodejs server.js ./
COPY --chown=nodejs:nodejs .env* ./

# Criar diretórios necessários
RUN mkdir -p /app/logs /app/uploads /app/backups /app/temp && \
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
