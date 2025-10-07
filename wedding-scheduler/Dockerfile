FROM node:18-alpine

# Instalar curl para healthcheck
RUN apk add --no-cache curl

# Diretório de trabalho
WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependências
RUN npm install --production || npm install --legacy-peer-deps

# Copiar código
COPY . .

# Criar diretórios
RUN mkdir -p public config src sql logs

# Verificar se index.html existe
RUN ls -la public/ || echo "Public directory empty"

# Porta
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s CMD curl -f http://localhost:3000/health || exit 1

# Start
CMD ["node", "server.js"]
