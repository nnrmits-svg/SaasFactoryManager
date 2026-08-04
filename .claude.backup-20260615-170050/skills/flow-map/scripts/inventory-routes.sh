#!/bin/bash
# inventory-routes.sh
# Lista las rutas de un proyecto Next.js leyendo src/app/**/page.tsx (App Router).
# Output: una ruta por línea, lista para pegar en el WORKFLOW.md screen flow.
#
# Uso:
#   ./inventory-routes.sh [project_root]
#
# Si no se pasa argumento, asume cwd.

set -euo pipefail

ROOT="${1:-.}"
APP_DIR="${ROOT}/src/app"

if [[ ! -d "$APP_DIR" ]]; then
    echo "ERROR: no existe ${APP_DIR}. ¿Es un proyecto Next.js App Router?" >&2
    exit 1
fi

echo "# Rutas detectadas en ${APP_DIR}"
echo ""

find "$APP_DIR" \( -name "page.tsx" -o -name "page.jsx" -o -name "page.ts" -o -name "page.js" \) 2>/dev/null \
    | sed "s|${APP_DIR}||" \
    | sed -E 's|/page\.[jt]sx?$||' \
    | sed 's|^$|/|' \
    | sed -E 's|\([^)]*\)/||g' \
    | sort -u \
    | while read -r route; do
        # Marcar rutas dinámicas
        if [[ "$route" == *"["* ]]; then
            echo "${route}    (ruta dinámica)"
        else
            echo "${route}"
        fi
    done

echo ""
echo "# API routes (si existen)"
if [[ -d "$APP_DIR/api" ]]; then
    find "$APP_DIR/api" \( -name "route.ts" -o -name "route.js" \) 2>/dev/null \
        | sed "s|${APP_DIR}||" \
        | sed -E 's|/route\.[jt]s$||' \
        | sort -u
fi
