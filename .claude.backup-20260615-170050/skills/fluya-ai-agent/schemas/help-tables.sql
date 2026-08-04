-- ============================================
-- TABLAS PARA EL AGENTE IA FLUYA (HELP CENTER)
-- Ejecutar en Supabase (dashboard o vía mcp__supabase__apply_migration).
-- ============================================

CREATE TABLE IF NOT EXISTS public.help_categories (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug          TEXT NOT NULL UNIQUE,
    name          TEXT NOT NULL,
    icon          TEXT,
    order_index   INTEGER NOT NULL DEFAULT 0,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_help_categories_active ON public.help_categories(is_active, order_index);

CREATE TABLE IF NOT EXISTS public.help_articles (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id        UUID REFERENCES public.help_categories(id) ON DELETE SET NULL,
    slug               TEXT NOT NULL UNIQUE,
    title              TEXT NOT NULL,
    excerpt            TEXT,
    content            TEXT,
    order_index        INTEGER NOT NULL DEFAULT 0,
    is_published       BOOLEAN NOT NULL DEFAULT FALSE,
    is_featured        BOOLEAN NOT NULL DEFAULT FALSE,
    views_count        INTEGER NOT NULL DEFAULT 0,
    helpful_count      INTEGER NOT NULL DEFAULT 0,
    not_helpful_count  INTEGER NOT NULL DEFAULT 0,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_help_articles_published ON public.help_articles(is_published, order_index);
CREATE INDEX IF NOT EXISTS idx_help_articles_category ON public.help_articles(category_id);
CREATE INDEX IF NOT EXISTS idx_help_articles_featured ON public.help_articles(is_featured) WHERE is_featured = TRUE;

CREATE TABLE IF NOT EXISTS public.faqs (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id  UUID REFERENCES public.help_categories(id) ON DELETE SET NULL,
    question     TEXT NOT NULL,
    answer       TEXT NOT NULL,
    order_index  INTEGER NOT NULL DEFAULT 0,
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_faqs_active ON public.faqs(is_active, order_index);
CREATE INDEX IF NOT EXISTS idx_faqs_category ON public.faqs(category_id);

CREATE TABLE IF NOT EXISTS public.article_feedback (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id  UUID NOT NULL REFERENCES public.help_articles(id) ON DELETE CASCADE,
    user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_helpful  BOOLEAN NOT NULL,
    comment     TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_article_feedback_article ON public.article_feedback(article_id);

-- ============================================
-- ROW LEVEL SECURITY
-- Lectura pública de contenido publicado; escritura solo admin (service role).
-- ============================================

ALTER TABLE public.help_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories readable by all"
    ON public.help_categories FOR SELECT
    USING (is_active = TRUE);

CREATE POLICY "articles readable by all"
    ON public.help_articles FOR SELECT
    USING (is_published = TRUE);

CREATE POLICY "faqs readable by all"
    ON public.faqs FOR SELECT
    USING (is_active = TRUE);

CREATE POLICY "feedback readable by owner"
    ON public.article_feedback FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "feedback insertable by authenticated"
    ON public.article_feedback FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- TRIGGERS: updated_at automático
-- ============================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_help_categories_updated
    BEFORE UPDATE ON public.help_categories
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_help_articles_updated
    BEFORE UPDATE ON public.help_articles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_faqs_updated
    BEFORE UPDATE ON public.faqs
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
