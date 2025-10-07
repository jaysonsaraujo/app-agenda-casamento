#!/bin/bash

echo "========================================="
echo "  Atualizando Credenciais do Supabase"
echo "========================================="

OLD_URL="https://app-phm-psj-db-phm2-supabase.xqzrhl.easypanel.host"
NEW_URL="https://aplicativos-db-phm2-supabase.xqzrhl.easypanel.host"

# Arquivos a serem atualizados
files=(
    "config/supabase.js"
    "public/index.html"
    ".env"
    ".env.example"
    "docker-compose.yml"
    "server.js"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "Atualizando $file..."
        sed -i "s|$OLD_URL|$NEW_URL|g" "$file"
        echo "✅ $file atualizado"
    else
        echo "⚠️  $file não encontrado"
    fi
done

echo ""
echo "========================================="
echo "✅ Atualização concluída!"
echo "========================================="
echo ""
echo "Novas credenciais:"
echo "URL: $NEW_URL"
echo "Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
echo ""
echo "Próximos passos:"
echo "1. Commit as mudanças: git add ."
echo "2. Commit: git commit -m 'Update Supabase credentials'"
echo "3. Push: git push origin main"
echo "========================================="
