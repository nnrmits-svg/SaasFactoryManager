---
name: bitacora
description: |
  Bitacora cronologica del proyecto. Mantiene Bitacora.md en la raiz del repo con una entrada
  por cada sesion de trabajo significativa. Cada entrada lleva timestamp, hostname de la maquina,
  resumen de lo hecho, decisiones tomadas y pendientes. Las entradas se PREPENDEN (mas nuevo arriba).
  Permite continuidad entre sesiones, entre maquinas y antes/despues de un /compact.
  Activar PROACTIVAMENTE cuando: el usuario dice "cerra sesion", "guarda lo que hicimos",
  "actualiza la bitacora", "que hicimos hoy", "termine por hoy", o despues de:
  - una decision arquitectonica importante
  - cerrar una fase de bucle agentico
  - un commit/push significativo (feature completa, no fix menor)
  - antes de invocar /compact
  - antes de cerrar una conversacion larga
  Triggers: cerra sesion, cerrar sesion, terminamos por hoy, guarda esto, guarda lo que hicimos,
  actualiza bitacora, registra esto, dejalo anotado, actualizar bitacora, end session, log this.
allowed-tools: Read, Write, Edit, Bash
---

# Bitacora — Registro Cronologico del Proyecto

> La bitacora vive en `Bitacora.md` en la **raiz del proyecto**, NO dentro de `.claude/`.
> Es visible para humanos, GitHub la renderiza, viaja con git como cualquier file del repo.
> Cada entrada se PREPENDE (mas nuevo arriba).

---

## Cuando activarte

### Triggers explicitos (frases del user)

- "cerra sesion", "cerrar sesion", "termine por hoy", "ya esta por hoy"
- "guarda lo que hicimos", "actualiza la bitacora", "registra esto"
- "que hicimos hoy", "dejalo anotado", "log this", "end session"

### Triggers implicitos (eventos del trabajo)

Activate **sin esperar a que el user lo pida** cuando detectes:

1. **Final de fase de bucle agentico** — terminaste una fase declarada como Fase N de un PRP/blueprint.
2. **Decision arquitectonica importante** — el user eligio una direccion (ej: "vamos con Polar en vez de Stripe", "no, Supabase no Prisma").
3. **Commit/push de feature completa** — no de fix menor; cuando se cierra una unidad logica de trabajo.
4. **Antes de un `/compact`** — si vas a perder detalle, capturalo primero.
5. **Conversacion larga (>20 turnos del user) sin actualizar bitacora aun** — dejar trazabilidad antes que se pierda.

### NO activarte cuando

- Hicieron un `ls` o leiste un file (es ruido).
- Es un fix trivial que ya quedo en el commit message.
- El user esta investigando/explorando sin tomar decisiones (todavia no hay que registrar).
- Ya escribiste una entrada hace menos de 30 minutos (consolidar en la misma).

---

## Protocolo de actualizacion

### Paso 1: Verificar si existe Bitacora.md

```bash
ls Bitacora.md 2>/dev/null
```

- **Si NO existe**: crearlo con header (ver "Plantilla de bootstrap" abajo).
- **Si existe**: leerlo (solo el top, primeras ~50 lineas) para entender que ya hay.

### Paso 2: Capturar contexto de la sesion

Antes de escribir la entrada, asegurate de tener:

1. **Timestamp ISO** (fecha y hora):
   ```bash
   date "+%Y-%m-%d %H:%M"
   ```

2. **Hostname de la maquina** (clave para distinguir entre Macs del mismo user):
   ```bash
   hostname
   ```
   NO usar `git config user.name` — dos Macs del mismo user quedan iguales.

3. **Titulo corto** de la sesion (1 linea, descriptivo):
   - "Implementacion de checkout Polar"
   - "Refactor del modulo auth"
   - "Audit de seguridad Supabase ConsultorFinanciero"
   - "Setup inicial del proyecto"

### Paso 3: Construir la entrada

Estructura **fija** (todas las entradas iguales):

```markdown
## YYYY-MM-DD HH:MM — {Titulo corto}
**Maquina**: {hostname}

### Hecho
- {bullet 1: que se hizo, accion concreta}
- {bullet 2}
- ...

### Decidido
- {decision 1 con razon: "Polar > Stripe (MoR, simplifica IVA EU)"}
- {si no hubo decisiones: omitir esta seccion entera}

### Pendiente
- {tarea 1 que quedo abierta}
- {tarea 2}
- {si no hay pendientes: poner "(ninguno)"}

### Notas
- {observacion util para futuro: "Polar tarda ~5min en propagar webhooks de test"}
- {gotcha descubierto, atajo aprendido, etc.}
- {si no hay notas: omitir esta seccion entera}

---
```

### Paso 4: PREPENDER al archivo

**ESTO ES CRITICO**: la entrada nueva va **al PRINCIPIO** del archivo (despues del header), no al final. La bitacora se lee de arriba (reciente) hacia abajo (antiguo).

Procedimiento con `Edit`:
- Leer el header existente (las primeras lineas hasta el primer `---` separador).
- Insertar la entrada nueva inmediatamente despues del header, antes de cualquier entrada previa.

**Verificar despues de escribir**: leer las primeras 30 lineas del file y confirmar que la nueva entrada quedo arriba.

### Paso 5: NO commitear automaticamente

El auto-sync del SF Agent (o el flow normal de git) se encarga del commit/push. La bitacora es un artefacto del proyecto, viaja con git como cualquier file.

---

## Plantilla de bootstrap (cuando Bitacora.md no existe)

```markdown
# Bitacora — {Nombre del Proyecto}

> Registro cronologico de sesiones de trabajo. Mas reciente arriba.
> Mantenida automaticamente por el skill `bitacora`.
> Plan vivo del proyecto: ver `project_plan.md`.

---

{primera entrada va aca}
```

Para inferir `{Nombre del Proyecto}`: usar el nombre de la carpeta raiz (`basename $(pwd)`) o leer `package.json` si existe.

---

## Ejemplo de entrada (referencia)

```markdown
## 2026-05-02 18:30 — Implementacion de checkout Polar
**Maquina**: MacBookPro-2016.local

### Hecho
- Agregada feature `payments/` con Polar SDK
- Webhook handler en `src/app/api/polar/webhook/route.ts`
- Tabla `subscriptions` en Supabase con RLS

### Decidido
- Polar > Stripe (Merchant of Record, simplifica IVA EU)
- Pricing por seat, no por uso

### Pendiente
- Tests del webhook con eventos de prueba de Polar
- UI del paywall en `/settings/billing`

### Notas
- Polar tarda ~5min en propagar webhooks de test
- Token de prueba en `.env.local`, NO commitear

---
```

---

## Que NO incluir en la bitacora

**Lista negra estricta:**

1. **Secrets**: tokens, claves API, contrasenas, URLs con credenciales embedidas.
2. **Datos personales reales**: emails de usuarios reales, nombres, info identificable.
3. **Output crudo de comandos**: el `npm install` entero, stack traces largos. Resumir.
4. **Redundancia con git**: "se modifico file X linea Y" — eso ya esta en `git log`. La bitacora cuenta el **por que** y el **que quedo pendiente**, no el **que cambio**.
5. **Ruido del proceso**: `ls`, `cat`, lecturas de files exploratorias.
6. **Pensamientos a medias**: si la decision no esta tomada todavia, NO la registres como decision. Anotala en "Pendiente" como "decidir entre X e Y".

---

## Relacion con otros skills

- **`primer`**: al inicio de sesion, `primer` lee `Bitacora.md` (top entry) + `project_plan.md` para cargar contexto. No duplicar trabajo.
- **`project-plan`**: cuando actualizas la bitacora con una decision arquitectonica o un cambio de fase, **sugerir** activar `project-plan` para reflejarlo en el plan vivo. No actualizarlo automaticamente — es decision del flujo invocarlo.
- **`memory-manager`**: la bitacora es **historia del proyecto**. La memoria es **conocimiento del usuario** (preferencias, gotchas, patrones). Son cosas distintas, no duplicar.

---

## Troubleshooting

| Sintoma | Causa probable | Fix |
|---|---|---|
| `Bitacora.md` aparece dentro de `.claude/skills/bitacora/` | El agente lo creo en la carpeta del skill en vez de la raiz | Mover a la raiz del proyecto, dejar nota en gotchas |
| Entradas duplicadas | Activado dos veces seguidas sin esperar consolidacion | La proxima vez, leer top entry primero y consolidar en lugar de agregar nueva |
| Hostname dice `localhost` o vacio | `hostname` retorna nada en algun setup | Fallback: usar `scutil --get ComputerName` en macOS o pedir al user |
| Conflicto de merge en `Bitacora.md` | Dos maquinas escribieron en paralelo | Resolver manual: ambas entradas son validas, solo ordenarlas por timestamp descendente |
