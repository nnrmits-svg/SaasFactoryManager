---
name: setup-workstation
description: "Configurar estacion de trabajo profesional completa: terminal (Zsh + plugins), editor (extensiones + theme), Claude Code (settings + guard hook), y SaaS Factory alias. Idempotente, seguro de correr multiples veces. Activar cuando el usuario dice: configura mi entorno, setup workstation, entorno pro, configura mi terminal, instala extensiones, setup mi maquina, o primera vez usando SaaS Factory."
allowed-tools: Bash, Read, Write, Edit
user-invocable: true
---

# Setup Workstation: Entorno Pro Completo

Configura la estacion de trabajo del desarrollador en un solo comando.
Detecta OS, verifica que esta instalado, instala lo que falta. Idempotente.

**Filosofia**: Configura UNA VEZ, construye PARA SIEMPRE.

---

## Deteccion de Sistema

Antes de hacer NADA, detecta el OS:

```bash
OS="unknown"
if [[ "$OSTYPE" == "darwin"* ]]; then
  OS="macos"
  PKG="brew"
elif grep -qi microsoft /proc/version 2>/dev/null; then
  OS="wsl2"
  PKG="apt"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  OS="linux"
  PKG="apt"
fi
echo "OS detectado: $OS | Package manager: $PKG"
```

Si es WSL2, advertir:
> Tus proyectos SIEMPRE en ~/ (filesystem Linux), NUNCA en /mnt/c/ (rompe hot reload).

---

## Paso 1: Estructura de Carpetas

Crea los directorios base si no existen:

```bash
mkdir -p ~/Developer/software/templates
mkdir -p ~/Developer/playground
```

Verifica: `ls ~/Developer/`

---

## Paso 2: Package Manager

- **macOS**: Verifica que Homebrew existe. Si no: instalar.
  ```bash
  command -v brew &>/dev/null || /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  ```

- **Linux/WSL2**:
  ```bash
  sudo apt update && sudo apt install -y build-essential curl git zsh
  ```

---

## Paso 3: Oh My Zsh

Verifica primero: `test -d ~/.oh-my-zsh`

Si NO existe:
```bash
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended
```

Verifica: `echo $ZSH`

---

## Paso 4: Powerlevel10k

Verifica: `test -d ${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}/themes/powerlevel10k`

Si NO existe:
```bash
git clone --depth=1 https://github.com/romkatv/powerlevel10k.git ${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}/themes/powerlevel10k
```

En `~/.zshrc`, asegura que `ZSH_THEME="powerlevel10k/powerlevel10k"`.

Fuente Nerd Font:
- **macOS**: `brew install --cask font-meslo-lg-nerd-font`
- **Linux**: descargar MesloLGS NF desde GitHub de Powerlevel10k

---

## Paso 5: Plugins de Zsh

Verificar e instalar cada uno solo si no existe:

**a) zsh-autosuggestions:**
```bash
PLUGIN_DIR="${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-autosuggestions"
test -d "$PLUGIN_DIR" || git clone https://github.com/zsh-users/zsh-autosuggestions "$PLUGIN_DIR"
```

**b) zsh-syntax-highlighting:**
```bash
PLUGIN_DIR="${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-syntax-highlighting"
test -d "$PLUGIN_DIR" || git clone https://github.com/zsh-users/zsh-syntax-highlighting.git "$PLUGIN_DIR"
```

**c) fzf-tab:**
```bash
PLUGIN_DIR="${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/fzf-tab"
test -d "$PLUGIN_DIR" || git clone https://github.com/Aloxaf/fzf-tab "$PLUGIN_DIR"
```

En `~/.zshrc`, asegura la linea:
```
plugins=(git zsh-autosuggestions zsh-syntax-highlighting fzf-tab)
```

**IMPORTANTE**: Busca la linea `plugins=(...` existente y REEMPLAZALA. No dupliques.

---

## Paso 6: Herramientas CLI Modernas

Verificar cada herramienta con `command -v` antes de instalar:

**macOS:**
```bash
for tool in eza bat fd zoxide fzf jq; do
  command -v $tool &>/dev/null || brew install $tool
done
```

**Linux/WSL2:**
```bash
sudo apt install -y fzf jq
command -v zoxide &>/dev/null || curl -sSfL https://raw.githubusercontent.com/ajeetdsouza/zoxide/main/install.sh | sh
# eza, bat, fd: instalar desde GitHub releases o con cargo
```

Agrega al final de `~/.zshrc` (si no esta ya):
```bash
eval "$(zoxide init zsh)"
[ -f ~/.fzf.zsh ] && source ~/.fzf.zsh
export FZF_DEFAULT_COMMAND='fd --type f --strip-cwd-prefix'
export FZF_CTRL_T_COMMAND="$FZF_DEFAULT_COMMAND"
```

**IMPORTANTE**: Usa `grep` para verificar que cada linea NO exista antes de agregarla. No dupliques.

---

## Paso 7: Aliases

Agrega al final de `~/.zshrc` (verificar que no existan antes):

```bash
# === Modern CLI ===
alias ls='eza --icons'
alias ll='eza -la --icons --git'
alias tree='eza --tree --icons'
alias cat='bat --paging=never'

# === Development ===
alias dev='npm run dev'
alias cc='claude'
alias proyectos='cd ~/Developer/software'
alias kill-ports='for port in {3000..3006} {8000..8006}; do lsof -ti :$port | xargs kill -9 2>/dev/null; done && echo "Puertos limpiados"'
alias fresh='pkill -f "next" 2>/dev/null; for p in {3000..3006}; do lsof -t -i:$p 2>/dev/null | xargs kill -9 2>/dev/null; done; rm -rf .next node_modules/.cache tsconfig.tsbuildinfo && echo "Cache cleaned"'

# === SaaS Factory ===
SF_TEMPLATE="$HOME/Developer/software/templates/saas-factory-setup"
alias saas-factory='git -C "$SF_TEMPLATE" pull --quiet origin main 2>/dev/null; cp -r "$SF_TEMPLATE/saas-factory/." .'
```

**IMPORTANTE**: Busca si ya existe un bloque `# === Modern CLI ===` o `# === Development ===` o `# === SaaS Factory ===`. Si existe, REEMPLAZALO completo. Si no existe, agrega al final.

---

## Paso 8: Extensiones del Editor

Detecta que editor tiene el usuario:

```bash
EDITOR_CMD=""
if command -v antigravity &>/dev/null; then EDITOR_CMD="antigravity"
elif command -v cursor &>/dev/null; then EDITOR_CMD="cursor"
elif command -v code &>/dev/null; then EDITOR_CMD="code"
fi
```

Si no encuentra ninguno, informar al usuario y saltar este paso.

Instalar extensiones (verificar antes con `--list-extensions`):

```bash
INSTALLED=$($EDITOR_CMD --list-extensions 2>/dev/null)

EXTENSIONS=(
  # Imprescindibles
  "PKief.material-icon-theme"
  "zhuangtongfa.Material-theme"
  "usernamehw.errorlens"
  "yoavbls.pretty-ts-errors"
  "bradlc.vscode-tailwindcss"
  "dbaeumer.vscode-eslint"
  "esbenp.prettier-vscode"
  "formulahendry.auto-rename-tag"
  "dsznajder.es7-react-js-snippets"
  # Recomendadas
  "eamodio.gitlens"
  "WallabyJs.console-ninja"
  "wix.vscode-import-cost"
)

for ext in "${EXTENSIONS[@]}"; do
  if ! echo "$INSTALLED" | grep -qi "$ext"; then
    $EDITOR_CMD --install-extension "$ext" 2>/dev/null
  fi
done
```

---

## Paso 9: Settings del Editor

Detecta la ruta del settings.json segun OS + editor:

| OS | Editor | Ruta |
|----|--------|------|
| macOS | Antigravity | `~/Library/Application Support/Antigravity/User/settings.json` |
| macOS | Cursor | `~/Library/Application Support/Cursor/User/settings.json` |
| macOS | VS Code | `~/Library/Application Support/Code/User/settings.json` |
| Linux | Todos | `~/.config/{Antigravity,Cursor,Code}/User/settings.json` |

**IMPORTANTE**: Si el archivo ya existe, hacer MERGE con `jq`. No borrar settings existentes del usuario.

Settings a garantizar:

```json
{
  "editor.fontSize": 16,
  "editor.fontFamily": "'MesloLGS NF', 'Fira Code', 'JetBrains Mono', monospace",
  "editor.fontLigatures": true,
  "editor.lineHeight": 1.8,
  "editor.minimap.enabled": false,
  "editor.stickyScroll.enabled": true,
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.bracketPairColorization.enabled": true,
  "editor.guides.bracketPairs": "active",
  "editor.wordWrap": "on",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "files.autoSave": "onFocusChange",
  "explorer.compactFolders": false,
  "explorer.confirmDelete": false,
  "explorer.confirmDragAndDrop": false,
  "terminal.integrated.fontSize": 14,
  "terminal.integrated.fontFamily": "'MesloLGS NF', 'Fira Code', monospace",
  "tailwindCSS.emmetCompletions": true,
  "editor.quickSuggestions": { "strings": "on" },
  "typescript.preferences.importModuleSpecifier": "non-relative",
  "typescript.updateImportsOnFileMove.enabled": "always",
  "git.autofetch": true,
  "workbench.colorTheme": "One Dark Pro",
  "workbench.iconTheme": "material-icon-theme"
}
```

---

## Paso 10: Claude Code Config

### a) Settings (~/.claude/settings.json)

Lee el archivo si existe, mergea estos campos:

```json
{
  "permissions": {
    "deny": [
      "Bash(command:*id_rsa*)",
      "Bash(command:*id_ed25519*)",
      "Bash(command:*aws credentials*)",
      "Bash(command:*~/.claude/settings*)",
      "Edit(file_path:*~/.claude/settings*)"
    ]
  }
}
```

**IMPORTANTE**: No sobreescribir permissions existentes del usuario. MERGE deny rules.

### b) Guard Hook (~/.claude/hooks/guard-destructive.sh)

Verifica si existe. Si no, crear:

```bash
mkdir -p ~/.claude/hooks

cat > ~/.claude/hooks/guard-destructive.sh << 'HOOK'
#!/bin/bash
INPUT=$(cat)
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty')
CMD=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if [[ "$TOOL" == "Bash" ]]; then
  if echo "$CMD" | grep -qE 'rm\s+-rf\s+(/|~|\$HOME|/Users)'; then
    echo "BLOCKED: destructive rm -rf detected"; exit 2
  fi
  if echo "$CMD" | grep -qE 'git\s+push\s+.*--force.*\s+(main|master)'; then
    echo "BLOCKED: force push to main/master"; exit 2
  fi
fi
exit 0
HOOK

chmod +x ~/.claude/hooks/guard-destructive.sh
```

---

## Paso 11: SaaS Factory Template

Verifica si el template esta clonado:

```bash
SF_DIR="$HOME/Developer/software/templates/saas-factory-setup"
if [ ! -d "$SF_DIR" ]; then
  git clone https://github.com/saas-factory-community/saas-factory-setup.git "$SF_DIR"
else
  git -C "$SF_DIR" pull --quiet origin main 2>/dev/null
fi
```

---

## Paso 12: Resumen Final

Al terminar, muestra un reporte claro:

```
=== ENTORNO PRO CONFIGURADO ===

Terminal:
  [OK/SKIP] Oh My Zsh
  [OK/SKIP] Powerlevel10k
  [OK/SKIP] Plugins (autosuggestions, syntax-highlighting, fzf-tab)
  [OK/SKIP] CLI moderno (eza, bat, fd, zoxide, fzf)
  [OK/SKIP] Aliases (dev, cc, kill-ports, fresh, saas-factory)

Editor ([nombre]):
  [OK/SKIP] 12 extensiones
  [OK/SKIP] Settings optimizados

Claude Code:
  [OK/SKIP] Settings con deny rules
  [OK/SKIP] Guard hook anti-destructivo

SaaS Factory:
  [OK/SKIP] Template clonado/actualizado
  [OK/SKIP] Alias saas-factory configurado

Para crear tu primer proyecto:
  mkdir mi-app && cd mi-app && saas-factory && npm install
  claude .
  /new-app

IMPORTANTE: Cierra y abre tu terminal para que los cambios de .zshrc surtan efecto.
```

---

## Reglas Criticas

1. **IDEMPOTENTE**: Verificar ANTES de instalar. Si ya existe, SKIP.
2. **NO DESTRUCTIVO**: Nunca borrar configs existentes. Siempre MERGE.
3. **PASO A PASO**: Ejecutar cada paso, verificar, reportar, siguiente.
4. **PREGUNTAR SI FALLA**: Si algo falla, reportar al usuario y preguntar como proceder. No asumir.
5. **NO TOCAR CODIGO**: Este skill configura la ESTACION, no el proyecto.
