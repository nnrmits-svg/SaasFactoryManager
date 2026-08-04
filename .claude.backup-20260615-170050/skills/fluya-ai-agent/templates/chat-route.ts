import { openai } from '@/lib/openai';
import { getHelpArticles, getFAQs } from '@/features/help/actions';

export const runtime = 'nodejs';
export const maxDuration = 30;

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

// ============================================
// APP-SPECIFIC KNOWLEDGE BASE
// Reemplazar el contenido de este bloque con el conocimiento de la app target.
// Ver system-prompt-template.md para la estructura recomendada.
// ============================================

const APP_NAME = '{{APP_NAME}}';
const APP_DESCRIPTION = '{{APP_DESCRIPTION}}'; // ej: "plataforma de gestión de X"
const LANGUAGE_STYLE = 'español rioplatense (vos, usá, podés)'; // ajustar según locale

const KNOWLEDGE_BASE = `
## 1. NOMBRE DE LA FEATURE
- Descripción breve de qué hace
- Campos / opciones relevantes
- Casos de uso típicos

## 2. OTRA FEATURE
- ...

---

## ÚLTIMAS NOVEDADES

### {{MES AÑO}}
- Cambios recientes relevantes para los usuarios
`;

// ============================================
// PROMPT BUILDER (dinámico)
// ============================================

async function buildSystemPrompt(): Promise<string> {
    const [articlesResult, faqsResult] = await Promise.all([
        getHelpArticles(),
        getFAQs(),
    ]);

    const articles = articlesResult.data || [];
    const faqs = faqsResult.data || [];

    const articlesContext = articles
        .map((a) => `## ${a.title}\n${a.content || a.excerpt || ''}`)
        .join('\n\n');

    const faqsContext = faqs
        .map((f) => `P: ${f.question}\nR: ${f.answer}`)
        .join('\n\n');

    return `Eres AI Fluya, el asistente inteligente de ${APP_NAME}, ${APP_DESCRIPTION}.

INSTRUCCIONES:
- Responde siempre en ${LANGUAGE_STYLE}.
- Sé conciso y directo (máximo 3-4 párrafos).
- Usa la información de los artículos, FAQs y conocimiento detallado proporcionado.
- Si la pregunta está fuera de tu conocimiento, sugiere contactar soporte en /contact.
- Cuando sea relevante, guía al usuario paso a paso.
- No inventes funcionalidades que no existen.
- Usá un tono amigable y profesional.

---

CONOCIMIENTO COMPLETO DE LA PLATAFORMA:
${KNOWLEDGE_BASE}

---

### Artículos de Ayuda (base de datos)
${articlesContext}

### Preguntas Frecuentes (base de datos)
${faqsContext}`;
}

// ============================================
// ROUTE HANDLER
// ============================================

export async function POST(request: Request) {
    try {
        const { messages } = (await request.json()) as { messages: ChatMessage[] };

        if (!messages || messages.length === 0) {
            return Response.json({ error: 'No messages provided' }, { status: 400 });
        }

        const systemPrompt = await buildSystemPrompt();

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                ...messages.map((m) => ({
                    role: m.role as 'user' | 'assistant',
                    content: m.content,
                })),
            ],
            stream: true,
            temperature: 0.7,
            max_tokens: 800,
        });

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                for await (const chunk of response) {
                    const content = chunk.choices[0]?.delta?.content;
                    if (content) {
                        controller.enqueue(encoder.encode(content));
                    }
                }
                controller.close();
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
