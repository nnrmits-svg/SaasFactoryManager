import { streamText, type UIMessage } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY ?? '',
});

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

function extractTextFromMessage(msg: UIMessage): string {
  if (msg.parts && msg.parts.length > 0) {
    return msg.parts
      .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join('');
  }
  return '';
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
  const uiMessages: UIMessage[] = body.messages || [];
  const stepContext = body.stepContext;

  // Convert UIMessages to simple messages for streamText
  const messages = uiMessages.map((msg) => ({
    role: msg.role as 'user' | 'assistant',
    content: extractTextFromMessage(msg),
  }));

  const systemWithContext = stepContext
    ? `${SYSTEM_PROMPT}\n\nPaso actual del wizard: "${stepContext.title}" — Pregunta: "${stepContext.question}"\nPista: ${stepContext.hint}\n${stepContext.previousAnswers ? `Respuestas anteriores del usuario:\n${stepContext.previousAnswers}` : ''}`
    : SYSTEM_PROMPT;

  const result = streamText({
    model: openrouter('google/gemini-2.0-flash-001'),
    system: systemWithContext,
    messages,
    maxOutputTokens: 500,
  });

  return result.toUIMessageStreamResponse();
}
