import { createOpenAI } from '@ai-sdk/openai';
import { streamText, stepCountIs } from 'ai';
import { getHelpArticles, getFAQs } from '@/features/help/actions';
import { helpTools } from '@/features/help/tools';

// gpt-4o-mini: tool calling confiable, costo ~$0.15/1M input. Probado vs
// gemini-2.0-flash que via OpenRouter no ejecutaba las tools (solo generaba
// preamble tipo "dame un toque..." y terminaba sin llamar la funcion).
const MODEL = 'openai/gpt-4o-mini';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ============================================
// KNOWLEDGE BASE — extracto del WORKFLOW.md (fuente: raiz del repo)
// ============================================
const KNOWLEDGE_BASE = `
## QUE ES FACTORY MANAGER
Business OS para gestionar una fabrica de software. El dueno (founder) ve todos sus proyectos
en un dashboard, monitorea tiempo y dinero, sincroniza skills entre catalogo central y proyectos,
y genera reportes de costo por hora.

## PERSONAJES
- **Founder**: vision total. Pantalla: /dashboard
- **Operador tecnico** (roadmap): mantener proyectos sincronizados
- **Cliente final** (roadmap): ver SOLO su proyecto

## ESTADOS DE SKILLS
- **synced** (verde): local = catalogo
- **divergent** (ambar): local difiere — editado directo
- **missing** (rojo): local_hash NULL — carpeta borrada
- **external** (gris): registry_hash NULL — skill custom

Como arreglar: para "divergent" → Re-sync o pushear cambios al catalogo. Para "missing" → git checkout HEAD --
.claude/skills/<nombre>/. Para "external" → es intencional, no hay que arreglar.

## OTROS ESTADOS
- **agent_status** (en projects): pending / creating / created / failed
- **tracking** (en proyecto): stopped / active
- **Agent connection**: active si heartbeat <60s, sino offline

## GLOSARIO TECNICO → HUMANO
- **skill**: capacidad reutilizable (login, emails, etc.)
- **catalogo**: biblioteca central compartida entre todos los proyectos
- **Agent**: programa local que mantiene proyectos en sincronia
- **wip**: commit automatico del Agent ("work in progress")
- **hash**: huella digital del skill (compara local vs catalogo)
- **portfolio**: la pantalla con todos los proyectos
- **factory**: wizard para crear proyecto nuevo

## RESPUESTAS TIPICAS DE ERROR
- "Por que no se sincronizo?" → revisar estado del Agent. Si offline: "El Agent esta dormido, despertalo".
- "Donde esta mi proyecto?" → chequear filtros, sino archivados.
- "Por que ambar y no rojo?" → ambar = existe pero cambios. Rojo = NO existe en disco.

## COLOQUIALISMOS
- "se rompio" → error en produccion, pedir detalles
- "esta caro" → revisar billing
- "ese de [tema]" → buscar proyecto por nombre fuzzy
- "fuera de fase" → divergent
`;

async function buildSystemPrompt(): Promise<string> {
  const [articlesResult, faqsResult] = await Promise.all([
    getHelpArticles(),
    getFAQs(),
  ]);

  type ArticleRow = { title: string; content?: string | null; excerpt?: string | null };
  type FaqRow = { question: string; answer: string };

  const articlesContext = ((articlesResult.data ?? []) as ArticleRow[])
    .map((a) => `## ${a.title}\n${a.content || a.excerpt || ''}`)
    .join('\n\n');

  const faqsContext = ((faqsResult.data ?? []) as FaqRow[])
    .map((f) => `P: ${f.question}\nR: ${f.answer}`)
    .join('\n\n');

  return `Eres AI Fluya, el asistente operativo de Factory Manager (Business OS de Fluya Studio para gestionar una fabrica de software SaaS).

INSTRUCCIONES:
- Responde siempre en espanol rioplatense (vos, usa, podes — argentino conversacional).
- Se conciso y directo. Maximo 3-4 parrafos, idealmente 2.
- Tono amigable, profesional, no robotico. Usa "tocar" / "ir a" / "mirar".

USAR LAS HERRAMIENTAS (importantisimo):
Cuando el usuario pregunte algo concreto sobre SUS proyectos, costos o skills, USA las herramientas
disponibles para responder con datos REALES, no con respuestas genericas. Ejemplos:
- "que proyectos tengo" → llamar list_my_projects
- "como va SaasFactoryAgent" → llamar get_project_status con name=SaasFactoryAgent
- "que skills tienen problemas" → llamar list_problematic_skills
- "cuanto gaste este mes" → llamar get_cost_summary con month=YYYY-MM (hoy es 2026-05)
- "tengo skills divergent en X" → llamar list_problematic_skills con project=X

Solo da respuesta generica (sin tools) si la pregunta es conceptual ("que significa divergent")
o de troubleshooting general ("como arreglo X").

REGLAS:
- No inventes funcionalidades. Si algo es "roadmap" o "proximamente", decilo asi.
- Para acciones destructivas (borrar), pedir confirmacion explicita.
- Si una herramienta devuelve error o no encuentra datos, decilo: "No encontre proyectos con ese nombre".
- Si el usuario menciona algo del cliente final/operador con roles, aclara que el sistema de roles esta en roadmap (sprint B, requiere /add-security).

---

CONOCIMIENTO COMPLETO DE LA PLATAFORMA:
${KNOWLEDGE_BASE}

---

### Articulos de Ayuda (base de datos)
${articlesContext || '(sin articulos cargados)'}

### Preguntas Frecuentes (base de datos)
${faqsContext || '(sin FAQs cargadas)'}`;
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'OPENROUTER_API_KEY no configurada' },
      { status: 500 }
    );
  }

  try {
    const { messages } = (await req.json()) as { messages: ChatMessage[] };

    if (!messages || messages.length === 0) {
      return Response.json({ error: 'No messages provided' }, { status: 400 });
    }

    const systemPrompt = await buildSystemPrompt();

    const openrouter = createOpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey,
    });

    const result = streamText({
      model: openrouter(MODEL),
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      tools: helpTools,
      // 3 steps = user → tool_call → tool_result → final_text
      stopWhen: stepCountIs(3),
      temperature: 0.7,
    });

    return result.toTextStreamResponse();
  } catch (error: unknown) {
    console.error('Help chat error:', error);
    const message = error instanceof Error ? error.message : 'Error interno del asistente';
    return Response.json({ error: message }, { status: 500 });
  }
}
