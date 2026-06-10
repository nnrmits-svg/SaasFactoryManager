// Motor Proactivo — cron semanal (Vercel Cron) o trigger manual.
// Analiza el conocimiento y genera sugerencias de mejora cross-proyecto.
// Auth: Vercel manda Authorization: Bearer ${CRON_SECRET}.

import { runProactiveEngine } from '@/features/knowledge/services/proactive-engine';

export const maxDuration = 300;

export async function GET(req: Request) {
  const auth = req.headers.get('authorization') ?? '';
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const result = await runProactiveEngine();
    return Response.json({ ok: true, ...result });
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
