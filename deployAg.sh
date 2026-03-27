#!/bin/bash

# Colores para la terminal
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Obtener la ruta del directorio del script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

echo -e "${BLUE}🔍 Ubicación actual: ${NC}$(pwd)"
echo -e "${BLUE}🔍 Consultando estado del repositorio...${NC}"
git status --short

# Verificar si hay cambios (incluyendo archivos nuevos)
if [ -z "$(git status --porcelain)" ]; then
    echo -e "${GREEN}✅ No hay cambios pendientes. Tu código local está sincronizado.${NC}"
    exit 0
fi

echo -e "\n${YELLOW}⚠️ Se detectaron cambios pendientes.${NC}"
echo -n "📝 Ingresa el mensaje para el commit (o presiona Enter para usar uno por defecto): "
read commit_message

if [ -z "$commit_message" ]; then
    commit_message="update: sincronización automática $(date +'%Y-%m-%d %H:%M')"
fi

echo -e "\n${BLUE}🚀 Iniciando actualización en GitHub y Vercel...${NC}"

# Paso 1: Agregar cambios
git add .

# Paso 2: Commit
git commit -m "$commit_message"

# Paso 3: Push (usa la rama actual)
BRANCH=$(git branch --show-current)
if git push origin "$BRANCH"; then
    echo -e "\n${GREEN}🎉 ¡Éxito! Los cambios están en GitHub (rama: ${BRANCH}).${NC}"
    echo -e "${GREEN}📦 Vercel detectará el cambio y comenzará el deploy automáticamente en unos segundos.${NC}"
else
    echo -e "\n${YELLOW}❌ Error al subir los cambios. Revisa tu conexión o configuración de Git.${NC}"
fi
