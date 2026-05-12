---
name: cross-repo-access
description: |
  Configurar permission rules en .claude/settings.json para que el agente pueda leer proyectos hermanos
  del ecosistema (BusinessOS, SaasFactoryManager, SaasFactoryAgent, otros en AplicacionesSaas/) sin
  pedir permiso en cada lectura. Detecta automaticamente los proyectos hermanos en el filesystem,
  propone los paths a autorizar, y escribe el settings.json del proyecto actual.

  Activar cuando el usuario dice: dame acceso a, configura acceso, cross-repo, ver otros proyectos,
  agente no ve, sandbox bloquea, permission denied, leer otro repo, BusinessOS desde aca,
  Manager desde Agent, Agent desde Manager, workspace access, cross-project, monorepo access.

  NO USAR para: dar permisos de escritura (esos van case-by-case), para cambiar settings de Supabase
  o de la app, para skills de SaaS Factory que no son acerca de permisos del agente.
allowed-tools: Read, Write, Edit, Glob, Bash
---

# Cross-Repo Access — Permisos del Agente entre Proyectos del Ecosistema

> Configura `.claude/settings.json` del proyecto actual para que el agente pueda **leer** los proyectos
> hermanos del ecosistema (BusinessOS, SaaS Factory Manager/Agent, otros bajo `AplicacionesSaas/`).
> NO da permisos de escritura — write siempre necesita autorizacion explicita del usuario.

---

## Por que existe este skill

Claude Code corre con un sandbox por proyecto: solo puede leer/escribir dentro del directorio donde
arrancaste el agente. Cuando dos proyectos del ecosistema necesitan coordinar (ej: SF Manager genera
un export que va a BusinessOS, o SF Agent escribe en una tabla que SF Manager consume), el agente de
uno necesita LEER el otro para entender contratos, schemas, types compartidos.

Las opciones son:
1. **Permission rules** (este skill): el usuario autoriza una vez, el agente lee libremente despues.
2. **Workspace shell** en `ProyectosIA/.claude/`: requiere reorganizar y arrancar siempre desde el top.
3. **Copy-paste manual**: el usuario pega el material del otro repo cuando hace falta. No escala.

Este skill implementa la opcion 1, que es la mas pragmatica si los proyectos son repos independientes.

---

## Activacion

Cuando este skill se invoca, ejecutar estos pasos en orden:

### Paso 1: Identificar el proyecto actual

```bash
pwd
```

Identificar el nombre del proyecto desde el ultimo segmento del path, o desde el campo `name` de
`package.json` si existe.

### Paso 2: Detectar proyectos hermanos del ecosistema

Buscar candidatos en estas ubicaciones (un nivel arriba y dos niveles arriba del proyecto actual):

```bash
# Un nivel arriba (hermanos directos)
ls -d ../*/ 2>/dev/null

# Dos niveles arriba (primos via /AplicacionesSaas/ u otras categorias)
ls -d ../../*/ 2>/dev/null
ls -d ../../*/*/  2>/dev/null  # ej: ProyectosIA/AplicacionesSaas/*
```

Filtrar candidatos: solo los que tengan al menos uno de:
- Carpeta `.claude/` (es un proyecto Claude Code)
- Archivo `package.json` (es un proyecto Node)
- Archivo `CLAUDE.md` (tiene instrucciones para agente)

Excluir el proyecto actual de los candidatos.

**Proyectos conocidos del ecosistema Fluya** (priorizar si aparecen):
- `BusinessOS` — Business OS de Fluya Studio (gobierna contratos, clientes, facturacion).
- `SaasFactoryManager` — Web del Manager (Vercel + Next.js).
- `SaasFactoryAgent` — Electron local que opera filesystem/git.
- Cualquier otro bajo `AplicacionesSaas/` es candidato secundario.

### Paso 3: Mostrar al usuario los candidatos

Imprimir una tabla:

```
Proyecto actual: <nombre>
Path: <pwd>

Proyectos hermanos detectados:

  [1] BusinessOS               (/Users/.../ProyectosIA/BusinessOS)
  [2] SaasFactoryAgent         (/Users/.../ProyectosIA/AplicacionesSaas/SaasFactoryAgent)
  [3] otros...

Voy a generar permisos de LECTURA para los 3 proyectos. Confirmas? (si / no / elegir)
```

Esperar respuesta. Si el usuario elige un subset, usar solo esos.

### Paso 4: Leer settings.json existente (sin pisar)

```bash
cat .claude/settings.json 2>/dev/null
```

Si existe, parsear y preservar todos los allows existentes. Si no existe, partir de objeto vacio.

### Paso 5: Generar las allow rules

Por cada proyecto seleccionado, agregar estas reglas al array `permissions.allow`:

```
Read(<abs-path>/**)
Bash(ls <abs-path>:*)
Bash(find <abs-path>:*)
Bash(grep:* <abs-path>/*)
```

**NO duplicar** reglas que ya esten en el array (idempotencia).

### Paso 6: Pedir autorizacion explicita y escribir

Antes de escribir, mostrar el diff:

```
Voy a agregar a .claude/settings.json estas reglas:

  + Read(/Users/.../BusinessOS/**)
  + Read(/Users/.../SaasFactoryAgent/**)
  + Bash(ls /Users/.../BusinessOS:*)
  ...

Confirmas el write? (si / no)
```

**IMPORTANTE**: este write modifica los permisos del propio agente, por lo que el sandbox de
Claude Code probablemente lo va a bloquear por "self-modification of permission config". El usuario
debe aprobar explicitamente o pegar el contenido manualmente.

Si el usuario responde "si" / "autorizo" / "ok", intentar el Write. Si el sandbox bloquea, imprimir
el JSON completo y pedirle al usuario que lo pegue manualmente en `.claude/settings.json`.

### Paso 7: Validar

Despues del write (o del pegado manual), correr:

```bash
ls /Users/<usuario>/ProyectosIA/BusinessOS 2>&1 | head -3
```

Si funciona sin "Permission denied", reportar OK. Si todavia falla, revisar formato del settings.json
(JSON valido) y reportar el error.

### Paso 8: Sugerir simetria

Recordar al usuario que para que **el Claude del otro proyecto** pueda leer este, hay que invocar este
mismo skill desde el otro lado:

```
Configurado del lado <proyecto-actual>. Si querés que el Claude de BusinessOS tambien pueda leer
este proyecto, abri Claude en /Users/.../BusinessOS y corre /cross-repo-access.

Para el SF Agent, lo mismo desde /Users/.../SaasFactoryAgent.

Tres archivos, un skill, simetria completa.
```

---

## Estructura de settings.json resultante

Ejemplo desde el SaasFactoryManager autorizando lectura de BusinessOS y SF Agent:

```json
{
  "permissions": {
    "allow": [
      "Read(/Users/<usuario>/ProyectosIA/BusinessOS/**)",
      "Read(/Users/<usuario>/ProyectosIA/AplicacionesSaas/SaasFactoryAgent/**)",
      "Bash(ls /Users/<usuario>/ProyectosIA/BusinessOS:*)",
      "Bash(ls /Users/<usuario>/ProyectosIA/AplicacionesSaas/SaasFactoryAgent:*)",
      "Bash(find /Users/<usuario>/ProyectosIA/BusinessOS:*)",
      "Bash(find /Users/<usuario>/ProyectosIA/AplicacionesSaas/SaasFactoryAgent:*)",
      "Bash(grep:* /Users/<usuario>/ProyectosIA/BusinessOS/*)",
      "Bash(grep:* /Users/<usuario>/ProyectosIA/AplicacionesSaas/SaasFactoryAgent/*)"
    ]
  }
}
```

Si ya hay otras allows (ej: `"Skill(fluya-brand)"`), preservarlas. El resultado final agrupa todas
las allows en un solo array, deduplicadas.

---

## Que NO hace este skill

- **No da permisos de Write/Edit** sobre los otros proyectos. Escribir afuera requiere autorizacion
  case-by-case del usuario. Esto es deliberado: el sandbox separa lectura (informacion) de escritura
  (cambios), y solo aflojamos lectura.
- **No mueve folders ni reorganiza repos**. La estructura sigue siendo `ProyectosIA/<repos>` separados.
- **No configura permisos del lado contrario**. Cada proyecto necesita correr el skill por separado
  (asimetria por default).
- **No comparte secretos** (.env, credentials). El sandbox de write sigue activo: el agente puede
  leer codigo pero no puede modificarlo, y el usuario sigue siendo responsable de no exponer secrets
  al copy-paste.

---

## Casos de uso del ecosistema Fluya

### 1. SF Manager genera contrato → exporta a BusinessOS
SF Manager necesita leer schema de BusinessOS para saber que payload mandarle. Invocar el skill desde
SF Manager autorizando lectura de BusinessOS. Cuando llega Fase 7 del PRP-005, el Claude del Manager
puede leer `BusinessOS/migrations/*.sql` y `BusinessOS/src/api/quotes/*.ts` para implementar el export
sin tener que pedir al humano que pegue el contrato.

### 2. SF Agent escribe work_sessions consumido por SF Manager
Coordinacion entre Claudes de Manager y Agent: ambos deben conocer el schema de
`work_sessions` y el contrato del bus `agent_commands`. Habilitar lectura cruzada agiliza las
revisiones cuando se cambia algo del schema.

### 3. Proyecto nuevo en AplicacionesSaas/ necesita pattern de auth
Proyecto recien creado puede leer el `add-login` ya implementado en SF Manager como referencia. El
skill abre esa lectura sin tener que copiar archivos.

---

## Errores comunes

### Error: sandbox bloquea el write a settings.json

Sintoma:
```
Permission denied: self-modification of permission config without explicit user authorization
```

Causa: Claude Code protege contra que el agente se otorgue mas permisos solo.

Fix: el usuario tiene que aprobar explicitamente la operacion ("autorizo settings.json") o crear el
archivo manualmente con el JSON generado.

### Error: ya existe `.claude/settings.local.json` con otras reglas

Sintoma: Hay un `settings.local.json` (no commiteado) con reglas que NO quieras pisar.

Fix: este skill escribe `settings.json` (commiteado, compartido con el equipo), NO `settings.local.json`.
Los dos archivos coexisten y Claude Code combina sus reglas. Si hay conflicto, `settings.local.json`
gana.

### Error: paths con tilde (~) no funcionan

Sintoma: `Read(~/ProyectosIA/...)` no matchea.

Fix: usar paths absolutos siempre. El skill ya lo hace asi: detecta `$HOME` y expande.

---

## Salida final

Al cerrar, el skill debe reportar:

```
✅ Cross-repo access configurado en <proyecto-actual>

Permisos agregados:
  - Read sobre BusinessOS
  - Read sobre SaasFactoryAgent

Validacion: ls /Users/.../BusinessOS → OK (no permission denied)

Siguiente paso (opcional):
  Configurar el mismo skill desde:
    - /Users/.../BusinessOS  (para que su Claude vea SF Manager y Agent)
    - /Users/.../AplicacionesSaas/SaasFactoryAgent  (para que vea SF Manager y BusinessOS)

Esto da simetria completa: cada Claude del ecosistema ve a los otros dos.
```

Y proponer agregar entrada a `Bitacora.md` documentando el cambio.
