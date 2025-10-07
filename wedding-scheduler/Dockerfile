FROM node:18-alpine

# Instalar dependências do sistema
RUN apk add --no-cache curl tzdata

# Definir timezone
ENV TZ=America/Sao_Paulo

# Criar diretório da aplicação
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm install --production || npm install --production --legacy-peer-deps

# Copiar código da aplicação
COPY . .

# Criar diretórios necessários
RUN mkdir -p /app/logs /app/uploads /app/backups

# Expor porta
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Comando para iniciar a aplicação
CMD ["node", "server.js"]
