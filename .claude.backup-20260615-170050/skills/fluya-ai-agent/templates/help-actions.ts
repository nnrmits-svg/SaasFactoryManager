'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const getAdminClient = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    return createClient(url, key);
};

// ============================================
// CATEGORÍAS
// ============================================

export async function getHelpCategories() {
    try {
        const supabase = getAdminClient();
        if (!supabase) return { data: [], error: 'Database unavailable' };

        const { data, error } = await supabase
            .from('help_categories')
            .select('*')
            .eq('is_active', true)
            .order('order_index');

        if (error) return { data: [], error: error.message };
        return { data: data || [], error: null };
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        return { data: [], error: msg };
    }
}

// ============================================
// ARTÍCULOS
// ============================================

export async function getHelpArticles(categorySlug?: string) {
    try {
        const supabase = getAdminClient();
        if (!supabase) return { data: [], error: 'Database unavailable' };

        let categoryId: string | undefined;
        if (categorySlug) {
            const { data: category } = await supabase
                .from('help_categories')
                .select('id')
                .eq('slug', categorySlug)
                .single();
            categoryId = category?.id;
        }

        let query = supabase
            .from('help_articles')
            .select(`*, category:help_categories(id, name, slug, icon)`)
            .eq('is_published', true)
            .order('order_index');

        if (categoryId) query = query.eq('category_id', categoryId);

        const { data, error } = await query;
        if (error) return { data: [], error: error.message };
        return { data: data || [], error: null };
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        return { data: [], error: msg };
    }
}

export async function getFeaturedArticles() {
    try {
        const supabase = getAdminClient();
        if (!supabase) return { data: [], error: 'Database unavailable' };

        const { data, error } = await supabase
            .from('help_articles')
            .select(`*, category:help_categories(id, name, slug, icon)`)
            .eq('is_published', true)
            .eq('is_featured', true)
            .order('order_index')
            .limit(6);

        if (error) return { data: [], error: error.message };
        return { data: data || [], error: null };
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        return { data: [], error: msg };
    }
}

export async function getHelpArticle(slug: string) {
    try {
        const supabase = getAdminClient();
        if (!supabase) return { data: null, error: 'Database unavailable' };

        const { data, error } = await supabase
            .from('help_articles')
            .select(`*, category:help_categories(id, name, slug, icon)`)
            .eq('slug', slug)
            .eq('is_published', true)
            .single();

        if (error) return { data: null, error: error.message };

        await supabase
            .from('help_articles')
            .update({ views_count: (data.views_count || 0) + 1 })
            .eq('id', data.id);

        return { data, error: null };
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        return { data: null, error: msg };
    }
}

export async function searchHelpArticles(query: string) {
    try {
        const supabase = getAdminClient();
        if (!supabase) return { data: [], error: 'Database unavailable' };

        const { data, error } = await supabase
            .from('help_articles')
            .select(`*, category:help_categories(id, name, slug, icon)`)
            .eq('is_published', true)
            .or(`title.ilike.%${query}%,content.ilike.%${query}%,excerpt.ilike.%${query}%`)
            .order('order_index')
            .limit(20);

        if (error) return { data: [], error: error.message };
        return { data: data || [], error: null };
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        return { data: [], error: msg };
    }
}

// ============================================
// FAQs
// ============================================

export async function getFAQs(categorySlug?: string) {
    try {
        const supabase = getAdminClient();
        if (!supabase) return { data: [], error: 'Database unavailable' };

        let categoryId: string | undefined;
        if (categorySlug) {
            const { data: category } = await supabase
                .from('help_categories')
                .select('id')
                .eq('slug', categorySlug)
                .single();
            categoryId = category?.id;
        }

        let query = supabase
            .from('faqs')
            .select(`*, category:help_categories(id, name, slug, icon)`)
            .eq('is_active', true)
            .order('order_index');

        if (categoryId) query = query.eq('category_id', categoryId);

        const { data, error } = await query;
        if (error) return { data: [], error: error.message };
        return { data: data || [], error: null };
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        return { data: [], error: msg };
    }
}

// ============================================
// FEEDBACK
// ============================================

export async function submitArticleFeedback(
    articleId: string,
    isHelpful: boolean,
    comment?: string
) {
    try {
        const supabase = getAdminClient();
        if (!supabase) return { error: 'Database unavailable' };

        const field = isHelpful ? 'helpful_count' : 'not_helpful_count';
        const { data: article } = await supabase
            .from('help_articles')
            .select(field)
            .eq('id', articleId)
            .single();

        if (article) {
            await supabase
                .from('help_articles')
                .update({ [field]: ((article as Record<string, number>)[field] || 0) + 1 })
                .eq('id', articleId);
        }

        if (comment) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('article_feedback').insert({
                    article_id: articleId,
                    user_id: user.id,
                    is_helpful: isHelpful,
                    comment,
                });
            }
        }

        revalidatePath('/help');
        return { error: null, message: '¡Gracias por tu feedback!' };
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        return { error: msg };
    }
}
