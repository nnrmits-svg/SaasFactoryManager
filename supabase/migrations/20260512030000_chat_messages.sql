-- Sprint A.3 (Fase 3): Memoria entre conversaciones del AI Fluya
-- Aplicar en proyecto Supabase SaasFactoryManager (ref: fxlvexilnrfkkcbzwskr)
--
-- Persistencia de mensajes del chatbot por usuario. Se usa para inyectar
-- "contexto previo" (sumario de las ultimas N interacciones) en el system
-- prompt cuando el usuario abre el chat en una nueva sesion.
--
-- RLS: cada usuario solo ve/inserta/borra sus propios mensajes.

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role        TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content     TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_user_time
    ON public.chat_messages(user_id, created_at DESC);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users see own chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "users insert own chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "users delete own chat messages" ON public.chat_messages;

CREATE POLICY "users see own chat messages"
    ON public.chat_messages FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "users insert own chat messages"
    ON public.chat_messages FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users delete own chat messages"
    ON public.chat_messages FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================
-- POST-VERIFICACION:
-- SELECT count(*) FROM chat_messages;  -- 0 inicialmente
-- SELECT polname, polcmd FROM pg_policy
-- WHERE polrelid = 'public.chat_messages'::regclass;
-- Esperado: 3 policies (SELECT, INSERT, DELETE)
-- ============================================================
