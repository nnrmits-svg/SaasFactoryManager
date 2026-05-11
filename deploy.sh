#!/bin/bash
# deploy.sh — Deploy a Vercel via push a main.
#
# Flujo:
#   1. git status — chequear cambios
#   2. git pull --rebase — incorporar lo que el Agent o otra maquina haya pusheado
#   3. git add . + commit con mensaje del usuario (o default)
#   4. git push origin main → Vercel detecta y deploya
#
# Mejora sobre deployAg.sh: hace pull --rebase ANTES del push para evitar
# rechazos por non-fast-forward cuando el SF Agent pushea wip commits desde
# otras maquinas en paralelo.

set -euo pipefail

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

echo -e "${BLUE}🔍 Repositorio: ${NC}$(pwd)"
echo -e "${BLUE}🔍 Estado actual:${NC}"
git status --short

# Si no hay cambios locales, intentar solo sincronizar con remoto
if [ -z "$(git status --porcelain)" ]; then
    echo -e "${GREEN}✅ No hay cambios pendientes localmente.${NC}"
    echo -e "${BLUE}🔄 Verificando sincronizacion con remoto...${NC}"
    git fetch origin main --quiet
    LOCAL=$(git rev-parse HEAD)
    REMOTE=$(git rev-parse origin/main)
    if [ "$LOCAL" = "$REMOTE" ]; then
        echo -e "${GREEN}🟢 Local y remoto en sincronía. No hay nada que deployar.${NC}"
        exit 0
    else
        echo -e "${YELLOW}⚠️  Local difiere de remoto. Pulleando...${NC}"
        git pull --rebase origin main
    fi
    exit 0
fi

# Hay cambios — pedir mensaje
echo -e "\n${YELLOW}⚠️ Se detectaron cambios pendientes.${NC}"
echo -n "📝 Mensaje del commit (Enter para default): "
read -r commit_message

if [ -z "$commit_message" ]; then
    commit_message="update: sincronizacion automatica $(date +'%Y-%m-%d %H:%M')"
fi

echo -e "\n${BLUE}🚀 Iniciando deploy a Vercel via GitHub...${NC}"

# Paso 1: agregar y commitear
git add .
if ! git commit -m "$commit_message"; then
    echo -e "${RED}❌ Commit fallo (probablemente hooks). Revisa el output arriba.${NC}"
    exit 1
fi

# Paso 2: pull --rebase ANTES del push — evita non-fast-forward
echo -e "${BLUE}🔄 Sincronizando con remoto (pull --rebase)...${NC}"
if ! git pull --rebase origin main; then
    echo -e "${RED}❌ Rebase tiene conflictos.${NC}"
    echo -e "${YELLOW}   Resolvelos manualmente (git status muestra cuales),${NC}"
    echo -e "${YELLOW}   despues corre: git rebase --continue && git push origin main${NC}"
    exit 1
fi

# Paso 3: push
echo -e "${BLUE}📤 Pusheando a origin main...${NC}"
if git push origin main; then
    echo -e "\n${GREEN}🎉 ¡Exito! Cambios en GitHub.${NC}"
    echo -e "${GREEN}📦 Vercel detectara el cambio y deployara en ~1-2 min.${NC}"
    echo -e "${BLUE}🔗 Dashboard Vercel: https://vercel.com/dashboard${NC}"
else
    echo -e "\n${RED}❌ Error al pushear. Revisa permisos del repo y conexion.${NC}"
    exit 1
fi
