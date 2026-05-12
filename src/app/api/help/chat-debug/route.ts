// Endpoint debug: ejecuta generateText (no-streaming) con las tools y devuelve
// el resultado completo (steps, tool_calls, tool_results, texto final).
// Para diagnosticar por que el chat principal devuelve stream vacio en queries
// que invocan tools. ELIMINAR DESPUES DE DEBUG.

import { createOpenAI } from '@ai-sdk/openai';
import { generateText, stepCountIs } from 'ai';
import { helpTools } from '@/features/help/tools';

const MODEL = 'openai/gpt-4o-mini';

export async function POST(req: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return Response.json({ error: 'OPENROUTER_API_KEY no configurada' }, { status: 500 });

  try {
    const { message } = (await req.json()) as { message: string };

    const openrouter = createOpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey,
    });

    const result = await generateText({
      model: openrouter.chat(MODEL),
      system:
        'Eres un asistente operativo. Usa las herramientas para responder con datos REALES. ' +
        'Despues de llamar una herramienta, SIEMPRE genera un texto en espanol que use los datos.',
      messages: [{ role: 'user', content: message }],
      tools: helpTools,
      stopWhen: stepCountIs(5),
      temperature: 0.7,
    });

    return Response.json({
      text: result.text,
      finish_reason: result.finishReason,
      steps_count: result.steps?.length ?? 0,
      steps: result.steps?.map((s) => ({
        text: s.text,
        finishReason: s.finishReason,
        toolCalls: s.toolCalls?.map((tc) => ({
          name: tc.toolName,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          input: (tc as any).input ?? (tc as any).args,
        })),
        toolResults: s.toolResults?.map((tr) => ({
          name: tr.toolName,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          output: (tr as any).output ?? (tr as any).result,
        })),
        usage: s.usage,
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error';
    console.error('[chat-debug]', error);
    return Response.json({ error: message, stack: error instanceof Error ? error.stack : undefined }, { status: 500 });
  }
}
