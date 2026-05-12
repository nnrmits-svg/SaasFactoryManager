// Memoria persistente del chat AI Fluya por usuario.
// - Cada mensaje (user + assistant) se guarda en chat_messages
// - Antes de cada request, se inyecta un sumario de las ultimas N interacciones
//   como contexto en el system prompt (NO como mensajes — evita duplicacion con
//   la conversacion actual que el cliente ya envia)

import { createClient } from '@/lib/supabase/server';

// Cuantos mensajes del historico inyectar como contexto.
// 10 = ~5 turnos. Balance entre contexto util y tokens consumidos.
const HISTORY_LIMIT = 10;

// Cuanto tiempo atras buscar mensajes. Despues de esto se considera "vieja
// conversacion" y no aporta contexto util.
const HISTORY_DAYS = 30;

interface ChatMessageRow {
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

/**
 * Devuelve un sumario en texto de las ultimas N interacciones del usuario,
 * formateado para inyectar al system prompt. Si no hay historia, devuelve string vacio.
 */
export async function getRecentChatContext(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return '';

  const since = new Date();
  since.setDate(since.getDate() - HISTORY_DAYS);

  const { data, error } = await supabase
    .from('chat_messages')
    .select('role, content, created_at')
    .eq('user_id', user.id)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })
    .limit(HISTORY_LIMIT);

  if (error || !data || data.length === 0) return '';

  // Reverse: queremos cronologico viejo→nuevo para que el modelo entienda el flow
  const messages = (data as ChatMessageRow[]).reverse();

  const lines = messages.map((m) => {
    const when = formatRelativeTime(m.created_at);
    const speaker = m.role === 'user' ? 'Usuario' : 'AI Fluya';
    // Limitar cada linea a 200 chars para no inflar el prompt
    const content = m.content.length > 200 ? m.content.slice(0, 197) + '...' : m.content;
    return `[${when}] ${speaker}: ${content}`;
  });

  return `### Memoria de conversaciones previas con este usuario
(${messages.length} mensaje(s) recientes, ordenados cronologicamente)

${lines.join('\n')}

---
Usa esto para dar continuidad: si el usuario habla de algo que ya menciono ("y como va eso?", "lo arreglaste?"), refierete a la conversacion previa naturalmente.`;
}

/**
 * Guarda un mensaje del chat (user o assistant) en la BD. No-op si no hay sesion.
 * Errores se loguean pero no se propagan (no romper UX por fallar el save).
 */
export async function saveChatMessage(
  role: 'user' | 'assistant',
  content: string
): Promise<void> {
  if (!content || !content.trim()) return;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('chat_messages').insert({
      user_id: user.id,
      role,
      content: content.slice(0, 4000), // truncar mensajes monstruosos
    });

    if (error) {
      console.error('[chat-memory] save failed:', error.message);
    }
  } catch (err) {
    console.error('[chat-memory] save error:', err);
  }
}

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'ahora';
  if (diffMin < 60) return `hace ${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `hace ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `hace ${diffD}d`;
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}
