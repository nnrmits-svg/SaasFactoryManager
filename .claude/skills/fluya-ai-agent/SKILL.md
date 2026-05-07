---
name: fluya-ai-agent
description: "Instalar el Agente IA de Fluya (chatbot AI Fluya) en una app de la factory: API route con OpenAI streaming, widget flotante FAB, chat full-page, tablas de help articles/FAQs en Supabase y system prompt dinámico con contexto de la app. Activar cuando el usuario dice: instalá el agente AI Fluya, poné el chatbot de ayuda, necesito AI Fluya, chatbot flotante, asistente IA, help center IA, agente de ayuda."
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

# Skill: Agente IA Fluya (AI Fluya Chatbot)

Instala el chatbot "AI Fluya" en una app: widget flotante FAB en todas las páginas (solo usuarios autenticados) + chat full-page para `/help` + API route con OpenAI streaming + sistema de articles/FAQs en Supabase que el agente lee para responder con contexto.

## Cuándo usarlo

- "Instalá el agente AI Fluya en esta app"
- "Necesito el chatbot de ayuda flotante"
- "Poné AI Fluya como asistente de help"
- "Quiero el chat de ayuda con IA"

## Prerequisitos

La app target debe tener:
- Next.js 15+ con App Router
- Supabase configurado (`@supabase/supabase-js`, cliente en `src/lib/supabase/`)
- Tailwind con branding Fluya aplicado (ver skill `fluya-brand` — este skill asume que `fluya-purple`, `fluya-blue`, `fluya-green`, `fluya-dark` existen)
- `OPENAI_API_KEY` en variables de entorno

Si falta el branding Fluya, ejecutar primero el skill `fluya-brand`.

## Qué instala

1. **API route** → `src/app/api/help/chat/route.ts` (streaming con OpenAI `gpt-4o-mini`)
2. **Cliente OpenAI** → `src/lib/openai.ts`
3. **ChatbotWidget** → `src/features/help/components/ChatbotWidget.tsx` (FAB flotante global)
4. **AIAssistant** → `src/features/help/components/AIAssistant.tsx` (chat full-width para `/help`)
5. **Server actions** → `src/features/help/actions.ts` (CRUD de articles/categorías/FAQs)
6. **Tablas Supabase** → `help_categories`, `help_articles`, `faqs`, `article_feedback` con RLS
7. **Avatar del bot** → `public/fluyabot.png`
8. **System prompt template** → esqueleto para adaptar al dominio de la app

## Pasos de instalación

### 1. Copiar el avatar
```bash
cp .claude/skills/fluya-ai-agent/assets/fluyabot.png public/
```

### 2. Cliente OpenAI
```bash
cp .claude/skills/fluya-ai-agent/templates/openai-client.ts src/lib/openai.ts
```
Agregar `OPENAI_API_KEY=sk-...` a `.env.local` y a `.env.local.example`.

Instalar dependencia:
```bash
npm install openai
```

### 3. Crear tablas en Supabase
Ejecutar el SQL de `schemas/help-tables.sql` vía `mcp__supabase__apply_migration` o Dashboard. Crea:
- `help_categories` — categorías de artículos
- `help_articles` — artículos con markdown
- `faqs` — preguntas frecuentes
- `article_feedback` — 👍/👎 por artículo
- RLS: lectura pública, escritura solo admin

### 4. Server actions
```bash
mkdir -p src/features/help
cp .claude/skills/fluya-ai-agent/templates/help-actions.ts src/features/help/actions.ts
```

### 5. API route (chat)
```bash
mkdir -p src/app/api/help/chat
cp .claude/skills/fluya-ai-agent/templates/chat-route.ts src/app/api/help/chat/route.ts
```
**Editar el system prompt** dentro de `route.ts`: reemplazar la sección `KNOWLEDGE_BASE` con el conocimiento específico de la app. Ver `system-prompt-template.md` para la estructura recomendada.

### 6. Componentes UI
```bash
mkdir -p src/features/help/components
cp .claude/skills/fluya-ai-agent/templates/ChatbotWidget.tsx src/features/help/components/
cp .claude/skills/fluya-ai-agent/templates/AIAssistant.tsx src/features/help/components/
```

### 7. Montar el widget global
Editar `src/app/layout.tsx`:
```tsx
import { ChatbotWidget } from '@/features/help/components/ChatbotWidget';

// dentro del <body>, después de {children}:
<ChatbotWidget />
```

### 8. Crear la página `/help`
`src/app/help/page.tsx`:
```tsx
import { AIAssistant } from '@/features/help/components/AIAssistant';

export default function HelpPage() {
  return (
    <main className="min-h-screen bg-fluya-dark py-12 px-4">
      <h1 className="text-4xl font-bold text-center text-white mb-8">
        ¿En qué podemos ayudarte?
      </h1>
      <AIAssistant />
    </main>
  );
}
```

### 9. Cargar el prompt con datos
El system prompt se construye dinámicamente en `route.ts` leyendo `help_articles` y `faqs` desde la BD. Poblar esas tablas con contenido específico de la app (puede hacerse vía admin panel o seed script).

## Arquitectura del flujo

```
Usuario escribe mensaje
        ↓
ChatbotWidget / AIAssistant (cliente)
        ↓ POST /api/help/chat
        ↓ { messages: [...] }
Route handler
        ↓ buildSystemPrompt()
        ↓   lee help_articles + faqs de Supabase
        ↓   arma system prompt con knowledge base + dinámico
        ↓ OpenAI streaming (gpt-4o-mini)
        ↓ ReadableStream → cliente
Cliente decodifica chunks en tiempo real y actualiza UI
```

## Parámetros clave

| Parámetro | Valor default | Dónde editar |
|-----------|---------------|--------------|
| Modelo | `gpt-4o-mini` | `chat-route.ts` línea con `model:` |
| Temperature | `0.7` | `chat-route.ts` |
| Max tokens | `800` | `chat-route.ts` |
| Runtime | `nodejs` | `chat-route.ts` |
| Max duration | `30s` | `chat-route.ts` |
| Mensaje welcome | `"¡Hola! Soy AI Fluya..."` | `ChatbotWidget.tsx` + `AIAssistant.tsx` |
| Sugerencias iniciales | 4 preguntas | `ChatbotWidget.tsx` + `AIAssistant.tsx` |
| Auth required para widget | `true` | `ChatbotWidget.tsx` |

## Personalizar al dominio de la app

El prompt por default está pensado para SuscriptionsMgmt. Para una app nueva:

1. **Cambiar el rol** al inicio del prompt:
   ```
   Eres AI Fluya, el asistente inteligente de {{APP_NAME}}, {{APP_DESCRIPTION}}.
   ```

2. **Reemplazar el bloque `KNOWLEDGE_BASE`** con las features reales de la nueva app. Mantener la estructura numerada (`## 1. Feature`, `## 2. Feature`, etc.) — le da al modelo un índice claro.

3. **Actualizar las `SUGGESTIONS`** en ambos componentes con preguntas típicas del dominio.

4. **Actualizar el `WELCOME_MESSAGE`** para mencionar las features principales.

5. **Poblar `help_articles` y `faqs`** con artículos reales. El system prompt los inyecta automáticamente, así que no hace falta tocar código para enriquecer el contexto — solo cargar contenido en la BD.

Ver `system-prompt-template.md` para una plantilla limpia con placeholders.

## Reglas / Anti-patrones

- NO hardcodear datos del usuario en el system prompt (suscripción, perfil, financiero). El agente es genérico; si se quiere contexto personal, agregar una función que lo inyecte por request.
- NO subir `OPENAI_API_KEY` a git. Usar `.env.local`.
- NO remover el check de autenticación del widget sin motivo — evita gasto de tokens en visitantes anónimos.
- NO usar `gpt-4` o `gpt-4o` en production sin considerar costos — `gpt-4o-mini` es ~15x más barato y alcanza para el caso de help.
- NO aumentar `max_tokens` sin motivo — 800 es suficiente para respuestas de help.
- El avatar `fluyabot.png` DEBE estar en `public/` como `/fluyabot.png` — los componentes lo referencian con esa ruta absoluta.

## Archivos del skill

```
.claude/skills/fluya-ai-agent/
├── SKILL.md
├── system-prompt-template.md
├── templates/
│   ├── chat-route.ts
│   ├── openai-client.ts
│   ├── ChatbotWidget.tsx
│   ├── AIAssistant.tsx
│   └── help-actions.ts
├── schemas/
│   └── help-tables.sql
└── assets/
    └── fluyabot.png
```

## Relación con otros skills

- **fluya-brand** — debe aplicarse antes. Este skill usa `fluya-purple`, `fluya-blue`, `fluya-green`, `fluya-dark` y asume tema oscuro.
- **supabase** — usar para crear las tablas vía migrations.
