// Sync CHANGELOG → knowledge_items (cambios de plataforma) — cron o trigger manual.
// Alimenta la KB que consume AI Fluya (auto-update Nivel 3).
// Auth: Vercel manda Authorization: Bearer ${CRON_SECRET}.

import { syncChangelogToKnowledge } from '@/features/help/services/changelog-knowledge-sync';

export const maxDuration = 60;

export async function GET(req: Request) {
  const auth = req.headers.get('authorization') ?? '';
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const result = await syncChangelogToKnowledge();
    return Response.json({ ok: true, ...result });
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
