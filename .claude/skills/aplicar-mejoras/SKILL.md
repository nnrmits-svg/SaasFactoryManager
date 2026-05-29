---
name: aplicar-mejoras
description: "Skill que toma los findings de /audit-proyecto y los aplica de forma controlada con bucle-agentico. Cierra el ciclo audit → fix. El dev elige qué findings aplicar (críticos / importantes / sugerencias) y el skill los implementa uno por uno con tests + bitácora updates. Activar cuando el usuario dice: aplicá las mejoras, arreglá lo que detectó el audit, implementá los findings, fix the audit findings."
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# Aplicar Mejoras — Cierra el ciclo audit → fix

> Reporte: $ARGUMENTS (path a outputs/audit-*-resumen.md o similar)

Sos el ejecutor que toma los **findings detectados por `/audit-proyecto`** y los **implementa** uno por uno con el rigor del Grupo ITS.

Sin este skill, `/audit-proyecto` queda en "te dije qué arreglar pero hacelo solo". Con vos, el ciclo se cierra: detectar → priorizar → aplicar → validar.

---

## Pre-requisitos

- Debe existir un reporte de audit (`outputs/audit-{fecha}-resumen.md`)
- El proyecto debe tener los agents especializados en `.claude/agents/`
- Idealmente el dev corrió `/primer` para tener contexto

---

## Proceso

### Paso 1: Detectar el reporte de audit

Si `$ARGUMENTS` es un path → usar ese.
Si no → buscar el último audit en `outputs/`:

```bash
ls -t outputs/audit-*-resumen.md | head -1
```

Si no existe ningún audit → abortar:
```
⚠️ No encuentro un reporte de audit en outputs/.

Primero corré /audit-proyecto para generar el reporte. Después corré
este skill para aplicar los findings.
```

### Paso 2: Parsear el reporte

Leer el `.md` del audit y extraer:

```typescript
interface Finding {
  id: string;
  severity: 'critical' | 'important' | 'suggestion';
  area: 'frontend' | 'backend' | 'supabase' | 'vercel' | 'performance' | 'security' | 'accessibility' | 'db';
  title: string;
  file?: string;
  line?: number;
  impact: string;
  fix: string;
  effort: 'low' | 'medium' | 'high';
}
```

Generar tabla resumen y mostrar al dev:

```
📋 Findings detectados en el audit:

🔴 Críticos: 3
🟡 Importantes: 7
🟢 Sugerencias: 12

Total: 22 findings
```

### Paso 3: Selección de findings a aplicar

Preguntar al dev (modo conversacional, no formulario):

```
¿Qué findings querés que aplique?

Opciones:
1. Solo críticos (3) — más rápido, mayor impacto
2. Críticos + importantes (10) — recomendado para sprint
3. Todos los críticos + selección de importantes (decime cuáles)
4. Por área específica (ej: solo security, solo performance)
5. IDs específicos (ej: #1, #3, #7)

¿Qué elegís? (pegá tu respuesta libre)
```

Procesar respuesta:
- Si "1", "2", "todo": claro
- Si "por área X": filtrar por `finding.area === X`
- Si "IDs": parsear lista
- Si ambiguo: pedir clarificación

### Paso 4: Plan de ejecución

Mostrar al dev el plan ordenado:

```
📋 Plan de ejecución (ordenado por severidad + esfuerzo):

🔴 Finding #1 — [security] CSP header ausente
   Esfuerzo: bajo (15 min)
   Engineer: security-engineer
   Archivo: next.config.ts

🔴 Finding #3 — [performance] Imagen hero sin priorizar
   Esfuerzo: bajo (10 min)
   Engineer: performance-engineer
   Archivo: src/app/page.tsx:42

🟡 Finding #5 — [supabase] Falta índice en accounts(user_id)
   Esfuerzo: bajo (20 min — migration + deploy)
   Engineer: supabase-admin
   Archivo: nueva migration

[...total estimado: 4-6 horas]

¿Procedo en orden? (y/n)
  - y → arranco con Finding #1
  - n → decime el orden que querés
  - solo X → solo aplico el finding X
```

### Paso 5: Ejecución finding por finding

Por cada finding seleccionado, ejecutar este loop:

#### A. Mostrar contexto

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 Aplicando Finding #{N}: {título}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Impacto: {descripción}
Fix recomendado: {acción}
Engineer: {agent_name}
```

#### B. Invocar al engineer correspondiente

Mapping engineer ↔ área:

| Área del finding | Engineer a invocar |
|---|---|
| frontend | frontend-specialist |
| backend | backend-specialist |
| supabase | supabase-admin |
| db (schema) | db-architect → supabase-admin (implementa) |
| vercel | vercel-deployer |
| performance | performance-engineer |
| security | security-engineer |
| accessibility | accessibility-engineer |
| observability | observability-engineer |
| cost | cost-optimizer |

Pasar al engineer:
```
{engineer}: implementar fix para Finding #{N}

Contexto del audit:
- Archivo: {file:line}
- Impacto: {impact}
- Fix recomendado: {fix}

Reglas:
- NO romper funcionalidad existente
- Agregar tests si aplica
- Actualizar comentarios si aplica
- Pasar tests antes de finalizar
```

#### C. Validar el cambio

Después del engineer:

```bash
# Si hay tests
npm test -- --filter={archivo modificado}

# Si modificó schema
# Validar migration up + down

# Si modificó frontend
# Validar build
npm run build
```

Si algo falla:
```
❌ Finding #{N} no pudo aplicarse:
{error}

Opciones:
1. Revertir cambios y skip
2. Que el dev revise manualmente
3. Continuar de todas formas (no recomendado)

¿Cómo procedo?
```

#### D. Loguear en bitácora

```markdown
## {fecha} — Aplicado Finding #{N} del audit

- Audit ref: outputs/audit-{fecha}-resumen.md
- Área: {area}
- Engineer: {agent}
- Archivos modificados: {lista}
- Tests: {pasaron/agregados/no aplica}
- Impacto medido: {antes vs después si aplica}
```

#### E. Continuar con el siguiente

```
✅ Finding #{N} aplicado correctamente.

Progreso: {N}/{total}

Siguiente: Finding #{N+1}...
```

### Paso 6: Cierre con resumen

Cuando se aplicaron todos los seleccionados:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 Aplicación de mejoras completada
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Findings aplicados: {N} / {seleccionados}
Saltados: {M} (con razón)

Cambios en código:
- Archivos modificados: {lista}
- Archivos nuevos: {lista}
- Migrations creadas: {N}
- Tests agregados: {N}

Bitácora actualizada: bitacora.md
Project plan actualizado: project_plan.md (estado de fase)

Próximos pasos:
  1. Revisá los cambios:
     git diff

  2. Corré la suite completa de tests:
     npm test

  3. Validá en local que todo funciona:
     npm run dev

  4. Si OK → commit:
     git add . && git commit -m "fix: aplicar findings audit {fecha}"

  5. Re-correr el audit para ver mejoras:
     /audit-proyecto
     → debería tener menos findings críticos
```

### Paso 7: Actualizar reporte del audit

Marcar findings aplicados en el reporte original:

```markdown
## 🔴 Findings Críticos

### 1. CSP header ausente  ✅ APLICADO {fecha}
- ...

### 2. Sin rate limit en /api/login  ⏳ PENDIENTE
- ...
```

---

## Reglas

- SIEMPRE pedirle al dev qué findings aplicar (no asumir "todos")
- SIEMPRE invocar al engineer correcto según el área
- SIEMPRE validar el cambio antes de pasar al siguiente
- SIEMPRE loguear en bitácora cada finding aplicado
- NUNCA aplicar findings sin tests (si el código tiene test suite)
- NUNCA aplicar más de 10 findings en una sola sesión sin checkpoint del dev
- Si un finding crítico falla → STOP, escalar al dev (no continuar)

## Anti-patrones

- NO ejecutar todos los findings de una sin confirmar
- NO modificar código sin validar tests
- NO skipear el log en bitácora (después no podés rastrear qué se hizo)
- NO confundir con /bucle-agentico (ese es para PRPs nuevos, este es para fixes del audit)

## Ejemplo de invocación

```bash
# Después de correr /audit-proyecto
/aplicar-mejoras

# O con path explícito
/aplicar-mejoras outputs/audit-2026-05-29-resumen.md
```

Resultado esperado: arregla los findings seleccionados con tests y bitácora actualizada.

---

*Skill v1.0 — Cierra el ciclo audit → fix. Iterar cuando se agreguen nuevos engineers que requieran nuevos mappings.*
