const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'google/gemini-2.0-flash-001';

const SYSTEM_PROMPT = `Eres un consultor de negocio senior que ayuda a definir ideas de SaaS.
Tu rol es ayudar al usuario a responder las preguntas del wizard de negocio.

Contexto: El usuario esta completando un formulario paso a paso para definir su SaaS.
Cada paso tiene una pregunta especifica. Tu trabajo es:
1. Dar sugerencias concretas basadas en lo que el usuario describe
2. Hacer preguntas de seguimiento si la respuesta es vaga
3. Proponer opciones cuando el usuario no sabe que responder
4. Ser conciso — respuestas de 2-4 oraciones max, no parrafos largos

Reglas:
- Responde SIEMPRE en espanol
- Se directo y practico, no academico
- Da ejemplos concretos cuando sea posible
- Si el usuario pide ayuda generica, propone 2-3 opciones para elegir
- No repitas la pregunta del wizard, el usuario ya la ve en pantalla
- Si el usuario pega una respuesta larga, ayudalo a resumirla`;

interface ChatMessage {
  role: string;
  content: string;
}

interface StepContext {
  title: string;
  question: string;
  hint: string;
  previousAnswers?: string;
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'OPENROUTER_API_KEY no configurada' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const body = await req.json();
  const chatMessages: ChatMessage[] = body.messages || [];
  const stepContext: StepContext | undefined = body.stepContext;

  const systemContent = stepContext
    ? `${SYSTEM_PROMPT}\n\nPaso actual del wizard: "${stepContext.title}" — Pregunta: "${stepContext.question}"\nPista: ${stepContext.hint}\n${stepContext.previousAnswers ? `Respuestas anteriores del usuario:\n${stepContext.previousAnswers}` : ''}`
    : SYSTEM_PROMPT;

  const messages = [
    { role: 'system', content: systemContent },
    ...chatMessages.map((m) => ({ role: m.role, content: m.content || '' })),
  ];

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        max_tokens: 500,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({ error: `OpenRouter error: ${response.status} ${errorText}` }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse SSE stream from OpenRouter and forward as plain text
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const data = line.slice(6).trim();
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  controller.enqueue(encoder.encode(content));
                }
              } catch {
                // Skip malformed JSON chunks
              }
            }
          }
          controller.close();
        } catch (err) {
          controller.enqueue(encoder.encode(`\n[Error: ${err}]`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
