// Radar de Ecosistema — cron semanal (Vercel Cron) o trigger manual.
// Auth: Vercel manda Authorization: Bearer ${CRON_SECRET}. El mismo secret
// sirve para dispararlo a mano (radar v0 on-demand).

import { runEcosystemRadar } from '@/features/knowledge/services/ecosystem-radar';

// Nota: con cacheComponents (Next 16) NO se puede usar `export const dynamic`.
// La route es dinámica sola porque lee headers (authorization) y env.
export const maxDuration = 300;

export async function GET(req: Request) {
  const auth = req.headers.get('authorization') ?? '';
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  const started = Date.now();
  try {
    const result = await runEcosystemRadar();
    return Response.json({ ok: true, durationMs: Date.now() - started, ...result });
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
