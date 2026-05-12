// Endpoint debug para diagnosticar memoria: ejecuta saveChatMessage y
// getRecentChatContext directamente y devuelve resultado.

import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userErr } = await supabase.auth.getUser();

    if (userErr || !user) {
      return Response.json({ stage: 'auth', error: userErr?.message ?? 'no user', user_id: null });
    }

    // 1. Intentar insert directo
    const { data: inserted, error: insertErr } = await supabase
      .from('chat_messages')
      .insert({
        user_id: user.id,
        role: 'user',
        content: `debug test ${Date.now()}`,
      })
      .select()
      .single();

    // 2. Read back
    const { data: rows, error: readErr } = await supabase
      .from('chat_messages')
      .select('id, role, content, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    return Response.json({
      user_id: user.id,
      insert: {
        error: insertErr?.message ?? null,
        success: !!inserted,
        inserted,
      },
      read: {
        error: readErr?.message ?? null,
        count: rows?.length ?? 0,
        rows,
      },
    });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
