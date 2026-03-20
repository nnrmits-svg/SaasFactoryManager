---
name: agent-performance
description: "Medir y reportar el rendimiento del agente durante la construccion de un proyecto. Tiempo por fase, errores, tokens, calidad. Ejecutar al final de un sprint, despues de un bucle-agentico, o cuando el usuario dice: como fue el performance, cuanto tardo, metricas del agente, reporte de calidad, agent stats, como trabajaste."
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
user-invocable: true
---

# Agent Performance: Metricas de Rendimiento

Mide como trabajo el agente durante la construccion. No es para la app del cliente - es para **el equipo** que opera la fabrica.

---

## Cuando Ejecutar

- Al final de un bucle-agentico (despues de implementar un PRP)
- Al final de un sprint o sesion de trabajo
- Cuando el usuario pregunta "como fue el performance?"
- Periodicamente para tracking de mejora continua

---

## Proceso de Medicion

### Paso 1: Recopilar Datos de la Sesion

Lee el contexto disponible para armar las metricas:

```bash
# 1. Commits de la sesion (ultimas N horas)
git log --since="8 hours ago" --oneline --stat

# 2. Archivos modificados
git diff --stat HEAD~10 2>/dev/null || git diff --stat HEAD~5

# 3. Errores de build actuales
npm run build 2>&1 | tail -5

# 4. Errores de tipos
npx tsc --noEmit 2>&1 | tail -10

# 5. Warnings de lint
npm run lint 2>&1 | tail -10
```

### Paso 2: Analizar PRPs Ejecutados

Buscar PRPs que se trabajaron en esta sesion:

```bash
# PRPs existentes
ls .claude/PRPs/PRP-*.md 2>/dev/null

# Estado de cada PRP (buscar checkmarks)
grep -l "\[x\]" .claude/PRPs/PRP-*.md 2>/dev/null
```

Para cada PRP, extraer:
- Fases totales vs fases completadas
- Errores documentados (seccion Auto-Blindaje)

### Paso 3: Calcular Metricas

#### 3.1 Metricas de Velocidad

| Metrica | Como Medir | Target |
|---------|-----------|--------|
| Commits por sesion | `git log --since="8h" --oneline \| wc -l` | 5-15 |
| Archivos tocados | `git diff --stat HEAD~N` | Depende del scope |
| Lineas agregadas | `git diff --stat HEAD~N \| tail -1` | Depende del scope |
| Lineas eliminadas | `git diff --stat HEAD~N \| tail -1` | Mas = mejor (cleanup) |

#### 3.2 Metricas de Calidad

| Metrica | Como Medir | Target |
|---------|-----------|--------|
| Build status | `npm run build` exit code | 0 (sin errores) |
| Type errors | `npx tsc --noEmit 2>&1 \| grep "error" \| wc -l` | 0 |
| Lint warnings | `npm run lint 2>&1 \| grep "warning" \| wc -l` | < 5 |
| Tests passing | `npm test 2>&1` (si hay tests) | 100% |
| RLS habilitado | Supabase MCP `get_advisors` type=security | Todas las tablas |

#### 3.3 Metricas de Proceso

| Metrica | Como Medir | Target |
|---------|-----------|--------|
| Fases completadas | Checkmarks en PRP | 100% del plan |
| Errores auto-blindados | Buscar en PRP seccion errores | Documentados |
| Skills usados | Inferir de commits/archivos | Apropiados al task |
| Rollbacks necesarios | `git log --grep="revert"` | 0 |

#### 3.4 Metricas de Seguridad

| Metrica | Como Medir | Target |
|---------|-----------|--------|
| Tablas sin RLS | Supabase MCP `get_advisors` security | 0 |
| Secrets expuestos | `grep -r "sk_\|api_key\|password" src/ --include="*.ts"` | 0 |
| Inputs sin validar | Buscar forms sin Zod | 0 |

### Paso 4: Generar Reporte

Genera el archivo `AGENT_PERFORMANCE.md` en la raiz del proyecto:

```markdown
# Agent Performance Report

> Generado: [FECHA Y HORA]
> Proyecto: [Nombre del proyecto]
> Sesion: [Descripcion breve de que se trabajo]

---

## Resumen Ejecutivo

| Categoria | Score | Estado |
|-----------|-------|--------|
| Velocidad | [X/10] | [emoji] |
| Calidad | [X/10] | [emoji] |
| Proceso | [X/10] | [emoji] |
| Seguridad | [X/10] | [emoji] |
| **TOTAL** | **[X/10]** | **[emoji]** |

---

## Velocidad

- **Commits**: [N] commits en esta sesion
- **Archivos modificados**: [N] archivos
- **Lineas**: +[N] agregadas / -[N] eliminadas
- **Net change**: [+/-N] lineas netas

### Commits de la Sesion
| # | Mensaje | Archivos |
|---|---------|----------|
| 1 | [mensaje] | [N] |
| 2 | [mensaje] | [N] |
| ... | ... | ... |

---

## Calidad

- **Build**: [PASS/FAIL] [detalles si falla]
- **TypeScript**: [N] errores de tipo
- **Lint**: [N] warnings
- **Tests**: [PASS/FAIL/NO_TESTS] ([N]/[N] passing)

### Deuda Tecnica Detectada
- [Lista de issues encontrados, si hay]

---

## Proceso

- **PRP ejecutado**: [PRP-XXX] [nombre]
- **Fases completadas**: [N]/[N] ([%])
- **Skills usados**: [lista]
- **Errores auto-blindados**: [N]
- **Rollbacks**: [N]

### Auto-Blindaje (errores documentados)
| Error | Fix | Aplica a |
|-------|-----|----------|
| [descripcion] | [solucion] | [scope] |

---

## Seguridad

- **Tablas sin RLS**: [N] [lista si hay]
- **Secrets expuestos**: [N] [detalles si hay]
- **Inputs sin validar**: [N] [detalles si hay]

---

## Recomendaciones

1. [Accion recomendada basada en metricas]
2. [Accion recomendada basada en metricas]
3. [Accion recomendada basada en metricas]

---

## Scoring

### Como se calcula

**Velocidad** (peso 20%):
- 10: 10+ commits con scope apropiado
- 7: 5-9 commits
- 4: 1-4 commits
- 1: 0 commits

**Calidad** (peso 35%):
- 10: Build OK + 0 type errors + 0 lint warnings + tests pass
- 7: Build OK + < 3 type errors + < 5 lint warnings
- 4: Build OK pero con errores de tipo o lint
- 1: Build FAIL

**Proceso** (peso 25%):
- 10: 100% fases completadas + errores documentados + 0 rollbacks
- 7: 80%+ fases + errores documentados
- 4: 50%+ fases completadas
- 1: < 50% fases o multiples rollbacks

**Seguridad** (peso 20%):
- 10: 0 tablas sin RLS + 0 secrets + 0 inputs sin validar
- 7: < 2 issues menores
- 4: 2-5 issues
- 1: Secrets expuestos o tablas publicas sin RLS
```

### Paso 5: Guardar Historico

Agrega una entrada al historial en `.claude/memory/`:

```bash
# Si existe el archivo de performance historico, agregar
# Si no existe, crear
```

En `.claude/memory/reference/performance-history.md`:

```markdown
## [FECHA] - [Proyecto/Feature]
- Score: [X/10]
- Velocidad: [X] | Calidad: [X] | Proceso: [X] | Seguridad: [X]
- Commits: [N] | Build: [PASS/FAIL] | Fases: [N/N]
- Notas: [observacion breve]
```

---

## Comparacion con Sesiones Anteriores

Si existe historial, mostrar tendencia:

```
Tendencia de Performance (ultimas 5 sesiones):

Sesion 1: ████████░░ 8.0
Sesion 2: ███████░░░ 7.0
Sesion 3: █████████░ 9.0
Sesion 4: ████████░░ 8.5
Sesion 5: █████████░ 9.2  ← actual

Tendencia: MEJORANDO (+0.3 promedio por sesion)
```

---

## Uso Rapido

Para un reporte rapido sin el analisis completo:

```
Quick Stats:
- Commits: [N]
- Build: [PASS/FAIL]
- Types: [N errors]
- Lint: [N warnings]
- Score estimado: [X/10]
```

---

## Reglas

1. **NO MENTIR**: Si el build falla, reportar FAIL. Sin maquillaje.
2. **COMPARAR**: Siempre mostrar tendencia si hay historial.
3. **ACTIONABLE**: Las recomendaciones deben ser acciones concretas.
4. **AUTOMATICO**: No preguntarle al usuario por datos, inferir todo del codebase.
5. **NO BLOQUEAR**: Este skill es de lectura, nunca modifica codigo del proyecto.
6. **PERSISTIR**: Siempre guardar en performance-history.md para tracking.
