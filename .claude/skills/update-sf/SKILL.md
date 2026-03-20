---
name: update-sf
description: "Actualizar SaaS Factory a la ultima version. Activar cuando el usuario dice: actualiza el template, hay nueva version, update SaaS Factory, quiero la ultima version, o cuando se detecta que el template esta desactualizado."
allowed-tools: Read, Bash
---

# Update SaaS Factory

Este skill actualiza las herramientas de desarrollo (carpeta `.claude/`) a la ultima version disponible.
**Preserva los skills custom del proyecto** (carpeta `.claude/skills-custom/`).

## Proceso

### Paso 1: Buscar el alias saas-factory

Busca el alias `saas-factory` en los archivos de configuracion del shell del usuario:

```bash
# Buscar en zshrc
grep "alias saas-factory" ~/.zshrc

# Si no esta, buscar en bashrc
grep "alias saas-factory" ~/.bashrc
```

El alias tiene este formato:
```bash
alias saas-factory="cp -r /ruta/al/repo/saas-factory/. ."
```

**Extrae la ruta del repo** del alias (la parte entre `cp -r ` y `/saas-factory/.`).

Si no encuentras el alias, pregunta al usuario:
> No encontre el alias `saas-factory`. Por favor, indica la ruta donde tienes el repositorio de SaaS Factory.

### Paso 2: Actualizar el repositorio fuente

Una vez tengas la ruta del repo, actualiza con git:

```bash
cd [RUTA_REPO_SF]
git pull origin main
```

Si hay errores de git (cambios locales, etc.), informa al usuario y sugiere solucion.

### Paso 3: Preservar skills-custom y memory

**ANTES** de reemplazar, respalda lo que NO debe perderse:

```bash
# En el directorio del proyecto actual
BACKUP_DIR=$(mktemp -d)

# Preservar skills-custom (skills especificos del proyecto)
if [ -d .claude/skills-custom ]; then
  cp -r .claude/skills-custom "$BACKUP_DIR/skills-custom"
fi

# Preservar memory (memoria persistente del proyecto)
if [ -d .claude/memory ]; then
  cp -r .claude/memory "$BACKUP_DIR/memory"
fi

# Preservar PRPs del proyecto (tienen historial de features)
if [ -d .claude/PRPs ]; then
  cp -r .claude/PRPs "$BACKUP_DIR/PRPs"
fi
```

### Paso 4: Reemplazar .claude/

Elimina la carpeta `.claude/` actual y copia la nueva:

```bash
rm -rf .claude/
cp -r [RUTA_REPO_SF]/saas-factory/.claude/ .claude/
```

### Paso 5: Restaurar lo preservado

```bash
# Restaurar skills-custom
if [ -d "$BACKUP_DIR/skills-custom" ]; then
  cp -r "$BACKUP_DIR/skills-custom" .claude/skills-custom
fi

# Restaurar memory
if [ -d "$BACKUP_DIR/memory" ]; then
  cp -r "$BACKUP_DIR/memory" .claude/memory
fi

# Restaurar PRPs (merge: mantener PRPs del proyecto, agregar nuevos templates)
if [ -d "$BACKUP_DIR/PRPs" ]; then
  cp -rn "$BACKUP_DIR/PRPs/"* .claude/PRPs/ 2>/dev/null
fi

# Limpiar backup
rm -rf "$BACKUP_DIR"
```

### Paso 6: Confirmar actualizacion

Informa al usuario:

```
SaaS Factory actualizado correctamente.

Actualizado:
  - .claude/skills/ (skills de la fabrica actualizados)
  - .claude/design-systems/ (sistemas de diseno actualizados)

Preservado:
  - .claude/skills-custom/ (tus skills del proyecto)
  - .claude/memory/ (memoria persistente del proyecto)
  - .claude/PRPs/ (tus PRPs existentes + nuevos templates)

NO modificado:
  - CLAUDE.md (tu configuracion de proyecto)
  - .mcp.json (tus tokens y credenciales)
  - src/ (tu codigo)
```

## Estructura de Skills (2 carpetas)

```
.claude/
├── skills/            # Del template (se actualiza con /update-sf)
│   ├── new-app/
│   ├── add-login/
│   ├── add-payments/
│   └── ...
│
├── skills-custom/     # Del proyecto (NUNCA se toca en update)
│   ├── add-admin/
│   ├── add-alerts/
│   └── ...
│
└── memory/            # Memoria persistente (NUNCA se toca en update)
```

## Notas

- Este skill NO modifica `CLAUDE.md`, `.mcp.json` ni el codigo fuente
- `skills-custom/` NUNCA se toca - son skills especificos de este proyecto
- `memory/` NUNCA se toca - es la memoria persistente del proyecto
- PRPs del proyecto se preservan, templates nuevos se agregan
- Si necesitas actualizar `CLAUDE.md` manualmente, revisa el template en el repo SF
