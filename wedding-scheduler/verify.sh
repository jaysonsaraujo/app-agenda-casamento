#!/bin/bash

echo "========================================="
echo "  Verificação do Sistema"
echo "========================================="

# Verificar arquivos essenciais
echo "Verificando arquivos..."

files=("Dockerfile" "docker-compose.yml" "package.json" "server.js" "public/index.html")

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file existe"
    else
        echo "❌ $file NÃO ENCONTRADO"
    fi
done

echo ""
echo "Conteúdo do diretório public/:"
ls -la public/ 2>/dev/null || echo "Diretório public/ não existe"

echo ""
echo "========================================="
