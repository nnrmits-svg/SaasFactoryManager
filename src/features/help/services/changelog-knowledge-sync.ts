// Nivel 3 del auto-update de AI Fluya: sincroniza el CHANGELOG (version.ts, la
// fuente de verdad de los cambios de plataforma) hacia knowledge_items como
// items source_type='platform_change' / dimension='platform'. Así la AI Fluya
// (vía la tool buscar_conocimiento) conoce cada release automáticamente, sin que
// nadie escriba a mano en la KB.
//
// Idempotente: cada release queda con source_ref='changelog:v<version>' y solo
// se insertan los que faltan. Usa service_role (bypassa RLS) porque corre en
// contexto de cron, sin sesión de usuario.

import { createClient } from '@supabase/supabase-js';
import { CHANGELOG } from '@/shared/lib/version';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY no configurada');
  }
  return createClient(url, key);
}

export interface ChangelogSyncResult {
  total: number;
  synced: number;
  skipped: number;
  versions: string[];
}

export async function syncChangelogToKnowledge(): Promise<ChangelogSyncResult> {
  const admin = getAdminClient();

  const refOf = (version: string) => `changelog:v${version}`;
  const allRefs = CHANGELOG.map((c) => refOf(c.version));

  // ¿Cuáles ya están en la KB? (una sola query)
  const { data: existing, error: selErr } = await admin
    .from('knowledge_items')
    .select('source_ref')
    .eq('source_type', 'platform_change')
    .in('source_ref', allRefs);

  if (selErr) throw new Error(`select knowledge_items: ${selErr.message}`);

  const existingRefs = new Set((existing ?? []).map((r) => r.source_ref as string));

  const rows = CHANGELOG.filter((c) => !existingRefs.has(refOf(c.version))).map((c) => ({
    dimension: 'platform',
    item_type: 'version_bump',
    title: `Release v${c.version} (${c.date})`,
    body: c.highlights.join('\n\n'),
    context: `Cambio de plataforma del Factory Manager, registrado automáticamente desde el changelog (version.ts). Versión ${c.version}, ${c.date}.`,
    source_type: 'platform_change',
    source_ref: refOf(c.version),
    status: 'approved',
    tags: ['release', 'platform', 'changelog', `v${c.version}`],
  }));

  if (rows.length > 0) {
    const { error: insErr } = await admin.from('knowledge_items').insert(rows);
    if (insErr) throw new Error(`insert knowledge_items: ${insErr.message}`);
  }

  return {
    total: CHANGELOG.length,
    synced: rows.length,
    skipped: CHANGELOG.length - rows.length,
    versions: rows.map((r) => r.source_ref.replace('changelog:', '')),
  };
}
