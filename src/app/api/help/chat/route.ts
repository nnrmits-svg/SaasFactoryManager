import { getHelpArticles, getFAQs } from '@/features/help/actions';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'google/gemini-2.0-flash-001';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ============================================
// KNOWLEDGE BASE — extracto del WORKFLOW.md (fuente: raiz del repo)
// El bot lo usa para responder preguntas sobre estados, intents y glosario.
// Cuando WORKFLOW.md cambie, regenerar este bloque manualmente o via /flow-map.
// ============================================
const KNOWLEDGE_BASE = `
## QUE ES FACTORY MANAGER
Business OS para gestionar una fabrica de software. Permite al dueno ver todos sus proyectos SaaS
en un dashboard, monitorear tiempo y dinero invertido, sincronizar "skills" entre catalogo central
y proyectos, y generar reportes de costo por hora.

## PERSONAJES
- **Founder**: vision total del portfolio, costos, decisiones de negocio. Pantalla: /dashboard
- **Operador tecnico** (roadmap): mantener proyectos sincronizados, levantar tracking
- **Cliente final** (roadmap): ver SOLO su proyecto, su gasto, pedir features

## ESTADOS DE SKILLS (los 4 canonicos)
- **synced** (verde): el skill local esta igual al catalogo central. Todo en orden.
- **divergent** (ambar): el skill local tiene cambios que NO estan en el catalogo. Alguien lo edito directo.
- **missing** (rojo): el skill desaparecio del proyecto pero queda registrado. Probablemente lo borraron.
- **external** (gris): skill custom de ese proyecto, no esta en el catalogo central.

Como arreglar: para "divergent" → tocar Re-sync para volver al catalogo, o pushear los cambios al catalogo
desde el SF Agent. Para "missing" → restaurar el archivo con git checkout. Para "external" → es intencional, no hay que arreglar nada.

## OTROS ESTADOS
- **agent_status**: pending / creating / created / failed (cuando el Agent crea un proyecto nuevo)
- **tracking**: stopped / active (auto-commit cada 30s)
- **Agent connection**: active si recibio heartbeat <60s, sino offline

## EVENTOS / MENSAJES (lo que el usuario ve)
- "Sincronizado con catalogo" → badge verde, skill synced
- "Difiere del catalogo" → badge ambar, skill divergent
- "Falta el skill" → badge rojo, skill missing
- "Skill custom" → badge gris, skill external
- "Tracking activo" → modo auto-commit prendido
- "Hace Xs/Xm/Xh" → ultima actividad del Agent
- "Disponible proximamente via Agent" → boton deshabilitado esperando wire-up

## GLOSARIO TECNICO → HUMANO
- **skill**: capacidad reutilizable que sabe hacer algo concreto (ej: agregar login, mandar emails)
- **catalogo / registry**: la biblioteca central de skills compartidos entre todos los proyectos
- **Agent**: programa que corre en la computadora del dueno y mantiene los proyectos en sincronia
- **wip**: commit automatico del Agent (work in progress, no es version final)
- **hash**: huella digital que prueba que dos versiones del skill son iguales
- **RLS**: reglas de seguridad de la BD (Row Level Security)
- **portfolio**: pantalla con todos los proyectos juntos
- **factory**: asistente para crear un proyecto nuevo desde una idea

## INTENT MAP (que puede hacer el usuario)
- "mostrame mis proyectos" → /dashboard
- "abrime el de X" → /project/X
- "que proyectos tienen problemas" → filtrar por skills divergent/missing
- "cuanto gaste este mes" → /reports
- "creame un proyecto nuevo de X" → /factory wizard
- "por que add-emails esta raro?" → leer estado del skill y traducir con glosario
- "sincronizame el proyecto" → trigger sync (requiere Agent)
- "borra el proyecto" → confirmar 2x antes (destructivo)

## RESPUESTAS TIPICAS DE ERROR (como contestar)
- "Por que no se sincronizo X?" → revisar estado del Agent. Si offline: "El Agent esta dormido, despertalo
  desde Settings". Si online: revisar logs del ultimo sync.
- "Donde esta mi proyecto, no aparece?" → chequear filtros activos. Sino buscar archivados.
- "Por que dice ambar y no rojo?" → ambar = el skill EXISTE pero tiene cambios. Rojo = el skill NO existe en disco.
- "Se quedo cargando, que pasa?" → pedir hard reload (Cmd+Shift+R). Si persiste, revisar consola.

## COLOQUIALISMOS (interpretar como)
- "se rompio" / "no anda" → error en produccion, pedir detalles
- "esta caro" → revisar billing/cost report
- "ese de [tema]" → buscar proyecto por nombre fuzzy
- "esta fuera de fase" → skill divergent
- "no aparece" → posible filtro activo o estado missing
`;

async function buildSystemPrompt(): Promise<string> {
  const [articlesResult, faqsResult] = await Promise.all([
    getHelpArticles(),
    getFAQs(),
  ]);

  const articles = articlesResult.data || [];
  const faqs = faqsResult.data || [];

  type ArticleRow = { title: string; content?: string | null; excerpt?: string | null };
  type FaqRow = { question: string; answer: string };

  const articlesContext = (articles as ArticleRow[])
    .map((a) => `## ${a.title}\n${a.content || a.excerpt || ''}`)
    .join('\n\n');

  const faqsContext = (faqs as FaqRow[])
    .map((f) => `P: ${f.question}\nR: ${f.answer}`)
    .join('\n\n');

  return `Eres AI Fluya, el asistente inteligente de Factory Manager, el Business OS de Fluya Studio para gestionar una fabrica de software SaaS.

INSTRUCCIONES:
- Responde siempre en espanol rioplatense (vos, usa, podes — argentino conversacional).
- Se conciso y directo. Maximo 3-4 parrafos, idealmente 2.
- Usa el conocimiento provisto abajo + los articulos y FAQs de la BD.
- Si la pregunta esta fuera de tu conocimiento, sugeri ver /reports, /settings o contactar al equipo en /contacto.
- Cuando sea relevante, guia paso a paso.
- No inventes funcionalidades. Si algo es "roadmap" o "proximamente", decilo asi.
- Tono amigable, profesional, no robotico. Usa "tocar" / "ir a" / "mirar" en vez de "click" / "navigate" / "view".
- Para preguntas sobre estados de skills, leer el contexto del usuario si lo da. Si no, explicar generico.
- Para acciones destructivas (borrar, etc.), pedir confirmacion explicita.
- Si el usuario menciona algo del cliente final / operador con roles, aclara que el sistema de roles esta en roadmap (sprint B/C, requiere /add-security).

---

CONOCIMIENTO COMPLETO DE LA PLATAFORMA:
${KNOWLEDGE_BASE}

---

### Articulos de Ayuda (base de datos)
${articlesContext || '(sin articulos cargados todavia)'}

### Preguntas Frecuentes (base de datos)
${faqsContext || '(sin FAQs cargadas todavia)'}`;
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

    const upstream = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        stream: true,
        temperature: 0.7,
        max_tokens: 800,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ],
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const errText = await upstream.text();
      return Response.json(
        { error: `OpenRouter error: ${upstream.status} ${errText}` },
        { status: 502 }
      );
    }

    // OpenRouter devuelve SSE (data: { ... } por linea). Lo parseamos y reenviamos
    // solo el contenido a texto plano — los componentes esperan chunks crudos.
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const reader = upstream.body.getReader();

    const stream = new ReadableStream({
      async start(controller) {
        let buffer = '';
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith('data:')) continue;
              const payload = trimmed.slice(5).trim();
              if (payload === '[DONE]') {
                controller.close();
                return;
              }
              try {
                const json = JSON.parse(payload) as {
                  choices?: Array<{ delta?: { content?: string } }>;
                };
                const content = json.choices?.[0]?.delta?.content;
                if (content) controller.enqueue(encoder.encode(content));
              } catch {
                // chunk parcial / keepalive — ignorar
              }
            }
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error: unknown) {
    console.error('Help chat error:', error);
    const message = error instanceof Error ? error.message : 'Error interno del asistente';
    return Response.json({ error: message }, { status: 500 });
  }
}
